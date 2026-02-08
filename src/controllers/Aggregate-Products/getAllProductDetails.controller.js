const sequelize = require("../../config/db");


const Product = require("../../models/products/product.model");
const ProductPrice = require("../../models/products/price.model");
const ProductSpec = require("../../models/products/productSpec.model");
const ProductVariant = require("../../models/productVariants/productVariant.model");
const VariantImage = require("../../models/productVariants/variantImage.model");
const VariantSize = require("../../models/productVariants/variantSize.model");


const Offer = require("../../models/offers/offer.model");
const OfferSub = require("../../models/offers/offerSub.model");
const OfferApplicableCategory = require("../../models/offers/offerApplicableCategory.model");
const OfferApplicableProduct = require("../../models/offers/offerApplicableProduct.model");


const {
Category,
SubCategory,
ProductCategory,
ProductRating,
ProductReview,
} = require("../../models");

exports.getAllProductsDetails = async (req, res) => {
  try {
    const products = await Product.findAll({
      attributes: [
        "id",
        "title",
        "description",
        "brandName",
        "badge",
        "isActive",
        "createdAt",
      ],

      include: [
        // CATEGORY HIERARCHY
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
          model: ProductCategory,
          as: "ProductCategory",
          attributes: ["id", "name"],
        },

        // PRICE

        {
          model: ProductPrice,
          as: "price",
        },

        // SPECS
        {
          model: ProductSpec,
          as: "specs",
        },

        // VARIANTS → IMAGES → SIZES

        {
          model: ProductVariant,
          as: "variants",
          attributes: [
            "id",
            "variantCode",
            "colorName",
            "colorCode",
            "colorSwatch",
            "totalStock",
            "stockStatus",
            "isActive",
          ],
          include: [
            {
              model: VariantImage,
              as: "images",
              attributes: ["id", "imageUrl"],
            },
            {
              model: VariantSize,
              as: "sizes",
              attributes: ["id", "size", "stock", "chest"],
            },
          ],
        },

        // OFFERS

        {
          model: OfferApplicableProduct,
          as: "offerApplicableProducts",
          attributes: ["id", "offerId", "subOfferId"],
          include: [
            {
              model: Offer,
              as: "offerDetails",
              attributes: [
                "id",
                "offerCode",
                "title",
                "festival",
                "description",
                "startDate",
                "endDate",
                "isActive",
              ],
              include: [
                {
                  model: OfferSub,
                  as: "subOffers",
                  attributes: [
                    "id",
                    "discountType",
                    "discountValue",
                    "maxDiscount",
                  ],
                },
              ],
            },
          ],
        },
      ],

      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("GET ALL PRODUCTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};