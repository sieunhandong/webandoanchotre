const Review = require("../models/Review");
const Book = require("../models/Book");

const createReview = async (req, res) => {
  try {
    const { title, bookId, content } = req.body;

    if (!title || !bookId || !content) {
      return res.status(400).json({ message: "Thiếu dữ liệu cần thiết." });
    }
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Không tìm thấy sách" });

    const existing = await Review.findOne({ bookId });
    if (existing)
      return res
        .status(400)
        .json({ message: "Review cho sách này đã tồn tại" });

    const imageUrls = req.files?.map((file) => file.path) || [];

    const newReview = new Review({
      title,
      bookId,
      content, // HTML từ CKEditor
      adminId: req.user._id,
      images: imageUrls,
    });

    await newReview.save();
    res.status(201).json({ message: "Review đã được tạo", newReview });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi tạo review", error: error.message });
  }
};

const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find().populate(
      "bookId adminId",
      "title name"
    );
    return res.status(200).json(reviews);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).populate(
      "bookId adminId",
      "title name"
    );
    if (!review)
      return res.status(404).json({ message: "Không tìm thấy review" });

    return res.status(200).json(review);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!review)
      return res.status(404).json({ message: "Không tìm thấy review" });

    return res.status(200).json({ message: "Cập nhật thành công", review });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Xoá review thành công" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createReview,
  getAllReviews,
  getReviewById,
  updateReview,
  deleteReview,
};
