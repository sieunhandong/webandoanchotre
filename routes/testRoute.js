// routes/testRoute.js
const express = require("express");
const router = express.Router();
const autoCompleteOrders = require("../utils/autoCompleteOrders");

router.get("/test-auto-complete", async (req, res) => {
    try {
        await autoCompleteOrders();
        res.json({ success: true, message: "✅ Đã chạy cron autoCompleteOrders thủ công" });
    } catch (error) {
        console.error("❌ Test autoCompleteOrders error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
