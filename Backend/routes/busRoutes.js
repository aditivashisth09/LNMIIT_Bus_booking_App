import express from 'express';
import {
  getAllBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
  getConductorBus,
  deletePhysicalBusAsset,
} from '../controllers/busController.js';
import { protect, admin, conductor } from '../middleware/authMiddleware.js';

const router = express.Router();

// Conductor route
router.route('/mybus').get(protect, conductor, getConductorBus);

// Student routes
router.route('/').get(protect, getAllBuses);
router.route('/:id').get(protect, getBusById);

// Admin routes
router.route('/').post(protect, admin, createBus);
router.route('/:id').put(protect, admin, updateBus).delete(protect, admin, deleteBus);

// --- NEW ROUTE: Fleet Management (Delete Asset) ---
router.delete('/fleet/:busNumber', protect, admin, deletePhysicalBusAsset);

export default router;