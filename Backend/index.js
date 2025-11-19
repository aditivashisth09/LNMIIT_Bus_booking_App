import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import mongoose from 'mongoose'; // Added for direct access if needed

// Route files
import authRoutes from './routes/authRoutes.js';
import busRoutes from './routes/busRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import conductorRoutes from './routes/conductorRoutes.js';

// Load env vars
dotenv.config();

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

// --- CRITICAL FIX: DROP BAD INDEX ---
// This attempts to remove the old index that is causing your "schedule: null" duplicate error.
// It runs once when the server starts.
mongoose.connection.once('open', async () => {
  try {
    const collection = mongoose.connection.collection('bookings');
    // Check if the bad index exists and drop it
    const indexes = await collection.indexes();
    const badIndex = indexes.find(idx => idx.name === 'schedule_1_user_1');
    
    if (badIndex) {
      console.log('Found problematic index "schedule_1_user_1". Dropping it...');
      await collection.dropIndex('schedule_1_user_1');
      console.log('Successfully dropped bad index. Restart the server if needed.');
    }
  } catch (error) {
    console.log('Note: Auto-fix for index skipped or failed (this is normal if it was already fixed).');
  }
});
// --- END FIX ---

// Simple error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: err.message || 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(
  PORT,
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  )
);