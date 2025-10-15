const express = require("express");
const MealSetController = require("../controllers/MealSetController");
const router = express.Router({ mergeParams: true });


router.get("/:id", MealSetController.getMealSetById);
router.get("/", MealSetController.getAllMealSets);


module.exports = router;
