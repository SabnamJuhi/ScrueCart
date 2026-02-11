// const { Op } = require("sequelize");


// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");


// exports.getFilteredProducts = async (req, res) => {
//   try {
//     const {
//       categoryId,
//       subCategoryId,
//       productCategoryId,
//       brands,
//       colors,
//       sizes,
//       minPrice,
//       maxPrice,
//       inStock,
//       specs,
//     } = req.query;

//     /* ---------------- HELPER ---------------- */
//     const toArray = (val) => (val ? val.split(",").map((v) => v.trim()) : []);

//     /* ---------------- PRODUCT WHERE ---------------- */
//     const productWhere = {
//       isActive: true,
//     };

//     if (categoryId) {
//       productWhere.categoryId = { [Op.in]: toArray(categoryId) };
//     }

//     if (subCategoryId) {
//       productWhere.subCategoryId = { [Op.in]: toArray(subCategoryId) };
//     }

//     if (productCategoryId) {
//       productWhere.productCategoryId = { [Op.in]: toArray(productCategoryId) };
//     }

//     if (brands) {
//       productWhere.brandName = { [Op.in]: toArray(brands) };
//     }

//     /* ---------------- PRICE WHERE ---------------- */
//     const priceWhere = {};

//     if (minPrice || maxPrice) {
//       priceWhere.sellingPrice = {};
//       if (minPrice) priceWhere.sellingPrice[Op.gte] = Number(minPrice);
//       if (maxPrice) priceWhere.sellingPrice[Op.lte] = Number(maxPrice);
//     }

//     /* ---------------- VARIANT WHERE ---------------- */
//     const variantWhere = {};

//     if (colors) {
//       variantWhere.colorName = { [Op.in]: toArray(colors) };
//     }

//     if (inStock === "true") {
//       variantWhere.totalStock = { [Op.gt]: 0 };
//     }

//     /* ---------------- SIZE WHERE ---------------- */
//     const sizeWhere = {};

//     if (sizes) {
//       sizeWhere.size = { [Op.in]: toArray(sizes) };
//       if (inStock === "true") {
//         sizeWhere.stock = { [Op.gt]: 0 };
//       }
//     }

//     /* ---------------- SPECS WHERE ---------------- */
//     const specIncludes = [];

//     if (specs && typeof specs === "object") {
//       Object.entries(specs).forEach(([key, value]) => {
//         const values = toArray(value);

//         specIncludes.push({
//           model: ProductSpec,
//           as: "specs",
//           where: {
//             specKey: key,
//             specValue: {
//               [Op.or]: values.map((v) => ({ [Op.like]: `%${v}%` })),
//             },
//           },
//           required: true,
//         });
//       });
//     }

//     /* ---------------- FINAL QUERY ---------------- */
//     const products = await Product.findAll({
//       where: productWhere,

//       include: [
//         {
//           model: ProductPrice,
//           as: "price",
//           where: priceWhere,
//           required: Object.keys(priceWhere).length > 0,
//         },

//         {
//           model: ProductVariant,
//           as: "variants",
//           where: variantWhere,
//           required: Object.keys(variantWhere).length > 0,

//           include: [
//             {
//               model: VariantSize,
//               as: "sizes",
//               where: sizeWhere,
//               required:
//                 Object.keys(variantWhere).length > 0 ||
//                 Object.keys(sizeWhere).length > 0,
//             },
//           ],
//         },

//         ...specIncludes,
//       ],

//       distinct: true,
//     });

//     return res.json({
//       success: true,
//       count: products.length,
//       data: products,
//     });
//   } catch (error) {
//     console.error("FILTER PRODUCT ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };














const { Op } = require("sequelize");

