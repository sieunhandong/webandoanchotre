const mongoose = require("mongoose");
const User = require("../models/User");
const Category = require("../models/Category");
const Book = require("../models/Book");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Feedback = require("../models/Feedback");
const Complaint = require("../models/Complaint");

const DB = {
  user: User,
  category: Category,
  book: Book,
  cart: Cart,
  order: Order,
  feedback: Feedback,
  complaint: Complaint,
};

DB.connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_CONNECTION_CLOUD, {
      dbName: process.env.DB_NAME,
    });
    console.log("Connected to the cloud database (MongoDB Atlas)");
  } catch (err) {
    console.warn("Cloud connection failed. Trying local...");

    try {
      await mongoose.connect(process.env.DB_CONNECTION_LOCAL, {
        dbName: process.env.DB_NAME,
      });
      console.log("Connected to the local database (MongoDB)");
    } catch (localErr) {
      console.error("Could not connect to any database", localErr);
      process.exit(1); // Dừng chương trình
    }
  }
};

module.exports = DB;