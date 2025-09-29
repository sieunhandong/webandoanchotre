const Order = require("../models/Order");
const Book = require("../models/Book");
const Cart = require("../models/Cart");
const Discount = require("../models/Discount");
const User = require("../models/User");
const sendEmail = require("../utils/sendMail");
const { applyDiscountCampaignsToBooks } = require("../utils/applyDiscount");

const createOrder = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart || cart.cartItems.length === 0) {
      return res.status(400).json({ message: "Giỏ hàng không được để trống!" });
    }

    const items = [];
    const { shippingInfo, paymentMethod, discountUsed, pointUsed } = req.body;

    const discount = discountUsed
      ? await Discount.findById(discountUsed)
      : null;
    const userId = req.user.id;

    // Lấy sách và áp dụng giảm giá
    const bookIds = cart.cartItems.map((item) => item.book);
    const books = await Book.find({ _id: { $in: bookIds } });
    const discountedBooks = await applyDiscountCampaignsToBooks(books);

    // Tính tổng tiền
    let totalAmount = 0;
    let itemsHtml = "";

    for (const item of cart.cartItems) {
      const book = discountedBooks.find(
        (b) => b._id.toString() === item.book.toString()
      );
      if (!book) {
        return res
          .status(404)
          .json({ message: `Sách ID ${item.book} không tồn tại!` });
      }
      if (book.stock < item.quantity) {
        return res
          .status(400)
          .json({ message: `Sách "${book.title}" không đủ hàng!` });
      }

      const itemTotal = book.price * item.quantity;
      totalAmount += itemTotal;

      items.push({
        book: book._id,
        quantity: item.quantity,
        price: book.price, 
      });

      itemsHtml += `
        <tr>
          <td style="padding: 10px; font-size: 14px; color: #2c3e50; text-align: left;">${
            book.title
          }</td>
          <td style="padding: 10px; font-size: 14px; color: #2c3e50; text-align: right;">${
            item.quantity
          }</td>
          <td style="padding: 10px; font-size: 14px; color: #2c3e50; text-align: right;">${itemTotal.toLocaleString(
            "vi-VN"
          )} VND</td>
        </tr>`;
    }

    // Áp dụng mã giảm giá
    if (discount) {
      if (discount.type === "fixed") {
        totalAmount -= discount.value;
      } else if (discount.type === "percentage") {
        totalAmount -= (totalAmount * discount.value) / 100;
      }
    }

    // Trừ điểm
    totalAmount -= pointUsed;

    // Giới hạn COD
    if (paymentMethod === "COD" && totalAmount > 500000) {
      return res.status(400).json({
        message: "Thanh toán khi nhận hàng bị giới hạn ở đơn dưới 500.000đ",
      });
    }

    const newOrder = new Order({
      user: userId,
      items,
      shippingInfo,
      paymentMethod,
      discountUsed,
      pointUsed,
      paymentStatus: "Pending",
      orderStatus: "Pending",
    });

    const savedOrder = await newOrder.save();

    // Xóa giỏ hàng sau khi tạo đơn
    await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { cartItems: [] } },
      { new: true }
    );

    // Nếu thanh toán COD thì tăng số lượt dùng mã giảm giá
    if (savedOrder && paymentMethod === "COD" && discount) {
      discount.usedCount = discount.usedCount + 1;
      await discount.save();
    }

    // Gửi email xác nhận
    const user = await User.findById(userId);
    const shippingInfoStr = `${shippingInfo.address}, ${shippingInfo.provineName}, ${shippingInfo.districtName}, ${shippingInfo.wardName}`;
    await sendEmail(
      user.email,
      {
        orderId: savedOrder._id.toString(),
        paymentMethod:
          paymentMethod === "COD"
            ? "Thanh toán khi nhận hàng"
            : "Thanh toán trực tuyến",
        totalAmount,
        itemsHtml,
        shippingInfo: shippingInfoStr,
      },
      "orderConfirmation"
    );

    res.status(201).json({ data: savedOrder, totalAmount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function getMyOrders(req, res) {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("items.book", "title images price")
      .sort({ createdAt: -1 });
    return res.json({ data: orders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function getOrderDetails(req, res) {
  const orderId = req.params.id;
  const user = req.user;
  try {
    const order = await Order.findById(orderId)
      .populate("items.book", "title images price")
      .populate("discountUsed", "code amount");

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }
    if (
      order.user.toString() !== user._id.toString() &&
      user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json({ data: order });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
}
async function cancelOrder(req, res) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    if (order.paymentStatus !== "Pending" || order.orderStatus !== "Pending") {
      return res.status(400).json({ message: "Đơn hàng không thể hủy" });
    }

    order.orderStatus = "Cancelled";
    await order.save();

    res.json({ message: "Đã hủy đơn hàng" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderDetails,
  cancelOrder,
};
