// /**
//  * PRICE CALCULATION SERVICE
//  * All price-related business logic lives here
//  */

// /**
//  * Calculate discount percentage from MRP and selling price
//  * @param {number} mrp
//  * @param {number} sellingPrice
//  * @returns {number} discountPercentage
//  */
// exports.calculateDiscountPercentage = (mrp, sellingPrice) => {
//   if (!mrp || !sellingPrice) return 0
//   if (mrp <= 0 || sellingPrice < 0) return 0

//   const discount = ((mrp - sellingPrice) / mrp) * 100
//   return Math.round(discount)
// }

// /**
//  * Validate price values
//  * @param {number} mrp
//  * @param {number} sellingPrice
//  */
// exports.validatePrice = (mrp, sellingPrice) => {
//   if (sellingPrice > mrp) {
//     throw new Error("Selling price cannot be greater than MRP")
//   }
// }

// /**
//  * Generate price object (useful for seeding / bulk create)
//  * @param {number} baseMrp
//  * @param {number} baseSelling
//  * @param {number} index
//  */
// exports.generatePriceByIndex = (baseMrp, baseSelling, index) => {
//   const mrp = baseMrp + index * 500
//   const sellingPrice = baseSelling + index * 400

//   return {
//     mrp,
//     sellingPrice,
//     discountPercentage: exports.calculateDiscountPercentage(mrp, sellingPrice),
//     currency: "INR"
//   }
// }



const ProductPrice = require("../models/products/price.model")

exports.upsert = async (productId, price, transaction) => {
  const discountPercentage =
    Math.round(((price.mrp - price.sellingPrice) / price.mrp) * 100)

  const [row] = await ProductPrice.findOrCreate({
    where: { productId },
    defaults: {
      ...price,
      discountPercentage,
      currency: price.currency || "INR"
    },
    transaction
  })

  return row.update(
    { ...price, discountPercentage },
    { transaction }
  )
}
