// routes/blogCategoryRoutes.js
const router = require("express").Router();
const BlogCategoryController = require("../controllers/BlogCategoryController");
const { checkAuthorize } = require("../middleware/authMiddleware");

router.post("/", checkAuthorize(["admin"]), BlogCategoryController.createCategory);
router.get("/", BlogCategoryController.getAllCategories);
router.put("/:id", checkAuthorize(["admin"]), BlogCategoryController.updateCategory);
router.delete("/:id", checkAuthorize(["admin"]), BlogCategoryController.deleteCategory);

module.exports = router;
