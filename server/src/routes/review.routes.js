const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.use(verifyToken);

router.post('/', reviewController.createReview);
router.post('/report', reviewController.reportEntity);

module.exports = router;
