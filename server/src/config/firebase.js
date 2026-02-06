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
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });
        } else if (serviceAccountPath) {
            console.log(`Firebase Init: Using GOOGLE_APPLICATION_CREDENTIALS file at ${serviceAccountPath}`);
            // Priority 2: File Path (Best for Local Dev)
            // If the path is absolute or relative, require works. 
            // Note: require() caches, so for dynamic updates use fs.readFileSync if needed, but require is standard here.
            admin.initializeApp({
                credential: admin.credential.cert(require(serviceAccountPath))
            });
        } else {
            console.log('Firebase Init: Using Application Default Credentials');
            // Priority 3: Application Default Credentials (GCP usage)
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
