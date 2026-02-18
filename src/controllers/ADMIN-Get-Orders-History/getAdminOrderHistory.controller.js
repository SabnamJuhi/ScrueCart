// const { Order, OrderAddress, OrderItem, User } = require("../../models");

// exports.getAdminOrderHistory = async (req, res) => {
//   try {
//     const orders = await Order.findAll({
//       where: {
//         status: ["delivered", "completed", "cancelled", "refunded"],
//       },
//       include: [
//         {
//           model: OrderAddress,
//           as: "address", // ✅ REQUIRED
//         },
//         {
//           model: OrderItem,
//         },
//         {
//           model: User,
//           attributes: ["id", "userName", "email"],
//         },
//       ],
//       order: [["createdAt", "DESC"]],
//     });

//     res.json({
//       success: true,
//       total: orders.length,
//       data: orders,
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };







// const {
//   Order,
//   OrderAddress,
//   OrderItem,
//   User,
//   Product,
//   ProductPrice,
//   ProductVariant,
//   VariantImage,
//   VariantSize,
// } = require("../../models");

// exports.getAdminOrderHistory = async (req, res) => {
//   try {
//     const orders = await Order.findAll({
//       where: {
//         status: ["delivered", "completed", "cancelled", "refunded"],
//       },
//       include: [
//         {
//           model: OrderAddress,
//           as: "address",
//         },
//         {
//           model: User,
//           attributes: ["id", "userName", "email"],
//         },
//         {
//           model: OrderItem,
//           include: [
//             {
//               model: Product,
//               include: [{ model: ProductPrice, as: "price" }],
//             },
//             {
//               model: ProductVariant,
//               include: [{ model: VariantImage, as: "images", limit: 1 }],
//             },
//             {
//               model: VariantSize,
//             },
//           ],
//         },
//       ],
//       order: [["createdAt", "DESC"]],
//     });

//     // 🔹 Format response same as other order APIs
//     const formattedOrders = orders.map((order) => {
//       const items = order.OrderItems.map((item) => {
//         const sellingPrice = item.Product?.price?.sellingPrice || 0;

//         return {
//           orderItemId: item.id,
//           productId: item.productId,
//           title: item.Product?.title || "Unknown Product",
//           image: item.ProductVariant?.images?.[0]?.imageUrl || null,

//           variant: {
//             color: item.ProductVariant?.colorName,
//             size: item.VariantSize?.size,
//           },

//           price: sellingPrice,
//           quantity: item.quantity,
//           total: sellingPrice * item.quantity,
//         };
//       });

//       return {
//         orderId: order.id,
//         orderNumber: order.orderNumber,
//         status: order.status,
//         createdAt: order.createdAt,

//         customer: {
//           id: order.User?.id,
//           name: order.User?.userName,
//           email: order.User?.email,
//         },

//         address: order.address,
//         items,
//       };
//     });

//     res.json({
//       success: true,
//       total: formattedOrders.length,
//       data: formattedOrders,
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };




const {
  Order,
  OrderAddress,
  OrderItem,
  User,
  Product,
  ProductPrice,
  ProductVariant,
  VariantImage,
  VariantSize,
} = require("../../models");

exports.getAdminOrderHistory = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: {
        status: ["delivered", "completed", "cancelled", "refunded"],
      },
      include: [
        {
          model: OrderAddress,
          as: "address",
        },
        {
          model: User,
          attributes: ["id", "userName", "email"],
        },
        {
          model: OrderItem,
          include: [
            {
              model: Product, 
               attributes: [
                  "id",
                  "title",
                  "sku",       
                ],
              include: [{ model: ProductPrice, as: "price" }],
            },
            {
              model: ProductVariant,
              include: [{ model: VariantImage, as: "images", limit: 1 }],
            },
            {
              model: VariantSize,
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    /**
     * 🔹 Transform response (same structure as Active Orders)
     */
    const formattedOrders = orders.map((order) => {
      const items = order.OrderItems.map((item) => {
        const sellingPrice = item.Product?.price?.sellingPrice || 0;

        return {
          orderItemId: item.id,
          productId: item.productId,
          title: item.Product?.title || "Unknown Product",
          image: item.ProductVariant?.images?.[0]?.imageUrl || null,

          variant: {
            color: item.ProductVariant?.colorName || null,
            size: item.VariantSize?.size || null,
          },

          price: sellingPrice,
          quantity: item.quantity,
          total: sellingPrice * item.quantity,
        };
      });

      return {
        /**
         * 🆕 FULL ORDER TABLE DETAILS
         */
        orderDetails: {
          id: order.id,
          orderNumber: order.orderNumber,
          subtotal: order.subtotal,
          shippingFee: order.shippingFee,
          taxAmount: order.taxAmount,
          totalAmount: order.totalAmount,

          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          transactionId: order.transactionId,

          deliveryOtp: order.deliveryOtp,
          otpVerified: order.otpVerified,

          confirmedAt: order.confirmedAt,
          shippedAt: order.shippedAt,
          deliveredAt: order.deliveredAt,
          completedAt: order.completedAt,
          cancelledAt: order.cancelledAt,
          refundedAt: order.refundedAt,

          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          userId: order.userId,
        },

        /**
         * 👤 CUSTOMER INFO
         */
        customer: {
          id: order.User?.id,
          name: order.User?.userName,
          email: order.User?.email,
        },

        /**
         * 📍 ADDRESS SNAPSHOT
         */
        address: order.address,

        /**
         * 🛒 ITEMS
         */
        items,
      };
    });

    res.json({
      success: true,
      total: formattedOrders.length,
      data: formattedOrders,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
