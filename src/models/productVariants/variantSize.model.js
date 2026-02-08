// models/variantSize.model.js
const { Model, DataTypes } = require("sequelize")
const sequelize = require("../../config/db")

class VariantSize extends Model {}

VariantSize.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    variantId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    size: {
      type: DataTypes.STRING,
      allowNull: false
    },
    chest: {
      type: DataTypes.STRING
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  },
  {
    sequelize,
    tableName: "variant_sizes"
  }
)

module.exports = VariantSize
