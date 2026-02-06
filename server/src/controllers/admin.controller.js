const { db, admin } = require('../config/firebase');

// Get System Overview Stats
const getSystemStats = async (req, res) => {
    try {
        const usersSnap = await db.ref('users').once('value');
        const bookingsSnap = await db.ref('bookings').once('value');
        const jobsSnap = await db.ref('jobs').once('value');
        const servicesSnap = await db.ref('services').once('value');

        res.json({
            users: usersSnap.numChildren(),
            bookings: bookingsSnap.numChildren(),
            jobs: jobsSnap.numChildren(),
            services: servicesSnap.numChildren(),
        });
    } catch (error) {
        res.status(500).json({ message: 'Stats failed' });
    }
};

// Get Users (with Filter)
const getUsers = async (req, res) => {
    try {
        const { role } = req.query; // optional filter

        let users = [];
        const snapshot = await db.ref('users').limitToFirst(50).once('value');

        snapshot.forEach(child => {
            const u = child.val();
            u.uid = child.key;
            if (role) {
                if (u.role === role) users.push(u);
            } else {
                users.push(u);
            }
        });

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

        await db.ref('users/' + uid).update({ isBanned });

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

        await db.ref('users/' + uid).update({ profileStatus: status });
        res.json({ message: `User status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed' });
    }
};

module.exports = { getSystemStats, getUsers, toggleBan, verifyUser };
