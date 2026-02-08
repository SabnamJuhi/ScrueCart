exports.sendDeliveryOtp = async (req, res) => {
try {
const { orderNumber } = req.params;


const order = await Order.findOne({ where: { orderNumber } });
if (!order) throw new Error("Order not found");


const otp = Math.floor(1000 + Math.random() * 9000).toString();


await order.update({
status: "out_for_delivery",
deliveryOtp: otp,
otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
});


// 🔹 Integrate WhatsApp API here (Twilio / Meta / Interakt)
console.log("Delivery OTP:", otp);


res.json({ success: true, message: "OTP sent for delivery" });
} catch (err) {
res.status(400).json({ success: false, message: err.message });
}
};