const { db } = require('../config/firebase');

/**
 * Review Model
 * {
 *   entityId: string, // Service ID or Freelancer ID
 *   bookingId: string,
 *   reviewerId: string,
 *   userName: string,
 *   rating: number, // 1-5
 *   comment: string,
 *   createdAt: timestamp
 * }
 */

// Create Review
const createReview = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { entityId, bookingId, rating, comment } = req.body;

        if (!entityId || !rating) return res.status(400).json({ message: 'Rating required' });

        // Validate Booking Completion (Optional but good practice)
        if (bookingId) {
            const booking = await db.collection('bookings').doc(bookingId).get();
            if (booking.exists && booking.data().status !== 'COMPLETED') {
                return res.status(400).json({ message: 'Can only review completed bookings' });
            }
        }

        const newReview = {
            entityId,
            bookingId: bookingId || null,
            reviewerId: uid,
            userName: req.userProfile.fullName || 'User',
            rating: Number(rating),
            comment: comment || '',
            createdAt: new Date().toISOString()
        };

        await db.collection('reviews').add(newReview);
        res.status(201).json({ message: 'Review submitted' });

    } catch (error) {
        res.status(500).json({ message: 'Review failed' });
    }
};

// Report Entity (Safety)
const reportEntity = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { entityId, reason, type } = req.body; // type: 'SERVICE', 'JOB', 'USER'

        await db.collection('reports').add({
            reporterId: uid,
            entityId,
            type: type || 'GENERAL',
            reason,
            status: 'OPEN',
            createdAt: new Date().toISOString()
        });

        res.json({ message: 'Report submitted. Admin will review.' });
    } catch (error) {
        res.status(500).json({ message: 'Report failed' });
    }
};

module.exports = { createReview, reportEntity };
