const router = require("express").Router();
const commentController = require("../controllers/CommentController");
const { checkAuthorize } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Quản lý bình luận cho review
 */

/**
 * @swagger
 * /comment:
 *   post:
 *     summary: Gửi bình luận cho bài review (user)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reviewId
 *               - content
 *             properties:
 *               reviewId:
 *                 type: string
 *                 description: ID của bài review
 *               content:
 *                 type: string
 *                 description: Nội dung bình luận
 *     responses:
 *       201:
 *         description: Đã gửi bình luận, chờ duyệt
 *       404:
 *         description: Không tìm thấy review
 *       500:
 *         description: Lỗi server
 */
router.post("/", checkAuthorize(["user"]), commentController.createComment);

/**
 * @swagger
 * /comment/review/{reviewId}:
 *   get:
 *     summary: Lấy các bình luận đã duyệt theo reviewId
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bài review
 *     responses:
 *       200:
 *         description: Danh sách comment đã duyệt
 *       500:
 *         description: Lỗi server
 */
router.get("/review/:reviewId", commentController.getCommentsByReview);

/**
 * @swagger
 * /comment:
 *   get:
 *     summary: Lấy toàn bộ bình luận (Admin)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách toàn bộ bình luận
 *       500:
 *         description: Lỗi server
 */
router.get("/", checkAuthorize(["admin"]), commentController.getAllComments);

/**
 * @swagger
 * /comment/approve/{id}:
 *   put:
 *     summary: Duyệt một bình luận (Admin)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của comment
 *     responses:
 *       200:
 *         description: Đã duyệt bình luận
 *       404:
 *         description: Không tìm thấy comment
 *       500:
 *         description: Lỗi server
 */
router.put("/approve/:id", checkAuthorize(["admin"]), commentController.approveComment);

/**
 * @swagger
 * /comment/{id}:
 *   delete:
 *     summary: Xoá bình luận (Admin)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của comment
 *     responses:
 *       200:
 *         description: Đã xoá bình luận
 *       500:
 *         description: Lỗi server
 */
router.delete("/:id", checkAuthorize(["admin"]), commentController.deleteComment);

module.exports = router;
