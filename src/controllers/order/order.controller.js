// const {
//   Order,
//   OrderItem,
//   OrderAddress,
//   CartItem,
//   Product,
//   ProductPrice,
//   ProductVariant,
//   sequelize,
// } = require("../../models");
// // const { generateOrderNumber } = require("../../utils/helpers");
// // const Razorpay = require("razorpay");
// const { generateOrderNumber } = require("../../utils/helpers");
// const { encrypt, generateChecksum } = require("../../utils/iciciCrypto");

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// exports.placeOrder = async (req, res) => {
//   const t = await sequelize.transaction();

//   try {
//     const userId = req.user.id;
//     const { shippingAddress, paymentMethod } = req.body;

//     // 1. Fetch Cart Items - Use distinct IDs to prevent join duplication
//     const cartItems = await CartItem.findAll({
//       where: { userId },
//       include: [
//         {
//           model: Product,
//           as: "product",
//           include: [{ model: ProductPrice, as: "price" }],
//         },
//         { model: ProductVariant, as: "variant" },
//       ],
//       transaction: t,
//     });

//     if (!cartItems.length) throw new Error("Cart is empty");

//     // 2. RESET MATH - Ensure we start from zero
//     let subtotal = 0;

//     // Use a Set to track processed Cart IDs to prevent double-counting
//     const processedIds = new Set();

//     for (const item of cartItems) {
//       if (processedIds.has(item.id)) continue; // Skip if already counted

//       const itemPrice = parseFloat(item.product.price.sellingPrice) || 0;
//       const itemQty = parseInt(item.quantity);

//       subtotal += itemPrice * itemQty;
//       processedIds.add(item.id);
//     }

//     const taxAmount = Math.round(subtotal * 0.12);
//     const shippingFee = subtotal > 5000 ? 0 : 150;
//     const totalAmount = subtotal + taxAmount + shippingFee;

//     // 3. Create Order Header (Fixing the 0.00 taxAmount bug)
//     const order = await Order.create(
//       {
//         userId,
//         orderNumber: generateOrderNumber(),
//         subtotal: subtotal,
//         taxAmount: taxAmount, // This was 0.00 in your SQL, now it's fixed
//         shippingFee: shippingFee,
//         totalAmount: totalAmount,
//         status: "pending",
//         paymentMethod,
//         paymentStatus: "unpaid",
//       },
//       { transaction: t },
//     );

//     // 4. Create Items
//     const orderItemsData = cartItems.map((item) => ({
//       orderId: order.id,
//       productId: item.productId,
//       productName: item.product.title,
//       quantity: item.quantity,
//       priceAtPurchase: item.product.price.sellingPrice,
//       totalPrice: item.product.price.sellingPrice * item.quantity,
//       variantInfo: { color: item.variant.colorName, size: item.selectedSize },
//     }));

//     await OrderItem.bulkCreate(orderItemsData, { transaction: t });

//     await OrderAddress.create(
//       { orderId: order.id, ...shippingAddress },
//       { transaction: t },
//     );

//     await t.commit();
//     const options = {
//       amount: totalAmount * 100, // Razorpay works in paise (70000 INR = 7000000 paise)
//       currency: "INR",
//       receipt: order.orderNumber,
//     };

//     const razorpayOrder = await razorpay.orders.create(options);

//     res.status(201).json({
//       success: true,
//       orderNumber: order.orderNumber,
//       razorpayOrderId: razorpayOrder.id,
//       amount: razorpayOrder.amount,
//       keyId: process.env.RAZORPAY_KEY_ID,
//     });
//     // res.status(201).json({
//     //     success: true, orderNumber: order.orderNumber, totalAmount
//     // });
//   } catch (error) {
//     await t.rollback();
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // STEP 2: Finalize Order (Webhook from Payment Gateway)
// exports.handlePaymentWebhook = async (req, res) => {
//   const t = await sequelize.transaction();
//   try {
//     const { orderNumber, transactionId } = req.body;
//     const order = await Order.findOne({
//       where: { orderNumber, status: "pending" },
//       include: [OrderItem],
//       transaction: t,
//     });

//     if (!order) throw new Error("Order not found");

//     await order.update(
//       { status: "confirmed", paymentStatus: "paid", transactionId },
//       { transaction: t },
//     );

//     for (const item of order.OrderItems) {
//       const product = await Product.findByPk(item.productId, {
//         transaction: t,
//       });
//       await product.decrement("stockQuantity", {
//         by: item.quantity,
//         transaction: t,
//       });
//     }

//     await CartItem.destroy({ where: { userId: order.userId }, transaction: t });

//     await t.commit();
//     res.status(200).json({ success: true, message: "Order confirmed" });
//   } catch (error) {
//     await t.rollback();
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

/**
 * Place Order & generate ICICI payment data
 */




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

const { generateOrderNumber } = require("../../utils/helpers");
const {
  encrypt,
  decrypt,
  generateChecksum,
} = require("../../utils/iciciCrypto");

/**
 * STEP 1 — Place Order & Generate ICICI Payment Payload
 */
