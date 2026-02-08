const { auth, db } = require('../config/firebase');

const createAdmin = async () => {
    try {
        const email = 'admin@eventra.com';
        const password = 'AdminPassword123!';

        console.log(`Creating admin user: ${email}...`);

        let uid;
        try {
            const userRecord = await auth.getUserByEmail(email);
            uid = userRecord.uid;
            console.log('User already exists in Auth, updating...');
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                const userRecord = await auth.createUser({
                    email,
                    password,
                    displayName: 'System Admin'
                });
                uid = userRecord.uid;
                console.log('User created in Auth.');
            } else {
                throw error;
            }
        }

        console.log(`Setting/Updating admin profile for UID: ${uid}...`);

        await db.ref('users/' + uid).set({
            email,
            role: 'ADMIN',
            fullName: 'System Administrator',
            profileStatus: 'ACTIVE',
            isBanned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        console.log('SUCCESS: Admin user created/updated.');
        process.exit(0);
    } catch (error) {
        console.error('FAILURE:', error);
        process.exit(1);
    }
};

createAdmin();
