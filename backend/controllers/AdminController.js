const Book = require("../models/Book");
const Order = require("../models/Order");
const User = require("../models/User");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách user", error });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User không tồn tại" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy thông tin user", error });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).select("-password");
    if (!updatedUser)
      return res.status(404).json({ message: "User không tồn tại" });
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật user", error });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser)
      return res.status(404).json({ message: "User không tồn tại" });
    res.status(200).json({ message: "Xóa user thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa user", error });
  }
};

exports.changeStatusUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy user với id ${userId}` });
    }

    user.isActivated = !user.isActivated;
    await user.save();

    res.status(200).json({ message: "Thành công", data: user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.book", "title price")
      .populate("discountUsed");
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh sách đơn hàng", error });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: req.body.orderStatus },
      { new: true }
    );
    if (!updatedOrder)
      return res.status(404).json({ message: "Đơn hàng không tồn tại" });
    if (
      updatedOrder.paymentStatus === "Completed" &&
      updatedOrder.orderStatus === "Cancelled"
    ) {
      for (const item of updatedOrder.items) {
        const book = await Book.findById(item.book._id);
        if (book) {
          book.stock += item.quantity;
          await book.save();
        }
      }
    }
    res.status(200).json(updatedOrder);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi cập nhật trạng thái đơn hàng", error });
  }
};

exports.updateBoxInfo = async (req, res) => {
  try {
    const { boxInfo } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    order.boxInfo = boxInfo;
    const updatedOrder = await order.save();
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
