// const { Order } = require("../../models");

// exports.sendDeliveryOtp = async (req, res) => {
// try {
// const { orderNumber } = req.params;


// const order = await Order.findOne({ where: { orderNumber } });
// if (!order) throw new Error("Order not found");


// const otp = Math.floor(1000 + Math.random() * 9000).toString();


// await order.update({
// status: "out_for_delivery",
// deliveryOtp: otp,
// otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
// });


// // 🔹 Integrate WhatsApp API here (Twilio / Meta / Interakt)
// console.log("Delivery OTP:", otp);


// res.json({ success: true, message: "OTP sent for delivery" });
// } catch (err) {
// res.status(400).json({ success: false, message: err.message });
// }
// };


const crypto = require("crypto");
const { Order, OrderAddress } = require("../../models");
const { sendSMS, sendWhatsApp } = require("../../services/notification.service");

exports.sendDeliveryOtp = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({
      where: { orderNumber },
      include: [{ model: OrderAddress, as: "address" }],
    });

    if (!order) throw new Error("Order not found");

    const now = new Date();

    // ❌ If OTP still valid → block resend
    if (order.otpExpiresAt && now < new Date(order.otpExpiresAt)) {
      const secondsLeft = Math.ceil(
        (new Date(order.otpExpiresAt) - now) / 1000
      );

      throw new Error(
        `OTP already sent. Try again in ${secondsLeft} seconds.`
      );
    }

    // ✅ OTP expired OR not present → clear old OTP
    await order.update({
      deliveryOtpHash: null,
      otpExpiresAt: null,
      otpVerified: false,
    });

    // 📱 Get phone
    const phone = order.address?.phoneNumber;
    if (!phone) throw new Error("Customer phone number not found");

    // 🔢 Generate new 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // 🔐 Hash OTP
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // 💾 Save new OTP
    await order.update({
      status: "out_for_delivery",
      deliveryOtpHash: otpHash,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    // 📩 Send PLAIN OTP
    const message =
      `Your delivery OTP is ${otp}. ` +
      `Share it with the delivery partner ONLY after receiving your parcel.`;

    await sendSMS(phone, message);
    await sendWhatsApp(phone, message);

    console.log("NEW DELIVERY OTP:", otp, "sent to:", phone);

    return res.json({
      success: true,
      message: "New delivery OTP sent successfully",
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
