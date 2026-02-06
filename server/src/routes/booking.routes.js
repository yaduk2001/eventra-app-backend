const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { verifyToken, roleGuard } = require('../middleware/auth.middleware');

router.use(verifyToken);

// Create Booking (Customer)
router.post('/', roleGuard(['CUSTOMER']), bookingController.createBooking);

// Get My Bookings (All Roles)
router.get('/', bookingController.getBookings);

// Update Status (Provider: Accept/Reject, Customer: Cancel)
router.patch('/:id/status', bookingController.updateBookingStatus);

module.exports = router;
