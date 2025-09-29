const Feedback = require("../models/Feedback");

exports.getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("book", "title") // Lấy tiêu đề sách
      .populate("user", "name") // Lấy tên user
      .sort({ createdAt: -1 }); // Sắp xếp theo thời gian mới nhất

    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy danh sách feedback",
      error: error.message,
    });
  }
};

exports.deleteFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const feedback = await Feedback.findById(feedbackId);

    if (!feedback) {
      return res.status(404).json({ message: "Không tìm thấy feedback" });
    }

    await feedback.deleteOne();
    res.status(200).json({ message: "Feedback đã được xóa" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi khi xóa feedback", error: error.message });
  }
};
exports.getFeedbacksByBook = async (req, res) => {
  try {
    const { id } = req.params;
    const feedbacks = await Feedback.find({ book: id })
      .populate("book", "title") // Lấy tiêu đề sách
      .populate("user", "name") // Lấy tên user
      .sort({ createdAt: -1 }); // Sắp xếp theo thời gian mới nhất

    if (feedbacks.length === 0) {
      return res
        .status(404)
        .json({ message: "Không có feedback cho sách này" });
    }

    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy feedbacks cho sách",
      error: error.message,
    });
  }
};

exports.getFeedbacksByUser = async (req, res) => {
  try {
    const { id } = req.params;
    const feedbacks = await Feedback.find({ user: id })
      .populate("book", "title") // Lấy tiêu đề sách
      .populate("user", "name") // Lấy tên user
      .sort({ createdAt: -1 }); // Sắp xếp theo thời gian mới nhất

    if (feedbacks.length === 0) {
      return res
        .status(404)
        .json({ message: "Không có feedback cho người dùng này" });
    }

    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy feedbacks cho người dùng",
      error: error.message,
    });
  }
};