exports.placeOrder = async (req, res) => {
  let t;

  try {
    t = await sequelize.transaction();

    const userId = req.user.id;
    const { shippingAddress, paymentMethod } = req.body;

    // 1️⃣ Fetch cart with full relations
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
      lock: t.LOCK.UPDATE, // 🔒 prevent race condition
    });

    if (!cartItems.length) throw new Error("Cart is empty");

    // 2️⃣ Calculate subtotal + validate stock
    let subtotal = 0;

    for (const item of cartItems) {
      const price = Number(item.product?.price?.sellingPrice || 0);
      const qty = Number(item.quantity || 0);
      const stock = Number(item.variantSize?.stock || 0);

      if (!price || qty <= 0) {
        throw new Error(`Invalid price/quantity for product ${item.productId}`);
      }

      if (stock < qty) {
        throw new Error(
          `Insufficient stock for ${item.product.title} (${item.variantSize.size})`,
        );
      }

      subtotal += price * qty;
    }

    if (!subtotal || isNaN(subtotal)) {
      throw new Error("Invalid subtotal calculation");
    }

    const taxAmount = Math.round(subtotal * 0.12);
    const shippingFee = subtotal > 5000 ? 0 : 150;
    const totalAmount = subtotal + taxAmount + shippingFee;

    // 3️⃣ Create Order
    const order = await Order.create(
      {
        userId,
        orderNumber: generateOrderNumber(),
        subtotal,
        taxAmount,
        shippingFee,
        totalAmount,
        status: "pending",
        paymentMethod,
        paymentStatus: "unpaid",
      },
      { transaction: t },
    );

    // 4️⃣ Create Order Items
    const orderItems = cartItems.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      variantId: item.variantId,
      sizeId: item.sizeId,
      // 🔹 REQUIRED SNAPSHOT FIELDS
      productName: item.product.title,
      variantColor: item.variant.colorName,
      sizeLabel: item.variantSize.size,

      quantity: item.quantity,
      priceAtPurchase: item.product.price.sellingPrice,
      totalPrice: item.product.price.sellingPrice * item.quantity,
    }));

    await OrderItem.bulkCreate(orderItems, { transaction: t });

    // 5️⃣ Save Address
    await OrderAddress.create(
      { orderId: order.id, ...shippingAddress },
      { transaction: t },
    );

    // ✅ Commit BEFORE payment gateway
    await t.commit();

    // --------------------------------------------------
    // 🏦 ICICI PAYMENT INIT
    // --------------------------------------------------
    const paymentData = {
      merchantId: process.env.ICICI_MERCHANT_ID,
      orderNumber: order.orderNumber,
      amount: totalAmount,
      currency: "INR",
      returnUrl: process.env.ICICI_RETURN_URL,
      cancelUrl: process.env.ICICI_CANCEL_URL,
    };

    const payload = JSON.stringify(paymentData);
    const encData = encrypt(payload, process.env.ICICI_ENCRYPTION_KEY);
    const checksum = generateChecksum(encData, process.env.ICICI_CHECKSUM_KEY);

    return res.status(200).json({
      success: true,
      orderNumber: order.orderNumber,
      totalAmount,
      paymentUrl: process.env.ICICI_PAYMENT_URL,
      encData,
      checksum,
    });
  } catch (error) {
    if (t && !t.finished) await t.rollback();

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * STEP 2 — ICICI REAL CALLBACK (PRODUCTION SAFE)
 */
// exports.iciciReturn = async (req, res) => {
//   let t;

//   try {
//     t = await sequelize.transaction();

//     const { encData, checksum } = req.body;

//     // 1️⃣ Basic validation
//     if (!encData || !checksum) {
//       throw new Error("Missing encData or checksum");
//     }

//     // 2️⃣ Verify checksum (security)
//     const generatedChecksum = generateChecksum(
//       encData,
//       process.env.ICICI_CHECKSUM_KEY
//     );

//     if (generatedChecksum !== checksum) {
//       throw new Error("Checksum mismatch");
//     }

//     // 3️⃣ Decrypt ICICI response
//     let decrypted;
//     try {
//       decrypted = JSON.parse(
//         decrypt(encData, process.env.ICICI_ENCRYPTION_KEY)
//       );
//     } catch (err) {
//       throw new Error("Invalid encrypted payload");
//     }

//     const { orderNumber, transactionId, status } = decrypted;

//     if (!orderNumber) {
//       throw new Error("Invalid ICICI response: missing orderNumber");
//     }

//     // 4️⃣ Lock pending order (prevents double payment processing)
//     const order = await Order.findOne({
//       where: { orderNumber },
//       include: [OrderItem],
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!order) {
//       throw new Error("Order not found");
//     }

//     // 🔐 Idempotency check → already processed
//     if (order.status !== "pending") {
//       await t.commit();

//       return res.redirect(
//         `${process.env.FRONTEND_URL}/payment-result?status=${order.paymentStatus}&order=${order.orderNumber}`
//       );
//     }

//     // --------------------------------------------------
//     // 5️⃣ HANDLE SUCCESS PAYMENT
//     // --------------------------------------------------
//     if (status === "SUCCESS") {
//       // Update order payment info
//       await order.update(
//         {
//           status: "confirmed",
//           paymentStatus: "paid",
//           transactionId: transactionId || null,
//         },
//         { transaction: t }
//       );

//       // Deduct stock safely
//       for (const item of order.OrderItems) {
//         // Size stock
//         const sizeUpdated = await VariantSize.decrement("stock", {
//           by: item.quantity,
//           where: {
//             id: item.sizeId,
//             stock: { [sequelize.Op.gte]: item.quantity }, // prevent negative stock
//           },
//           transaction: t,
//         });

//         if (!sizeUpdated[0][1]) {
//           throw new Error("Stock mismatch during payment confirmation");
//         }

//         // Variant total stock
//         await ProductVariant.decrement("totalStock", {
//           by: item.quantity,
//           where: { id: item.variantId },
//           transaction: t,
//         });
//       }

//       // Clear user cart
//       await CartItem.destroy({
//         where: { userId: order.userId },
//         transaction: t,
//       });
//     }

//     // --------------------------------------------------
//     // 6️⃣ HANDLE FAILED / CANCELLED PAYMENT
//     // --------------------------------------------------
//     else {
//       await order.update(
//         {
//           status: "cancelled",
//           paymentStatus: "failed",
//           transactionId: transactionId || null,
//         },
//         { transaction: t }
//       );
//     }

//     await t.commit();

//     // --------------------------------------------------
//     // 7️⃣ Redirect user to frontend result page
//     // --------------------------------------------------
//     return res.redirect(
//       `${process.env.FRONTEND_URL}/payment-result?status=${order.paymentStatus}&order=${order.orderNumber}`
//     );
//   } catch (err) {
//     if (t) await t.rollback();

//     console.error("ICICI CALLBACK ERROR:", err.message);

//     // Never expose internal error to ICICI
//     return res.redirect(
//       `${process.env.FRONTEND_URL}/payment-result?status=error`
//     );
//   }
// };

exports.iciciReturn = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { encData, checksum } = req.body;

    //  Validate checksum
    const validChecksum = generateChecksum(
      encData,
      process.env.ICICI_CHECKSUM_KEY
    );

    if (validChecksum !== checksum) {
      throw new Error("Checksum mismatch");
    }

    //  Decrypt ICICI response
    const decrypted = JSON.parse(
      decrypt(encData, process.env.ICICI_ENCRYPTION_KEY)
    );

    const { orderNumber, transactionId, status } = decrypted;

    if (!orderNumber) throw new Error("Invalid ICICI payload");

    // Find order safely
    const order = await Order.findOne({
      where: { orderNumber },
      include: [OrderItem],
      transaction: t,
      lock: true,
    });

    if (!order) throw new Error("Order not found");

    // 🔐 Prevent duplicate payment processing
    if (order.paymentStatus === "paid") {
      await t.commit();
      return res.redirect(`${process.env.FRONTEND_URL}/payment-success`);
    }

    // SUCCESS FLOW
    if (status === "SUCCESS") {
      await order.update(
        {
          status: "confirmed",
          paymentStatus: "paid",
          transactionId,
          paidAt: new Date(),
        },
        { transaction: t }
      );

      // 5️⃣ Deduct stock
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

      //  Clear cart
      await CartItem.destroy({
        where: { userId: order.userId },
        transaction: t,
      });

      //  Generate invoice number (simple example)
      const invoiceNumber = `INV-${Date.now()}`;

      await order.update({ invoiceNumber }, { transaction: t });

      await t.commit();

      //  Redirect to frontend success page
      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-success?order=${order.orderNumber}`
      );
    }

    //  FAILED PAYMENT FLOW
    await order.update(
      { status: "cancelled", paymentStatus: "failed" },
      { transaction: t }
    );

    await t.commit();

    return res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
  } catch (err) {
    await t.rollback();

    console.error("ICICI RETURN ERROR:", err.message);

    return res.redirect(`${process.env.FRONTEND_URL}/payment-error`);
  }
};

// STEP 3 — Local Test Callback (for Postman testing)
 
exports.iciciTestCallback = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { orderNumber, transactionId = "TEST_TXN_123", status } = req.body;

    if (!orderNumber) {
      throw new Error("orderNumber is required in request body");
    }

    const order = await Order.findOne({
      where: { orderNumber, status: "pending" },
      include: [OrderItem],
      transaction: t,
      lock: true,
    });

    if (!order) throw new Error("Order not found or already processed");

    if (status === "SUCCESS") {
      await order.update(
        { status: "confirmed", paymentStatus: "paid", transactionId },
        { transaction: t }
      );

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
    } else {
      await order.update(
        { status: "cancelled", paymentStatus: "failed" },
        { transaction: t }
      );
    }

    await t.commit();

    return res.json({
      success: true,
      message: "Test payment processed successfully",
    });
  } catch (err) {
    await t.rollback();

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

