const router = require("express").Router();
const multer = require("multer");
const chatbotController = require("../controllers/ChatBotController");

const upload = multer({ storage: multer.memoryStorage() });


router.post("/suggest", chatbotController.getSuggestions);



router.post("/upload-image-suggest", upload.single('image'), chatbotController.uploadImage);

module.exports = router;