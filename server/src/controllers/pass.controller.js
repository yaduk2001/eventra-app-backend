const { db } = require('../config/firebase');

/**
 * Pass Controller
 * Handles creation and retrieval of event passes.
 */

// Create a new Event Pass (by organizer/admin)
const createPass = async (req, res) => {
    try {
        const uid = req.user.uid;
        let userProfile = req.userProfile;

        // Fetch user profile if not provided by middleware
        if (!userProfile) {
            const userSnapshot = await db.ref('users/' + uid).once('value');
            userProfile = userSnapshot.val() || {};
        }

        const {
            eventName,
            eventDate,
            startTime,
            location,
            price,
            passType,
            capacity
        } = req.body;

        if (!eventName || !eventDate || !price || !passType) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const newPass = {
            creatorId: uid,
            creatorName: userProfile.fullName || userProfile.name || 'Organizer',
            eventName,
            eventDate,
            startTime: startTime || '',
            location: location || '',
            price: Number(price),
            passType, // e.g., 'VIP', 'Standard'
            capacity: capacity ? Number(capacity) : 100,
            soldCount: 0,
            isActive: true,
            createdAt: new Date().toISOString()
        };

        const passRef = db.ref('passes').push();
        await passRef.set(newPass);

        res.status(201).json({ id: passRef.key, ...newPass });
    } catch (error) {
        console.error('Create Pass Error:', error);
        res.status(500).json({ message: 'Failed to create pass' });
    }
};

// Get all available passes
const getPasses = async (req, res) => {
    try {
        const snapshot = await db.ref('passes').once('value');
        const passes = [];

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const p = child.val();
                if (p.isActive) {
                    passes.push({ id: child.key, ...p });
                }
            });
        }

        res.json(passes);
    } catch (error) {
        console.error('Get Passes Error:', error);
        res.status(500).json({ message: 'Failed to fetch passes' });
    }
};

// Purchase a pass
const purchasePass = async (req, res) => {
    try {
        const { id } = req.params; // Pass ID
        const uid = req.user.uid;
        const { quantity, attendeeName, email } = req.body;

        const qty = Number(quantity) || 1;

        // 1. Check Pass Availability
        const passRef = db.ref(`passes/${id}`);
        const snapshot = await passRef.once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ message: 'Pass not found' });
        }

        const passData = snapshot.val();
        if (passData.soldCount + qty > passData.capacity) {
            return res.status(400).json({ message: 'Not enough tickets available' });
        }

        // 2. Record Transaction
        const purchaseData = {
            passId: id,
            buyerId: uid,
            attendeeName,
            email,
            quantity: qty,
            totalPrice: passData.price * qty,
            eventName: passData.eventName,
            passType: passData.passType,
            purchasedAt: new Date().toISOString(),
            status: 'CONFIRMED'
        };

        const purchaseRef = db.ref('pass_purchases').push();
        await purchaseRef.set(purchaseData);

        // 3. Update Sold Count
        await passRef.update({ soldCount: passData.soldCount + qty });

        res.status(201).json({
            message: 'Purchase successful',
            purchaseId: purchaseRef.key,
            ...purchaseData
        });

    } catch (error) {
        console.error('Purchase Pass Error:', error);
        res.status(500).json({ message: 'Purchase failed' });
    }
};

// Get My Purchased Passes
const getMyPasses = async (req, res) => {
    try {
        const uid = req.user.uid;
        const snapshot = await db.ref('pass_purchases').orderByChild('buyerId').equalTo(uid).once('value');

        const myPasses = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                myPasses.push({ id: child.key, ...child.val() });
            });
        }
        res.json(myPasses);
    } catch (error) {
        console.error('Get My Passes Error:', error);
        res.status(500).json({ message: 'Failed to fetch my passes' });
    }
};

module.exports = { createPass, getPasses, purchasePass, getMyPasses };
