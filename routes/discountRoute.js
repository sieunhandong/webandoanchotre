const router = require("express").Router();
const discountController = require("../controllers/DiscountController");

/**
 * @swagger
 * tags:
 *   name: Discount
 *   description: API quản lý và gợi ý mã giảm giá
 */

/**
 * @swagger
 * /discount/suitable:
 *   get:
 *     summary: Lấy danh sách mã giảm giá phù hợp với số tiền mua hàng
 *     tags: [Discount]
 *     parameters:
 *       - in: query
 *         name: amount
 *         required: true
 *         description: Số tiền mua hàng để lọc các mã giảm giá phù hợp
 *         schema:
 *           type: number
 *           example: 500000
 *       - in: query
 *         name: productId
 *         required: false
 *         description: ID sách cụ thể (nếu có) để lọc thêm giảm giá áp dụng cho sách
 *         schema:
 *           type: string
 *           example: 66ffe7e91a9babc123456789
 *     responses:
 *       200:
 *         description: Danh sách mã giảm giá phù hợp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 discounts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Discount'
 *       400:
 *         description: Số tiền không hợp lệ
 *       500:
 *         description: Lỗi server
 */

router.get("/suitable", discountController.getDiscountSuitable);

module.exports = router;
