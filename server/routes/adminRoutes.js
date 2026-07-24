import express from 'express';
import { 
  fetchStats, 
  fetchReports, 
  dismissReport, 
  takeReportAction, 
  sendBroadcast, 
  updateBroadcast,
  fetchBroadcasts, 
  deleteBroadcast, 
  createReport,
  fetchUsers,
  suspendUser,
  unsuspendUser,
  deleteUser,
  fetchAcceptedRequests
} from '../controllers/adminController.js';
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
router.put('/broadcast/:id', protect, authorize('admin'), updateBroadcast);
router.delete('/broadcast/:id', protect, authorize('admin'), deleteBroadcast);

// New User Management & Accepted Requests tracking routes for Admin
router.get('/users', protect, authorize('admin'), fetchUsers);
router.put('/users/:id/suspend', protect, authorize('admin'), suspendUser);
router.put('/users/:id/unsuspend', protect, authorize('admin'), unsuspendUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);
router.get('/accepted-requests', protect, authorize('admin'), fetchAcceptedRequests);

export default router;
