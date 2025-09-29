const cron = require("node-cron");
const Order = require("../models/Order");

cron.schedule("0 0 * * *", async () => {
  try {
    const now = new Date();
    const result = await Order.updateMany(
      {
        paymentMethod: "Online",
        paymentStatus: "Pending",
        orderStatus: "Pending",
        expireAt: { $lte: now },
      },
      {
        orderStatus: "Cancelled",
      }
    );
    console.log(
      `[CRON] Đã hủy ${result.modifiedCount} đơn hàng hết hạn thanh toán`
    );
  } catch (error) {
    console.error("[CRON] Lỗi khi hủy đơn:", error.message);
  }
});
