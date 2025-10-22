const Order = require("../models/Order");
const MealSet = require("../models/MealSet");
const Account = require("../models/Account");
const UserProfile = require("../models/UserProfile");
const sendEmail = require("../utils/sendMail");
const moment = require("moment");
const dotenv = require("dotenv");
dotenv.config();
const createOrder = async (req, res) => {
  try {
    // ==========================
    // 1️⃣ Kiểm tra đăng nhập
    // ==========================
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập để tiếp tục đặt hàng",
        redirect: "/login?redirect=/set-detail",
      });
    }

    const userId = req.user.id;
    const { setId, duration, price, deliveryTime, address, phone } = req.body;

    // ==========================
    // 2️⃣ Kiểm tra dữ liệu
    // ==========================
    if (!setId || !price) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin set ăn hoặc giá tiền!",
      });
    }

    // ==========================
    // 3️⃣ Lấy thông tin Set Ăn
    // ==========================
    const mealSet = await MealSet.findById(setId);
    if (!mealSet) {
      return res.status(404).json({
        success: false,
        message: "Set ăn không tồn tại!",
      });
    }

    // ==========================
    // 4️⃣ Cập nhật hoặc tạo UserProfile
    // ==========================
    let userProfile = await UserProfile.findOne({ accountId: userId });
    if (!userProfile) {
      userProfile = new UserProfile({ accountId: userId });
    }

    if (address) {
      userProfile.address = {
        ...address,
        isDefault: true,
      };
    }

    await userProfile.save();
    const account = await Account.findById(req.user.id);
    if (account && !account.userInfo) {
      account.userInfo = userProfile._id;
      await account.save();
    }
    // ==========================
    // 5️⃣ Tạo Order
    // ==========================
    const order = new Order({
      userId,
      items: [
        {
          setId: mealSet._id,
          duration: duration || mealSet.duration || 1,
          price,
          quantity: 1,
        },
      ],
      total: price,
      delivery: {
        time: deliveryTime || "Chưa xác định",
        phone: phone || "",
        address: address || {},
      },
      paymentStatus: "pending",
      status: "pending",
    });

    // ==========================
    // 6️⃣ Tạo mã thanh toán Sepay & link QR
    // ==========================
    const sepayAccount = process.env.SEPAY_ACC || "VQRQAEQNT2617";
    const sepayBank = process.env.SEPAY_BANK || "MBBank";

    // Ví dụ mã đơn hàng: DHMMDD + 6 ký tự cuối của _id
    const orderCode = "DH" + moment().format("MMDD") + order._id.toString().slice(-6);

    const paymentUrl = `https://qr.sepay.vn/img?acc=${sepayAccount}&bank=${sepayBank}&amount=${price}&des=${orderCode}`;

    order.paymentUrl = paymentUrl;
    order.orderCode = orderCode;

    await order.save();

    // ==========================
    // 7️⃣ Phản hồi client
    // ==========================
    res.json({
      success: true,
      message: "Đơn hàng đã được tạo thành công!",
      data: {
        orderId: order._id,
        total: order.total,
        delivery: order.delivery,
        paymentStatus: order.paymentStatus,
        orderCode: order.orderCode,
        paymentUrl: order.paymentUrl,
      },
    });
  } catch (error) {
    console.error("❌ Lỗi khi tạo đơn hàng:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


async function getMyOrders(req, res) {
  try {
    // 🔹 Lấy tất cả đơn hàng của người dùng
    const orders = await Order.find({ userId: req.user._id })
      .populate("items.setId", "title price duration")
      .sort({ createdAt: -1 });

    // 🔹 Duyệt từng đơn hàng để thêm tiến trình + thực đơn tương ứng
    const enrichedOrders = orders.map((order) => {
      if (!order.delivery?.time || !order.items?.length) return order;

      const startDate = moment(order.delivery.time).startOf("day");
      const today = moment().startOf("day");
      const duration = order.items[0].duration || 0;

      const diffDays = today.diff(startDate, "days") + 1;
      let currentDay = diffDays;

      if (currentDay < 1) currentDay = 0; // chưa bắt đầu
      if (currentDay > duration) currentDay = duration; // đã hoàn tất

      // 🔹 Lấy thực đơn trong Order.mealSuggestions
      let todayMenu = null;
      if (order.mealSuggestions?.length) {
        const found = order.mealSuggestions.find(
          (m) => Number(m.day) === Number(currentDay)
        );
        if (found) todayMenu = found.menu;
      }

      return {
        ...order.toObject(),
        progress: {
          startDate: startDate.format("YYYY-MM-DD"),
          duration,
          currentDay,
          isStarted: currentDay > 0,
          isCompleted: currentDay >= duration,
          todayMenu,
        },
      };
    });

    return res.json({ data: enrichedOrders });
  } catch (err) {
    console.error("❌ getMyOrders error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
async function getOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const order = await Order.findOne({ orderCode: id });
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }
    return res.json({ paymentStatus: order.paymentStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
}


async function getOrderDetails(req, res) {
  try {
    const orderId = req.params.id;
    const user = req.user;
    const order = await Order.findById(orderId)
      .populate("items.setId", "title price duration");

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // Kiểm tra quyền truy cập
    if (
      order.userId.toString() !== user._id.toString() &&
      user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Bạn không có quyền xem đơn này" });
    }

    return res.status(200).json({ data: order });
  } catch (error) {
    console.error("❌ getOrderDetails error:", error);
    return res.status(500).json({ message: error.message });
  }
}
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({ orderCode: id, userId: userId, paymentStatus: "pending" })

    if (!order) {
      return res.status(404).json({ message: "Đơn hàng không tồn tại hoặc đã thanh toán" });
    }

    await order.deleteOne();

    return res.status(204).json({ success: true, message: "Đơn hàng đã bị hủy" });
  } catch (error) {
    console.error("❌ deleteOrder error:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderDetails,
  deleteOrder,
  getOrderStatus
};
