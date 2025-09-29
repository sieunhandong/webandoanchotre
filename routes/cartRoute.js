const router = require("express").Router();
const cartController = require("../controllers/CartController");
const { checkAuthorize } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: API quản lý giỏ hàng người dùng
 */


/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Lấy giỏ hàng của người dùng hiện tại
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy giỏ hàng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cartItems:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Lỗi server
 */
router.get("/", checkAuthorize(["user"]), cartController.getCart);

/**
 * @swagger
 * /cart/add:
 *   post:
 *     summary: Thêm sách vào giỏ hàng
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookId
 *               - quantity
 *             properties:
 *               bookId:
 *                 type: string
 *                 example: 60f8c2d3c8a3b35a2f0e9a9b
 *               quantity:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Đã thêm hoặc cập nhật sách vào giỏ
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc sách không đủ hàng
 *       404:
 *         description: Sách không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.post("/add", checkAuthorize(["user"]), cartController.addBookToCart);

/**
 * @swagger
 * /cart/update:
 *   put:
 *     summary: Cập nhật số lượng sách trong giỏ hàng
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookId
 *               - quantity
 *             properties:
 *               bookId:
 *                 type: string
 *                 example: 60f8c2d3c8a3b35a2f0e9a9b
 *               quantity:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Đã cập nhật số lượng
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc sách không đủ hàng
 *       404:
 *         description: Giỏ hàng hoặc sách không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.put("/update", checkAuthorize(["user"]), cartController.updateCart);

/**
 * @swagger
 * /cart/remove/{bookId}:
 *   delete:
 *     summary: Xóa sách khỏi giỏ hàng
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sách cần xóa khỏi giỏ hàng
 *     responses:
 *       200:
 *         description: Đã xóa sách khỏi giỏ hàng
 *       404:
 *         description: Giỏ hàng không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.delete("/remove/:bookId", checkAuthorize(["user"]), cartController.deleteBookFromCart);

module.exports = router;