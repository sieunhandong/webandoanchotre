const router = require("express").Router();
const multer = require("multer");
const chatbotController = require("../controllers/ChatBotController");

const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   name: Chatbot
 *   description: API gợi ý sách thông minh bằng văn bản hoặc hình ảnh
 */

/**
 * @swagger
 * /chatbot/suggest:
 *   post:
 *     summary: Gợi ý sách dựa trên từ khóa người dùng nhập
 *     tags: [Chatbot]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 example: sách kỹ năng mềm
 *     responses:
 *       200:
 *         description: Phản hồi gợi ý sách từ chatbot
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reply:
 *                   type: string
 *       400:
 *         description: Thiếu từ khóa tìm kiếm
 *       500:
 *         description: Lỗi nội bộ server
 */
router.post("/suggest", chatbotController.getSuggestions);


/**
 * @swagger
 * /chatbot/upload-image-suggest:
 *   post:
 *     summary: Gợi ý sách dựa trên hình ảnh người dùng tải lên
 *     tags: [Chatbot]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Phản hồi gợi ý sách từ hình ảnh
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reply:
 *                   type: string
 *       400:
 *         description: Không có hình ảnh được gửi lên
 *       500:
 *         description: Lỗi nội bộ server khi xử lý ảnh
 */
router.post("/upload-image-suggest", upload.single('image'), chatbotController.uploadImage);

module.exports = router;