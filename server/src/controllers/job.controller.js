const { db } = require('../config/firebase');

/**
 * Job Model (RTDB 'jobs' node)
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

        const jobRef = db.ref('jobs').push();
        await jobRef.set({ ...newJob, id: jobRef.key });

        res.status(201).json({ id: jobRef.key, ...newJob });
    } catch (error) {
        res.status(500).json({ message: 'Failed to post job' });
    }
};

// Get Jobs (Feed)
const getJobs = async (req, res) => {
    try {
        const { roleType, category } = req.query;

        // Fetch All OPEN jobs then filter
        // Optimization: orderByChild('status').equalTo('OPEN')
        const snapshot = await db.ref('jobs').orderByChild('status').equalTo('OPEN').once('value');

        let jobs = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                jobs.push({ id: child.key, ...child.val() });
            });
        }

        if (roleType) {
            jobs = jobs.filter(j => j.roleType === roleType);
        }
        if (category) {
            jobs = jobs.filter(j => j.category === category);
        }

        // Sort by createdAt desc
        jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(jobs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch jobs' });
    }
};

/**
 * Application Model (RTDB 'applications' node)
 */

// Apply for Job
const applyForJob = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { jobId, coverNote } = req.body;

        // Check if already applied
        // Query applications by jobId, then filter for applicantId
        const existingSnap = await db.ref('applications').orderByChild('jobId').equalTo(jobId).once('value');
        let alreadyApplied = false;

        if (existingSnap.exists()) {
            existingSnap.forEach(child => {
                if (child.val().applicantId === uid) alreadyApplied = true;
            });
        }

        if (alreadyApplied) return res.status(409).json({ message: 'Already applied' });

        const newApp = {
            jobId,
            applicantId: uid,
            applicantName: req.userProfile.fullName || 'Unknown',
            coverNote: coverNote || '',
            status: 'APPLIED',
            createdAt: new Date().toISOString()
        };

        const appRef = db.ref('applications').push();
        await appRef.set({ ...newApp, id: appRef.key });

        res.status(201).json({ id: appRef.key, ...newApp });
    } catch (error) {
        res.status(500).json({ message: 'Application failed' });
    }
};

// Get Applications (For Employer or Applicant)
const getApplications = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { jobId } = req.query;

        // Strategy: Query by applicantId OR jobId
        let snapshot;
        let apps = [];

        if (req.userProfile.role === 'JOB_SEEKER' || req.userProfile.role === 'FREELANCER') {
            snapshot = await db.ref('applications').orderByChild('applicantId').equalTo(uid).once('value');
        } else {
            // Employer
            if (!jobId) return res.status(400).json({ message: 'Job ID required for Employers' });
            snapshot = await db.ref('applications').orderByChild('jobId').equalTo(jobId).once('value');
        }

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                apps.push({ id: child.key, ...child.val() });
            });
        }

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

        await db.ref('applications/' + id).update({ status });
        res.json({ message: 'Status updated' });
    } catch (error) {
        res.status(500).json({ message: 'Update failed' });
    }
};

module.exports = { createJob, getJobs, applyForJob, getApplications, updateApplicationStatus };
