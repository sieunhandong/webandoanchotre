const router = require("express").Router();
const bookController = require("../controllers/BookController");



router.get("/", bookController.getAllBooks);


router.get("/category/:id", bookController.getBookByCategory);


router.get("/sales", bookController.getDiscountedBooks);


router.get("/new-book", bookController.getNewBooks);


router.get("/best-seller", bookController.getBestSellers);


router.get("/:id", bookController.getBookById);


router.get("/author/:author", bookController.getBookByAuthor);

router.get("/publisher/:publisher", bookController.getBookByPublisher);

module.exports = router;