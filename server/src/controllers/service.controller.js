const { db } = require('../config/firebase');

/**
 * Service Model Reference (Realtime Database 'services' node)
 */

const createService = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { name, type, description, price, pricingUnit, location, images, capacity } = req.body;

        if (!name || !type || !price) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const newService = {
            providerId: uid,
            providerName: req.userProfile.fullName || 'Unknown Provider',
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

        const serviceRef = db.ref('services').push();
        await serviceRef.set({ ...newService, id: serviceRef.key });

        res.status(201).json({ id: serviceRef.key, ...newService });
    } catch (error) {
        console.error('Create Service Error:', error);
        res.status(500).json({ message: 'Failed to create service' });
    }
};

const getServices = async (req, res) => {
    try {
        const { type, search, providerId } = req.query;

        // RTDB MVP Query: Fetch all and filter (Inefficient for production)
        const snapshot = await db.ref('services').once('value');

        let services = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const s = child.val();
                if (s.isActive) {
                    services.push({ id: child.key, ...s });
                }
            });
        }

        // Apply filters
        if (type) {
            services = services.filter(s => s.type === type);
        }

        if (providerId) {
            services = services.filter(s => s.providerId === providerId);
        }

        if (search) {
            const searchLower = search.toLowerCase();
            services = services.filter(s =>
                s.name.toLowerCase().includes(searchLower) ||
                (s.description && s.description.toLowerCase().includes(searchLower))
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
        const snapshot = await db.ref('services/' + id).once('value');

        if (!snapshot.exists()) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.json({ id: snapshot.key, ...snapshot.val() });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching service' });
    }
};

const deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const uid = req.user.uid;

        const serviceRef = db.ref('services/' + id);
        const snapshot = await serviceRef.once('value');

        if (!snapshot.exists()) return res.status(404).json({ message: 'Service not found' });

        const service = snapshot.val();

        // Ownership check
        if (service.providerId !== uid && req.userProfile.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Unlimited Access Required' });
        }

        await serviceRef.remove();
        res.json({ message: 'Service deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Delete failed' });
    }
};

module.exports = { createService, getServices, getServiceById, deleteService };
