const { db } = require('../config/firebase');

/**
 * Booking Model (Firestore 'bookings' collection)
 * {
 *   customerId: string,
 *   customerName: string,
 *   providerId: string,
 *   serviceId: string,
 *   serviceName: string,
 *   serviceType: string,
 *   date: timestamp (ISO String),
 *   status: 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED',
 *   price: number,
 *   createdAt: timestamp
 * }
 */

// Create Booking Request
const createBooking = async (req, res) => {
    try {
        const { serviceId, date } = req.body;
        const customerId = req.user.uid;

        if (!serviceId || !date) {
            return res.status(400).json({ message: 'Service ID and Date are required' });
        }

        // 1. Fetch Service Details
        const serviceDoc = await db.collection('services').doc(serviceId).get();
        if (!serviceDoc.exists) return res.status(404).json({ message: 'Service not found' });
        const service = serviceDoc.data();

        // 2. Check Availability (Basic Concurrency Check)
        // In production, we'd use a transaction if "Single Slot" logic applies strictly.
        // For MVP, we check if there's any CONFIRMED booking for same service + date.
        // Assuming 'date' is a specific ISO date string (YYYY-MM-DD). If it includes time, check overlap.
        // Let's assume simpler Day-based booking for now.

        // const conflict = await db.collection('bookings')
        //   .where('serviceId', '==', serviceId)
        //   .where('date', '==', date)
        //   .where('status', '==', 'CONFIRMED')
        //   .get();

        // if (!conflict.empty) return res.status(409).json({ message: 'Service already booked for this date' });

        // 3. Create Booking
        const newBooking = {
            customerId,
            customerName: req.userProfile.fullName,
            providerId: service.providerId,
            serviceId,
            serviceName: service.name,
            serviceType: service.type,
            date,
            price: service.price, // Snapshot price at time of booking
            status: 'REQUESTED',
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('bookings').add(newBooking);

        // TODO: Send Notification to Provider (FCM)

        res.status(201).json({ id: docRef.id, ...newBooking });
    } catch (error) {
        console.error('Create Booking Error:', error);
        res.status(500).json({ message: 'Booking failed' });
    }
};

// Get Bookings (For Customer or Provider)
const getBookings = async (req, res) => {
    try {
        const uid = req.user.uid;
        const role = req.userProfile.role;

        let query = db.collection('bookings');

        if (role === 'CUSTOMER') {
            query = query.where('customerId', '==', uid);
        } else if (role === 'PROVIDER') {
            query = query.where('providerId', '==', uid);
        } else {
            // Freelancer logic similar to provider
            query = query.where('providerId', '==', uid);
        }

        const snapshot = await query.orderBy('createdAt', 'desc').get();
        const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch bookings' });
    }
};

// Update Booking Status (Accept/Reject/Complete)
const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const uid = req.user.uid;
        const role = req.userProfile.role;

        const bookingRef = db.collection('bookings').doc(id);
        const bookingDoc = await bookingRef.get();

        if (!bookingDoc.exists) return res.status(404).json({ message: 'Booking not found' });
        const booking = bookingDoc.data();

        // Authorization Logic
        // Provider can: ACCEPT, REJECT, COMPLETE
        // Customer can: CANCEL

        if (role === 'PROVIDER') {
            if (booking.providerId !== uid) return res.status(403).json({ message: 'Unauthorized' });
            if (!['ACCEPTED', 'REJECTED', 'CONFIRMED', 'COMPLETED'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status transition for Provider' });
            }
        } else if (role === 'CUSTOMER') {
            if (booking.customerId !== uid) return res.status(403).json({ message: 'Unauthorized' });
            if (status !== 'CANCELLED') {
                return res.status(400).json({ message: 'Customer can only CANCEL' });
            }
        }

        await bookingRef.update({ status, updatedAt: new Date().toISOString() });
        res.json({ message: `Booking status updated to ${status}` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Update failed' });
    }
};

module.exports = { createBooking, getBookings, updateBookingStatus };
