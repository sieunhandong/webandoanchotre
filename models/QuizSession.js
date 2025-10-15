const mongoose = require("mongoose");

const quizSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    sessionId: { type: String, required: true, unique: true },
    step: { type: Number, default: 1 },
    data: {
        age: { type: String },
        weight: { type: String },
        allergies: [{ type: String }],
        feedingMethod: { type: String, enum: ["traditional", "blw", "japanese"] },
        selectedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
        selectedSet: {
            setId: { type: mongoose.Schema.Types.ObjectId, ref: 'MealSet' },
            duration: { type: Number },
            price: { type: Number },
        },
        delivery: {
            time: { type: String },
            address: {
                address: { type: String },
                provinceId: { type: Number },
                provinceName: { type: String },
                districtId: { type: Number },
                districtName: { type: String },
                wardCode: { type: String },
                wardName: { type: String },
            },
        },
        mealSuggestions: [{ // Định nghĩa rõ ràng
            day: { type: Number, required: true },
            meals: [{ type: String, required: true }],
        }],
    },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => Date.now() + 24 * 60 * 60 * 1000 },
}, { timestamps: true });

module.exports = mongoose.model("QuizSession", quizSessionSchema);