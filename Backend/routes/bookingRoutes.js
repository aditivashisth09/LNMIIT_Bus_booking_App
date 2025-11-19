import express from 'express';
import {
  createBooking,
  getMyBookings,
  cancelBooking,
  joinWaitingList,
} from '../controllers/bookingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, createBooking);
router.route('/mybookings').get(protect, getMyBookings);
router.route('/waitlist').post(protect, joinWaitingList);
router.route('/:id').delete(protect, cancelBooking);

export default router;