import express from 'express';
import { fetchStats, fetchReports, dismissReport, takeReportAction, sendBroadcast, fetchBroadcasts, deleteBroadcast, createReport } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Publicly accessible routes
router.get('/stats', fetchStats);
router.get('/broadcasts', fetchBroadcasts); // public can read broadcasts

router.post('/reports', protect, createReport); // Anyone can report

// Admin only routes
router.get('/reports', protect, authorize('admin'), fetchReports);
router.put('/reports/:id/dismiss', protect, authorize('admin'), dismissReport);
router.post('/reports/:id/action', protect, authorize('admin'), takeReportAction);
router.post('/broadcast', protect, authorize('admin'), sendBroadcast);
router.delete('/broadcast/:id', protect, authorize('admin'), deleteBroadcast);

export default router;
