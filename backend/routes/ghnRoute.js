const router = require("express").Router();
const ghnController = require("../controllers/GhnController");


router.get("/province", ghnController.getProvince);
router.get("/district", ghnController.getDistrict);
router.get("/ward", ghnController.getWard);


router.get("/calculate-fee", ghnController.calculateFee);


router.get("/tracking/:orderId", ghnController.getTrackingDetails);

//Hoàn đơn hàng
router.post("/return/:orderId", ghnController.returnOrder);

module.exports = router;
