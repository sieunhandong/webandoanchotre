const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
    {
        reviewId: { type: mongoose.Schema.Types.ObjectId, ref: "Review", required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: true },
        isApproved: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
