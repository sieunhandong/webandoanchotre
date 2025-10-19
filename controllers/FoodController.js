const Food = require('../models/Food');
// --- Lấy 6 món ăn mới nhất cho Home ---
const getHomeFoods = async (req, res) => {
    try {
        const foods = await Food.find()
            .sort({ createdAt: -1 })
            .limit(8);

        res.status(200).json({ success: true, data: foods });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Không thể lấy món ăn", error: error.message });
    }
};

// --- Lấy tất cả món ăn (có filter + phân trang) ---
const getAllFoods = async (req, res) => {
    try {
        let { page = 1, limit = 12, search = "" } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { ingredients: { $regex: search, $options: "i" } },
            ];
        }

        const total = await Food.countDocuments(filter);

        const foods = await Food.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({ success: true, data: foods, total });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Không thể lấy món ăn", error: error.message });
    }
};

module.exports = { getHomeFoods, getAllFoods };
