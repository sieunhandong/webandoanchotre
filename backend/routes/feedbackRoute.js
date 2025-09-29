const router = require("express").Router();
const feedbackController = require("../controllers/FeedbackController");
const { checkAuthorize } = require("../middleware/authMiddleware");


router.get("/user/:bookId", checkAuthorize(["user"]), feedbackController.getUserFeedback);



router.post("/:bookId", checkAuthorize(["user"]), feedbackController.createFeedback);


router.get("/:bookId", feedbackController.getFeedbacksByBook);


router.put("/update/:feedbackId", checkAuthorize(["user"]), feedbackController.updateFeedback);



router.delete("/delete/:feedbackId", checkAuthorize(["user"]), feedbackController.deleteFeedback);



module.exports = router;