const router = require("express").Router();
const userController = require("../controllers/UserController");
const { checkAuthorize } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: User
 *   description: API người dùng
 */

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Lấy thông tin hồ sơ người dùng hiện tại
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về thông tin người dùng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Không được ủy quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/profile", checkAuthorize(["user"]), userController.getMyProfile);
/**
 * @swagger
 * /wishlist:
 *   get:
 *     summary: Lấy danh sách sách trong wishlist của người dùng
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách sách trong wishlist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 wishlist:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Book'
 *       401:
 *         description: Không được ủy quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/wishlist", checkAuthorize(["user"]), userController.getMyWishlist);

/**
 * @swagger
 * /wishlist/{bookId}:
 *   post:
 *     summary: Thêm sách vào wishlist
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: bookId
 *         in: path
 *         required: true
 *         description: ID của sách cần thêm
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã thêm sách vào wishlist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 wishlist:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Sách đã tồn tại trong wishlist hoặc yêu cầu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Không được ủy quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Sách không tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/wishlist/:bookId",
  checkAuthorize(["user"]),
  userController.addBookToWishlist
);

/**
 * @swagger
 * /wishlist/{bookId}:
 *   delete:
 *     summary: Xóa sách khỏi wishlist
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: bookId
 *         in: path
 *         required: true
 *         description: ID của sách cần xóa
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã xóa sách khỏi wishlist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 wishlist:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Sách không có trong wishlist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Không được ủy quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  "/wishlist/:bookId",
  checkAuthorize(["user"]),
  userController.deleteBookFromWishlist
);
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
