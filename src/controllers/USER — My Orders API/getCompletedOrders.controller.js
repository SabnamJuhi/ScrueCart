exports.getCompletedOrders = async (req, res) => {
const orders = await Order.findAll({
where: { userId: req.user.id, status: "delivered" },
order: [["createdAt", "DESC"]],
});


res.json({ success: true, data: orders });
};