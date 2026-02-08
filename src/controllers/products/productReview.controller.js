// const ProductReview = require("../../models/products/productReview.model")

// /**
//  * CREATE REVIEW
//  */
// exports.createReview = async (req, res) => {
//   try {
//     const {
//       productId,
//       userId,
//       userName,
//       rating,
//       title,
//       reviewText,
//       isVerifiedBuyer
//     } = req.body

//     if (!productId || !rating) {
//       return res.status(400).json({
//         message: "productId and rating are required"
//       })
//     }

//     const review = await ProductReview.create({
//       productId,
//       userId,
//       userName,
//       rating,
//       title,
//       reviewText,
//       isVerifiedBuyer
//     })

//     res.status(201).json({
//       message: "Review added successfully",
//       data: review
//     })
//   } catch (error) {
//     res.status(500).json({
//       message: "Failed to create review",
//       error: error.message
//     })
//   }
// }

// /**
//  * GET ALL REVIEWS OF A PRODUCT
//  */
// exports.getReviewsByProduct = async (req, res) => {
//   try {
//     const { productId } = req.params

//     const reviews = await ProductReview.findAll({
//       where: { productId },
//       order: [["createdAt", "DESC"]]
//     })

//     res.status(200).json({
//       total: reviews.length,
//       data: reviews
//     })
//   } catch (error) {
//     res.status(500).json({
//       message: "Failed to fetch reviews",
//       error: error.message
//     })
//   }
// }

// /**
//  * UPDATE REVIEW
//  */
// exports.updateReview = async (req, res) => {
//   try {
//     const { id } = req.params

//     const review = await ProductReview.findByPk(id)

//     if (!review) {
//       return res.status(404).json({ message: "Review not found" })
//     }

//     await review.update(req.body)

//     res.status(200).json({
//       message: "Review updated successfully",
//       data: review
//     })
//   } catch (error) {
//     res.status(500).json({
//       message: "Failed to update review",
//       error: error.message
//     })
//   }
// }

// /**
//  * DELETE REVIEW
//  */
// exports.deleteReview = async (req, res) => {
//   try {
//     const { id } = req.params

//     const review = await ProductReview.findByPk(id)

//     if (!review) {
//       return res.status(404).json({ message: "Review not found" })
//     }

//     await review.destroy()

//     res.status(200).json({
//       message: "Review deleted successfully"
//     })
//   } catch (error) {
//     res.status(500).json({
//       message: "Failed to delete review",
//       error: error.message
//     })
//   }
// }


// // // 
// // exports.createOrUpdateReview = async (req, res) => {
// //   try {
// //     const {
// //       productId,
// //       userId,
// //       userName,
// //       rating,
// //       title,
// //       reviewText,
// //       isVerifiedBuyer
// //     } = req.body

// //     const existingReview = await ProductReview.findOne({
// //       where: { productId, userId }
// //     })

// //     let review

// //     if (existingReview) {
// //       review = await existingReview.update({
// //         rating,
// //         title,
// //         reviewText,
// //         isVerifiedBuyer
// //       })

// //       return res.status(200).json({
// //         message: "Review updated successfully",
// //         data: review
// //       })
// //     }

// //     review = await ProductReview.create({
// //       productId,
// //       userId,
// //       userName,
// //       rating,
// //       title,
// //       reviewText,
// //       isVerifiedBuyer
// //     })

// //     res.status(201).json({
// //       message: "Review added successfully",
// //       data: review
// //     })
// //   } catch (error) {
// //     res.status(500).json({
// //       message: "Failed to save review",
// //       error: error.message
// //     })
// //   }
// // }






const ProductReview = require("../../models/products/productReview.model")
const ProductRating = require("../../models/products/productRating.model")
const { calculateRatingFromReviews } = require("../../services/rating.service")
const sequelize = require("../../config/db")

// Helper function to sync the rating table
const syncProductRating = async (productId, transaction) => {
    // 1. Get all current reviews for this product
    const reviews = await ProductReview.findAll({ 
        where: { productId },
        transaction 
    });

    // 2. Calculate new summary
    const summary = calculateRatingFromReviews(reviews);

    // 3. Update or Create the entry in ProductRating table
    await ProductRating.upsert({
        productId,
        ...summary
    }, { transaction });
};

/**
 * CREATE REVIEW
 */
exports.createReview = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { productId, userId, userName, rating, title, reviewText, isVerifiedBuyer } = req.body;

        if (!productId || !rating) {
            return res.status(400).json({ message: "productId and rating are required" });
        }

        // Create the review
        const review = await ProductReview.create({
            productId, userId, userName, rating, title, reviewText, isVerifiedBuyer
        }, { transaction: t });

        // Update the rating summary table
        await syncProductRating(productId, t);

        await t.commit();
        res.status(201).json({ message: "Review added and rating updated", data: review });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: "Failed to create review", error: error.message });
    }
}

/**
 * UPDATE REVIEW
 */
exports.updateReview = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const review = await ProductReview.findByPk(id);

        if (!review) return res.status(404).json({ message: "Review not found" });

        await review.update(req.body, { transaction: t });

        // Recalculate and sync
        await syncProductRating(review.productId, t);

        await t.commit();
        res.status(200).json({ message: "Review and rating updated", data: review });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: "Failed to update review", error: error.message });
    }
}

/**
 * DELETE REVIEW
 */
exports.deleteReview = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const review = await ProductReview.findByPk(id);

        if (!review) return res.status(404).json({ message: "Review not found" });

        const productId = review.productId;
        await review.destroy({ transaction: t });

        // Recalculate and sync
        await syncProductRating(productId, t);

        await t.commit();
        res.status(200).json({ message: "Review deleted and rating recalculated" });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: "Failed to delete review", error: error.message });
    }
}
/**
 * GET ALL REVIEWS OF A PRODUCT
 */
exports.getReviewsByProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        const reviews = await ProductReview.findAll({
            where: { productId },
            order: [["createdAt", "DESC"]]
        });

        res.status(200).json({
            success: true,
            total: reviews.length,
            data: reviews
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch reviews",
            error: error.message
        });
    }
};