const { db } = require('./src/config/firebase');

async function testConnection() {
    try {
        console.log('Testing Realtime Database Connection...');

        // Try to read root or a user path
        // Just reading root '/' might be large if data exists, but empty is fine.
        // Let's read a non-existent path to verify access without downloading potentially huge data? 
        // Or just 'users' limit 1.

        const snapshot = await db.ref('users').limitToFirst(1).once('value');

        console.log('✅ Connection Successful!');
        if (snapshot.exists()) {
            console.log(`Found data in "users". Key: ${Object.keys(snapshot.val())[0]}`);
        } else {
            console.log('Collection "users" is empty or not found, but connection works.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Connection Failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        process.exit(1);
    }
}

testConnection();
