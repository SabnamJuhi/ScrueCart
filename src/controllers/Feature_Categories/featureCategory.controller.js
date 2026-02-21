const { FeaturedCategory, Category } = require("../../models");

exports.addFeaturedCategories = async (req, res) => {
  try {
    const { categoryIds } = req.body; 
    // Expecting: [1,2,3]

    if (!Array.isArray(categoryIds) || !categoryIds.length) {
      return res.status(400).json({
        success: false,
        message: "categoryIds array is required",
      });
    }

    // Optional: Validate categories exist
    const existing = await Category.findAll({
      where: { id: categoryIds },
      attributes: ["id"],
    });

    const existingIds = existing.map((c) => c.id);

    const rows = existingIds.map((id, index) => ({
      categoryId: id,
      sortOrder: index + 1,
    }));

    await FeaturedCategory.bulkCreate(rows);

    return res.status(201).json({
      success: true,
      message: "Featured categories added successfully",
    });
  } catch (error) {
    console.error("Add Featured Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getFeaturedCategories = async (req, res) => {
  try {
    const featured = await FeaturedCategory.findAll({
      where: { isActive: true },
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "isActive"],
        },
      ],
      order: [["sortOrder", "ASC"]],
    });

    return res.json({
      success: true,
      data: featured,
    });
  } catch (error) {
    console.error("Get Featured Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.removeFeaturedCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const row = await FeaturedCategory.findByPk(id);
    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    await row.destroy();

    return res.json({
      success: true,
      message: "Removed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateFeaturedCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, isActive, sortOrder } = req.body;

    const row = await FeaturedCategory.findByPk(id);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Featured category not found",
      });
    }

    // Optional: If categoryId is being updated, validate it exists
    if (categoryId) {
      const categoryExists = await Category.findByPk(categoryId);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid categoryId",
        });
      }
      row.categoryId = categoryId;
    }

    // Update fields if provided
    if (typeof isActive !== "undefined") {
      row.isActive = isActive;
    }

    if (typeof sortOrder !== "undefined") {
      row.sortOrder = sortOrder;
    }

    await row.save();

    return res.json({
      success: true,
      message: "Featured category updated successfully",
      data: row,
    });
  } catch (error) {
    console.error("Update Featured Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};