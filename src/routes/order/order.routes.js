const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/order/order.controller");
const { protected } = require("../../middleware/user.logout.middleware");
const {
  updateOrderStatus,
} = require("../../controllers/ADMIN-Update Order Status API/updateOrderStatus.controller");
const {
  sendDeliveryOtp,
} = require("../../controllers/ADMIN-Update Order Status API/sendDeliveryOtp.controller");
const {
  verifyDeliveryOtp,
} = require("../../controllers/ADMIN-Update Order Status API/verifyDeliveryOtp.controller");
const {
  getActiveOrders,
} = require("../../controllers/USER — My Orders API/getActiveOrders.controller");
const {
  getCompletedOrders,
} = require("../../controllers/USER — My Orders API/getCompletedOrders.controller");
const {
  cancelOrder,
} = require("../../controllers/USER — My Orders API/cancelOrder.controller");
const {
  returnOrder,
} = require("../../controllers/USER — My Orders API/returnOrder.controller");
const {
  completeRefund,
} = require("../../controllers/ADMIN-Update Order Status API/completeRefund.controller");
const {
  markDeliveredCOD,
} = require("../../controllers/COD-DeliveryPaymentCompletion APIs/markDeliveredCOD.controller");
const {
  collectCODPayment,
} = require("../../controllers/COD-DeliveryPaymentCompletion APIs/collectCODPayment.controller");
const {
  getAdminActiveOrders,
} = require("../../controllers/ADMIN-Get-Orders-History/getAdminActiveOrders.controller");
const {
  getAdminOrderHistory,
} = require("../../controllers/ADMIN-Get-Orders-History/getAdminOrderHistory.controller");
const {
  getOrderHistory,
} = require("../../controllers/USER — My Orders API/getOrderHistory.controller");
const {
  addAddress,
  getUserAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getAddressById,
} = require("../../controllers/order/Address.CRUD.controller");
const adminAuthMiddleware = require("../../middleware/admin.auth.middleware");
const { createDeliveryBoy, updateDeliveryBoy, deleteDeliveryBoy, getDeliveryBoys } = require("../../controllers/order/deliveryBoy.CRUD.controller");
const { confirmCodPayment } = require("../../controllers/ADMIN-Update Order Status API/confirmCodPayment.controller");

// Create Order (Requires Login)
router.post("/place", protected, orderController.placeOrder);
router.post("/verify-payment", protected, orderController.verifyRazorpayPayment);

// Payment Webhook (Public, called by Razorpay/Stripe)
// router.post('/webhook/payment', orderController.handlePaymentWebhook);

// router.post("/payment/icici/callback", orderController.iciciReturn);
// router.post("/payment/icici/test", orderController.iciciTestCallback);

router.post("/delivery-boy", createDeliveryBoy);
router.get("/delivery-boy", getDeliveryBoys);
router.put("/delivery-boy/:id", updateDeliveryBoy);
router.delete("/delivery-boy/:id", deleteDeliveryBoy);

//ADMIN — Update Order Status API
router.patch("/admin/:orderNumber/status", updateOrderStatus);
router.post("/admin/:orderNumber/send-otp", adminAuthMiddleware, sendDeliveryOtp);
router.post("/admin/verify-delivery-otp", verifyDeliveryOtp);
router.patch("/admin/confirm-cod-payment", confirmCodPayment);
router.post("/admin/:orderNumber/refund", completeRefund);

//USER — My Orders API
router.get("/active", protected, getActiveOrders);
router.get("/completed", protected, getCompletedOrders);
router.get("/history", protected, getOrderHistory);

//cancel/return
router.post("/:orderNumber/cancel", cancelOrder);
router.post("/:orderNumber/return", returnOrder);

// COD flow
router.patch("/admin/:orderNumber/mark-delivered", markDeliveredCOD);
router.patch("/admin/:orderNumber/collect-cod", collectCODPayment);

//Admin-get-Orders
// ADMIN — Orders viewing
router.get("/admin/active", getAdminActiveOrders);
router.get("/admin/history", getAdminOrderHistory);

//Adress APIS
router.post("/user/address", protected, addAddress);
router.get("/user/address", protected, getUserAddresses);
router.get("/user/address/:id", protected, getAddressById);
router.put("/user/address/:id", protected, updateAddress);
router.delete("/user/address/:id", protected, deleteAddress);
router.patch("/user/address/default/:id", protected, setDefaultAddress);

// router.post(
//   "/razorpay-webhook",
//   express.raw({ type: "application/json" }),
//   razorpayWebhook
// );
router.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  orderController.razorpayWebhook,
);

module.exports = router;

// 1. User creates order → status: pending, paymentStatus: unpaid
// 2. ICICI success → status: confirmed, paymentStatus: paid
// 3. Admin ships → status: shipped
// 4. Delivered → status: delivered + OTP sent
// 5. OTP verified → status: completed

// const express = require("express");
// const router = express.Router();
// const { encrypt, generateChecksum } = require("../utils/iciciCrypto");
// // const orderController = require('../../controllers/order/order.controller');
// // const { protect } = require('../../middleware/user.auth.middleware');

// router.post("/pay", (req, res) => {
//   const {
//     ICICI_MERCHANT_ID,
//     ICICI_SUB_MERCHANT_ID,
//     ICICI_ENCRYPTION_KEY,
//     ICICI_CHECKSUM_KEY,
//     ICICI_PAYMENT_URL,
//     ICICI_RETURN_URL
//   } = process.env;

//   const orderId = "ORD" + Date.now();

//   const paymentData = {
//     merchantid: ICICI_MERCHANT_ID,
//     submerchantid: ICICI_SUB_MERCHANT_ID,
//     orderid: orderId,
//     amount: "100.00",
//     currency: "INR",
//     ru: ICICI_RETURN_URL,
//     customername: "Ravi",
//     customeremail: "ravi@gmail.com",
//     customermobile: "9876543210"
//   };

//   const payload = JSON.stringify(paymentData);

//   const encryptedPayload = encrypt(payload, ICICI_ENCRYPTION_KEY);
//   const checksum = generateChecksum(encryptedPayload, ICICI_CHECKSUM_KEY);

//   res.json({
//     paymentUrl: ICICI_PAYMENT_URL,
//     encData: encryptedPayload,
//     checksum
//   });
// });

// module.exports = router;
