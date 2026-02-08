const { Model, DataTypes } = require("sequelize")
const sequelize = require("../../config/db")

class Product extends Model {}

Product.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    subCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    productCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
     description: {
      type: DataTypes.TEXT
    },
     brandName: {
      type: DataTypes.STRING,
      allowNull: false   
    },
    badge: {
      type: DataTypes.STRING
    },
    
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    modelName: "Product",
    tableName: "products"
  },
)

module.exports = Product