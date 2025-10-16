const router = require("express").Router();
const orderController = require("../controllers/OrderController");
const { checkAuthorize } = require("../middleware/authMiddleware");


router.post(
  "/create",
  checkAuthorize(["user"]),
  orderController.createOrder
);


router.get("/my-orders", checkAuthorize(["user"]), orderController.getMyOrders);

router.get(
  "/details/:id",
  checkAuthorize(["user", "admin"]),
  orderController.getOrderDetails
);

router.get(
  "/status/:id",
  checkAuthorize(["user", "admin"]),
  orderController.getOrderStatus
);
router.delete(
  "/:id",
  checkAuthorize(["user", "admin"]),
  orderController.deleteOrder
);

module.exports = router;
