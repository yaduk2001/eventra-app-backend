const express = require('express');
const router = express.Router();
const { createPass, getPasses, purchasePass } = require('../controllers/pass.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.post('/', verifyToken, createPass);
router.get('/', getPasses);
router.post('/:id/purchase', verifyToken, purchasePass);

module.exports = router;
