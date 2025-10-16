// Load environment variables from .env file
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");
const autoCompleteOrders = require("./utils/autoCompleteOrders");

const DB = require("./config/db");

const app = express();
const port = process.env.PORT || 9999;

const testRoute = require("./routes/testRoute");
app.use("/test", testRoute);

// Middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
// Routes
routes(app);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  DB.connectDB();


  // ✅ Cron mới: kiểm tra đơn hàng đã hết hạn để hoàn tất
  cron.schedule("0 0 * * *", () => {
    console.log("[CRON] Auto completing finished orders...");
    autoCompleteOrders();
  });
});
