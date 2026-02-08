const { Model, DataTypes } = require("sequelize")
const sequelize = require("../../config/db")

class ProductPrice extends Model {}

ProductPrice.init(
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
    mrp: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    sellingPrice: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    discountPercentage: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: "INR"
    }
  },
  {
    sequelize,
    modelName: "ProductPrice",
    tableName: "product_prices"
  }
)

module.exports = ProductPrice
