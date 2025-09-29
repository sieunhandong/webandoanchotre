const router = require("express").Router();
const cartController = require("../controllers/CartController");
const { checkAuthorize } = require("../middleware/authMiddleware");


router.get("/", checkAuthorize(["user"]), cartController.getCart);


router.post("/add", checkAuthorize(["user"]), cartController.addBookToCart);


router.put("/update", checkAuthorize(["user"]), cartController.updateCart);


router.delete("/remove/:bookId", checkAuthorize(["user"]), cartController.deleteBookFromCart);

module.exports = router;