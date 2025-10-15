const Order = require("../models/Order");

async function autoCompleteOrders() {
    try {
        console.log("🕓 [CRON] Đang kiểm tra đơn hàng cần hoàn tất...");

        // Lấy tất cả đơn đang pending hoặc đang giao
        const orders = await Order.find({ status: { $in: ["pending"] } });

        const now = new Date();
        let updatedCount = 0;

        for (const order of orders) {
            if (!order.delivery?.time || !order.items?.length) continue;

            const startDate = new Date(order.delivery.time);
            const maxDuration = Math.max(...order.items.map(i => i.duration || 0));

            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + maxDuration);

            if (now >= endDate) {
                order.status = "completed";
                await order.save();
                updatedCount++;
            }
        }

        console.log(`✅ [CRON] Hoàn tất ${updatedCount} đơn hàng.`);
    } catch (error) {
        console.error("❌ Lỗi trong autoCompleteOrders:", error);
    }
}

module.exports = autoCompleteOrders;
