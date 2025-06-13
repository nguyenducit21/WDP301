const Category = require('../models/category.model');

// Lấy tất cả danh mục
exports.findAll = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Thêm danh mục mới
exports.create = async (req, res) => {
  try {
    const { name, description, is_active } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Tên danh mục là bắt buộc" });
    }
    // Kiểm tra trùng tên (nếu cần)
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: "Tên danh mục đã tồn tại" });
    }

    const newCategory = new Category({
      name,
      description: description || "",
      is_active: is_active !== false,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const savedCategory = await newCategory.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Xóa danh mục
exports.delete = async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);
    if (!deletedCategory) {
      return res.status(404).json({ message: "Không tìm thấy danh mục để xóa" });
    }
    res.status(200).json({ message: "Xóa thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật danh mục
exports.update = async (req, res) => {
  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedCategory) {
      return res.status(404).json({ message: "Không tìm thấy danh mục để cập nhật" });
    }
    res.status(200).json(updatedCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};