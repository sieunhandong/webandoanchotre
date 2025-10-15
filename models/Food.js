const mongoose = require("mongoose");


const foodSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        ingredients: { type: String, required: true }, // có thể lưu dạng HTML hoặc plain text
        recipe: { type: String, required: true }, // công thức nấu
        images: [{ type: String }], // URL hình ảnh
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Food", foodSchema);