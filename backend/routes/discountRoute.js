const router = require("express").Router();
const discountController = require("../controllers/DiscountController");


router.get("/suitable", discountController.getDiscountSuitable);

module.exports = router;
