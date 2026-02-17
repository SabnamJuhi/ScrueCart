const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const DeliveryBoy = require("../../models/orders/deliveryBoy.model");
const { Order, OrderAddress } = require("../../models");
const { hashPassword, comparePassword } = require("../../utils/password");
const { generateToken } = require("../../utils/jwt");


/**
 * REGISTER DELIVERY BOY (Admin or Self)
 */
exports.registerDeliveryBoy = async (req, res) => {
  try {
    const { name, email, mobile, password, confirmPassword, area } = req.body;

    if (!name || !email || !mobile || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await DeliveryBoy.findOne({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res.status(409).json({ message: "Delivery boy already exists" });
    }

    // ❌ NO HASHING — store plain password
    const boy = await DeliveryBoy.create({
      name,
      email: normalizedEmail,
      mobile,
      password, // plain text
      area: area || null,
      status: "active",
    });

    res.status(201).json({
      success: true,
      deliveryBoy: {
        id: boy.id,
        name: boy.name,
        email: boy.email,
        mobile: boy.mobile,
        area: boy.area,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.loginDeliveryBoy = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // ✅ FIX: search by email column, NOT normalizedEmail
    const boy = await DeliveryBoy.findOne({
      where: { email: normalizedEmail },
    });

    if (!boy) throw new Error("Invalid credentials");

    // ❌ NO bcrypt — simple comparison
    if (boy.password !== password) {
      throw new Error("Invalid credentials");
    }

    if (boy.status !== "active") {
      throw new Error("Delivery boy account inactive");
    }

    const token = generateToken(boy.id);

    res.json({
      success: true,
      token,
      deliveryBoy: {
        id: boy.id,
        name: boy.name,
        email: boy.email,
        area: boy.area,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAllDeliveryBoys = async (req, res) => {
  try {
    const boys = await DeliveryBoy.findAll({
      attributes: { exclude: ["password"] }, // hide password
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      count: boys.length,
      data: boys,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


exports.updateDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, password, area, status } = req.body;

    const boy = await DeliveryBoy.findByPk(id);
    if (!boy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    // normalize email if provided
    let normalizedEmail = boy.email;
    if (email) {
      normalizedEmail = email.toLowerCase().trim();

      const existing = await DeliveryBoy.findOne({
        where: { email: normalizedEmail },
      });

      if (existing && existing.id !== boy.id) {
        return res.status(409).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    await boy.update({
      name: name ?? boy.name,
      email: normalizedEmail,
      mobile: mobile ?? boy.mobile,
      password: password ?? boy.password, // plain password
      area: area ?? boy.area,
      status: status ?? boy.status,
    });

    const updated = boy.toJSON();
    delete updated.password;

    res.json({
      success: true,
      message: "Delivery boy updated successfully",
      data: updated,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.deleteDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;

    const boy = await DeliveryBoy.findByPk(id);
    if (!boy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    await boy.destroy();

    res.json({
      success: true,
      message: "Delivery boy deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};



exports.getMyAssignedOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: {
        deliveryBoyId: req.deliveryBoy.id,
        status: "out_for_delivery",
      },
      include: [{ model: OrderAddress, as: "address" }],
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyDeliveryOtp = async (req, res) => {
  try {
    const { orderNumber, otp } = req.body;

    if (!orderNumber || !otp) {
      throw new Error("orderNumber and otp required");
    }

    const order = await Order.findOne({ where: { orderNumber } });
    if (!order) throw new Error("Order not found");

    // must belong to this delivery boy
    if (order.deliveryBoyId !== req.deliveryBoy.id) {
      throw new Error("Not authorized for this order");
    }

    if (order.status !== "out_for_delivery") {
      throw new Error("Order not in deliverable state");
    }

    // Simple OTP check
    if (order.otp !== otp) {
      throw new Error("Invalid OTP");
    }

    const updateData = {
      otpVerified: true,
      otp: null, // remove OTP after successful verification
      deliveredAt: new Date(),
    };

    // Update status based on payment method
    if (order.paymentMethod === "COD") {
      updateData.status = "delivered"; // COD: mark delivered
    } else {
      updateData.status = "completed"; // Online: mark completed
      updateData.completedAt = new Date();
      updateData.paymentStatus = "paid";
    }

    await order.update(updateData);

    res.json({
      success: true,
      message:
        order.paymentMethod === "COD"
          ? "Delivered. Collect cash & confirm payment."
          : "Order completed successfully.",
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.confirmCodPayment = async (req, res) => {
  try {
    const { orderNumber } = req.body;

    const order = await Order.findOne({ where: { orderNumber } });
    if (!order) throw new Error("Order not found");

    if (order.deliveryBoyId !== req.deliveryBoy.id) {
      throw new Error("Not authorized");
    }

    if (order.paymentMethod !== "COD") {
      throw new Error("Not a COD order");
    }

    if (order.status !== "delivered") {
      throw new Error("Order not delivered yet");
    }

    await order.update({
      status: "completed",
      paymentStatus: "paid",
      completedAt: new Date(),
    });

    res.json({
      success: true,
      message: "COD payment confirmed. Order completed.",
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
