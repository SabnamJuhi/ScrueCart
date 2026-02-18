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
    const toArray = (val) => (val ? val.split(",").map((v) => v.trim()) : []);

    /* ---------- product where ---------- */
    const productWhere = { isActive: true };

    if (categoryId)
      productWhere.categoryId = { [Op.in]: toArray(categoryId).map(Number) };

    if (subCategoryId)
      productWhere.subCategoryId = {
        [Op.in]: toArray(subCategoryId).map(Number),
      };

    if (productCategoryId)
      productWhere.productCategoryId = {
        [Op.in]: toArray(productCategoryId).map(Number),
      };

    if (brands) productWhere.brandName = { [Op.in]: toArray(brands) };

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
          attributes: [], //  used only for filtering
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
          colorArray.includes((v.colorName || "").toLowerCase()),
        ),
      );
    }

    if (sizes) {
      const sizeArray = toArray(sizes);
      filteredProducts = filteredProducts.filter((p) =>
        p.variants.some((v) => v.sizes.some((s) => sizeArray.includes(s.size))),
      );
    }

    if (inStock === "true") {
      filteredProducts = filteredProducts.filter((p) =>
        p.variants.some(
          (v) => v.totalStock > 0 && v.sizes.some((s) => s.stock > 0),
        ),
      );
    }
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


  const finalProducts = filteredProducts.map((p) => {
  const productWishlisted = !!wishlistedMap[p.id];

  return {
    ...p.toJSON(),
    isWishlisted: productWishlisted,        
    wishlistedVariants: wishlistedMap[p.id] || [], 
  };
});


    return res.json({
      success: true,
      count: finalProducts.length,
      data: finalProducts,
    });
  } catch (error) {
    console.error("FILTER PRODUCT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
