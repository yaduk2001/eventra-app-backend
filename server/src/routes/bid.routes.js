const express = require('express');
const router = express.Router();
const bidController = require('../controllers/bid.controller');
const { verifyToken, roleGuard } = require('../middleware/auth.middleware');

// Create Bid Request (Customer)
router.post('/requests', verifyToken, roleGuard(['CUSTOMER']), bidController.createBidRequest);

// Get Bid Requests (Provider: Market View; Customer: Their Requests)
router.get('/requests', verifyToken, bidController.getBidRequests);

// Place a Bid (Provider)
router.post('/requests/:requestId/bid', verifyToken, roleGuard(['PROVIDER', 'FREELANCER']), bidController.placeBid);

// Respond to Bid (Customer) - Accept/Reject
router.post('/requests/:requestId/bids/:bidId/respond', verifyToken, roleGuard(['CUSTOMER']), bidController.respondToBid);

module.exports = router;
