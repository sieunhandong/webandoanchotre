const router = require("express").Router();
const orderController = require("../controllers/OrderController");
const { checkAuthorize } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: API order của người dùng
 */

/**
 * @swagger
 * /order/create:
 *   post:
 *     summary: Tạo đơn hàng mới
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shippingInfo:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   phoneNumber:
 *                     type: string
 *                   address:
 *                     type: string
 *                   provineName:
 *                     type: string
 *                   districtName:
 *                     type: string
 *                   wardName:
 *                     type: string
 *                   note:
 *                     type: string
 *                   fee:
 *                     type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [COD, Online]
 *               discountUsed:
 *                 type: string
 *               pointUsed:
 *                 type: number
 *             example:
 *               shippingInfo:
 *                 name: "Nguyen Van A"
 *                 phoneNumber: "0901234567"
 *                 address: "123 Dinh Tien Hoang"
 *                 provineName: "TP HCM"
 *                 districtName: "Quan 1"
 *                 wardName: "Ben Nghe"
 *                 note: "Giao giờ hành chính"
 *                 fee: 15000
 *               paymentMethod: "COD"
 *               discountUsed: "6652d2641226f3d190f3e470"
 *               pointUsed: 0
 *     responses:
 *       201:
 *         description: Đơn hàng tạo thành công
 *       400:
 *         description: Lỗi đầu vào hoặc giỏ hàng trống
 *       500:
 *         description: Lỗi server
 */
router.post(
  "/create",
  checkAuthorize(["user", "admin"]),
  orderController.createOrder
);

/**
 * @swagger
 * /order/my-orders:
 *   get:
 *     summary: Lấy đơn hàng của người dùng
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng
 *       401:
 *         description: Không có quyền
 *       500:
 *         description: Lỗi server
 */
router.get("/my-orders", checkAuthorize(["user"]), orderController.getMyOrders);

/**
 * @swagger
 * /order/details/{id}:
 *   get:
 *     summary: Lấy chi tiết đơn hàng theo ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của đơn hàng
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin đơn hàng
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy đơn
 *       500:
 *         description: Lỗi server
 */
router.get(
  "/details/:id",
  checkAuthorize(["user", "admin"]),
  orderController.getOrderDetails
);
router.put(
  "/cancel/:id",
  checkAuthorize(["user", "admin"]),
  orderController.cancelOrder
);

module.exports = router;
