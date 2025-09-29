// Load environment variables from .env file
require("dotenv").config();
require("./utils/cancelExpiredOrders");
require("./utils/updateShippingStatus");
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");

const {
  autoDeactivateExpiredCampaigns,
} = require("./controllers/AdminDiscountCampaignController");

const DB = require("./config/db");

const app = express();
const port = process.env.PORT || 9999;

app.use(
  cors({
    origin: "http://localhost:3000",
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

  cron.schedule("0 0 * * *", () => {
    console.log("[CRON] Checking and deactivating expired campaigns...");
    autoDeactivateExpiredCampaigns();
  });
});
