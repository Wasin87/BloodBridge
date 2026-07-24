import express from 'express';
import { updateProfileName, updateAvatarUrl, fetchNotifications, fetchDonationHistory } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.put('/profile/name', protect, updateProfileName);
router.put('/profile/avatar', protect, updateAvatarUrl);
router.get('/notifications', protect, fetchNotifications);
router.get('/history', protect, fetchDonationHistory);

export default router;
