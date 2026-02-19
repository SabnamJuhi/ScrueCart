// const {
//   Product,
//   ProductPrice,
//   ProductVariant,
//   VariantSize,
// } = require("../../../models");

// exports.buyNowCheckout = async (req, res) => {
//   try {
//     const { buyNow } = req.body;

//     if (!buyNow) {
//       return res.status(400).json({
//         success: false,
//         message: "Buy Now payload missing",
//       });
//     }

//     const { productId, variantId, sizeId, quantity } = buyNow;
//     // const { productId, variantId, sizeId, quantity } = req.body;

//     if (!productId || !variantId || !sizeId || !quantity) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields",
//       });
//     }

//     // Fetch product + price + stock
//     const product = await Product.findByPk(productId, {
//       include: [{ model: ProductPrice, as: "price" }],
//     });

//     const variant = await ProductVariant.findByPk(variantId);
//     const variantSize = await VariantSize.findByPk(sizeId);

//     if (!product || !variant || !variantSize) {
//       return res.status(404).json({
//         success: false,
//         message: "Invalid product selection",
//       });
//     }

//     const price = Number(product.price?.sellingPrice || 0);
//     const stock = Number(variantSize.stock || 0);
//     const gstRate = Number(product.gstRate || 0);

//     if (!price || quantity <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid quantity or price",
//       });
//     }

//     if (stock < quantity) {
//       return res.status(400).json({
//         success: false,
//         message: "Insufficient stock",
//       });
//     }

//     // ===== SAME CALCULATION AS CART =====
//     const subtotal = price * quantity;
//     const taxAmount = Math.round((subtotal * gstRate) / 100);
//     const shippingFee = subtotal > 5000 ? 0 : 150;
//     const grandTotal = subtotal + taxAmount + shippingFee;

//     return res.json({
//       success: true,
//       data: {
//         type: "buy_now",

//         productId,
//         variantId,
//         sizeId,
//         quantity,

//         productName: product.title,
//         variantColor: variant.colorName,
//         sizeLabel: variantSize.size,

//         price,
//         subtotal,
//         taxAmount,
//         shippingFee,
//         grandTotal,
//         currency: "INR",
//       },
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };



const {
  Product,
  ProductPrice,
  ProductVariant,
  VariantSize,
  VariantImage,
} = require("../../../models");

exports.buyNowCheckout = async (req, res) => {
  try {
    const { buyNow } = req.body;

    if (!buyNow) {
      return res.status(400).json({
        success: false,
        message: "Buy Now payload missing",
      });
    }

    const { productId, variantId, sizeId, quantity } = buyNow;

    if (!productId || !variantId || !sizeId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Fetch product + price
    const product = await Product.findByPk(productId, {
      include: [{ model: ProductPrice, as: "price" }],
    });

    const variant = await ProductVariant.findByPk(variantId, {
      include: [{ model: VariantImage, as: "images" }],
    });

    const variantSize = await VariantSize.findByPk(sizeId);

    if (!product || !variant || !variantSize) {
      return res.status(404).json({
        success: false,
        message: "Invalid product selection",
      });
    }

    const price = Number(product.price?.sellingPrice || 0);
    const stock = Number(variantSize.stock || 0);
    const gstRate = Number(product.gstRate || 0);

    if (!price || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quantity or price",
      });
    }

    if (stock < quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock",
      });
    }

    // ===== CALCULATIONS =====
    const subTotal = price * quantity;
    const taxAmount = Math.round((subTotal * gstRate) / 100);
    const shippingFee = subTotal > 5000 ? 0 : 150;
    const grandTotal = subTotal + taxAmount + shippingFee;

    // Image logic
    const image =
      variant.images?.find((img) => img.isPrimary)?.url ||
      variant.images?.[0]?.url ||
      null;

    // ===== SINGLE ITEM ARRAY =====
    const data = [
      {
        cartId: Date.now(), // temp id (since no cart table used)
        productId,
        variantId,
        sizeId,
        title: product.title,
        image,
        variant: {
          color: variant.colorName,
          size: variantSize.size,
          stock,
          status: stock > 0 ? "In Stock" : "Out of Stock",
          isAvailable: stock >= quantity,
        },
        price,
        quantity,
        total: subTotal,
      },
    ];

    return res.json({
      success: true,
      data,
      summary: {
        itemsCount: 1,
        totalQuantity: quantity,
        subTotal,
        tax: { amount: taxAmount },
        grandTotal,
        shippingFee,
        currency: "INR",
        canCheckout: stock >= quantity,
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

