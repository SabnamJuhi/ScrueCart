const express = require("express");
const router = express.Router();
const multer = require("multer");

const upload = multer({ dest: "uploads/" });

const {
  bulkCreateProductsFromExcel,
} = require("../../controllers/Bulk Product Upload/BulkProductUpload.controller");

router.post(
  "/bulk-upload-products",
  upload.single("file"),
  bulkCreateProductsFromExcel
);

module.exports = router;
