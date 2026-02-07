const { db } = require('../config/firebase');

// Create a new Bid Request (Customer Action)
const createBidRequest = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { eventName, eventType, date, location, guestCount, budget, isFreelancerRequest } = req.body;

        if (!eventName || !date || !budget) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const newRequest = {
            customerId: uid,
            customerName: req.userProfile.fullName || 'Unknown Customer',
            eventName,
            eventType: eventType || 'GENERAL',
            date,
            location: location || '',
            guestCount: Number(guestCount) || 0,
            budget: Number(budget),
            isFreelancerRequest: isFreelancerRequest || false,
            status: 'OPEN',
            bids: {}, // Placeholder for bids
            createdAt: new Date().toISOString()
        };

        const requestRef = db.ref('bidRequests').push();
        await requestRef.set({ ...newRequest, id: requestRef.key });

        res.status(201).json({ id: requestRef.key, ...newRequest });
    } catch (error) {
        console.error('Create Bid Request Error:', error);
        res.status(500).json({ message: 'Failed to create request' });
    }
};

// Get Bid Requests (Provider: View Open; Customer: View Theirs)
const getBidRequests = async (req, res) => {
    try {
        const uid = req.user.uid;
        const role = req.userProfile.role;

        let snapshot;

        if (role === 'CUSTOMER') {
            // Customer sees their own requests
            snapshot = await db.ref('bidRequests').orderByChild('customerId').equalTo(uid).once('value');
        } else {
            // Provider sees ALL open requests (simple marketplace)
            // Ideally filtered by location/category but keeping it simple MVP
            // RTDB Query Limitation: Can only filter by one child.
            // So we fetch 'OPEN' requests and let client/server filter more if needed.
            // Or just fetch all and filter in memory.

            snapshot = await db.ref('bidRequests').orderByChild('status').equalTo('OPEN').once('value');
        }

        let requests = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const val = child.val();
                // Transform bids object to array for easier frontend handling
                const bidsArray = [];
                if (val.bids) {
                    Object.keys(val.bids).forEach(key => {
                        bidsArray.push({ id: key, ...val.bids[key] });
                    });
                }
                requests.push({ ...val, id: child.key, bids: bidsArray });
            });
            // Sort by createdAt desc
            requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        res.json(requests);

    } catch (error) {
        console.error('Info Error:', error);
        res.status(500).json({ message: 'Failed to fetch requests' });
    }
};

// Place a Bid (Provider Action)
const placeBid = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { requestId } = req.params;
        const { price, pitch } = req.body;

        if (!price || !pitch) {
            return res.status(400).json({ message: 'Price and pitch required' });
        }

        const requestRef = db.ref('bidRequests/' + requestId);
        const snapshot = await requestRef.once('value');
        if (!snapshot.exists()) return res.status(404).json({ message: 'Request not found' });

        const request = snapshot.val();
        if (request.status !== 'OPEN') return res.status(400).json({ message: 'Request is closed' });

        const newBid = {
            providerId: uid,
            providerName: req.userProfile.fullName || 'Unknown Provider',
            price: Number(price),
            pitch,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        };

        const bidRef = requestRef.child('bids').push();
        await bidRef.set({ ...newBid, bidId: bidRef.key }); // Storing bidId inside object useful

        // TODO: Notify Customer

        res.status(201).json({ id: bidRef.key, ...newBid });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to place bid' });
    }
};

// Respond to Bid (Customer Action: Accept/Reject)
const respondToBid = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { requestId, bidId } = req.params;
        const { action } = req.body; // 'ACCEPT' | 'REJECT'

        const requestRef = db.ref('bidRequests/' + requestId);
        const requestSnap = await requestRef.once('value');
        if (!requestSnap.exists()) return res.status(404).json({ message: 'Request not found' });

        const request = requestSnap.val();
        if (request.customerId !== uid) return res.status(403).json({ message: 'Unauthorized' });

        const bidRef = requestRef.child('bids/' + bidId);
        const bidSnap = await bidRef.once('value');
        if (!bidSnap.exists()) return res.status(404).json({ message: 'Bid not found' });

        if (action === 'REJECT') {
            await bidRef.update({ status: 'REJECTED' });
            return res.json({ message: 'Bid rejected' });
        }

        if (action === 'ACCEPT') {
            const bid = bidSnap.val();

            // 1. Create Confirmed Booking in 'bookings' collection
            const newBooking = {
                customerId: uid,
                customerName: req.userProfile.fullName,
                providerId: bid.providerId,
                serviceId: 'CUSTOM_BID', // Placeholder as it's a custom request
                serviceName: request.eventName + ' (Custom Bid)',
                serviceType: request.eventType,
                date: request.date,
                price: bid.price,
                status: 'CONFIRMED',
                createdAt: new Date().toISOString(),
                bidRequestId: requestId // Link back
            };

            const bookingRef = db.ref('bookings').push();
            await bookingRef.set({ ...newBooking, id: bookingRef.key });

            // 2. Update Bid Status
            await bidRef.update({ status: 'ACCEPTED' });

            // 3. Close Request
            await requestRef.update({ status: 'CLOSED', selectedBidId: bidId });

            return res.json({ message: 'Bid accepted, booking created', bookingId: bookingRef.key });
        }

        res.status(400).json({ message: 'Invalid action' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Action failed' });
    }
};

module.exports = { createBidRequest, getBidRequests, placeBid, respondToBid };
