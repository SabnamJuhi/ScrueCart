const crypto = require("crypto");
const { Order, OrderAddress } = require("../../models");
const {sendSMS, sendWhatsApp} = require("../../services/notification.service");
const DeliveryBoy = require("../../models/orders/deliveryBoy.model");
const { sendDeliveryAssignmentEmail } = require("../../utils/email");

exports.sendDeliveryOtp = async (req, res) => {
  try {
    const { orderNumber, deliveryBoyId } = req.body;

    if (!orderNumber || !deliveryBoyId) {
      throw new Error("orderNumber and deliveryBoyId are required");
    }

    // 🔎 Find order + address
    const order = await Order.findOne({
      where: { orderNumber },
      include: [{ model: OrderAddress, as: "address" }],
    });

    if (!order) throw new Error("Order not found");

    // 🔎 Find delivery boy
    const boy = await DeliveryBoy.findByPk(deliveryBoyId);
    if (!boy) throw new Error("Delivery boy not found");

    const now = new Date();

    // ❌ Block resend if OTP still valid
    if (order.otpExpiresAt && now < new Date(order.otpExpiresAt)) {
      const secondsLeft = Math.ceil(
        (new Date(order.otpExpiresAt) - now) / 1000
      );

      throw new Error(`OTP already sent. Try again in ${secondsLeft} seconds.`);
    }

    // 🧹 Clear old OTP
    await order.update({
      deliveryOtpHash: null,
      otpExpiresAt: null,
      otpVerified: false,
    });

    // 📱 Customer phone
    const phone = order.address?.phoneNumber;
    if (!phone) throw new Error("Customer phone number not found");

    // 🔢 Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // 🔐 Hash OTP
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // --------------------------------------------------
    // 📧 1️⃣ SEND EMAIL (ALWAYS REQUIRED)
    // --------------------------------------------------
    const verificationLink =
      `${process.env.FRONTEND_URL}/verify-delivery?orderNumber=${orderNumber}`;

    await sendDeliveryAssignmentEmail({
      to: boy.email,
      orderNumber,
      customerName: order.address?.name,
      phone,
      address: order.address?.fullAddress,
      otp, // include OTP in email for dev/testing
      verificationLink,
    });

    // --------------------------------------------------
    // 📩 2️⃣ TRY SMS / WHATSAPP (OPTIONAL)
    // --------------------------------------------------
    try {
      await sendSMS(phone, otp);
      await sendWhatsApp(phone, otp);
    } catch (notifyErr) {
      console.error("SMS/WhatsApp failed but email sent → continuing");
    }

    // --------------------------------------------------
    // 💾 3️⃣ SAVE OTP IN DB
    // --------------------------------------------------
    await order.update({
      status: "out_for_delivery",
      deliveryBoyId: boy.id,
      deliveryOtpHash: otpHash,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      otpVerified: false,
    });

    // --------------------------------------------------
    // 🖥️ 4️⃣ SHOW OTP IN CONSOLE (DEV SUPPORT)
    // --------------------------------------------------
    console.log("=================================");
    console.log("📦 DELIVERY OTP GENERATED");
    console.log("Order:", orderNumber);
    console.log("OTP:", otp);
    console.log("Sent to email:", boy.email);
    console.log("=================================");

    // --------------------------------------------------
    // ✅ RESPONSE (include OTP only in dev)
    // --------------------------------------------------
    const isDev = process.env.NODE_ENV !== "production";

    return res.json({
      success: true,
      message: "Delivery boy assigned and OTP processed",
      ...(isDev && { devOtp: otp }),
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};