import express from 'express';
// UPDATED: Import new functions
import { 
  getDashboardStats, 
  downloadReport, 
  getConductors, 
  getAllBusSchedules,
  getHoldList, 
  removeUserHold
} from '../controllers/adminController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, admin, getDashboardStats);
router.get('/report', protect, admin, downloadReport);
router.get('/conductors', protect, admin, getConductors);
router.get('/buses/all', protect, admin, getAllBusSchedules);

// --- NEW ROUTES FOR HOLD MANAGEMENT ---
router.get('/hold-list', protect, admin, getHoldList);
router.put('/remove-hold/:id', protect, admin, removeUserHold);
// --- END NEW ROUTES ---

export default router;