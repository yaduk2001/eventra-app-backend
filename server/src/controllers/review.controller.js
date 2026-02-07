const { db } = require('../config/firebase');

/**
 * Review Model (RTDB 'testimonials' node)
 */

// Create Review
const createReview = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { entityId, bookingId, rating, comment } = req.body;

        if (!entityId || !rating) return res.status(400).json({ message: 'Rating required' });

        // Validate Booking Completion (Optional but good practice)
        if (bookingId) {
            const bookingSnapshot = await db.ref('bookings/' + bookingId).once('value');
            if (bookingSnapshot.exists() && bookingSnapshot.val().status !== 'COMPLETED') {
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

        const reviewRef = db.ref('testimonials').push();
        await reviewRef.set({ ...newReview, id: reviewRef.key });

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

        const report = {
            reporterId: uid,
            entityId,
            type: type || 'GENERAL',
            reason,
            status: 'OPEN',
            createdAt: new Date().toISOString()
        };

        const reportRef = db.ref('reports').push();
        await reportRef.set({ ...report, id: reportRef.key });

        res.json({ message: 'Report submitted. Admin will review.' });
    } catch (error) {
        res.status(500).json({ message: 'Report failed' });
    }
};

module.exports = { createReview, reportEntity };
