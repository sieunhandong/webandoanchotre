const router = require('express').Router();
const authController = require('../controllers/AuthController');
const { checkAuthorize } = require('../middleware/authMiddleware');



router.post("/send-otp", authController.sendOtp);


router.post("/verify-otp", authController.verifyOtp);


router.post("/register", authController.register);


router.post("/login", authController.login);


router.post("/reset-password", authController.resetPassword);


router.post("/refresh-token", authController.refreshToken);


router.post("/change-password", checkAuthorize(["user"]), authController.changePassword);


router.post("/google-auth", authController.googleLogin);


router.post("/facebook-auth", authController.facebookLogin);

router.post("/logout", authController.logoutUser);
module.exports = router;
