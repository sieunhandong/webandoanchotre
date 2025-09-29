const express = require("express");
const { checkAuthorize } = require("../middleware/authMiddleware");
const { uploadMultiple } = require("../config/cloudinary");
const adminController = require("../controllers/AdminController");
const adminBookController = require("../controllers/AdminBookController");
const adminFeedbackController = require("../controllers/AdminFeedBackController");
const adminDiscountCampaignController = require("../controllers/AdminDiscountCampaignController");
const adminDiscountController = require("../controllers/AdminDiscountController");
const adminDashboardController = require("../controllers/AdminDashBoardController");
const adminComplaintController = require("../controllers/AdminComplaintController");
const { confirmOrder } = require("../controllers/GhnController");
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
router.put(
  "/orders/:id/change-status",
  checkAuthorize(["admin"]),
  adminController.updateOrderStatus
);
router.post(
  "/orders/update-box-info/:id",
  checkAuthorize(["admin"]),
  adminController.updateBoxInfo
);
router.post("/orders/confirm/:id", checkAuthorize(["admin"]), confirmOrder);

//Quản lý sách
router.get(
  "/books",
  checkAuthorize(["admin"]),
  adminBookController.getAllBooks
);
router.get(
  "/books/:id",
  checkAuthorize(["admin"]),
  adminBookController.getBookById
);
router.post(
  "/books",
  checkAuthorize(["admin"]),
  uploadMultiple, // middleware upload ảnh
  adminBookController.createBook
);

router.put(
  "/books/:id",
  checkAuthorize(["admin"]),
  uploadMultiple, // hỗ trợ cập nhật ảnh mới
  adminBookController.updateBook
);
router.delete(
  "/books/:id",
  checkAuthorize(["admin"]),
  adminBookController.deleteBook
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
//Quản lý chiến dịch giảm giá
router.get(
  "/discount-campaigns",
  checkAuthorize(["admin"]),
  adminDiscountCampaignController.getAllCampaigns
);
router.delete(
  "/discount-campaigns/:id",
  checkAuthorize(["admin"]),
  adminDiscountCampaignController.deleteCampaign
);
router.post(
  "/discount-campaigns",
  checkAuthorize(["admin"]),
  adminDiscountCampaignController.createCampaign
);
router.put(
  "/discount-campaigns/:id",
  checkAuthorize(["admin"]),
  adminDiscountCampaignController.updateCampaign
);

router.post(
  "/discount-campaigns/check-book-conflicts",
  checkAuthorize(["admin"]),
  adminDiscountCampaignController.checkBookConflicts
);
router.post(
  "/discount-campaigns/check-book-conflicts-preview",
  checkAuthorize(["admin"]),
  adminDiscountCampaignController.checkBookConflictsPreview
);



//Quản lý discount
router.get(
  "/discounts",
  checkAuthorize(["admin"]),
  adminDiscountController.getAllDiscounts
);
router.get(
  "/discounts/:id",
  checkAuthorize(["admin"]),
  adminDiscountController.getDiscountById
);
router.post(
  "/discounts",
  checkAuthorize(["admin"]),
  adminDiscountController.createDiscount
);
router.put(
  "/discounts/:id",
  checkAuthorize(["admin"]),
  adminDiscountController.updatedDiscount
);
router.put(
  "/discounts/:id/change-status",
  checkAuthorize(["admin"]),
  adminDiscountController.changeStatusDiscount
);
router.delete(
  "/discounts/:id",
  checkAuthorize(["admin"]),
  adminDiscountController.deleteDiscount
);
router.patch(
  "/discounts/:id/products",
  checkAuthorize(["admin"]),
  adminDiscountController.updateDiscountProducts
);
router.delete(
  "/discounts/:discountId/books/:bookId",
  checkAuthorize(["admin"]),
  adminDiscountController.removeBookFromDiscount
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

module.exports = router;
