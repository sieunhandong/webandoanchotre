const Comment = require('../models/Comment');
const Review = require('../models/Review');

const createComment = async (req, res) => {
    try {
        const { reviewId, content } = req.body;

        const review = await Review.findById(reviewId);
        if (!review) return res.status(404).json({ message: "Không tìm thấy review" });

        const comment = await Comment.create({
            reviewId,
            content,
            userId: req.user._id,
            isApproved: false
        });

        return res.status(201).json({ message: "Đã gửi bình luận, chờ duyệt", comment });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getCommentsByReview = async (req, res) => {
    try {
        const { reviewId } = req.params;

        const comments = await Comment.find({
            reviewId,
            isApproved: true
        }).populate("userId", "name");

        return res.status(200).json(comments);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getAllComments = async (req, res) => {
    try {
        const comments = await Comment.find().populate("reviewId userId", "title name");
        return res.status(200).json(comments);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const approveComment = async (req, res) => {
    try {
        const comment = await Comment.findByIdAndUpdate(
            req.params.id,
            { isApproved: true },
            { new: true }
        );

        if (!comment) return res.status(404).json({ message: "Không tìm thấy comment" });

        return res.status(200).json({ message: "Đã duyệt bình luận", comment });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const deleteComment = async (req, res) => {
    try {
        await Comment.findByIdAndDelete(req.params.id);
        return res.status(200).json({ message: "Đã xoá bình luận" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createComment,
    getCommentsByReview,
    getAllComments,
    approveComment,
    deleteComment
};
