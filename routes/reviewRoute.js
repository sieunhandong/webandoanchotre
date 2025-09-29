const router = require("express").Router();
const { uploadMultiple } = require("../config/cloudinary");
const reviewController = require("../controllers/ReviewController");
const { checkAuthorize } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Quản lý đánh giá sách (review)
 */

/**
 * @swagger
 * /review:
 *   post:
 *     summary: Tạo bài review mới (Admin)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - bookId
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 description: Tiêu đề review
 *               bookId:
 *                 type: string
 *                 description: ID của sách
 *               content:
 *                 type: string
 *                 description: Nội dung review (HTML từ CKEditor)
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Danh sách ảnh (nhiều ảnh)
 *     responses:
 *       201:
 *         description: Review đã được tạo
 *       400:
 *         description: Thiếu dữ liệu cần thiết
 *       500:
 *         description: Lỗi khi tạo review
 */
router.post("/", checkAuthorize(["admin"]), uploadMultiple, reviewController.createReview);

/**
 * @swagger
 * /review:
 *   get:
 *     summary: Lấy tất cả review
 *     tags: [Reviews]
 *     responses:
 *       200:
 *         description: Danh sách review
 */
router.get("/", reviewController.getAllReviews);

/**
 * @swagger
 * /review/{id}:
 *   get:
 *     summary: Lấy review theo ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin review
 *       404:
 *         description: Không tìm thấy review
 */
router.get("/:id", reviewController.getReviewById);

/**
 * @swagger
 * /review/{id}:
 *   put:
 *     summary: Cập nhật review (Admin)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/:id", checkAuthorize(["admin"]), reviewController.updateReview);

/**
 * @swagger
 * /review/{id}:
 *   delete:
 *     summary: Xoá review (Admin)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xoá thành công
 */
router.delete("/:id", checkAuthorize(["admin"]), reviewController.deleteReview);

module.exports = router;
