const { db } = require('../config/firebase');

/**
 * Get User Profile
 */
const getProfile = async (req, res) => {
    try {
        const uid = req.user.uid;
        const userSnapshot = await db.ref('users/' + uid).once('value');
        if (!userSnapshot.exists()) return res.status(404).json({ message: 'Profile not found' });
        res.json(userSnapshot.val());
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

        await db.ref('users/' + uid).update({
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
            // PRD 5.1 A: Upcoming Event Counter
            // Note: RTDB querying is limited. We fetch by customerId and filter in memory.
            const bookingsSnapshot = await db.ref('bookings')
                .orderByChild('customerId')
                .equalTo(uid)
                .once('value');

            let upcomingEvents = 0;
            let nextEvent = null;
            const now = new Date().toISOString();

            if (bookingsSnapshot.exists()) {
                const bookings = [];
                bookingsSnapshot.forEach(child => {
                    const b = child.val();
                    if (b.status === 'CONFIRMED' && b.date >= now) {
                        bookings.push(b);
                    }
                });
                bookings.sort((a, b) => new Date(a.date) - new Date(b.date));
                upcomingEvents = bookings.length;
                nextEvent = bookings.length > 0 ? bookings[0] : null;
            }

            stats = {
                upcomingEvents,
                nextEvent
            }; // End of stats calculation

            // Replaces the original stats assignment block structure roughly
            // Original used bookingsSnapshot directly. We constructed 'stats' here.

            // To match the original code flow where 'stats' is assigned:
            // The original code assigned 'stats = { ... }'. 
            // We already assigned 'stats' above. 
            // However, the original code had 'stats = { upcomingEvents: ..., nextEvent: ... }'
            // I will return the simplified block to fit the target replacement.

            // Stats assigned above
            // Clean up placeholder for original stats assignment if needed
            // The previous chunk replaced the fetching. Now we need to remove the original stats assignment block 
            // OR I should have combined them.
            // Let's cancel this chunk and combine it with previous one.
            // Actually, I can just replace the whole block from 50 to 61.
            // Let's retry the Previous Chunk to cover 50-61.
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
