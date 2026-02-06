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
        // Attempt standard verification
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Token Verification Error:', error);

        // Fallback for "Metadata service" errors specific to Render/GCP environment mishaps
        // This is a safety net if verifyIdToken fails due to network/metadata lookups 
        // but the token itself might be valid. 
        // STUB: For now, we return 403 to be safe. 
        // If this persists, we might need to rely on client-side auth state completely 
        // or check if 'GOOGLE_SERVICE_ACCOUNT_JSON' is formatted 100% correctly.

        return res.status(403).json({ message: 'Unauthorized: Invalid token', error: error.message });
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

            // Fetch user role from Realtime Database
            const userSnapshot = await db.ref('users/' + req.user.uid).once('value');

            if (!userSnapshot.exists()) {
                // Try to see if wait, maybe we aren't creating it yet?
                // Just return 404 for now.
                return res.status(404).json({ message: 'User profile not found' });
            }

            const userData = userSnapshot.val();

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
            res.status(500).json({
                message: 'Internal Server Error - Role Guard Failed',
                error: error.message,
                code: error.code // Log specific Firebase error code if available
            });
        }
    };
};

module.exports = { verifyToken, roleGuard };
