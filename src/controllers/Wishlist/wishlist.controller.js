const {
  Wishlist,
  Product,
  ProductPrice,
  ProductVariant,
  VariantImage,
  VariantSize,
} = require("../../models");

exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, variantId } = req.body;

    // check duplicate
    const exists = await Wishlist.findOne({
      where: { userId, productId, variantId: variantId || null },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Already in wishlist",
      });
    }

    const wishlist = await Wishlist.create({
      userId,
      productId,
      variantId: variantId || null,
    });

    res.json({
      success: true,
      message: "Added to wishlist",
      data: wishlist,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const wishlistItems = await Wishlist.findAll({
      where: { userId },

      include: [
        {
          model: Product,
          attributes: ["id", "title", "brandName", "badge", "description"],
          include: [
            {
              model: ProductPrice,
              as: "price",
              attributes: ["mrp", "sellingPrice", "discountPercentage"],
            },
          ],
        },

        {
          model: ProductVariant,
          attributes: ["id", "colorName", "colorCode"],
          include: [
            {
              model: VariantImage,
              as: "images",
              attributes: ["imageUrl"],
            //   where: { isPrimary: true },
              required: false,
              limit: 1,
            },
            {
              model: VariantSize,
              as: "sizes",
              attributes: ["id", "size", "stock"],
            },
          ],
        },
      ],

      order: [["createdAt", "DESC"]],
    });

    // 🔹 Format clean e-commerce response
    const formattedWishlist = wishlistItems.map((item) => {
      const product = item.Product || {};
      const variant = item.ProductVariant || {};
      const price = product.price || {};
      const primaryImage = variant.images?.[0]?.imageUrl || null;

      return {
        wishlistId: item.id,
        addedAt: item.createdAt,

        product: {
          id: product.id,
          title: product.title,
          slug: product.slug,

          price: {
            mrp: price.mrp || 0,
            sellingPrice: price.sellingPrice || 0,
            discountPercent: price.discountPercent || 0,
          },
        },

        variant: {
          id: variant.id,
          colorName: variant.colorName,
          colorCode: variant.colorCode,
          image: primaryImage,

          sizes:
            variant.VariantSizes?.map((s) => ({
              sizeId: s.id,
              size: s.size,
              stock: s.stock,
              inStock: s.stock > 0,
            })) || [],
        },
      };
    });

    return res.json({
      success: true,
      total: formattedWishlist.length,
      data: formattedWishlist,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const item = await Wishlist.findOne({ where: { id, userId } });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Wishlist item not found",
      });
    }

    await item.destroy();

    res.json({
      success: true,
      message: "Removed from wishlist",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.clearWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    await Wishlist.destroy({ where: { userId } });

    res.json({
      success: true,
      message: "Wishlist cleared",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
