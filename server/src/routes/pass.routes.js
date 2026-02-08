const express = require('express');
const router = express.Router();
const { createPass, getPasses, purchasePass, getMyPasses } = require('../controllers/pass.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.post('/', verifyToken, createPass);
router.get('/', getPasses);
router.post('/:id/purchase', verifyToken, purchasePass);
router.get('/my-purchases', verifyToken, getMyPasses);

module.exports = router;
