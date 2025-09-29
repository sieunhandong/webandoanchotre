const Feedback = require('../models/Feedback');
const Book = require('../models/Book');

// Hàm tính toán average rating
const getAverageRating = async (bookId) => {
    const feedbacks = await Feedback.find({ book: bookId });

    if (feedbacks.length === 0) {
        return 0; // Nếu không có đánh giá, trả về 0
    }

    const totalRating = feedbacks.reduce((acc, feedback) => acc + feedback.rating, 0);
    return totalRating / feedbacks.length;  // Tính trung bình rating
};

// Tạo một đánh giá mới
const createFeedback = async (req, res) => {
    try {
        const { bookId } = req.params;  // Lấy bookId từ params
        const { rating, comment } = req.body;  // Lấy rating và comment từ body

        // Kiểm tra nếu sách tồn tại
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: "Không tìm thấy cuốn sách" });
        }

        // Kiểm tra nếu người dùng đã đánh giá cuốn sách này
        const existingFeedback = await Feedback.findOne({ book: bookId, user: req.user._id });
        if (existingFeedback) {
            return res.status(400).json({ message: "Bạn đã đánh giá cuốn sách này rồi" });
        }

        // Tạo mới review
        const feedback = new Feedback({
            book: bookId,
            user: req.user._id,
            rating,
            comment
        });

        await feedback.save();

        // Tính toán average rating mới cho sách
        const averageRating = await getAverageRating(bookId);

        return res.status(201).json({ message: "Đánh giá cuốn sách thành công", feedback, averageRating });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Lấy danh sách đánh giá của một cuốn sách
const getFeedbacksByBook = async (req, res) => {
    try {
        const { bookId } = req.params;

        // Kiểm tra nếu sách tồn tại
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: "Không tìm thấy cuốn sách" });
        }

        // Lấy tất cả đánh giá của cuốn sách
        const feedbacks = await Feedback.find({ book: bookId }).populate('user', 'name');

        // Tính toán average rating của sách
        const averageRating = await getAverageRating(bookId);

        return res.status(200).json({ feedbacks, averageRating });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getUserFeedback = async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user._id; // Lấy userId từ thông tin người dùng trong req.user

        // Tìm đánh giá của người dùng cho sách này
        const feedback = await Feedback.findOne({ book: bookId, user: userId });

        // if (!feedback) {
        //     return res.status(404).json({ message: "Không tìm thấy đánh giá của người dùng này" });
        // }

        return res.status(200).json(feedback);
    } catch (error) {
        console.error("Lỗi khi lấy đánh giá của người dùng:", error);
        return res.status(500).json({ message: "Lỗi server" });
    }
};

// Cập nhật đánh giá của người dùng
const updateFeedback = async (req, res) => {
    try {
        const { feedbackId } = req.params;
        const { rating, comment } = req.body;

        // Tìm review theo reviewId
        const feedback = await Feedback.findById(feedbackId);
        if (!feedback) {
            return res.status(404).json({ message: "Không tìm thấy đánh giá này" });
        }

        // Kiểm tra xem người dùng có phải là người đã tạo review này không
        if (feedback.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Bạn không được phép sửa đánh giá này" });
        }

        // Cập nhật review
        feedback.rating = rating || feedback.rating;
        feedback.comment = comment || feedback.comment;

        await feedback.save();

        // Tính toán lại average rating sau khi cập nhật
        const averageRating = await getAverageRating(feedback.book);

        return res.status(200).json({ message: "Đánh giá đã cập nhật", feedback, averageRating });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Xóa một đánh giá
const deleteFeedback = async (req, res) => {
    try {
        const { feedbackId } = req.params;

        // Tìm review theo reviewId
        const feedback = await Feedback.findById(feedbackId);
        if (!feedback) {
            return res.status(404).json({ message: "Không tìm thấy đánh giá này" });
        }

        // Kiểm tra xem người dùng có phải là người đã tạo feedback này không
        if (!req.user || feedback.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Bạn không được phép xóa đánh giá này" });
        }

        // Lưu lại bookId để tính lại average rating sau khi xóa
        const bookId = feedback.book;

        // Xóa feedback (sử dụng findByIdAndDelete để đảm bảo tính tương thích)
        await Feedback.findByIdAndDelete(feedbackId);

        // Tính toán lại average rating sau khi xóa
        const averageRating = await getAverageRating(bookId);

        return res.status(200).json({ message: "Đánh giá được xóa", averageRating });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


module.exports = {
    createFeedback,
    getFeedbacksByBook,
    getUserFeedback,
    updateFeedback,
    deleteFeedback
};
