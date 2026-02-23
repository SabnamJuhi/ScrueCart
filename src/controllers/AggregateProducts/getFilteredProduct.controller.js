// const { Op } = require("sequelize");

// const Product = require("../../models/products/product.model");
// const ProductPrice = require("../../models/products/price.model");
// const ProductSpec = require("../../models/products/productSpec.model");
// const ProductVariant = require("../../models/productVariants/productVariant.model");
// const VariantSize = require("../../models/productVariants/variantSize.model");
// const VariantImage = require("../../models/productVariants/variantImage.model");
// const Category = require("../../models/category/category.model");
// const SubCategory = require("../../models/category/subcategory.model");
// const Wishlist = require("../../models/wishlist.model");
// const {
//   getPaginationOptions,
//   formatPagination,
// } = require("../../utils/paginate");

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
//     const userId = req.user?.id;
//     const paginationOptions = getPaginationOptions(req.query);
//     const { limit, offset, currentPage } = paginationOptions;
//     const toArray = (val) => (val ? val.split(",").map((v) => v.trim()) : []);

//     /* ---------- product where ---------- */
//     const productWhere = { isActive: true };

//     /* ---------- CATEGORY + SUBCATEGORY + PRODUCTCATEGORY (FIXED LOGIC) ---------- */

// const categories = toArray(categoryId).map(Number);
// const subCategories = toArray(subCategoryId).map(Number);
// const productCategories = toArray(productCategoryId).map(Number);

// if (categories.length) {
//   const orConditions = [];

//   categories.forEach((catId) => {
//     const condition = { categoryId: catId };

//     // Apply subCategory & productCategory filters ONLY if they exist
//     if (subCategories.length) {
//       condition.subCategoryId = { [Op.in]: subCategories };
//     }

//     if (productCategories.length) {
//       condition.productCategoryId = { [Op.in]: productCategories };
//     }

//     orConditions.push(condition);
//   });

//   productWhere[Op.or] = orConditions;
// }

//     if (brands) productWhere.brandName = { [Op.in]: toArray(brands) };

//     /* ---------- price ---------- */
//     const priceWhere = {};
//     if (minPrice || maxPrice) {
//       priceWhere.sellingPrice = {};
//       if (minPrice) priceWhere.sellingPrice[Op.gte] = Number(minPrice);
//       if (maxPrice) priceWhere.sellingPrice[Op.lte] = Number(maxPrice);
//     }

//     /* ---------- spec FILTER include (for WHERE) ---------- */
//     const specFilterIncludes = [];

//     if (specs && typeof specs === "object") {
//       Object.entries(specs).forEach(([key, value]) => {
//         const values = toArray(value);

//         specFilterIncludes.push({
//           model: ProductSpec,
//           as: "specs",
//           attributes: [], //  used only for filtering
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

//     /* ---------- MAIN QUERY ---------- */
//     const products = await Product.findAll({
//       where: productWhere,
//       attributes: [
//         "id",
//         "sku",
//         "title",
//         "brandName",
//         "badge",
//         "isActive",
//         "createdAt",
//       ],
//       include: [
//         /* CATEGORY */
//         {
//           model: Category,
//           as: "Category",
//           attributes: ["id", "name"],
//         },

//         /* SUBCATEGORY */
//         {
//           model: SubCategory,
//           as: "SubCategory",
//           attributes: ["id", "name"],
//         },

//         /* PRICE */
//         {
//           model: ProductPrice,
//           as: "price",
//           where: Object.keys(priceWhere).length ? priceWhere : undefined,
//           required: Object.keys(priceWhere).length > 0,
//         },

//         /* ALL SPECS (always returned) */
//         {
//           model: ProductSpec,
//           as: "specs",
//           attributes: ["id", "specKey", "specValue"],
//           required: false,
//         },

//         /* VARIANTS */
//         {
//           model: ProductVariant,
//           as: "variants",
//           required: false,
//           include: [
//             {
//               model: VariantImage,
//               as: "images",
//               attributes: ["id", "imageUrl"],
//               required: false,
//             },
//             {
//               model: VariantSize,
//               as: "sizes",
//               required: false,
//             },
//           ],
//         },

//         /* SPEC FILTERING JOIN */
//         ...specFilterIncludes,
//       ],

//       order: [["createdAt", "DESC"]],
//       distinct: true,
//     });

//     /* ---------- POST FILTERS ---------- */
//     let filteredProducts = products;

//     if (colors) {
//       const colorArray = toArray(colors).map((c) => c.toLowerCase());
//       filteredProducts = filteredProducts.filter((p) =>
//         p.variants.some((v) =>
//           colorArray.includes((v.colorName || "").toLowerCase()),
//         ),
//       );
//     }

//     if (sizes) {
//       const sizeArray = toArray(sizes);
//       filteredProducts = filteredProducts.filter((p) =>
//         p.variants.some((v) => v.sizes.some((s) => sizeArray.includes(s.size))),
//       );
//     }

//     if (inStock === "true") {
//       filteredProducts = filteredProducts.filter((p) =>
//         p.variants.some(
//           (v) => v.totalStock > 0 && v.sizes.some((s) => s.stock > 0),
//         ),
//       );
//     }
//     let wishlistedMap = {};

//     if (userId) {
//       const wishlist = await Wishlist.findAll({
//         where: { userId },
//         attributes: ["productId", "variantId"],
//       });

//       wishlist.forEach((w) => {
//         if (!wishlistedMap[w.productId]) {
//           wishlistedMap[w.productId] = [];
//         }
//         wishlistedMap[w.productId].push(w.variantId);
//       });
//     }

