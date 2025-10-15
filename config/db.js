const mongoose = require("mongoose");
const User = require("../models/User");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Feedback = require("../models/Feedback");
const Complaint = require("../models/Complaint");
const UserProfile = require("../models/UserProfile");
const Account = require("../models/Account");
const BlogCategory = require("../models/BlogCategory");
const Blog = require("../models/Blog");
const Comment = require("../models/Comment");
const Food = require("../models/Food");
const MealSet = require("../models/MealSet");
const QuizSession = require("../models/QuizSession");

const DB = {
  user: User,
  category: Category,
  product: Product,
  userProfile: UserProfile,
  order: Order,
  feedback: Feedback,
  complaint: Complaint,
  account: Account,
  blogCategory: BlogCategory,
  blog: Blog,
  comment: Comment,
  food: Food,
  mealSet: MealSet,
  quizSession: QuizSession
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