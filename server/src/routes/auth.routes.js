const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Public: Create Profile (after Firebase Auth on client)
router.post('/register', authController.register);

// Protected: Get Profile
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
