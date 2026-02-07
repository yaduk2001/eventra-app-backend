const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Firebase Admin
// In production, use a service account file pointed to by GOOGLE_APPLICATION_CREDENTIALS
// For local dev, we will assume generic setup until credentials are provided
if (!admin.apps.length) {
    try {
        const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

        if (serviceAccountJson) {
            console.log('Firebase Init: Using GOOGLE_SERVICE_ACCOUNT_JSON from Env');
            // Priority 1: JSON String (Best for Production/CI)
            const serviceAccount = JSON.parse(serviceAccountJson);
            const projectId = serviceAccount.project_id;
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: projectId,
                databaseURL: `https://${projectId}-default-rtdb.firebaseio.com`
            });
        } else if (serviceAccountPath) {
            console.log(`Firebase Init: Using GOOGLE_APPLICATION_CREDENTIALS file at ${serviceAccountPath}`);
            const serviceAccount = require(serviceAccountPath);
            const projectId = serviceAccount.project_id;
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: projectId,
                databaseURL: `https://${projectId}-default-rtdb.firebaseio.com`
            });
        } else {
            console.log('Firebase Init: Using Application Default Credentials');
            // Check if project ID is in env, otherwise might fail to guess URL without explicit config
            // Check if project ID is in env, otherwise might fail to guess URL without explicit config
            const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'eventra-13b4c';
            const databaseURL = process.env.DATABASE_URL || `https://${projectId}-default-rtdb.firebaseio.com`;

            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                databaseURL: databaseURL
            });
        }
        console.log('Firebase Admin Initialized successfully (Realtime Database)');
    } catch (error) {
        console.warn('Firebase Admin Initialization Warning:', error.message);
        console.warn('Ensure GOOGLE_APPLICATION_CREDENTIALS is set or service account is provided.');
    }
}

const db = admin.database();
const auth = admin.auth();

module.exports = { admin, db, auth };
