// Load environment variables from .env file
require("dotenv").config();
require("./utils/cancelExpiredOrders");
require("./utils/updateShippingStatus");
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const cookieParser = require("cookie-parser");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const cron = require("node-cron");

const {
  autoDeactivateExpiredCampaigns,
} = require("./controllers/AdminDiscountCampaignController");

const DB = require("./config/db");

const app = express();
const port = process.env.PORT || 9999;

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "NewBook API",
      version: "1.0.0",
      description: "API web bán sách",
    },
    servers: [
      {
        url: "http://localhost:9999",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.get("/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerDocs);
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
// Middleware
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
