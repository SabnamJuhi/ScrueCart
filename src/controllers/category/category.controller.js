const { Category, SubCategory, ProductCategory, Product} = require("../../models");
const sequelize = require("../../config/db");

//CREATE CATEGORY (Admin)
exports.createCategory = async (req, res) => {
  const { name, description } = req.body

  if (!name) {
    return res.status(400).json({ message: "Category name is required" })
  }

  const exists = await Category.findOne({ where: { name } })
  if (exists) {
    return res.status(409).json({ message: "Category already exists" })
  }

  const category = await Category.create({
    name,
    description
  })

  res.status(201).json({
    message: "Category created successfully",
    category
  })
}

//GET ALL CATEGORIES (Public)
// exports.getAllCategories = async (req, res) => {
//   try {
//     const categories = await Category.findAll({
//       attributes: ["id", "name"], // ✅ Only return needed fields
//       order: [["id", "ASC"]]
//     })

//     res.status(200).json({
//       success: true,
//       data: categories
//     })
//   } catch (error) {
//     console.error("GetAllCategories Error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch categories"
//     })
//   }
// }



// GET CATEGORY BY ID (Nested with Sub and Product Categories)
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
      attributes: ["id", "name", "isActive"],
      include: [
        {
          model: SubCategory,
          as: "subcategories", // Must match the alias in your models/index.js
          attributes: ["id", "name", "isActive"],
          include: [
            {
              model: ProductCategory,
              as: "productCategories", // Must match the alias in your models/index.js
              attributes: ["id", "name", "isActive"]
            }
          ]
        }
      ]
    });

    // Check if category exists
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });

  } catch (error) {
    console.error("GetCategoryById Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch category details",
      error: error.message
    });
  }
};

//UPDATE CATEGORY 
// exports.updateCategory = async (req, res) => {
//   const { name, description, isActive } = req.body

//   const category = await Category.findByPk(req.params.id)
//   if (!category) {
//     return res.status(404).json({ message: "Category not found" })
//   }

//   await category.update({
//     name: name ?? category.name,
//     description: description ?? category.description,
//     isActive: isActive ?? category.isActive
//   })

//   res.json({
//     message: "Category updated successfully",
//     category
//   })
// }

exports.updateCategory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const category = await Category.findByPk(id, { transaction: t });
    if (!category) {
      await t.rollback();
      return res.status(404).json({ message: "Category not found" });
    }

    // Update Category Details
    await category.update({
      name: name ?? category.name,
      description: description ?? category.description,
      isActive: isActive ?? category.isActive
    }, { transaction: t });

    // CASCADE LOGIC: If isActive is being set to true
    if (isActive === true) {
      // 1. Activate all SubCategories
      await SubCategory.update(
        { isActive: true },
        { where: { categoryId: id }, transaction: t }
      );

      // 2. Activate all ProductCategories
      await ProductCategory.update(
        { isActive: true },
        { where: { categoryId: id }, transaction: t }
      );

      // 3. Activate all Products
      await Product.update(
        { isActive: true },
        { where: { categoryId: id }, transaction: t }
      );
    } 
    // OPTIONAL: If you want 'isActive: false' in Update to also cascade (like Delete)
    else if (isActive === false) {
      await SubCategory.update({ isActive: false }, { where: { categoryId: id }, transaction: t });
      await ProductCategory.update({ isActive: false }, { where: { categoryId: id }, transaction: t });
      await Product.update({ isActive: false }, { where: { categoryId: id }, transaction: t });
    }

    await t.commit();

    res.json({
      success: true,
      message: isActive === true 
        ? "Category and all associated items activated successfully" 
        : "Category updated successfully",
      category
    });

  } catch (error) {
    await t.rollback();
    console.error("UpdateCategory Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message
    });
  }
};

//DELETE CATEGORY (Admin – Soft Delete)
// exports.deleteCategory = async (req, res) => {
//   const category = await Category.findByPk(req.params.id)

//   if (!category) {
//     return res.status(404).json({ message: "Category not found" })
//   }

//   await category.update({ isActive: false })

//   res.json({ message: "Category disabled successfully" })
// }

exports.deleteCategory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;

    // 1. Verify Category exists
    const category = await Category.findByPk(id, { transaction: t });
    if (!category) {
      await t.rollback();
      return res.status(404).json({ message: "Category not found" });
    }

    // 2. Deactivate the Category
    await category.update({ isActive: false }, { transaction: t });

    // 3. Deactivate all SubCategories under this Category
    await SubCategory.update(
      { isActive: false },
      { where: { categoryId: id }, transaction: t }
    );

    // 4. Deactivate all ProductCategories under this Category
    await ProductCategory.update(
      { isActive: false },
      { where: { categoryId: id }, transaction: t }
    );

    // 5. Deactivate all Products belonging to this Category
    await Product.update(
      { isActive: false }, 
      { 
    where: { categoryId: id }, 
    transaction: t            
  }
    );

    await t.commit();

    res.json({ 
      success: true, 
      message: "Category, SubCategories, ProductCategories, and Products have all been disabled." 
    });

  } catch (error) {
    await t.rollback();
    console.error("Full Cascade Delete Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// GET ALL CATEGORIES (Nested with Sub and Product Categories)
exports.getAllNestedCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: ["id", "name", "isActive"],
      include: [
        {
          model: SubCategory,
          as: "subcategories", // Matches 'as' in models/index.js
          attributes: ["id", "name", "isActive"],
          include: [
            {
              model: ProductCategory,
              as: "productCategories", // Matches 'as' in models/index.js
              attributes: ["id", "name", "isActive"]
            }
          ]
        }
      ],
      order: [["id", "ASC"]]
    });

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error("GetAllCategories Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message
    });
  }
};