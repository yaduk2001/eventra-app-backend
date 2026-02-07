const { admin, db } = require('./src/config/firebase');

async function verifyRTDB() {
    console.log('--- Verifying Realtime Database Connection ---');
    try {
        // Log the effective database URL (from initialized app options)
        const appOptions = admin.app().options;
        console.log('Database URL:', appOptions.databaseURL);
        console.log('Project ID:', appOptions.projectId);

        // Try a simple read
        console.log('Attempting to read users/...');
        const snapshot = await db.ref('users').limitToFirst(1).once('value');

        if (snapshot.exists()) {
            console.log('SUCCESS: Connection proven. Found ' + snapshot.numChildren() + ' users.');
            const data = snapshot.val();
            // print first user key just to confirm
            console.log('First User Key:', Object.keys(data)[0]);
        } else {
            console.log('SUCCESS: Connection proven, but users collection is empty.');
        }

        process.exit(0);
    } catch (error) {
        console.error('FAILURE: Connection Failed');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        process.exit(1);
    }
}

verifyRTDB();
