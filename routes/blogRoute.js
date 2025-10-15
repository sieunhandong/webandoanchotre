const router = require("express").Router();
const BlogController = require("../controllers/BlogController");


router.get("/", BlogController.getAllBlogs);
router.get("/home", BlogController.getHomeBlogs);
router.get("/main-categories", BlogController.getBlogsByMainCategories);
router.get("/by-category", BlogController.getBlogsByCategory);

router.get("/:id", BlogController.getBlogById);


module.exports = router;
