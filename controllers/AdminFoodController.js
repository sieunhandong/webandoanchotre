import Food from "../models/Food.js";

// --- Get all foods (tìm kiếm theo name) ---
export const getAllFoods = async (req, res) => {
    try {
        const { search, page = 1, limit = 5 } = req.query;
        const filter = {};

        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        const total = await Food.countDocuments(filter);
        const foods = await Food.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.status(200).json({ foods, total });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- Get single food ---
export const getFoodById = async (req, res) => {
    try {
        const food = await Food.findById(req.params.id);
        if (!food) return res.status(404).json({ message: "Không tìm thấy món ăn" });
        res.status(200).json(food);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- Create food ---
export const createFood = async (req, res) => {
    try {
        const { name, ingredients, recipe } = req.body;
        const imageUrls = req.files?.map((file) => file.path) || [];
        const newFood = new Food({ name, ingredients, recipe, images: imageUrls, adminId: req.user?._id });
        await newFood.save();
        res.status(201).json(newFood);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- Update food ---
export const updateFood = async (req, res) => {
    try {
        const { name, ingredients, recipe } = req.body;
        const food = await Food.findById(req.params.id);
        if (!food) return res.status(404).json({ message: "Không tìm thấy món ăn" });

        if (name) food.name = name;
        if (ingredients) food.ingredients = ingredients;
        if (recipe) food.recipe = recipe;
        if (req.files?.length) {
            food.images = req.files.map(f => `/uploads/${f.filename}`);
        }

        await food.save();
        res.status(200).json(food);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- Delete food ---
export const deleteFood = async (req, res) => {
    try {
        const food = await Food.findByIdAndDelete(req.params.id);
        if (!food) return res.status(404).json({ message: "Không tìm thấy món ăn" });
        res.status(200).json({ message: "Xóa món ăn thành công" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
