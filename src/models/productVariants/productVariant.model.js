// models/productVariant.model.js
const { Model, DataTypes } = require("sequelize")
const sequelize = require("../../config/db")

class ProductVariant extends Model {}

ProductVariant.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    productId: {
      type: DataTypes.INTEGER, 
      allowNull: false
    },
    variantCode: {
      type: DataTypes.STRING, 
      allowNull: false,
      // unique: true
    },
    colorName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    colorCode: {
      type: DataTypes.STRING,
      allowNull: false
    },
    colorSwatch: {
      type: DataTypes.STRING
    },
    totalStock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    stockStatus: {
      type: DataTypes.STRING,
      defaultValue: "In Stock"
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: "product_variants"
  }
)

module.exports = ProductVariant
