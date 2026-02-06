const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const { verifyToken, roleGuard } = require('../middleware/auth.middleware');

router.use(verifyToken);

// Jobs
router.post('/', roleGuard(['PROVIDER', 'CUSTOMER', 'ADMIN']), jobController.createJob);
router.get('/', jobController.getJobs); // Public feed for auth users

// Applications
router.post('/apply', roleGuard(['FREELANCER', 'JOB_SEEKER']), jobController.applyForJob);
router.get('/applications', jobController.getApplications);
router.patch('/applications/:id', roleGuard(['PROVIDER', 'CUSTOMER', 'ADMIN']), jobController.updateApplicationStatus);

module.exports = router;
