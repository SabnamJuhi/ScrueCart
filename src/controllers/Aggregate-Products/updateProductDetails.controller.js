const sequelize = require("../../config/db");

const Product = require("../../models/products/product.model");
const ProductPrice = require("../../models/products/price.model");
const ProductSpec = require("../../models/products/productSpec.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantImage = require("../../models/productVariants/variantImage.model");
const VariantSize = require("../../models/productVariants/variantSize.model");

const cloudinary = require("../../config/cloudinary");

/* ---------------- SAFE JSON PARSER ---------------- */
const parseJSON = (data, field) => {
  try {
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    throw new Error(`Invalid JSON in "${field}"`);
  }
};

exports.updateProductDetails = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id: productId } = req.params;
    const {
      title,
      description,
      badge,
      brandName,
      isActive,
      price,
      specs,
      variants,
    } = req.body;

    /* ---------------- FIND PRODUCT ---------------- */
    const product = await Product.findByPk(productId, { transaction: t });
    if (!product) throw new Error("Product not found");

    /* ---------------- UPDATE CORE ---------------- */
    await product.update(
      {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(badge !== undefined && { badge }),
        ...(brandName !== undefined && { brandName }),
        ...(isActive !== undefined && { isActive }),
      },
      { transaction: t }
    );

    /* ---------------- PRICE UPSERT ---------------- */
    if (price) {
      const p = parseJSON(price, "price");

      const mrp = Number(p.mrp);
      const sellingPrice = Number(p.sellingPrice ?? mrp);

      await ProductPrice.upsert(
        {
          productId,
          mrp,
          sellingPrice,
          discountPercentage:
            mrp > sellingPrice
              ? Math.round(((mrp - sellingPrice) / mrp) * 100)
              : 0,
          currency: p.currency || "INR",
        },
        { transaction: t }
      );
    }

    /* ---------------- SPECS REPLACE ---------------- */
    if (specs) {
      const parsedSpecs = parseJSON(specs, "specs");

      await ProductSpec.destroy({ where: { productId }, transaction: t });

      const rows = Object.keys(parsedSpecs).map((key) => ({
        productId,
        specKey: key,
        specValue: Array.isArray(parsedSpecs[key])
          ? parsedSpecs[key].join(", ")
          : parsedSpecs[key],
      }));

      if (rows.length) await ProductSpec.bulkCreate(rows, { transaction: t });
    }

    /* ================= MAP UPLOADED CLOUDINARY IMAGES ================= */
    const variantImagesMap = {};

    for (const file of req.files || []) {
      let match;

      // existing variant images
      match = file.fieldname.match(/^variantImages_id_(\d+)$/);
      if (match) {
        const key = `id_${match[1]}`;
        variantImagesMap[key] ??= [];
        variantImagesMap[key].push(file.path); // ✅ cloudinary URL
        continue;
      }

      // new variant images
      match = file.fieldname.match(/^variantImages_tmp_(.+)$/);
      if (match) {
        const key = `tmp_${match[1]}`;
        variantImagesMap[key] ??= [];
        variantImagesMap[key].push(file.path);
      }
    }

    /* ================= VARIANTS ================= */
    if (variants) {
      const parsedVariants = parseJSON(variants, "variants");

      const dbVariants = await ProductVariant.findAll({
        where: { productId },
        include: [{ model: VariantImage, as: "images" }],
        transaction: t,
      });

      const dbMap = new Map(dbVariants.map((v) => [v.id, v]));
      const incomingIds = new Set();

      for (const v of parsedVariants) {
        let variant;

        /* ---------- UPDATE EXISTING VARIANT ---------- */
        if (v.id) {
          if (!dbMap.has(v.id)) throw new Error(`Invalid variant id ${v.id}`);

          variant = dbMap.get(v.id);
          incomingIds.add(variant.id);

          await variant.update(
            {
              variantCode: v.variantCode,
              colorName: v.color.name,
              colorCode: v.color.code,
              colorSwatch: v.color.swatch ?? null,
              totalStock: v.totalStock,
              stockStatus: v.stockStatus,
              isActive: v.isActive,
            },
            { transaction: t }
          );

          /* ---------- REPLACE SIZES ---------- */
          if (Array.isArray(v.sizes)) {
            await VariantSize.destroy({
              where: { variantId: variant.id },
              transaction: t,
            });

            await VariantSize.bulkCreate(
              v.sizes.map((s) => ({
                variantId: variant.id,
                size: s.size,
                stock: s.stock,
                chest: s.chest ?? null,
              })),
              { transaction: t }
            );
          }

          /* ---------- REPLACE IMAGES ---------- */
          const newImgs = variantImagesMap[`id_${variant.id}`] || [];

          if (newImgs.length > 0) {
            // 🔥 delete old images from cloudinary
            for (const img of variant.images) {
              const publicId = img.imageUrl.split("/").pop().split(".")[0];
              await cloudinary.uploader.destroy(`products/${publicId}`);
            }

            await VariantImage.destroy({
              where: { variantId: variant.id },
              transaction: t,
            });

            await VariantImage.bulkCreate(
              newImgs.map((url) => ({
                variantId: variant.id,
                imageUrl: url,
              })),
              { transaction: t }
            );
          }
        }

        /* ---------- CREATE NEW VARIANT ---------- */
        else {
          if (!v.tempKey) throw new Error("tempKey required for new variant");

          variant = await ProductVariant.create(
            {
              productId,
              variantCode: v.variantCode,
              colorName: v.color.name,
              colorCode: v.color.code,
              colorSwatch: v.color.swatch ?? null,
              totalStock: v.totalStock || 0,
              stockStatus: v.stockStatus || "Out of Stock",
            },
            { transaction: t }
          );

          incomingIds.add(variant.id);

          /* sizes */
          if (Array.isArray(v.sizes)) {
            await VariantSize.bulkCreate(
              v.sizes.map((s) => ({
                variantId: variant.id,
                size: s.size,
                stock: s.stock,
                chest: s.chest ?? null,
              })),
              { transaction: t }
            );
          }

          /* images */
          const imgs = variantImagesMap[`tmp_${v.tempKey}`] || [];
          if (imgs.length) {
            await VariantImage.bulkCreate(
              imgs.map((url) => ({
                variantId: variant.id,
                imageUrl: url,
              })),
              { transaction: t }
            );
          }
        }
      }

      /* ---------- DELETE REMOVED VARIANTS ---------- */
      const toDelete = dbVariants.filter((v) => !incomingIds.has(v.id));

      for (const v of toDelete) {
        // delete cloudinary images
        for (const img of v.images) {
          const publicId = img.imageUrl.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`products/${publicId}`);
        }
      }

      await VariantSize.destroy({
        where: { variantId: toDelete.map((v) => v.id) },
        transaction: t,
      });

      await VariantImage.destroy({
        where: { variantId: toDelete.map((v) => v.id) },
        transaction: t,
      });

      await ProductVariant.destroy({
        where: { id: toDelete.map((v) => v.id) },
        transaction: t,
      });
    }

    await t.commit();

    return res.json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    await t.rollback();
    console.error("UPDATE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
