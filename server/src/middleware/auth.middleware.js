const { admin, db } = require('../config/firebase');

/**
 * Verify Firebase ID Token
 * Extracts user info and attaches it to req.user
 */
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Token Verification Error:', error);
        return res.status(403).json({ message: 'Unauthorized: Invalid token' });
    }
};

/**
 * Role Guard
 * Checks if the user has the required role (fetched from Firestore or Custom Claims)
 * Note: Ideally, we sync role to Custom Claims for faster access, but for now we'll fetch from DB if needed, 
 * or trust the client to send the right token (secure via Custom Claims is best).
 * For this phase, we will fetch the user profile from Firestore to verify role/status.
 */
const roleGuard = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.uid) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // Fetch user role from Firestore
            const userDoc = await db.collection('users').doc(req.user.uid).get();

            if (!userDoc.exists) {
                return res.status(404).json({ message: 'User profile not found' });
            }

            const userData = userDoc.data();

            if (userData.isBanned) {
                return res.status(403).json({ message: 'Account is banned' });
            }

            if (!allowedRoles.includes(userData.role)) {
                return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
            }

            req.userProfile = userData; // Attach full profile for controllers
            next();
        } catch (error) {
            console.error('Role Guard Error:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    };
};

module.exports = { verifyToken, roleGuard };
