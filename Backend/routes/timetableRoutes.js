import express from 'express';
import { getTimetable, addSchedule } from '../controllers/timetableController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getTimetable);
router.route('/').post(protect, admin, addSchedule);

export default router;