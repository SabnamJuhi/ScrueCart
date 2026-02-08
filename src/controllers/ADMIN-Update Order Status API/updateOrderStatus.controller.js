exports.updateOrderStatus = async (req, res) => {
try {
const { orderNumber } = req.params;
const { status, courierName, trackingNumber } = req.body;


const order = await Order.findOne({ where: { orderNumber } });
if (!order) throw new Error("Order not found");


const updateData = { status };


if (status === "shipped") {
updateData.courierName = courierName;
updateData.trackingNumber = trackingNumber;
updateData.shippedAt = new Date();
}


await order.update(updateData);


res.json({ success: true, message: "Order status updated" });
} catch (err) {
res.status(400).json({ success: false, message: err.message });
}
};