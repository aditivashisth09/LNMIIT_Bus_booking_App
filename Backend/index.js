import 'dotenv/config'; // Load env vars at the VERY TOP

import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import mongoose from 'mongoose';

// Route files
import authRoutes from './routes/authRoutes.js';
import busRoutes from './routes/busRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import conductorRoutes from './routes/conductorRoutes.js';

// Import Scheduler
import { initScheduler, scheduleDailyBuses } from './utils/dailyScheduler.js';

// Connect to database
connectDB();

const app = express();

// Enable CORS
app.use(cors());

// Body parser middleware
app.use(express.json());

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/conductor', conductorRoutes);

// --- DATABASE CLEANUP & INITIALIZATION ---
mongoose.connection.once('open', async () => {
  try {
    const collection = mongoose.connection.collection('bookings');
    const indexes = await collection.indexes();
    
    // --- FIX: Identify and drop the problematic index ---
    const badIndexName = 'schedule_1_seatNumber_1'; // The exact name from your error
    const badIndex = indexes.find(idx => idx.name === badIndexName);
    
    if (badIndex) {
      console.log(`Found problematic index "${badIndexName}". Dropping it...`);
      await collection.dropIndex(badIndexName);
      console.log('Successfully dropped bad index.');
    }
    // ---------------------------------------------------

    const existingBadIndex2 = indexes.find(idx => idx.name === 'schedule_1_user_1');
    if (existingBadIndex2) {
      console.log('Found problematic index "schedule_1_user_1". Dropping it...');
      await collection.dropIndex('schedule_1_user_1');
      console.log('Successfully dropped bad index.');
    }

    // --- Run Scheduler on Startup if needed ---
    const Bus = mongoose.model('Bus');
    const busCount = await Bus.countDocuments({ route: { $ne: 'New Asset (Placeholder)' } });
    
    if (busCount === 0) {
      console.log("No buses found. Running initial daily schedule...");
      await scheduleDailyBuses();
    }
    
    // Start the Cron Job for future days
    initScheduler(); 

  } catch (error) {
    console.log('Auto-fix/Init skipped:', error.message);
  }
});

// Simple error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).send({ message: err.message || 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(
  PORT,
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  )
);