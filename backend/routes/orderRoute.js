const router = require("express").Router();
const orderController = require("../controllers/OrderController");
const { checkAuthorize } = require("../middleware/authMiddleware");


router.post(
  "/create",
  checkAuthorize(["user", "admin"]),
  orderController.createOrder
);


router.get("/my-orders", checkAuthorize(["user"]), orderController.getMyOrders);

router.get(
  "/details/:id",
  checkAuthorize(["user", "admin"]),
  orderController.getOrderDetails
);
router.put(
  "/cancel/:id",
  checkAuthorize(["user", "admin"]),
  orderController.cancelOrder
);

module.exports = router;
