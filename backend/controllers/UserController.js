const Book = require("../models/Book");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
// profile

const getMyProfile = async (req, res) => {
  try {
    const user = req?.user;
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

const editMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, email, phone } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email, phone },
      { new: true, runValidators: true }
    ).select("-password -accessToken -refreshToken");

    if (!updatedUser) {
      return res.status(404).json({ message: "Người dùng không tồn tại!" });
    }

    res.status(200).json({
      message: "Cập nhật thông tin thành công!",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi server!",
      error: error.message,
    });
  }
};

// wishlist
const addBookToWishlist = async (req, res) => {
  try {
    const { bookId } = req.params;
    const user = req.user;

    // Kiểm tra sách có tồn tại không
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Sách không tồn tại!" });
    }

    // Kiểm tra nếu sách đã có trong wishlist
    if (user.wishlist.includes(bookId)) {
      return res.status(400).json({ message: "Sách đã có trong wishlist!" });
    }

    // Thêm sách vào wishlist
    user.wishlist.push(bookId);
    await user.save();

    res
      .status(200)
      .json({ message: "Đã thêm sách vào wishlist!", wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

const deleteBookFromWishlist = async (req, res) => {
  try {
    const { bookId } = req.params;
    const user = req.user;

    // Kiểm tra nếu sách không có trong wishlist
    if (!user.wishlist.includes(bookId)) {
      return res.status(400).json({ message: "Sách không có trong wishlist!" });
    }

    // Loại bỏ sách khỏi wishlist
    user.wishlist = user.wishlist.filter((id) => id.toString() !== bookId);
    await user.save();

    res
      .status(200)
      .json({ message: "Đã xóa sách khỏi wishlist!", wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

const getMyWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("wishlist");

    res.status(200).json({ wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};
const getMyComplaints = async (req, res) => {
  try {
    const user = req.user;
    const complaints = await Complaint.find({ user: user._id }).select("-user -__v");
    res.status(200).json({ data: complaints });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

const addComplaint = async (req, res) => {
  try {
    const { type, description } = req.body;
    const userId = req.user._id;

    const newComplaint = new Complaint({ user: userId, type, description });
    await newComplaint.save();

    res.status(200).json({ message: "Phản ánh đã tạo thành công!", data: newComplaint });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

const cancelComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const user = req.user;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Phản ánh không tồn tại!" });
    }

    if (!complaint.user.equals(user._id)) {
      return res.status(403).json({ message: "Bạn không có quyền hủy phản ánh!" });
    }

    complaint.status = "Đã hủy";
    await complaint.save();

    res.status(200).json({ message: "Hủy phản ánh thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};
const userController = {
  getMyProfile,
  addBookToWishlist,
  deleteBookFromWishlist,
  getMyWishlist,
  editMyProfile,
  getMyComplaints,
  addComplaint,
  cancelComplaint,
};
module.exports = userController;
