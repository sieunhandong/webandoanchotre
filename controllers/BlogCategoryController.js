// controllers/BlogCategoryController.js
const BlogCategory = require("../models/BlogCategory");

// Tạo danh mục mới
const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: "Tên danh mục là bắt buộc." });

        const exists = await BlogCategory.findOne({ name });
        if (exists) return res.status(400).json({ message: "Danh mục đã tồn tại." });

        const newCategory = await BlogCategory.create({ name });
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy tất cả danh mục
const getAllCategories = async (req, res) => {
    try {
        const categories = await BlogCategory.find().sort({ createdAt: -1 });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Cập nhật danh mục
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const updated = await BlogCategory.findByIdAndUpdate(id, { name }, { new: true });
        if (!updated) return res.status(404).json({ message: "Không tìm thấy danh mục." });

        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Xóa danh mục
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await BlogCategory.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: "Không tìm thấy danh mục." });

        res.status(200).json({ message: "Xóa danh mục thành công." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createCategory,
    getAllCategories,
    updateCategory,
    deleteCategory,
};
