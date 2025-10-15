const router = require("express").Router();
const AdminFoodController = require("../controllers/AdminFoodController");
const FoodController = require("../controllers/FoodController");

// Home lấy 6 món mới
router.get("/home", FoodController.getHomeFoods);

// Lấy món ăn theo id
router.get("/:id", AdminFoodController.getFoodById);


// Trang chính lấy tất cả món, có phân trang + filter
router.get("/", FoodController.getAllFoods);

module.exports = router;
