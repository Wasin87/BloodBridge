import express from 'express';
import { createRequest, fetchRequests, deleteRequest, updateRequestStatus, acceptRequest, completeRequest } from '../controllers/requestController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', fetchRequests);
router.post('/', protect, createRequest);
router.delete('/:id', protect, deleteRequest);
router.put('/:id/status', protect, updateRequestStatus);
router.post('/:id/accept', protect, acceptRequest);
router.post('/:id/complete', protect, completeRequest);

export default router;
