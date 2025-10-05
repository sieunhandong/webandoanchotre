const mongoose = require("mongoose");

const UserProfileSchema = new mongoose.Schema({
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true }, // ai sở hữu profile này

    monthAge: { type: Number, required: true }, // tháng tuổi
    height: { type: Number, required: true },   // cm
    weight: { type: Number, required: true },   // kg
    gender: { type: String, enum: ["male", "female"], required: true },
    method: {
        type: String,
        enum: ["traditional", "blw", "mixed"],
        required: true
    },
    likes: [{ type: String }],
    allergies: [{ type: String }],
    dislikes: [{ type: String }],
    selectedProducts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product", // hoặc Product, tùy schema bạn đang dùng
        },
    ],
    mealSuggestions: [
        {
            day: Number,
            menu: String,
            reason: String,
        },
    ],

}, { timestamps: true });

module.exports = mongoose.model("UserProfile", UserProfileSchema);
