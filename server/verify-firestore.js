const { db } = require('./src/config/firebase');

async function testConnection() {
    try {
        console.log('Testing Firestore Connection...');

        // Try to list collections at the root level
        const collections = await db.listCollections();

        console.log('✅ Connection Successful!');
        console.log(`Found ${collections.length} collections.`);
        collections.forEach(col => console.log(` - ${col.id}`));

        process.exit(0);
    } catch (error) {
        console.error('❌ Connection Failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        // console.error('Full Error:', JSON.stringify(error, null, 2));
        process.exit(1);
    }
}

testConnection();
