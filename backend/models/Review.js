const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true, unique: true },
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String },
        content: { type: String, required: true },
        images: [{ type: String }],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
