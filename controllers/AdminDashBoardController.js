const mongoose = require("mongoose");
const Order = require("../models/Order");
const MealSet = require("../models/MealSet");
const Account = require("../models/Account");

const getAdminDashboardStats = async (req, res) => {
  try {
    // 1️⃣ Đếm trạng thái đơn hàng
    const orderStatusCount = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const statusMapping = {
      pending: "Chờ xử lý",
      completed: "Hoàn thành",
      cancelled: "Đã hủy",
    };

    const formattedOrderStatus = orderStatusCount.map((item) => ({
      status: statusMapping[item._id] || item._id,
      count: item.count,
    }));

    // 2️⃣ Tổng doanh thu (chỉ tính đơn đã hoàn thành)
    const totalRevenueResult = await Order.aggregate([
      { $match: { paymentStatus: "completed" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
        },
      },
    ]);

    const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

    // 3️⃣ Thống kê mỗi MealSet bán được bao nhiêu
    const mealSetSales = await Order.aggregate([
      { $match: { paymentStatus: "completed" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.setId",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$items.quantity", "$items.price"] },
          },
        },
      },
      {
        $lookup: {
          from: "mealsets",
          localField: "_id",
          foreignField: "_id",
          as: "mealSet",
        },
      },
      { $unwind: "$mealSet" },
      {
        $project: {
          _id: 0,
          mealSetId: "$mealSet._id",
          title: "$mealSet.title",
          duration: "$mealSet.duration",
          price: "$mealSet.price",
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    // 4️⃣ Phân tích doanh thu theo thời gian
    const revenueAnalysis = await Order.aggregate([
      { $match: { paymentStatus: "completed" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          dailyRevenue: { $sum: "$total" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
      { $limit: 30 },
    ]);

    // 5️⃣ Tổng set ăn & người dùng
    const totalMealSets = await MealSet.countDocuments({ isActive: true });
    const totalUsers = await Account.countDocuments({ role: "user" });

    return res.status(200).json({
      totalRevenue,
      totalMealSets,
      totalUsers,
      orderStatusCount: formattedOrderStatus,
      mealSetSales,
      revenueAnalysis,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thống kê admin dashboard:", error);
    return res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
  }
};

module.exports = { getAdminDashboardStats };
