exports.getActiveOrders = async (req, res) => {
const orders = await Order.findAll({
where: {
userId: req.user.id,
status: ["confirmed", "packed", "shipped", "out_for_delivery"],
},
order: [["createdAt", "DESC"]],
});


res.json({ success: true, data: orders });
};