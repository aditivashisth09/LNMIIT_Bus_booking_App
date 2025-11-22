import 'dotenv/config'; 
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

// Enable CORS - Allow All Origins
app.use(cors({
  origin: '*', 
  credentials: true 
}));

// Body parser middleware
app.use(express.json());

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/conductor', conductorRoutes);

// --- DATABASE CLEANUP & INITIALIZATION (SAFER VERSION) ---
mongoose.connection.once('open', async () => {
  console.log('✅ MongoDB Connection Open');
  
  try {
    // Check if bookings collection exists before touching indexes
    const collections = await mongoose.connection.db.listCollections().toArray();
    const bookingCollectionExists = collections.some(col => col.name === 'bookings');

    if (bookingCollectionExists) {
        const collection = mongoose.connection.collection('bookings');
        const indexes = await collection.indexes();
        
        // Drop specific bad indexes if they exist
        const badIndexes = ['schedule_1_seatNumber_1', 'schedule_1_user_1'];
        
        for (const badIdx of badIndexes) {
            if (indexes.find(idx => idx.name === badIdx)) {
                console.log(`Found problematic index "${badIdx}". Dropping...`);
                await collection.dropIndex(badIdx);
            }
        }
    }

    // Run Scheduler logic
    const Bus = mongoose.model('Bus');
    const busCount = await Bus.countDocuments({ route: { $ne: 'New Asset (Placeholder)' } });
    
    if (busCount === 0) {
      console.log("No buses found. Running initial daily schedule...");
      await scheduleDailyBuses();
    }
    
    initScheduler(); 

  } catch (error) {
    // Log error but DO NOT crash the server
    console.log('⚠️ Init/Cleanup Warning (Non-fatal):', error.message);
  }
});

// Simple error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (res.headersSent) return next(err);
  res.status(500).send({ message: err.message || 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(
  PORT,
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);