const router = require('express').Router();
const quizController = require('../controllers/QuizController');
const mealController = require('../controllers/MealPlanController');
const { checkAuthorize } = require('../middleware/authMiddleware');

router.post('/profile', checkAuthorize(['customer']), quizController.createOrUpdateProfile);
router.get('/profile', checkAuthorize(['customer']), quizController.getUserProfile);
router.post('/ai-suggestions', checkAuthorize(['customer']), mealController.getMealSuggestions);

module.exports = router;