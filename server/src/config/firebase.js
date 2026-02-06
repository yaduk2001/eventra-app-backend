const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Firebase Admin
// In production, use a service account file pointed to by GOOGLE_APPLICATION_CREDENTIALS
// For local dev, we will assume generic setup until credentials are provided
if (!admin.apps.length) {
    try {
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (serviceAccountPath) {
            admin.initializeApp({
                credential: admin.credential.cert(require(serviceAccountPath))
            });
        } else {
            admin.initializeApp({
                credential: admin.credential.applicationDefault()
            });
        }
        console.log('Firebase Admin Initialized successfully');
    } catch (error) {
        console.warn('Firebase Admin Initialization Warning:', error.message);
        console.warn('Ensure GOOGLE_APPLICATION_CREDENTIALS is set or service account is provided.');
    }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
