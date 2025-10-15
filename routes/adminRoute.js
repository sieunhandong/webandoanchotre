const express = require("express");
const { checkAuthorize } = require("../middleware/authMiddleware");
const { uploadMultiple } = require("../config/cloudinary");
const adminController = require("../controllers/AdminController");
const adminBookController = require("../controllers/AdminBookController");
const adminFeedbackController = require("../controllers/AdminFeedBackController");
const adminDashboardController = require("../controllers/AdminDashBoardController");
const adminComplaintController = require("../controllers/AdminComplaintController");
const mealSetController = require("../controllers/MealSetController");
const mealPlanController = require("../controllers/MealPlanController");
const FoodController = require("../controllers/AdminFoodController");
const BlogController = require("../controllers/BlogController");

const router = express.Router();


//Quản lý user
router.get("/users", checkAuthorize(["admin"]), adminController.getAllUsers);
router.get(
  "/users/:id",
  checkAuthorize(["admin"]),
  adminController.getUserById
);
router.put("/users/:id", checkAuthorize(["admin"]), adminController.updateUser);
router.put(
  "/users/:id/change-status",
  checkAuthorize(["admin"]),
  adminController.changeStatusUser
);

//Quản lý đơn hàng
router.get("/orders", checkAuthorize(["admin"]), adminController.getAllOrders);
router.post(
  "/orders/:id/ai-suggest",
  checkAuthorize(["admin"]),
  adminController.suggestMealByAI
);
router.put(
  "/orders/:id/update-menu",
  checkAuthorize(["admin"]),
  adminController.updateMealMenu
);
router.put("/orders/update-meal-done", checkAuthorize(["admin"]), adminController.updateMealDone);


//Quản lý sách
router.get("/products", checkAuthorize(["admin"]), adminBookController.getAllProducts);
router.get("/products/:id", checkAuthorize(["admin"]), adminBookController.getAllProducts);
router.post(
  "/products",
  checkAuthorize(["admin"]),
  uploadMultiple, // middleware upload ảnh
  adminBookController.createProduct
);

router.put(
  "/products/:id",
  checkAuthorize(["admin"]),
  uploadMultiple, // hỗ trợ cập nhật ảnh mới
  adminBookController.updateProduct
);
router.delete(
  "/products/:id",
  checkAuthorize(["admin"]),
  adminBookController.deleteProduct
);

//Quản lý danh mục sách
router.get(
  "/categories",
  checkAuthorize(["admin"]),
  adminBookController.getAllCategories
);
router.post(
  "/categories",
  checkAuthorize(["admin"]),
  adminBookController.createCategory
);
router.put(
  "/categories/:id",
  checkAuthorize(["admin"]),
  adminBookController.updateCategory
);
router.delete(
  "/categories/:id",
  checkAuthorize(["admin"]),
  adminBookController.deleteCategory
);

//Quản lý đánh giá và xếp hạng
router.get(
  "/feedbacks",
  checkAuthorize(["admin"]),
  adminFeedbackController.getAllFeedbacks
);
router.delete(
  "/feedbacks/:feedbackId",
  checkAuthorize(["admin"]),
  adminFeedbackController.deleteFeedback
);
router.get(
  "/books/:id/feedbacks",
  checkAuthorize(["admin"]),
  adminFeedbackController.getFeedbacksByBook
);
router.get(
  "/users/:id/feedbacks",
  checkAuthorize(["admin"]),
  adminFeedbackController.getFeedbacksByUser
);


// Quản lý khiếu nại
router.get(
  "/complaints",
  checkAuthorize(["admin"]),
  adminComplaintController.getAllComplaints
);
router.put(
  "/complaints/:id",
  checkAuthorize(["admin"]),
  adminComplaintController.updateComplaintStatus
);

//Quản lý DashBoard
router.get(
  "/dashboard",
  checkAuthorize(["admin"]),
  adminDashboardController.getAdminDashboardStats
);
//blog
router.post("/blog/", checkAuthorize(["admin"]), uploadMultiple, BlogController.createBlog);

router.put("/blog/:id", checkAuthorize(["admin"]), BlogController.updateBlog);

router.delete("/blog/:id", checkAuthorize(["admin"]), BlogController.deleteBlog);
router.get("/blog/", BlogController.getAllBlogsByAdmin);




// Cập nhật món ăn (chỉ admin)
router.put("/food/:id", checkAuthorize(["admin"]), uploadMultiple, FoodController.updateFood);

// Xóa món ăn (chỉ admin)
router.delete("/food/:id", checkAuthorize(["admin"]), FoodController.deleteFood);

// Tạo món ăn (chỉ admin)
router.post("/food", checkAuthorize(["admin"]), uploadMultiple, FoodController.createFood);

// Lấy tất cả món ăn (có thể tìm kiếm theo name)
router.get("/food", FoodController.getAllFoods);


router.post("/mealsets", checkAuthorize(["admin"]), mealSetController.createMealSet);   // tạo set ăn
router.get("/mealsets", checkAuthorize(["admin"]), mealSetController.getAllMealSetsByAmin);                   // lấy tất cả
router.get("/mealsets/:id", checkAuthorize(["admin"]), mealSetController.getMealSetByIdByAdmin);               // chi tiết 1 set
router.put("/mealsets/:id", checkAuthorize(["admin"]), mealSetController.updateMealSet); // update
router.delete("/mealsets/:id", checkAuthorize(["admin"]), mealSetController.deleteMealSet); // xóa
router.get("/mealplans", mealPlanController.getMealSuggestions);

module.exports = router;
