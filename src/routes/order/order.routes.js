const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/order/order.controller");
const { protected } = require("../../middleware/user.logout.middleware");
const {updateOrderStatus, markOutForDelivery} = require("../../controllers/ADMIN-Update Order Status API/updateOrderStatus.controller");
const {sendDeliveryOtp} = require("../../controllers/ADMIN-Update Order Status API/sendDeliveryOtp.controller");
// const { verifyDeliveryOtp} = require("../../controllers/ADMIN-Update Order Status API/verifyDeliveryOtp.controller");
const {getActiveOrders} = require("../../controllers/USER — My Orders API/getActiveOrders.controller");
const {getCompletedOrders} = require("../../controllers/USER — My Orders API/getCompletedOrders.controller");
const {cancelOrder} = require("../../controllers/USER — My Orders API/cancelOrder.controller");
const {returnOrder} = require("../../controllers/USER — My Orders API/returnOrder.controller");
const {completeRefund} = require("../../controllers/ADMIN-Update Order Status API/completeRefund.controller");
const {markDeliveredCOD} = require("../../controllers/COD-DeliveryPaymentCompletion APIs/markDeliveredCOD.controller");
const {collectCODPayment} = require("../../controllers/COD-DeliveryPaymentCompletion APIs/collectCODPayment.controller");
const {getAdminActiveOrders} = require("../../controllers/ADMIN-Get-Orders-History/getAdminActiveOrders.controller");
const {getAdminOrderHistory} = require("../../controllers/ADMIN-Get-Orders-History/getAdminOrderHistory.controller");
const { getOrderHistory} = require("../../controllers/USER — My Orders API/getOrderHistory.controller");
const {addAddress,getUserAddresses,updateAddress,deleteAddress,setDefaultAddress,getAddressById} = require("../../controllers/order/Address.CRUD.controller");
const adminAuthMiddleware = require("../../middleware/admin.auth.middleware");
// const {createDeliveryBoy, updateDeliveryBoy, deleteDeliveryBoy, } = require("../../controllers/order/deliveryBoy.CRUD.controller");
// const {confirmCodPayment} = require("../../controllers/ADMIN-Update Order Status API/confirmCodPayment.controller");
const {getMyAssignedOrders, loginDeliveryBoy, getAllDeliveryBoys, registerDeliveryBoy, updateDeliveryBoy, deleteDeliveryBoy, verifyDeliveryOtp, confirmCodPayment} = require("../../controllers/delivery-Boy/deliveryBoy.controller");
const {deliveryBoyAuth} = require("../../middleware/DeliveryBoy.Auth.middleware");


// Create Order (Requires Login)
router.post("/place", protected, orderController.placeOrder);
router.post("/verify-payment", protected, orderController.verifyRazorpayPayment,);

// Payment Webhook (Public, called by Razorpay/Stripe)
// router.post('/webhook/payment', orderController.handlePaymentWebhook);

// router.post("/payment/icici/callback", orderController.iciciReturn);
// router.post("/payment/icici/test", orderController.iciciTestCallback);

// router.post("/delivery-boy", createDeliveryBoy);
// router.get("/delivery-boy", getDeliveryBoys);
// router.put("/delivery-boy/:id", updateDeliveryBoy);
// router.delete("/delivery-boy/:id", deleteDeliveryBoy);

// --- Delivery Boy Auth ---
router.post("/register", adminAuthMiddleware, registerDeliveryBoy);
router.post("/login", loginDeliveryBoy);
router.get("/delivery-boys", adminAuthMiddleware, getAllDeliveryBoys);
router.patch("/delivery-boys/:id", adminAuthMiddleware, updateDeliveryBoy);
router.delete("/delivery-boys/:id",adminAuthMiddleware, deleteDeliveryBoy);
router.patch("/:orderNumber/shipped", adminAuthMiddleware, updateOrderStatus);
router.patch("/:orderNumber/out-for-delivery", adminAuthMiddleware, markOutForDelivery);
// --- Orders assigned to delivery boy ---
router.get("/my-orders", deliveryBoyAuth, getMyAssignedOrders);
// --- OTP Verification ---
router.post("/verify-otp", deliveryBoyAuth, verifyDeliveryOtp);
// --- COD payment confirmation ---
router.post("/confirm-cod-payment", deliveryBoyAuth, confirmCodPayment);

//ADMIN — Update Order Status API
// router.patch("/admin/:orderNumber/status", updateOrderStatus);
// router.post("/admin/:orderNumber/send-otp", adminAuthMiddleware, sendDeliveryOtp);
// router.post("/admin/verify-delivery-otp", verifyDeliveryOtp);
// router.patch("/admin/confirm-cod-payment", confirmCodPayment);



//USER — My Orders API
router.get("/active", protected, getActiveOrders);
router.get("/completed", protected, getCompletedOrders);
router.get("/history", protected, getOrderHistory);

//cancel/return
router.post("/:orderNumber/cancel", protected, cancelOrder);
router.post("/:orderNumber/return", returnOrder);
router.post("/admin/:orderNumber/refund", completeRefund);

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
  orderController.handleRefundProcessed,
  orderController.handlePaymentFailed,
  orderController.handlePaymentFailed
);

module.exports = router;

// 1. User creates order → status: pending, paymentStatus: unpaid
// 2. ICICI success → status: confirmed, paymentStatus: paid
// 3. Admin ships → status: shipped
// 4. Delivered → status: delivered + OTP sent
// 5. OTP verified → status: completed
