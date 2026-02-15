// const {
//   Order,
//   OrderItem,
//   OrderAddress,
//   CartItem,
//   Product,
//   ProductPrice,
//   ProductVariant,
//   VariantSize,
//   sequelize,
// } = require("../../models");
// const UserAddress = require("../../models/orders/userAddress.model");
// const { generateOrderNumber } = require("../../utils/helpers");

// const Razorpay = require("razorpay");
// const crypto = require("crypto");

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// exports.placeOrder = async (req, res) => {
//   let t;

//   try {
//     t = await sequelize.transaction();

//     const userId = req.user.id;
//     const { addressId, paymentMethod } = req.body;

//     if (!addressId) throw new Error("Address is required");

//     const userAddress = await UserAddress.findOne({
//       where: { id: addressId, userId },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!userAddress) throw new Error("Invalid address");

//     const cartItems = await CartItem.findAll({
//       where: { userId },
//       include: [
//         {
//           model: Product,
//           as: "product",
//           include: [{ model: ProductPrice, as: "price" }],
//         },
//         { model: ProductVariant, as: "variant" },
//         { model: VariantSize, as: "variantSize" },
//       ],
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!cartItems.length) throw new Error("Cart is empty");

//     let subtotal = 0;
//     let totalTax = 0;

//     for (const item of cartItems) {
//       const price = Number(item.product?.price?.sellingPrice || 0);
//       const qty = Number(item.quantity || 0);
//       const stock = Number(item.variantSize?.stock || 0);
//       const gstRate = Number(item.product?.gstRate || 0);

//       if (!price || qty <= 0) throw new Error("Invalid cart item");
//       if (stock < qty)
//         throw new Error(`Insufficient stock for ${item.product.title}`);

//       const itemSubtotal = price * qty;
//       const itemTax = Math.round((itemSubtotal * gstRate) / 100);

//       subtotal += itemSubtotal;
//       totalTax += itemTax;
//     }

//     const shippingFee = subtotal > 5000 ? 0 : 150;
//     const totalAmount = subtotal + totalTax + shippingFee;

//     const isCOD = paymentMethod === "COD";

//     const order = await Order.create(
//       {
//         userId,
//         orderNumber: generateOrderNumber(),
//         subtotal,
//         taxAmount: totalTax,
//         shippingFee,
//         totalAmount,
//         status: isCOD ? "confirmed" : "pending",
//         paymentMethod,
//         paymentStatus: isCOD ? "unpaid" : "unpaid",
//       },
//       { transaction: t },
//     );

//     // const orderItems = cartItems.map((item) => ({
//     //   orderId: order.id,
//     //   productId: item.productId,
//     //   variantId: item.variantId,
//     //   sizeId: item.sizeId,
//     //   productName: item.product.title,
//     //   variantColor: item.variant.colorName,
//     //   sizeLabel: item.variantSize.size,
//     //   quantity: item.quantity,
//     //   priceAtPurchase: item.product.price.sellingPrice,
//     //   totalPrice: item.product.price.sellingPrice * item.quantity,
//     // }));
//     const orderItems = cartItems.map((item) => {
//       const price = Number(item.product.price.sellingPrice);
//       const qty = Number(item.quantity);
//       const gstRate = Number(item.product.gstRate || 0);

//       const itemSubtotal = price * qty;
//       const itemTax = Math.round((itemSubtotal * gstRate) / 100);

//       return {
//         orderId: order.id,
//         productId: item.productId,
//         variantId: item.variantId,
//         sizeId: item.sizeId,

//         productName: item.product.title,
//         variantColor: item.variant.colorName,
//         sizeLabel: item.variantSize.size,

//         quantity: qty,
//         priceAtPurchase: price,

//         taxRate: gstRate, // ✅ GST snapshot
//         taxAmount: itemTax, // ✅ GST snapshot

//         totalPrice: itemSubtotal + itemTax,
//       };
//     });

//     await OrderItem.bulkCreate(orderItems, { transaction: t });

//     await OrderAddress.create(
//       {
//         orderId: order.id,
//         fullName: userAddress.fullName,
//         email: userAddress.email,
//         phoneNumber: userAddress.phoneNumber,
//         addressLine: userAddress.addressLine,
//         country: userAddress.country,
//         city: userAddress.city,
//         state: userAddress.state,
//         zipCode: userAddress.zipCode,
//       },
//       { transaction: t },
//     );

//     await t.commit();

//     // ---------------- COD FLOW ----------------
//     if (isCOD) {
//       return res.json({
//         success: true,
//         message: "Order placed with COD",
//         orderNumber: order.orderNumber,
//         totalAmount,
//       });
//     }

//     // ---------------- RAZORPAY ORDER ----------------
//     const razorpayOrder = await razorpay.orders.create({
//       amount: totalAmount * 100, // paisa
//       currency: "INR",
//       receipt: order.orderNumber,
//     });

//     return res.json({
//       success: true,
//       orderNumber: order.orderNumber,
//       razorpayOrderId: razorpayOrder.id,
//       amount: razorpayOrder.amount,
//       currency: "INR",
//       key: process.env.RAZORPAY_KEY_ID,
//     });
//   } catch (err) {
//     if (t && !t.finished) await t.rollback();

