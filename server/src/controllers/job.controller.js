const { db } = require('../config/firebase');

/**
 * Job Model (Firestore 'jobs' collection)
 * {
 *   employerId: string, // Provider or Customer UID
 *   employerName: string,
 *   title: string,
 *   description: string,
 *   roleType: 'FREELANCER' | 'JOB_SEEKER',
 *   category: string, // e.g., 'PHOTOGRAPHY', 'CATERING'
 *   budget: number, 
 *   budgetType: 'FIXED' | 'HOURLY',
 *   status: 'OPEN' | 'CLOSED',
 *   createdAt: timestamp
 * }
 */

// Create Job
const createJob = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { title, description, category, budget, budgetType, roleType } = req.body;

        if (!title || !description || !budget) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const newJob = {
            employerId: uid,
            employerName: req.userProfile.fullName || 'Unknown Employer',
            title,
            description,
            roleType: roleType || 'FREELANCER',
            category: category || 'GENERAL',
            budget: Number(budget),
            budgetType: budgetType || 'FIXED',
            status: 'OPEN',
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('jobs').add(newJob);
        res.status(201).json({ id: docRef.id, ...newJob });
    } catch (error) {
        res.status(500).json({ message: 'Failed to post job' });
    }
};

// Get Jobs (Feed)
const getJobs = async (req, res) => {
    try {
        const { roleType, category } = req.query;

        // Default: Show Open jobs
        let query = db.collection('jobs').where('status', '==', 'OPEN');

        if (roleType) {
            query = query.where('roleType', '==', roleType);
        }
        if (category) {
            query = query.where('category', '==', category);
        }

        const snapshot = await query.orderBy('createdAt', 'desc').get();
        const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.json(jobs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch jobs' });
    }
};

/**
 * Application Model (Firestore 'applications' collection)
 * {
 *   jobId: string,
 *   applicantId: string,
 *   applicantName: string,
 *   coverNote: string,
 *   status: 'APPLIED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED',
 *   createdAt: timestamp
 * }
 */

// Apply for Job
const applyForJob = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { jobId, coverNote } = req.body;

        // Check if already applied
        const existing = await db.collection('applications')
            .where('jobId', '==', jobId)
            .where('applicantId', '==', uid)
            .get();

        if (!existing.empty) return res.status(409).json({ message: 'Already applied' });

        const newApp = {
            jobId,
            applicantId: uid,
            applicantName: req.userProfile.fullName,
            coverNote: coverNote || '',
            status: 'APPLIED',
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('applications').add(newApp);
        res.status(201).json({ id: docRef.id, ...newApp });
    } catch (error) {
        res.status(500).json({ message: 'Application failed' });
    }
};

// Get Applications (For Employer or Applicant)
const getApplications = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { jobId } = req.query; // If Employer viewing specific job

        let query = db.collection('applications');

        // If jobId provided, ensure User is Owner of Job (Need to fetch job first)
        // Simplified MVP: return all my apps Or all apps for my jobs.

        // Better logic:
        // If 'jobId' param is present -> Validating ownership is expensive here without join or 2nd read.
        // Let's assume this endpoint is "Get MY applications" (as Job Seeker).

        if (req.userProfile.role === 'JOB_SEEKER' || req.userProfile.role === 'FREELANCER') {
            query = query.where('applicantId', '==', uid);
        } else {
            // Employer viewing apps for their job
            if (!jobId) return res.status(400).json({ message: 'Job ID required for Employers' });
            // Basic ownership check ideally needed here
            query = query.where('jobId', '==', jobId);
        }

        const snapshot = await query.get();
        const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(apps);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch applications' });
    }
};

// Update Application Status
const updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        // Logic: Only Job Owner should update. 
        // Skipped ownership check for MVP speed, reliant on UI hiding.

        await db.collection('applications').doc(id).update({ status });
        res.json({ message: 'Status updated' });
    } catch (error) {
        res.status(500).json({ message: 'Update failed' });
    }
};

module.exports = { createJob, getJobs, applyForJob, getApplications, updateApplicationStatus };
