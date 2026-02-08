const { Model, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

class OrderAddress extends Model {}

OrderAddress.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    addressLine: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
     country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Added Shipping Type field
    shippingType: {
      type: DataTypes.ENUM("delivery", "pickup"),
      allowNull: false,
      defaultValue: "delivery",
    },
  },
  {
    sequelize,
    modelName: "OrderAddress",
    tableName: "order_addresses",
  }
);

module.exports = OrderAddress;