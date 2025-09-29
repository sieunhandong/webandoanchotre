const router = require("express").Router();
const bookController = require("../controllers/BookController");


/**
 * @swagger
 * tags:
 *   name: Books
 *   description: API quản lý sách
 */


/**
 * @swagger
 * /book/:
 *   get:
 *     summary: Lấy tất cả sách đang hoạt động
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: Danh sách sách được lấy thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 *       500:
 *         description: Lỗi server
 */
router.get("/", bookController.getAllBooks);

/**
 * @swagger
 * /book/category/{id}:
 *   get:
 *     summary: Lấy danh sách sách theo danh mục
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID danh mục sách
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách sách thuộc danh mục
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 *       404:
 *         description: Không tìm thấy sách
 *       500:
 *         description: Lỗi server
 */
router.get("/category/:id", bookController.getBookByCategory);

/**
 * @swagger
 * /book/sales:
 *   get:
 *     summary: Lấy danh sách sách đang giảm giá
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: Danh sách sách đang giảm giá
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 *       404:
 *         description: Không tìm thấy sách đang giảm giá
 *       500:
 *         description: Lỗi server
 */
router.get("/sales", bookController.getDiscountedBooks);

/**
 * @swagger
 * /book/new-book:
 *   get:
 *     summary: Lấy danh sách sách mới phát hành
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: Danh sách sách mới phát hành
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 *       404:
 *         description: Không tìm thấy sách mới
 *       500:
 *         description: Lỗi server
 */
router.get("/new-book", bookController.getNewBooks);

/**
 * @swagger
 * /book/best-seller:
 *   get:
 *     summary: Lấy danh sách best seller
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: Danh sách best seller
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 *       404:
 *         description: Không tìm thấy sách mới
 *       500:
 *         description: Lỗi server
 */
router.get("/best-seller", bookController.getBestSellers);

/**
 * @swagger
 * /book/{id}:
 *   get:
 *     summary: Lấy thông tin sách theo ID
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của sách
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin sách
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         description: Không tìm thấy sách
 *       500:
 *         description: Lỗi server
 */
router.get("/:id", bookController.getBookById);

/**
 * @swagger
 * /book/author/{author}:
 *   get:
 *     summary: Lấy tất cả sách theo tác giả
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: author
 *         required: true
 *         description: Tên của tác giả
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin sách
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         description: Không tìm thấy sách
 *       500:
 *         description: Lỗi server
 */
router.get("/author/:author", bookController.getBookByAuthor);

/**
 * @swagger
 * /book/publisher/{publisher}:
 *   get:
 *     summary: Lấy tất cả sách theo nhà xuất bản
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: publisher
 *         required: true
 *         description: Tên nhà xuất bản
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin sách
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         description: Không tìm thấy sách
 *       500:
 *         description: Lỗi server
 */
router.get("/publisher/:publisher", bookController.getBookByPublisher);

module.exports = router;