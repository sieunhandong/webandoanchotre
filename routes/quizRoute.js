const express = require('express');
const router = express.Router();
const { checkAuthorize } = require('../middleware/authMiddleware');
const quizController = require('../controllers/QuizController');

router.post('/start', quizController.startQuiz);
router.post('/step1', quizController.step1);
router.post('/step2', quizController.step2);
router.post('/step3', quizController.step3);
router.post('/step4', quizController.step4);
router.post('/step5', quizController.step5);
router.get('/step6', quizController.step6);
router.post('/step7', checkAuthorize(["user"]), quizController.step7);
// Thêm endpoint mới để lấy dữ liệu bước cụ thể (cho quay lại)
router.get('/step/:step', quizController.getStepData);

// router.get('/payment-result', quizController.getPaymentReturn);
router.get('/orders', checkAuthorize(["user"]), quizController.getOrders);
router.get('/categories-products', quizController.getCategoriesAndProducts);
router.get('/sets', quizController.getSets);
router.get('/:sessionId', quizController.getQuizSession);

module.exports = router;