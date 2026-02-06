const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken, roleGuard } = require('../middleware/auth.middleware');

// All routes here require Authentication
router.use(verifyToken);

// Get my profile
router.get('/me', roleGuard(['CUSTOMER', 'PROVIDER', 'FREELANCER', 'JOB_SEEKER', 'ADMIN']), userController.getProfile);

// Update my profile
router.put('/me', roleGuard(['CUSTOMER', 'PROVIDER', 'FREELANCER', 'JOB_SEEKER', 'ADMIN']), userController.updateProfile);

// Get Dashboard Stats
router.get('/dashboard', roleGuard(['CUSTOMER', 'PROVIDER', 'FREELANCER', 'JOB_SEEKER', 'ADMIN']), userController.getDashboardStats);

module.exports = router;
