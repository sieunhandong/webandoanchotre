const router = require("express").Router();
const userController = require("../controllers/UserController");
const { checkAuthorize } = require("../middleware/authMiddleware");
const quizController = require("../controllers/QuizController");

router.get("/profile", checkAuthorize(["user"]), userController.getMyProfile);

router.put("/profile", checkAuthorize(["user"]), userController.editMyProfile);

/**
 * @swagger
 * /complaint:
 *   get:
 *     summary: Lấy danh sách phản ánh của người dùng hiện tại
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách phản ánh cá nhân
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Complaint'
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get("/complaint", checkAuthorize(["user"]), userController.getMyComplaints);

/**
 * @swagger
 * /complaint:
 *   post:
 *     summary: Gửi phản ánh mới
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - description
 *             properties:
 *               type:
 *                 type: string
 *                 description: "Loại phản ánh (ví dụ: 'Sản phẩm', 'Giao hàng', ...)"
 *               description:
 *                 type: string
 *                 description: "Nội dung phản ánh"
 *     responses:
 *       200:
 *         description: Phản ánh đã tạo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */

router.post("/complaint", checkAuthorize(["user"]), userController.addComplaint);

/**
 * @swagger
 * /complaint/{complaintId}:
 *   delete:
 *     summary: Hủy phản ánh của người dùng
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: complaintId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID phản ánh
 *     responses:
 *       200:
 *         description: Hủy phản ánh thành công
 *       403:
 *         description: Không có quyền hủy phản ánh này
 *       404:
 *         description: Phản ánh không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.delete("/complaint/:complaintId", checkAuthorize(["user"]), userController.cancelComplaint);
module.exports = router;
