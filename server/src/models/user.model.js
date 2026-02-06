/**
 * User Model (Concept Only - No strict schema in Firestore, but useful for Reference)
 * Collection: 'users'
 * Document ID: firebase_uid
 * Fields:
 * - email: string
 * - role: 'CUSTOMER' | 'PROVIDER' | 'FREELANCER' | 'JOB_SEEKER' | 'ADMIN'
 * - profileStatus: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'BANNED'
 * - createdAt: timestamp
 * - updatedAt: timestamp
 * - ...roleSpecificFields (e.g., businessName for Providers)
 */

class User {
    constructor(data) {
        this.email = data.email;
        this.role = data.role;
        this.profileStatus = data.profileStatus || 'ACTIVE'; // Default active for Customers
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

module.exports = User;
