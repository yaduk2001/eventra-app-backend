const { db } = require('../config/firebase');

/**
 * Register User Profile
 * Called after Firebase Auth Signup on client.
 * Creates the user document in Firestore.
 */
const register = async (req, res) => {
    try {
        const { uid, email, role, fullName, ...otherData } = req.body;

        if (!uid || !email || !role) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const validRoles = ['CUSTOMER', 'PROVIDER', 'FREELANCER', 'JOB_SEEKER'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Determine initial status
        let profileStatus = 'ACTIVE';
        if (role === 'PROVIDER' || role === 'FREELANCER') {
            profileStatus = 'PENDING_APPROVAL';
        }

        const newUser = {
            email,
            role,
            fullName,
            profileStatus,
            isBanned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...otherData // Specialized fields like businessName, etc.
        };

        await db.collection('users').doc(uid).set(newUser);

        res.status(201).json({ message: 'User profile created successfully', user: newUser });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Registration failed', error: error.message });
    }
};

/**
 * Get Current User Profile
 */
const getMe = async (req, res) => {
    try {
        const uid = req.user.uid;
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(userDoc.data());
    } catch (error) {
        console.error('GetMe Error:', error);
        res.status(500).json({ message: 'Failed to fetch profile' });
    }
};

module.exports = { register, getMe };
