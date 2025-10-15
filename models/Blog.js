const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
    {
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true,
        },
        title: { type: String, required: true },
        content: { type: String, required: true },
        images: [{ type: String }],
        blogCategoryId: {  // <--- đổi tên
            type: mongoose.Schema.Types.ObjectId,
            ref: "BlogCategory",
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Blog", blogSchema);
