const router = require("express").Router();
const userController = require("../controllers/UserController");
const { checkAuthorize } = require("../middleware/authMiddleware");

router.get("/profile", checkAuthorize(["user"]), userController.getMyProfile);

router.get("/wishlist", checkAuthorize(["user"]), userController.getMyWishlist);


router.post(
  "/wishlist/:bookId",
  checkAuthorize(["user"]),
  userController.addBookToWishlist
);


router.delete(
  "/wishlist/:bookId",
  checkAuthorize(["user"]),
  userController.deleteBookFromWishlist
);
router.put("/profile", checkAuthorize(["user"]), userController.editMyProfile);


router.get("/complaint", checkAuthorize(["user"]), userController.getMyComplaints);


router.post("/complaint", checkAuthorize(["user"]), userController.addComplaint);


router.delete("/complaint/:complaintId", checkAuthorize(["user"]), userController.cancelComplaint);

module.exports = router;
