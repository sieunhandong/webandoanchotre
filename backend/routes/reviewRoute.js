const router = require("express").Router();
const { uploadMultiple } = require("../config/cloudinary");
const reviewController = require("../controllers/ReviewController");
const { checkAuthorize } = require("../middleware/authMiddleware");


router.post("/", checkAuthorize(["admin"]), uploadMultiple, reviewController.createReview);


router.get("/", reviewController.getAllReviews);


router.get("/:id", reviewController.getReviewById);


router.put("/:id", checkAuthorize(["admin"]), reviewController.updateReview);


router.delete("/:id", checkAuthorize(["admin"]), reviewController.deleteReview);

module.exports = router;
