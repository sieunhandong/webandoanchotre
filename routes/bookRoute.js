const router = require("express").Router();
const bookController = require("../controllers/BookController");


router.get("/", bookController.getAllBooks);


router.get("/category/:id", bookController.getBookByCategory);


router.get("/:id", bookController.getBookById);

module.exports = router;