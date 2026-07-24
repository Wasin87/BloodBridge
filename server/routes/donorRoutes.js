import express from 'express';
import { upsertProfile, fetchProfiles, fetchMyProfile, toggleAvailability, deleteProfile } from '../controllers/donorController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', fetchProfiles);
router.post('/upsert', protect, upsertProfile);
router.get('/me', protect, fetchMyProfile);
router.put('/availability', protect, toggleAvailability);
router.delete('/me', protect, deleteProfile);

export default router;
