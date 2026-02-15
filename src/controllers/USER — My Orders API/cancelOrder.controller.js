const { Order } = require("../../models");

exports.cancelOrder = async (req, res) => {
try {
const { orderNumber } = req.params;


const order = await Order.findOne({ where: { orderNumber } });
if (!order) throw new Error("Order not found");


if (["shipped", "out_for_delivery", "delivered"].includes(order.status))
throw new Error("Order cannot be cancelled now");


await order.update({
status: "cancelled",
paymentStatus: "refund_pending",
});


res.json({ success: true, message: "Order cancelled" });
} catch (err) {
res.status(400).json({ success: false, message: err.message });
}
};