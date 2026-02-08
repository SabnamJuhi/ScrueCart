const express = require("express")
const router = express.Router()

const productController = require("../../controllers/product.aggregate.controller")
// const upload = require('../../middleware/upload');
const upload = require("../../middleware/uploadCloudinary");
const { createProduct } = require("../../controllers/Aggregate-Products/createProductDetails.controller");
const { updateProductDetails } = require("../../controllers/Aggregate-Products/updateProductDetails.controller");
const { softDeleteProduct } = require("../../controllers/Aggregate-Products/softDeleteProductDetails.controller");
const { deleteProductPermanently } = require("../../controllers/Aggregate-Products/deleteProductPermanently.controller");
const { getAllProductsDetails } = require("../../controllers/Aggregate-Products/getAllProductDetails.controller");
const { getProductById } = require("../../controllers/Aggregate-Products/getProductDetailsById.controller");
const { getProductFilters } = require("../../controllers/Aggregate-Products/getProductFilters.controller");
const { getFilteredProducts } = require("../../controllers/Aggregate-Products/getFilteredProduct.controller");

const adminAuth = require("../../middleware/admin.auth.middleware")


// router.post("/products", upload.any(), productController.createProduct)
router.post("/products", upload.any(), adminAuth, createProduct)


// router.get("/filter", productController.getFilteredProducts);
// router.get("/filterd-product", productController.getProductFilters);
router.get("/filters", getProductFilters);        // ✅ filter metadata
router.get("/products", getFilteredProducts); 

// router.get("/", productController.getAllProductsDetails)
// router.get("/:id", productController.getProductById)
router.get("/", getAllProductsDetails)
router.get("/:id", getProductById)

// router.put("/:id", upload.any(), productController.updateProductDetails)
router.put("/:id", upload.any(), adminAuth, updateProductDetails)

// router.delete('/:id', productController.softDeleteProduct)
router.delete('/:id', adminAuth, softDeleteProduct)

// router.delete('/delete/:id', productController.deleteProductPermanently)
router.delete('/delete/:id', adminAuth, deleteProductPermanently)


module.exports = router
