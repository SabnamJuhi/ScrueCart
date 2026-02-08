exports.verifyDeliveryOtp = async (req, res) => {
try {
const { orderNumber, otp } = req.body;


const order = await Order.findOne({ where: { orderNumber } });
if (!order) throw new Error("Order not found");


if (order.deliveryOtp !== otp)
return res.status(400).json({ message: "Invalid OTP" });


if (new Date() > order.otpExpiresAt)
return res.status(400).json({ message: "OTP expired" });


await order.update({
status: "delivered",
deliveredAt: new Date(),
deliveryOtp: null,
otpExpiresAt: null,
});


res.json({ success: true, message: "Order delivered successfully" });
} catch (err) {
res.status(400).json({ success: false, message: err.message });
}
};