//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

const {
  Order,
  OrderItem,
  OrderAddress,
  CartItem,
  Product,
  ProductPrice,
  ProductVariant,
  VariantSize,
  sequelize,
} = require("../../models");

const UserAddress = require("../../models/orders/userAddress.model");
const { generateOrderNumber } = require("../../utils/helpers");

const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.placeOrder = async (req, res) => {
  let t;

  try {
    t = await sequelize.transaction();

    const userId = req.user.id;
    const { addressId, paymentMethod } = req.body;

    if (!addressId) throw new Error("Address is required");

    // 🔒 Lock address row
    const userAddress = await UserAddress.findOne({
      where: { id: addressId, userId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!userAddress) throw new Error("Invalid address");

    // 🔒 Lock cart + stock rows
    const cartItems = await CartItem.findAll({
      where: { userId },
      include: [
        {
          model: Product,
          as: "product",
          include: [{ model: ProductPrice, as: "price" }],
        },
        { model: ProductVariant, as: "variant" },
        { model: VariantSize, as: "variantSize" },
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!cartItems.length) throw new Error("Cart is empty");

    let subtotal = 0;
    let totalTax = 0;

    // 🧮 Validate + calculate
    for (const item of cartItems) {
      const price = Number(item.product?.price?.sellingPrice || 0);
      const qty = Number(item.quantity || 0);
      const stock = Number(item.variantSize?.stock || 0);
      const gstRate = Number(item.product?.gstRate || 0);

      if (!price || qty <= 0) throw new Error("Invalid cart item");
      if (stock < qty)
        throw new Error(`Insufficient stock for ${item.product.title}`);

      const itemSubtotal = price * qty;
      const itemTax = Math.round((itemSubtotal * gstRate) / 100);

      subtotal += itemSubtotal;
      totalTax += itemTax;
    }

    const shippingFee = subtotal > 5000 ? 0 : 150;
    const totalAmount = subtotal + totalTax + shippingFee;

    const isCOD = paymentMethod === "COD";

    // 🧾 Create Order
    const order = await Order.create(
      {
        userId,
        orderNumber: generateOrderNumber(),
        subtotal,
        taxAmount: totalTax,
        shippingFee,
        totalAmount,
        status: isCOD ? "confirmed" : "pending",
        paymentMethod,
        paymentStatus: "unpaid",
      },
      { transaction: t }
    );

    // 📦 Order Items snapshot
    const orderItems = cartItems.map((item) => {
      const price = Number(item.product.price.sellingPrice);
      const qty = Number(item.quantity);
      const gstRate = Number(item.product.gstRate || 0);

      const itemSubtotal = price * qty;
      const itemTax = Math.round((itemSubtotal * gstRate) / 100);

      return {
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        sizeId: item.sizeId,

        productName: item.product.title,
        variantColor: item.variant.colorName,
        sizeLabel: item.variantSize.size,

        quantity: qty,
        priceAtPurchase: price,

        taxRate: gstRate,
        taxAmount: itemTax,

        totalPrice: itemSubtotal + itemTax,
      };
    });

    await OrderItem.bulkCreate(orderItems, { transaction: t });

    // 📍 Snapshot address
    await OrderAddress.create(
      {
        orderId: order.id,
        fullName: userAddress.fullName,
        email: userAddress.email,
        phoneNumber: userAddress.phoneNumber,
        addressLine: userAddress.addressLine,
        country: userAddress.country,
        city: userAddress.city,
        state: userAddress.state,
        zipCode: userAddress.zipCode,
      },
      { transaction: t }
    );

    // ================= COD STOCK DEDUCTION =================
    if (isCOD) {
      for (const item of orderItems) {
        await VariantSize.decrement("stock", {
          by: item.quantity,
          where: { id: item.sizeId },
          transaction: t,
        });

        await ProductVariant.decrement("totalStock", {
          by: item.quantity,
          where: { id: item.variantId },
          transaction: t,
        });
      }

      // 🛒 Clear cart
      await CartItem.destroy({
        where: { userId },
        transaction: t,
      });
    }

    // ✅ Commit transaction
    await t.commit();

    // ================= COD RESPONSE =================
    if (isCOD) {
      return res.json({
        success: true,
        message: "Order placed with Cash on Delivery",
        orderNumber: order.orderNumber,
        totalAmount,
      });
    }

    // ================= RAZORPAY ORDER =================
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100, // paisa
      currency: "INR",
      receipt: order.orderNumber,
    });

    return res.json({
      success: true,
      orderNumber: order.orderNumber,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    if (t && !t.finished) await t.rollback();

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


exports.verifyRazorpayPayment = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderNumber,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Payment verification failed");
    }

    const order = await Order.findOne({
      where: { orderNumber },
      include: [OrderItem],
      transaction: t,
      lock: true,
    });

    if (!order) throw new Error("Order not found");

    if (order.paymentStatus === "paid") {
      await t.commit();
      return res.json({ success: true });
    }

    await order.update(
      {
        status: "confirmed",
        paymentStatus: "paid",
        transactionId: razorpay_payment_id,
        paidAt: new Date(),
      },
      { transaction: t },
    );

    //  deduct stock
    for (const item of order.OrderItems) {
      await VariantSize.decrement("stock", {
        by: item.quantity,
        where: { id: item.sizeId },
        transaction: t,
      });

      await ProductVariant.decrement("totalStock", {
        by: item.quantity,
        where: { id: item.variantId },
        transaction: t,
      });
    }

    await CartItem.destroy({
      where: { userId: order.userId },
      transaction: t,
    });

    await t.commit();

    return res.json({
      success: true,
      message: "Payment verified",
    });
  } catch (err) {
    await t.rollback();

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};


exports.razorpayWebhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  try {
    // 🔐 Verify signature
    const signature = req.headers["x-razorpay-signature"];

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const event = JSON.parse(req.body.toString());

    // ================= PAYMENT CAPTURED =================
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderNumber = payment.receipt;

      let t = await sequelize.transaction();

      try {
        const order = await Order.findOne({
          where: { orderNumber },
          include: [{ model: OrderItem }],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!order) throw new Error("Order not found");

        // 🛑 Idempotency check
        if (order.paymentStatus === "paid") {
          await t.rollback();
          return res.json({ success: true, message: "Already processed" });
        }

        // ================= UPDATE ORDER =================
        order.paymentStatus = "paid";
        order.status = "confirmed";
        await order.save({ transaction: t });

        // ================= DEDUCT STOCK =================
        for (const item of order.OrderItems) {
          await VariantSize.decrement("stock", {
            by: item.quantity,
            where: { id: item.sizeId },
            transaction: t,
          });

          await ProductVariant.decrement("totalStock", {
            by: item.quantity,
            where: { id: item.variantId },
            transaction: t,
          });
        }

        // ================= CLEAR CART =================
        await CartItem.destroy({
          where: { userId: order.userId },
          transaction: t,
        });

        await t.commit();

        return res.json({ success: true });
      } catch (err) {
        await t.rollback();
        throw err;
      }
    }

    // ================= PAYMENT FAILED =================
    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;
      const orderNumber = payment.receipt;

      const order = await Order.findOne({ where: { orderNumber } });

      if (order && order.paymentStatus !== "paid") {
        order.paymentStatus = "failed";
        order.status = "cancelled";
        await order.save();
      }

      return res.json({ success: true });
    }

    // ================= REFUND PROCESSED =================
    if (event.event === "refund.processed") {
      const refund = event.payload.refund.entity;
      const orderNumber = refund.notes?.orderNumber;

      const order = await Order.findOne({
        where: { orderNumber },
        include: [{ model: OrderItem }],
      });

      if (order) {
        order.status = "refunded";
        await order.save();

        // 🔄 Restore stock
        for (const item of order.OrderItems) {
          await VariantSize.increment("stock", {
            by: item.quantity,
            where: { id: item.sizeId },
          });

          await ProductVariant.increment("totalStock", {
            by: item.quantity,
            where: { id: item.variantId },
          });
        }
      }

      return res.json({ success: true });
    }

    // default response
    return res.json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    return res.status(500).json({ success: false });
  }
};

// exports.razorpayWebhook = async (req, res) => {
//   const signature = req.headers["x-razorpay-signature"];

//   const expected = crypto
//     .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
//     .update(JSON.stringify(req.body))
//     .digest("hex");

//   // Invalid webhook → ignore silently
//   if (signature !== expected) {
//     return res.status(400).json({ success: false });
//   }

//   const event = req.body.event;

//   // We only care about payment captured
//   if (event !== "payment.captured") {
//     return res.json({ received: true });
//   }

//   const payment = req.body.payload.payment.entity;
//   const orderNumber = payment.receipt;

//   const t = await sequelize.transaction();

//   try {
//     const order = await Order.findOne({
//       where: { orderNumber },
//       include: [OrderItem],
//       transaction: t,
//       lock: true,
//     });

//     if (!order) throw new Error("Order not found");

//     //  Idempotency protection
//     if (order.paymentStatus === "paid") {
//       await t.commit();
//       return res.json({ received: true });
//     }

//     //  Mark paid
//     await order.update(
//       {
//         status: "confirmed",
//         paymentStatus: "paid",
//         transactionId: payment.id,
//         paidAt: new Date(),
//         invoiceNumber: `INV-${Date.now()}`,
//       },
//       { transaction: t }
//     );

//     //  Deduct stock
//     for (const item of order.OrderItems) {
//       await VariantSize.decrement("stock", {
//         by: item.quantity,
//         where: { id: item.sizeId },
//         transaction: t,
//       });

//       await ProductVariant.decrement("totalStock", {
//         by: item.quantity,
//         where: { id: item.variantId },
//         transaction: t,
//       });
//     }

//     //  Clear cart
//     await CartItem.destroy({
//       where: { userId: order.userId },
//       transaction: t,
//     });

//     await t.commit();

//     return res.json({ received: true });
//   } catch (err) {
//     await t.rollback();
//     return res.status(500).json({ received: false });
//   }
// };
