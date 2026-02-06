const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken, roleGuard } = require('../middleware/auth.middleware');

router.use(verifyToken);
router.use(roleGuard(['ADMIN'])); // Global Guard for this router

router.get('/stats', adminController.getSystemStats);
router.get('/users', adminController.getUsers);
router.patch('/users/:uid/ban', adminController.toggleBan);
router.patch('/users/:uid/verify', adminController.verifyUser);

module.exports = router;
