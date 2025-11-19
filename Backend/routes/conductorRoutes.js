import express from 'express';
import {
  getBusBookingsForConductor,
  updateBookingStatus,
} from '../controllers/conductorController.js';
import { protect, conductor } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all booking details for a specific bus
router.route('/bus/:id/bookings').get(protect, conductor, getBusBookingsForConductor);

// Mark a booking as attended or absent
router.route('/bookings/:id/status').put(protect, conductor, updateBookingStatus);

export default router;