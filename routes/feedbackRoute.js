const router = require("express").Router();
const feedbackController = require("../controllers/FeedbackController");
const { checkAuthorize } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Feedback
 *   description: API đánh giá sách
 */

/**
 * @swagger
 * /feedback/user/{bookId}:
 *   get:
 *     summary: Lấy đánh giá của người dùng cho một cuốn sách
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sách
 *     responses:
 *       200:
 *         description: Đánh giá của người dùng được tìm thấy
 *       404:
 *         description: Không tìm thấy đánh giá
 *       500:
 *         description: Lỗi server
 */
router.get("/user/:bookId", checkAuthorize(["user"]), feedbackController.getUserFeedback);


/**
 * @swagger
 * /feedback/{bookId}:
 *   post:
 *     summary: Tạo đánh giá mới cho sách
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sách
 *     requestBody:
 *       required: true
 *       description: Thông tin đánh giá
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 example: 4
 *               comment:
 *                 type: string
 *                 example: "Sách rất bổ ích"
 *     responses:
 *       201:
 *         description: Tạo đánh giá thành công
 *       400:
 *         description: Người dùng đã đánh giá cuốn sách
 *       404:
 *         description: Không tìm thấy sách
 *       500:
 *         description: Lỗi server
 */
router.post("/:bookId", checkAuthorize(["user"]), feedbackController.createFeedback);

/**
 * @swagger
 * /feedback/{bookId}:
 *   get:
 *     summary: Lấy tất cả đánh giá của một cuốn sách
 *     tags: [Feedback]
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sách
 *     responses:
 *       200:
 *         description: Danh sách đánh giá và trung bình rating
 *       404:
 *         description: Không tìm thấy sách
 *       500:
 *         description: Lỗi server
 */
router.get("/:bookId", feedbackController.getFeedbacksByBook);

/**
 * @swagger
 * /feedback/update/{feedbackId}:
 *   put:
 *     summary: Cập nhật đánh giá của người dùng
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đánh giá
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Sách rất tuyệt vời sau lần đọc thứ hai"
 *     responses:
 *       200:
 *         description: Cập nhật đánh giá thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy đánh giá
 *       500:
 *         description: Lỗi server
 */
router.put("/update/:feedbackId", checkAuthorize(["user"]), feedbackController.updateFeedback);


/**
 * @swagger
 * /feedback/delete/{feedbackId}:
 *   delete:
 *     summary: Xóa đánh giá của người dùng
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đánh giá
 *     responses:
 *       200:
 *         description: Đánh giá đã được xóa
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy đánh giá
 *       500:
 *         description: Lỗi server
 */
router.delete("/delete/:feedbackId", checkAuthorize(["user"]), feedbackController.deleteFeedback);



module.exports = router;