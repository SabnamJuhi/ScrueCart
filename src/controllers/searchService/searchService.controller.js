const { Op } = require("sequelize");

const Product = require("../../models/products/product.model");
const Category = require("../../models/category/category.model");
const SubCategory = require("../../models/category/subcategory.model");
const ProductCategory = require("../../models/category/productCategory.model");

exports.searchProducts = async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: "Search keyword is required",
      });
    }

    const products = await Product.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.iLike]: `%${keyword}%` } },
          { "$Category.name$": { [Op.iLike]: `%${keyword}%` } },
          { "$SubCategory.name$": { [Op.iLike]: `%${keyword}%` } },
          { "$ProductCategory.name$": { [Op.iLike]: `%${keyword}%` } },
        ],
      },
      include: [
        {
          model: Category,
          attributes: ["id", "name"],
        },
        {
          model: SubCategory,
          attributes: ["id", "name"],
        },
        {
          model: ProductCategory,
          attributes: ["id", "name"],
        },
      ],
      distinct: true,
    });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
};