const Product = require("../../models/products/product.model");
const ProductPrice = require("../../models/products/price.model");
const ProductSpec = require("../../models/products/productSpec.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantSize = require("../../models/productVariants/variantSize.model");
const VariantImage = require("../../models/productVariants/variantImage.model");
const Category = require("../../models/category/category.model");
const SubCategory = require("../../models/category/subcategory.model");


// exports.getFilteredProducts = async (req, res) => {
//   try {
//     const {
//       categoryId,
//       subCategoryId,
//       productCategoryId,
//       brands,
//       colors,
//       sizes,
//       minPrice,
//       maxPrice,
//       inStock,
//       specs,
//     } = req.query;

//     /* ---------- helper ---------- */
//     const toArray = (val) =>
//       val ? val.split(",").map((v) => v.trim()) : [];

//     /* ---------- product where ---------- */
//     const productWhere = { isActive: true };

//     if (categoryId)
//       productWhere.categoryId = { [Op.in]: toArray(categoryId).map(Number) };
//     if (subCategoryId)
//       productWhere.subCategoryId = { [Op.in]: toArray(subCategoryId).map(Number) };
//     if (productCategoryId)
//       productWhere.productCategoryId = { [Op.in]: toArray(productCategoryId).map(Number) };
//     if (brands) productWhere.brandName = { [Op.in]: toArray(brands) };

//     /* ---------- price ---------- */
//     const priceWhere = {};
//     if (minPrice || maxPrice) {
//       priceWhere.sellingPrice = {};
//       if (minPrice) priceWhere.sellingPrice[Op.gte] = Number(minPrice);
//       if (maxPrice) priceWhere.sellingPrice[Op.lte] = Number(maxPrice);
//     }

//     /* ---------- specs ---------- */
//     const specIncludes = [];
//     if (specs && typeof specs === "object") {
//       Object.entries(specs).forEach(([key, value]) => {
//         const values = toArray(value);
//         specIncludes.push({
//           model: ProductSpec,
//           as: "specs",
//           where: {
//             specKey: key,
//             specValue: { [Op.or]: values.map((v) => ({ [Op.like]: `%${v}%` })) },
//           },
//           required: true,
//         });
//       });
//     }

//     /* ---------- final query ---------- */
//     const products = await Product.findAll({
//       where: productWhere,

//       include: [
//         // PRICE
//         {
//           model: ProductPrice,
//           as: "price",
//           where: Object.keys(priceWhere).length ? priceWhere : undefined,
//           required: Object.keys(priceWhere).length > 0,
//         },

//         // VARIANTS → IMAGES → SIZES
//         {
//           model: ProductVariant,
//           as: "variants",
//           required: false, // allow products even if variant filters don't match
//           include: [
//             // IMAGES (always include)
//             {
//               model: VariantImage,
//               as: "images",
//               attributes: ["id", "imageUrl"],
//               required: false,
//             },
//             // SIZES
//             {
//               model: VariantSize,
//               as: "sizes",
//               required: false,
//             },
//           ],
//         },

//         ...specIncludes,
//       ],

//       order: [["createdAt", "DESC"]],
//       distinct: true,
//     });

//     /* ---------- POST-FILTERING (optional) ---------- */
//     let filteredProducts = products;

//     // filter by colors if provided
//     if (colors) {
//       const colorArray = toArray(colors).map((c) => c.toLowerCase());
//       filteredProducts = filteredProducts.filter((p) =>
//         p.variants.some((v) => colorArray.includes(v.colorName.toLowerCase()))
//       );
//     }

//     // filter by sizes if provided
//     if (sizes) {
//       const sizeArray = toArray(sizes);
//       filteredProducts = filteredProducts.filter((p) =>
//         p.variants.some((v) =>
//           v.sizes.some((s) => sizeArray.includes(s.size))
//         )
//       );
//     }

//     // filter by inStock if requested
//     if (inStock === "true") {
//       filteredProducts = filteredProducts.filter((p) =>
//         p.variants.some((v) =>
//           v.totalStock > 0 && v.sizes.some((s) => s.stock > 0)
//         )
//       );
//     }

//     return res.json({
//       success: true,
//       count: filteredProducts.length,
//       data: filteredProducts,
//     });
//   } catch (error) {
//     console.error("FILTER PRODUCT ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };




exports.getFilteredProducts = async (req, res) => {
  try {
    const {
      categoryId,
      subCategoryId,
      productCategoryId,
      brands,
      colors,
      sizes,
      minPrice,
      maxPrice,
      inStock,
      specs,
    } = req.query;

    const toArray = (val) =>
      val ? val.split(",").map((v) => v.trim()) : [];

    /* ---------- product where ---------- */
    const productWhere = { isActive: true };

    if (categoryId)
      productWhere.categoryId = { [Op.in]: toArray(categoryId).map(Number) };

    if (subCategoryId)
      productWhere.subCategoryId = { [Op.in]: toArray(subCategoryId).map(Number) };

    if (productCategoryId)
      productWhere.productCategoryId = { [Op.in]: toArray(productCategoryId).map(Number) };

    if (brands)
      productWhere.brandName = { [Op.in]: toArray(brands) };

    /* ---------- price ---------- */
    const priceWhere = {};
    if (minPrice || maxPrice) {
      priceWhere.sellingPrice = {};
      if (minPrice) priceWhere.sellingPrice[Op.gte] = Number(minPrice);
      if (maxPrice) priceWhere.sellingPrice[Op.lte] = Number(maxPrice);
    }

    /* ---------- spec FILTER include (for WHERE) ---------- */
    const specFilterIncludes = [];

    if (specs && typeof specs === "object") {
      Object.entries(specs).forEach(([key, value]) => {
        const values = toArray(value);

        specFilterIncludes.push({
          model: ProductSpec,
          as: "specs",
          attributes: [], // ⚠️ used only for filtering
          where: {
            specKey: key,
            specValue: {
              [Op.or]: values.map((v) => ({ [Op.like]: `%${v}%` })),
            },
          },
          required: true,
        });
      });
    }

    /* ---------- MAIN QUERY ---------- */
    const products = await Product.findAll({
      where: productWhere,

      include: [
        /* CATEGORY */
        {
          model: Category,
          as: "Category",
          attributes: ["id", "name"],
        },

        /* SUBCATEGORY */
        {
          model: SubCategory,
          as: "SubCategory",
          attributes: ["id", "name"],
        },

        /* PRICE */
        {
          model: ProductPrice,
          as: "price",
          where: Object.keys(priceWhere).length ? priceWhere : undefined,
          required: Object.keys(priceWhere).length > 0,
        },

        /* ALL SPECS (always returned) */
        {
          model: ProductSpec,
          as: "specs",
          attributes: ["id", "specKey", "specValue"],
          required: false,
        },

        /* VARIANTS */
        {
          model: ProductVariant,
          as: "variants",
          required: false,
          include: [
            {
              model: VariantImage,
              as: "images",
              attributes: ["id", "imageUrl"],
              required: false,
            },
            {
              model: VariantSize,
              as: "sizes",
              required: false,
            },
          ],
        },

        /* SPEC FILTERING JOIN */
        ...specFilterIncludes,
      ],

      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    /* ---------- POST FILTERS ---------- */
    let filteredProducts = products;

    if (colors) {
      const colorArray = toArray(colors).map((c) => c.toLowerCase());
      filteredProducts = filteredProducts.filter((p) =>
        p.variants.some((v) =>
          colorArray.includes((v.colorName || "").toLowerCase())
        )
      );
    }

    if (sizes) {
      const sizeArray = toArray(sizes);
      filteredProducts = filteredProducts.filter((p) =>
        p.variants.some((v) =>
          v.sizes.some((s) => sizeArray.includes(s.size))
        )
      );
    }

    if (inStock === "true") {
      filteredProducts = filteredProducts.filter((p) =>
        p.variants.some(
          (v) => v.totalStock > 0 && v.sizes.some((s) => s.stock > 0)
        )
      );
    }

    return res.json({
      success: true,
      count: filteredProducts.length,
      data: filteredProducts,
    });
  } catch (error) {
    console.error("FILTER PRODUCT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
