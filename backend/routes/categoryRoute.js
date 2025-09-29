const router = require("express").Router();
const categoryController = require("../controllers/CategoryController");



router.get("/", categoryController.getAllCategories);


router.get("/:id", categoryController.getCategoryById);

module.exports = router;