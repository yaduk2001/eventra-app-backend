const { db } = require('../config/firebase');

/**
 * Service Model Reference (Firestore 'services' collection)
 * {
 *   providerId: string,
 *   type: 'VENUE' | 'CATERING' | 'TRANSPORT' | 'TALENT',
 *   name: string,
 *   description: string,
 *   price: number,
 *   pricingUnit: 'PER_HOUR' | 'PER_DAY' | 'PER_PLATE' | 'FIXED',
 *   location: string,
 *   images: string[], // URLs
 *   capacity: number (optional),
 *   createdAt: timestamp
 * }
 */

const createService = async (req, res) => {
    try {
        const uid = req.user.uid;
        // req.userProfile is attached by RoleGuard
        // Verify again if needed, but RoleGuard(['PROVIDER']) handles it.

        const { name, type, description, price, pricingUnit, location, images, capacity } = req.body;

        if (!name || !type || !price) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const newService = {
            providerId: uid,
            providerName: req.userProfile.fullName || 'Unknown Provider', // Denormalize for easier display
            businessName: req.userProfile.businessName || '',
            type,
            name,
            description: description || '',
            price: Number(price),
            pricingUnit: pricingUnit || 'FIXED',
            location: location || '',
            images: images || [],
            capacity: capacity ? Number(capacity) : 0,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await db.collection('services').add(newService);
        res.status(201).json({ id: docRef.id, ...newService });
    } catch (error) {
        console.error('Create Service Error:', error);
        res.status(500).json({ message: 'Failed to create service' });
    }
};

const getServices = async (req, res) => {
    try {
        const { type, search, providerId } = req.query;
        let query = db.collection('services').where('isActive', '==', true);

        if (type) {
            query = query.where('type', '==', type);
        }

        if (providerId) {
            query = query.where('providerId', '==', providerId);
        }

        // Firestore doesn't support native full-text search. 
        // For 'search', we normally implement client-side filter or Algolia/Typesense.
        // For this MVP, we will fetch and filter in memory if 'search' is present (not scalable for 100k users, but functional for v1)
        // Or we rely on exact match.
        // We'll return the results and let client filter complex strings if needed, 
        // or simple startAt if sorted by name.

        const snapshot = await query.get();

        let services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Basic in-memory search filter for MVP
        if (search) {
            const searchLower = search.toLowerCase();
            services = services.filter(s =>
                s.name.toLowerCase().includes(searchLower) ||
                s.description.toLowerCase().includes(searchLower)
            );
        }

        res.json(services);
    } catch (error) {
        console.error('Get Services Error:', error);
        res.status(500).json({ message: 'Failed to fetch services' });
    }
};

const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('services').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching service' });
    }
};

const deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const uid = req.user.uid;

        const docRef = db.collection('services').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ message: 'Service not found' });

        // Ownership check
        if (doc.data().providerId !== uid && req.userProfile.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Unlimited Access Required' });
        }

        await docRef.delete();
        res.json({ message: 'Service deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Delete failed' });
    }
};

module.exports = { createService, getServices, getServiceById, deleteService };
