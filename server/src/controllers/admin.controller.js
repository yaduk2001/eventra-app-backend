const { db, admin } = require('../config/firebase');

// Get System Overview Stats
const getSystemStats = async (req, res) => {
    try {
        // In a real app, use aggregation queries or counters.
        // For MVP, simplistic counting (careful with large datasets).
        const usersSnap = await db.collection('users').count().get();
        const bookingsSnap = await db.collection('bookings').count().get();
        const jobsSnap = await db.collection('jobs').count().get();
        const servicesSnap = await db.collection('services').count().get();

        res.json({
            users: usersSnap.data().count,
            bookings: bookingsSnap.data().count,
            jobs: jobsSnap.data().count,
            services: servicesSnap.data().count,
        });
    } catch (error) {
        res.status(500).json({ message: 'Stats failed' });
    }
};

// Get Users (with Filter)
const getUsers = async (req, res) => {
    try {
        const { role } = req.query; // optional filter
        let query = db.collection('users');
        if (role) query = query.where('role', '==', role);

        // Limit for safety
        const snapshot = await query.limit(50).get();
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Fetch users failed' });
    }
};

// Ban User
const toggleBan = async (req, res) => {
    try {
        const { uid } = req.params;
        const { isBanned } = req.body; // true/false

        await db.collection('users').doc(uid).update({ isBanned });

        // Optionally revoke auth tokens
        if (isBanned) {
            await admin.auth().updateUser(uid, { disabled: true });
        } else {
            await admin.auth().updateUser(uid, { disabled: false });
        }

        res.json({ message: `User ban status: ${isBanned}` });
    } catch (error) {
        res.status(500).json({ message: 'Action failed' });
    }
};

// Verify User (Provider Approval)
const verifyUser = async (req, res) => {
    try {
        const { uid } = req.params;
        const { status } = req.body; // 'ACTIVE', 'REJECTED'

        await db.collection('users').doc(uid).update({ profileStatus: status });
        res.json({ message: `User status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed' });
    }
};

module.exports = { getSystemStats, getUsers, toggleBan, verifyUser };
