const router = require("express").Router();
const mealSetController = require("../controllers/MealSetController");
const mealPlanController = require("../controllers/MealPlanController");
const { checkAuthorize } = require("../middleware/authMiddleware");

router.post("/mealsets", checkAuthorize(["admin"]), mealSetController.createMealSet);   // tạo set ăn
router.get("/mealsets", mealSetController.getAllMealSets);                   // lấy tất cả
router.get("/mealsets/:id", mealSetController.getMealSetById);               // chi tiết 1 set
router.put("/mealsets/:id", checkAuthorize(["admin"]), mealSetController.updateMealSet); // update
router.delete("/mealsets/:id", checkAuthorize(["admin"]), mealSetController.deleteMealSet); // xóa
router.get("/mealplans", mealPlanController.getMealSuggestions);               // lấy tất cả
module.exports = router;