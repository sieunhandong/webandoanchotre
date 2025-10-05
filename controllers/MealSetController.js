const MealSet = require("../models/MealSet");

// Tạo set ăn
exports.createMealSet = async (req, res) => {
    try {
        const { title, duration, price, description } = req.body;

        if (!title || !duration || !price) {
            return res.status(400).json({ success: false, message: "Thiếu dữ liệu bắt buộc (title, duration, price)" });
        }

        const mealSet = new MealSet({
            title,
            duration,
            price,
            description,
        });

        await mealSet.save();

        res.status(201).json({ success: true, data: mealSet });
    } catch (error) {
        console.error("Lỗi khi tạo MealSet:", error);
        res.status(500).json({ success: false, message: "Không thể tạo set ăn", error: error.message });
    }
};

// Lấy danh sách tất cả set ăn
exports.getAllMealSets = async (req, res) => {
    try {
        const sets = await MealSet.find().sort({ createdAt: -1 });
        res.json({ success: true, data: sets });
    } catch (error) {
        res.status(500).json({ success: false, message: "Không thể lấy danh sách set ăn", error: error.message });
    }
};

// Lấy chi tiết 1 set ăn theo ID
exports.getMealSetById = async (req, res) => {
    try {
        const set = await MealSet.findById(req.params.id);
        if (!set) {
            return res.status(404).json({ success: false, message: "Không tìm thấy set ăn" });
        }
        res.json({ success: true, data: set });
    } catch (error) {
        res.status(500).json({ success: false, message: "Không thể lấy chi tiết set ăn", error: error.message });
    }
};

// Cập nhật set ăn
exports.updateMealSet = async (req, res) => {
    try {
        const set = await MealSet.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!set) {
            return res.status(404).json({ success: false, message: "Không tìm thấy set ăn" });
        }
        res.json({ success: true, data: set });
    } catch (error) {
        res.status(500).json({ success: false, message: "Không thể cập nhật set ăn", error: error.message });
    }
};

// Xóa set ăn
exports.deleteMealSet = async (req, res) => {
    try {
        const set = await MealSet.findByIdAndDelete(req.params.id);
        if (!set) {
            return res.status(404).json({ success: false, message: "Không tìm thấy set ăn" });
        }
        res.json({ success: true, message: "Xóa set ăn thành công" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Không thể xóa set ăn", error: error.message });
    }
};
