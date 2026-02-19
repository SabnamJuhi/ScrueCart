const xlsx = require("xlsx");
const sequelize = require("../../config/db");

const Product = require("../../models/products/product.model");
const ProductPrice = require("../../models/products/price.model");
const ProductSpec = require("../../models/products/productSpec.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantSize = require("../../models/productVariants/variantSize.model");

/**
 * EXPECTED EXCEL COLUMNS:
 * title | brandName | categoryId | subCategoryId | productCategoryId |
 * description | badge | gstRate | mrp | sellingPrice |
 * colorName | colorCode | size | stock | chest
 */

exports.bulkCreateProductsFromExcel = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    if (!req.file) throw new Error("Excel file is required");

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = xlsx.utils.sheet_to_json(sheet);

    if (!rows.length) throw new Error("Excel sheet is empty");

    const createdProducts = [];

    for (const row of rows) {
      const {
        title,
        brandName,
        categoryId,
        subCategoryId,
        productCategoryId,
        description,
        badge,
        gstRate,
        mrp,
        sellingPrice,
        colorName,
        colorCode,
        size,
        stock,
        chest,
         ...specColumns 
      } = row;

      if (!title || !categoryId || !subCategoryId || !productCategoryId) {
        throw new Error(`Missing required fields for product: ${title}`);
      }

      const numericGst = Number(gstRate);
      if (isNaN(numericGst)) throw new Error(`Invalid GST for ${title}`);

      /* -------- CREATE PRODUCT -------- */
      const product = await Product.create(
        {
          title,
          brandName,
          categoryId: Number(categoryId),
          subCategoryId: Number(subCategoryId),
          productCategoryId: Number(productCategoryId),
          description,
          badge,
          gstRate: numericGst,
        },
        { transaction: t }
      );

      /* -------- PRICE -------- */
      await ProductPrice.create(
        {
          productId: product.id,
          mrp: Number(mrp),
          sellingPrice: Number(sellingPrice),
          discountPercentage:
            mrp > sellingPrice
              ? Math.round(((mrp - sellingPrice) / mrp) * 100)
              : 0,
          currency: "INR",
        },
        { transaction: t }
      );
       /* -------- PRODUCT SPECS (NEW) -------- */
      const specRows = Object.entries(specColumns)
        .filter(([key, value]) => value !== undefined && value !== "")
        .map(([key, value]) => ({
          productId: product.id,
          specKey: key,
          specValue: String(value),
        }));

      if (specRows.length) {
        await ProductSpec.bulkCreate(specRows, { transaction: t });
      }

      /* -------- VARIANT -------- */
      const variant = await ProductVariant.create(
        {
          productId: product.id,
          variantCode: `VAR-${product.id}`,
          colorName,
          colorCode,
          totalStock: Number(stock) || 0,
          stockStatus: stock > 0 ? "In Stock" : "Out of Stock",
        },
        { transaction: t }
      );

      /* -------- SIZE -------- */
      await VariantSize.create(
        {
          variantId: variant.id,
          size,
          stock: Number(stock) || 0,
          chest: chest || null,
        },
        { transaction: t }
      );

      createdProducts.push(product.id);
    }

    await t.commit();

    return res.json({
      success: true,
      message: "Bulk products created successfully",
      totalCreated: createdProducts.length,
      productIds: createdProducts,
    });
  } catch (error) {
    await t.rollback();

    console.error("BULK UPLOAD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
