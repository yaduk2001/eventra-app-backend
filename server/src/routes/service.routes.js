const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { verifyToken, roleGuard } = require('../middleware/auth.middleware');

// Public Routes (Optional: if we want to allow public viewing without login. 
// PRD implies "Landing Page" has search. Assuming users might browse before login? 
// PRD "Login Flow" -> Routing. Let's assume login is required for now as per "Platform" nature, 
// or at least verifyToken handles optional auth? 
// We will secure all for simplicity and data protection, or allow public GET.
// Let's make GET public but maybe requires token if we want strictness. 
// For "Production Grade", public catalog is usually open. 
// But verifyToken middleware in `app.js` or here might block it.
// I'll make GET public, POST protected.
// Note: client ApiClient adds token if logged in.

// GET /api/services (Public)
router.get('/', serviceController.getServices);
router.get('/:id', serviceController.getServiceById);

// Protected Routes
router.use(verifyToken);

// Create Service (Provider Only)
router.post('/', roleGuard(['PROVIDER', 'ADMIN']), serviceController.createService);

// Delete Service (Provider Only)
router.delete('/:id', roleGuard(['PROVIDER', 'ADMIN']), serviceController.deleteService);

module.exports = router;
