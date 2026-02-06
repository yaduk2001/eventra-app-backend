const { db } = require('../config/firebase');

/**
 * Get User Profile
 */
const getProfile = async (req, res) => {
    try {
        const uid = req.user.uid;
        const doc = await db.collection('users').doc(uid).get();
        if (!doc.exists) return res.status(404).json({ message: 'Profile not found' });
        res.json(doc.data());
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Update User Profile
 */
const updateProfile = async (req, res) => {
    try {
        const uid = req.user.uid;
        // Prevent updating protected fields like 'role', 'email', 'isBanned' via this endpoint
        const { role, email, isBanned, profileStatus, ...updates } = req.body;

        await db.collection('users').doc(uid).update({
            ...updates,
            updatedAt: new Date().toISOString()
        });

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get Dashboard Stats
 * Aggregates data based on user role (Section 5 of PRD)
 */
const getDashboardStats = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { role } = req.userProfile; // From RoleGuard

        let stats = {};

        if (role === 'CUSTOMER') {
            // PRD 5.1 A: Upcoming Event Counter
            const bookingsSnapshot = await db.collection('bookings')
                .where('customerId', '==', uid)
                .where('status', '==', 'CONFIRMED')
                .where('date', '>=', new Date().toISOString())
                .orderBy('date', 'asc')
                .limit(1)
                .get();

            stats = {
                upcomingEvents: bookingsSnapshot.size,
                nextEvent: bookingsSnapshot.empty ? null : bookingsSnapshot.docs[0].data()
            };
        }
        else if (role === 'PROVIDER') {
            // PRD 5.2 A: Financial Widget, Operational Widget
            // Mocking aggregation for now as specific collections don't exist populated
            stats = {
                revenueMonth: 0,
                pendingPayouts: 0,
                todaysBookings: 0,
                newRequests: 0,
                profileHealth: 80
            };
        }
        else if (role === 'FREELANCER') {
            // PRD 5.4 A
            stats = {
                earningsMonth: 0,
                activeGigs: 0,
                availability: true
            };
        }

        res.json(stats);
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
};

module.exports = { getProfile, updateProfile, getDashboardStats };
