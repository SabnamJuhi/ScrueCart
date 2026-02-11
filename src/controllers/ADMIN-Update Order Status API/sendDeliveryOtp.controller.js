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

    // ✅ Correct phone field
    const phone = order.address?.phoneNumber;

    if (!phone) throw new Error("Customer phone number not found");

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    await order.update({
      status: "out_for_delivery",
      deliveryOtp: otp,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min expiry
    });

    const message =
      `Your delivery OTP is ${otp}. ` +
      `Please share it with the delivery partner only AFTER receiving the parcel.`;

    // Send SMS + WhatsApp
    await sendSMS(phone, message);
    await sendWhatsApp(phone, message);

    console.log("Delivery OTP:", otp, "sent to:", phone);

    res.json({
      success: true,
      message: "Delivery OTP sent successfully",
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
