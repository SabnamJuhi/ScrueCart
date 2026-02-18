const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class Product extends Model {}

Product.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sku: {
      type: DataTypes.VIRTUAL,
      get() {
        const categoryCode = this.Category?.code || "CAT";
        const subCode = this.SubCategory?.code || "SUB";
        const prodCatCode = this.ProductCategory?.code || "PRD";

        const paddedId = String(this.id).padStart(6, "0");

        return `${categoryCode}-${subCode}-${prodCatCode}-${paddedId}`;
      },
    },

    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    subCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    productCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    brandName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    badge: {
      type: DataTypes.STRING,
    },
    gstRate: {
      type: DataTypes.DECIMAL(5, 2), // 5.00, 12.00, 18.00, 28.00
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "Product",
    tableName: "products",
  },
);

module.exports = Product;