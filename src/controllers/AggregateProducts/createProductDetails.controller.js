const sequelize = require("../../config/db");

const Product = require("../../models/products/product.model");
const ProductPrice = require("../../models/products/price.model");
const ProductSpec = require("../../models/products/productSpec.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantImage = require("../../models/productVariants/variantImage.model");
const VariantSize = require("../../models/productVariants/variantSize.model");
const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");

/* ---------------- SAFE JSON PARSER ---------------- */
const parseJSON = (data, fieldName) => {
  try {
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    throw new Error(`Invalid JSON format in "${fieldName}"`);
  }
};

exports.createProduct = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    console.log("FILES RECEIVED:", req.files); // 🔥 debug

    const {
      title,
      brandName,
      categoryId,
      subCategoryId,
      productCategoryId,
      description,
      badge,
      price,
      specs,
      variants,
      appliedOffers,
      gstRate
    } = req.body;

    if (!title || !categoryId || !subCategoryId || !productCategoryId) {
      throw new Error("Missing required product fields");
    }

    const parsedPrice = parseJSON(price, "price");
    const parsedSpecs = parseJSON(specs, "specs");
    const parsedVariants = parseJSON(variants, "variants");
    const parsedAppliedOffers = appliedOffers
      ? parseJSON(appliedOffers, "appliedOffers")
      : [];

    if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
      throw new Error("At least one variant is required");
    }

    /* -------- MAP VARIANT IMAGES -------- */
    const variantImagesMap = {};

    for (const file of req.files || []) {
      const match = file.fieldname.match(/^variantImages_(\d+)$/);
      if (!match) continue;

      const index = Number(match[1]);

      if (!variantImagesMap[index]) variantImagesMap[index] = [];

      if (variantImagesMap[index].length >= 5) {
        throw new Error(`Max 5 images allowed for variant ${index}`);
      }

      // ✅ Cloudinary URL
      variantImagesMap[index].push(file.path);
    }
    if (gstRate === undefined || gstRate === null) {
  throw new Error("GST rate is required");
}
const numericGst = Number(gstRate);

if (isNaN(numericGst)) {
  throw new Error("Invalid GST rate");
}



    /* ---------------- CREATE PRODUCT ---------------- */
    const product = await Product.create(
      {
        title,
        brandName,
        categoryId: Number(categoryId),
        subCategoryId: Number(subCategoryId),
        productCategoryId: Number(productCategoryId),
        description,
        badge,
        gstRate: numericGst
      },
      { transaction: t },
    );

    /* ---------------- PRICE ---------------- */
    await ProductPrice.create(
      {
        productId: product.id,
        mrp: parsedPrice.mrp,
        sellingPrice: parsedPrice.sellingPrice,
        discountPercentage:
          parsedPrice.mrp > parsedPrice.sellingPrice
            ? Math.round(
                ((parsedPrice.mrp - parsedPrice.sellingPrice) /
                  parsedPrice.mrp) *
                  100,
              )
            : 0,
        currency: parsedPrice.currency || "INR",
      },
      { transaction: t },
    );

    /* ---------------- SPECS ---------------- */
    const specRows = Object.keys(parsedSpecs).map((key) => ({
      productId: product.id,
      specKey: key,
      specValue: Array.isArray(parsedSpecs[key])
        ? parsedSpecs[key].join(", ")
        : parsedSpecs[key],
    }));

    if (specRows.length) {
      await ProductSpec.bulkCreate(specRows, { transaction: t });
    }

    /* ---------------- VARIANTS ---------------- */
    for (let i = 0; i < parsedVariants.length; i++) {
      const v = parsedVariants[i];

      const variant = await ProductVariant.create(
        {
          productId: product.id,
          variantCode: v.variantCode,
          colorName: v.color?.name,
          colorCode: v.color?.code,
          swatch: v.color?.swatch || null,
          totalStock: v.totalStock || 0,
          stockStatus: v.stockStatus || "Out of Stock",
        },
        { transaction: t },
      );

      /* -------- IMAGES -------- */
      const images = variantImagesMap[i] || [];

      if (images.length) {
        await VariantImage.bulkCreate(
          images.map((img) => ({
            variantId: variant.id,
            imageUrl: img,
          })),
          { transaction: t },
        );
      }

      /* -------- SIZES -------- */
      if (Array.isArray(v.sizes) && v.sizes.length) {
        await VariantSize.bulkCreate(
          v.sizes.map((s) => ({
            variantId: variant.id,
            size: s.size,
            stock: s.stock,
            chest: s.chest ?? null,
          })),
          { transaction: t },
        );
      }
    }

    /* ---------------- OFFERS ---------------- */
    if (parsedAppliedOffers.length) {
      await OfferApplicableProduct.bulkCreate(
        parsedAppliedOffers.map((o) => ({
          productId: product.id,
          offerId: o.offerId,
          subOfferId: o.subOfferId,
        })),
        { transaction: t },
      );
    }

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Product created successfully with Cloudinary images",
      productId: product.id,
    });
  } catch (error) {
    await t.rollback();

    console.error("CREATE PRODUCT ERROR:", error);

    console.error("CREATE PRODUCT ERROR FULL:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Product creation failed",
      error: error?.errors || null, // Sequelize validation errors
    });
  }
};