//     const finalProducts = filteredProducts.map((p) => {
//       const productWishlisted = !!wishlistedMap[p.id];
//             return {
//             ...p.toJSON(),
//             isWishlisted: productWishlisted,
//             wishlistedVariants: wishlistedMap[p.id] || [],
//       };
//     });
//      /* ---------- MANUAL PAGINATION ---------- */
//     const totalCount = finalProducts.length;

//     const paginatedRows = finalProducts.slice(offset, offset + limit);

//     const response = formatPagination(
//       { count: totalCount, rows: paginatedRows },
//       currentPage,
//       limit
//     );

//     return res.json({
//       success: true,
//       ...response,
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
const Wishlist = require("../../models/wishlist.model");
const {
  getPaginationOptions,
  formatPagination,
} = require("../../utils/paginate");

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

    const userId = req.user?.id;
    const paginationOptions = getPaginationOptions(req.query);
    const { limit, offset, currentPage } = paginationOptions;

    const toArray = (val) =>
      val ? val.split(",").map((v) => v.trim()) : [];

    const productWhere = {};

if (req.query.isActive !== undefined) {
  productWhere.isActive = req.query.isActive === "true";
}

    const categories = toArray(categoryId).map(Number);
    const subCategories = toArray(subCategoryId).map(Number);
    const productCategories = toArray(productCategoryId).map(Number);

    /* ---------- FIXED CATEGORY LOGIC ---------- */
    if (categories.length) {
      const orConditions = categories.map((catId) => {
        const condition = { categoryId: catId };

        // Apply subCategory ONLY if provided
        if (subCategories.length) {
          condition.subCategoryId = { [Op.in]: subCategories };
        }

        // Apply productCategory ONLY if provided
        if (productCategories.length) {
          condition.productCategoryId = { [Op.in]: productCategories };
        }

        return condition;
      });

      productWhere[Op.or] = orConditions;
    }

    if (brands) {
      productWhere.brandName = { [Op.in]: toArray(brands) };
    }

    /* ================= PRICE FILTER ================= */
    const priceWhere = {};
    if (minPrice || maxPrice) {
      priceWhere.sellingPrice = {};
      if (minPrice) priceWhere.sellingPrice[Op.gte] = Number(minPrice);
      if (maxPrice) priceWhere.sellingPrice[Op.lte] = Number(maxPrice);
    }

    /* ================= SPEC FILTER ================= */
    const specFilterIncludes = [];

    if (specs && typeof specs === "object") {
      Object.entries(specs).forEach(([key, value]) => {
        const values = toArray(value);

        specFilterIncludes.push({
          model: ProductSpec,
          as: "specs",
          attributes: [],
          where: {
            specKey: key,
            specValue: {
              [Op.or]: values.map((v) => ({
                [Op.like]: `%${v}%`,
              })),
            },
          },
          required: true,
        });
      });
    }

    /* ================= MAIN QUERY ================= */
    const products = await Product.findAll({
      where: productWhere,
      attributes: [
        "id",
        "sku",
        "title",
        "brandName",
        "badge",
        "isActive",
        "createdAt",
      ],
      include: [
        {
          model: Category,
          as: "Category",
          attributes: ["id", "name"],
        },
        {
          model: SubCategory,
          as: "SubCategory",
          attributes: ["id", "name"],
        },
        {
          model: ProductPrice,
          as: "price",
          where: Object.keys(priceWhere).length
            ? priceWhere
            : undefined,
          required: Object.keys(priceWhere).length > 0,
        },
        {
          model: ProductSpec,
          as: "specs",
          attributes: ["id", "specKey", "specValue"],
          required: false,
        },
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
        ...specFilterIncludes,
      ],
      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    /* ================= POST FILTERS ================= */
    let filteredProducts = products;

    if (colors) {
      const colorArray = toArray(colors).map((c) =>
        c.toLowerCase(),
      );

      filteredProducts = filteredProducts.filter((p) =>
        p.variants.some((v) =>
          colorArray.includes(
            (v.colorName || "").toLowerCase(),
          ),
        ),
      );
    }

    if (sizes) {
      const sizeArray = toArray(sizes);

      filteredProducts = filteredProducts.filter((p) =>
        p.variants.some((v) =>
          v.sizes.some((s) =>
            sizeArray.includes(s.size),
          ),
        ),
      );
    }

    if (inStock === "true") {
      filteredProducts = filteredProducts.filter((p) =>
        p.variants.some(
          (v) =>
            v.totalStock > 0 &&
            v.sizes.some((s) => s.stock > 0),
        ),
      );
    }

    /* ================= WISHLIST ================= */
    let wishlistedMap = {};

    if (userId) {
      const wishlist = await Wishlist.findAll({
        where: { userId },
        attributes: ["productId", "variantId"],
      });

      wishlist.forEach((w) => {
        if (!wishlistedMap[w.productId]) {
          wishlistedMap[w.productId] = [];
        }
        wishlistedMap[w.productId].push(w.variantId);
      });
    }

    const finalProducts = filteredProducts.map((p) => ({
      ...p.toJSON(),
      isWishlisted: !!wishlistedMap[p.id],
      wishlistedVariants: wishlistedMap[p.id] || [],
    }));

    /* ================= PAGINATION ================= */
    const totalCount = finalProducts.length;
    const paginatedRows = finalProducts.slice(
      offset,
      offset + limit,
    );

    const response = formatPagination(
      { count: totalCount, rows: paginatedRows },
      currentPage,
      limit,
    );

    return res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error("FILTER PRODUCT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};