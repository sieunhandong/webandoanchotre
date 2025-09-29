const router = require("express").Router();
const paymentController = require("../controllers/PaymentController");
/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: API thanh toán qua VNPay
 */

/**
 * @swagger
 * /payment/create:
 *   post:
 *     summary: Tạo liên kết thanh toán VNPay cho đơn hàng
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: ID của đơn hàng cần thanh toán
 *     responses:
 *       200:
 *         description: Tạo thành công, trả về URL thanh toán
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentUrl:
 *                   type: string
 *       404:
 *         description: Không tìm thấy đơn hàng
 *       500:
 *         description: Lỗi server
 */
router.post("/create", paymentController.createPayment);

/**
 * @swagger
 * /payment/return:
 *   get:
 *     summary: Nhận phản hồi từ VNPay sau khi thanh toán
 *     tags: [Payment]
 *     parameters:
 *       - in: query
 *         name: vnp_BankTranNo
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã giao dịch tại ngân hàng
 *       - in: query
 *         name: vnp_CardType
 *         required: true
 *         schema:
 *           type: string
 *         description: Loại thẻ thanh toán (ATM, VISA, etc.)
 *       - in: query
 *         name: vnp_OrderInfo
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã đơn hàng nội bộ trong hệ thống
 *       - in: query
 *         name: vnp_PayDate
 *         required: true
 *         schema:
 *           type: string
 *         description: Thời gian thanh toán (định dạng yyyyMMddHHmmss)
 *       - in: query
 *         name: vnp_ResponseCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã phản hồi từ VNPay (00 là thanh toán thành công)
 *       - in: query
 *         name: vnp_TmnCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã định danh website/merchant tại VNPay
 *       - in: query
 *         name: vnp_TransactionNo
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã giao dịch tại VNPay
 *       - in: query
 *         name: vnp_TransactionStatus
 *         required: true
 *         schema:
 *           type: string
 *         description: Trạng thái giao dịch (00 là thành công)
 *       - in: query
 *         name: vnp_TxnRef
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã tham chiếu giao dịch (mỗi lần thanh toán là 1 mã duy nhất)
 *       - in: query
 *         name: vnp_SecureHash
 *         required: true
 *         schema:
 *           type: string
 *         description: Chữ ký xác thực (được tạo bằng HMAC SHA512)
 *     responses:
 *       200:
 *         description: Thanh toán thành công
 *       400:
 *         description: Thanh toán thất bại hoặc sai chữ ký bảo mật
 *       500:
 *         description: Lỗi server
 */
router.get("/return", paymentController.getPaymentReturn);


module.exports = router;
