const router = require("express").Router();
const commentController = require("../controllers/CommentController");
const { checkAuthorize } = require("../middleware/authMiddleware");


router.post("/", checkAuthorize(["user"]), commentController.createComment);


router.get("/review/:reviewId", commentController.getCommentsByReview);


router.get("/", checkAuthorize(["admin"]), commentController.getAllComments);


router.put("/approve/:id", checkAuthorize(["admin"]), commentController.approveComment);


router.delete("/:id", checkAuthorize(["admin"]), commentController.deleteComment);

module.exports = router;
