const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const DeliveryBoy = sequelize.define(
  "DeliveryBoy",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    vehicleNumber: DataTypes.STRING,
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "delivery_boys",
    timestamps: true,
  }
);

module.exports = DeliveryBoy;
