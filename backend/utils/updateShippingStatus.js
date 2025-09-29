const cron = require("node-cron");
const Order = require("../models/Order"); // Mongoose model
const { getGhnTracking } = require("../controllers/GhnController"); // Gọi GHN API tracking

// Nhóm các trạng thái cuối cùng (không cần đồng bộ nữa)
const FINAL_STATUSES = ["delivered", "returned", "cancel", "lost", "damage"];

// Mapping mô tả trạng thái GHN → tiếng Việt
const ghnStatusDescriptions = {
  ready_to_pick: "Đã tạo đơn, chờ lấy hàng",
  picking: "Đang đến lấy hàng",
  money_collect_picking: "Shipper đang tương tác với người gửi",
  picked: "Đã lấy hàng",
  storing: "Chuyển đến kho GHN",
  transporting: "Đang vận chuyển",
  sorting: "Phân loại tại kho",
  delivering: "Đang giao hàng",
  money_collect_delivering: "Shipper đang tương tác với người nhận",
  delivered: "Giao hàng thành công",
  delivery_fail: "Giao hàng thất bại",
  waiting_to_return: "Chờ trả hàng",
  return: "Chờ trả về người gửi",
  return_transporting: "Đang hoàn hàng",
  return_sorting: "Đang phân loại để hoàn hàng",
  returning: "Đang hoàn hàng về",
  return_fail: "Hoàn hàng thất bại",
  returned: "Hoàn hàng thành công",
  cancel: "Đơn đã huỷ",
  exception: "Đơn ngoại lệ",
  damage: "Hư hỏng hàng",
  lost: "Thất lạc hàng",
};

const syncShippingStatuses = async () => {
  try {
    const pendingOrders = await Order.find({
      shippingStatus: { $nin: FINAL_STATUSES },
      trackingNumber: { $exists: true, $ne: null },
    });

    console.log(`Bắt đầu đồng bộ ${pendingOrders.length} đơn hàng từ GHN...`);

    for (const order of pendingOrders) {
      console.log(order.trackingNumber);
      try {
        const ghn = await getGhnTracking(order.trackingNumber);
        const status = ghn?.status?.toLowerCase?.() || "unknown";
        const statusDesc = ghnStatusDescriptions[status] || "Không xác định";

        order.shippingStatus = status;

        // console.log("→ Trước khi cập nhật:", {
        //   shippingStatus: order.shippingStatus,
        //   orderStatus: order.orderStatus,
        //   delivered_time: order.delivered_time,
        // });

        order.shippingStatus = status;

        if (status === "delivered") {
          order.delivered_time = new Date(ghn.updated_at);
          order.orderStatus = "Completed"; // Câu lệnh này đang không hoạt động
        }

        // console.log("→ Sau khi cập nhật:", {
        //   shippingStatus: order.shippingStatus,
        //   orderStatus: order.orderStatus,
        //   delivered_time: order.delivered_time,
        // });

        await order.save();

        console.log(`Order ${order._id} ➜ ${status} (${statusDesc})`);
        if (
          order.paymentStatus === "Completed" &&
          ["delivery_fail", "returned", "cancel", "lost", "damage"].includes(
            status
          )
        ) {
          console.log(
            `→ Đơn ${order._id} đang thất bại, hoàn sách lại vào kho...`
          );

          for (const item of order.items) {
            const book = await Book.findById(item.book._id);
            if (book) {
              book.stock += item.quantity;
              await book.save();
              console.log(`   ↳ +${item.quantity} sách: ${book.title}`);
            }
          }
        }
      } catch (err) {
        console.warn(`Lỗi GHN cho Order ${order._id}: ${err.message}`);
      }
    }

    console.log("CRON GHN hoàn tất.\n");
  } catch (err) {
    console.error("Lỗi CRON GHN:", err);
  }
};

// Chạy cron mỗi 2 phút
cron.schedule("*/1 * * * *", () => {
  console.log("CRON: Cập nhật shippingStatus từ GHN...");
  syncShippingStatuses();
});
