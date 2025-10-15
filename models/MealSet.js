const mongoose = require("mongoose");

const MealSetSchema = new mongoose.Schema({
    title: { type: String, required: true }, // ví dụ: Set 3 ngày
    duration: { type: Number, required: true }, // số ngày
    price: { type: Number, required: true },
    description: String,
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("MealSet", MealSetSchema);
