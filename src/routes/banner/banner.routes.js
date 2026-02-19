const express = require("express");
const router = express.Router();

const upload = require("../../middleware/uploadCloudinary");

const {
  createBanner,
  getAllBanners,
  updateBanner,
  deleteBanner,
} = require("../../controllers/banner/banner.controller");

router.post("/", upload.single("image"), createBanner);
router.get("/", getAllBanners);
router.put("/:id", upload.single("image"), updateBanner);
router.delete("/:id", deleteBanner);

module.exports = router;
