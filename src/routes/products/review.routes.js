
const express = require("express")
const router = express.Router()

const reviewController = require("../../controllers/products/productReview.controller")

// Reviews
router.post("/", reviewController.createReview)
router.get("/:productId", reviewController.getReviewsByProduct)
router.put("/:id", reviewController.updateReview)
router.delete("/:id", reviewController.deleteReview)

module.exports = router