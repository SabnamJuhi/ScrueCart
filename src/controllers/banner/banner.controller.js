const Banner = require("../../models/banner/banner.model");
const cloudinary = require("../../config/cloudinary");


/* CREATE BANNER */
exports.createBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

    const { title, subtitle, cta, link } = req.body;

    const banner = await Banner.create({
      title,
      subtitle,
      cta,
      link,
      imageUrl: req.file.path,
    });

    res.json({ success: true, data: banner, message: "Banner created" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Create failed", error: err.message });
  }
};


/* GET ALL ACTIVE BANNERS */
exports.getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.findAll({
      where: { isActive: true },
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, data: banners });
  } catch (err) {
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};


/* UPDATE BANNER */
exports.updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: "Banner not found" });

    // if new image uploaded → delete old from cloudinary
    if (req.file) {
      await cloudinary.uploader.destroy(banner.publicId);

      banner.imageUrl = req.file.path;
    }

    const { title, subtitle, cta, link, isActive } = req.body;

    await banner.update({ title, subtitle, cta, link, isActive });

    res.json({ success: true, data: banner, message: "Banner updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};


/* DELETE BANNER (soft + cloudinary delete optional) */
exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: "Banner not found" });

    // remove image from cloudinary
    await cloudinary.uploader.destroy(banner.publicId);

    await banner.destroy(); // or use isActive false

    res.json({ success: true, message: "Banner deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};
