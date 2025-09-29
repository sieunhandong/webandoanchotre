const Category = require("../models/Category");
const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server!", error: error.message });
    }
}
const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: "Không tìm thấy danh mục" });
        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy danh mục", error: error.message });
    }
};

module.exports = {
    getAllCategories,
    getCategoryById
};