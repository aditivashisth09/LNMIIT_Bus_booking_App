import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Bus from '../models/busModel.js';

// Resolve path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load timetable
const timetablePath = path.join(__dirname, '../data/busTimetable.json');

const scheduleDailyBuses = async () => {
  console.log('--- 🚌 Running Bus Schedule Synchronization ---');
  
  try {
    // 1. Read JSON
    const rawData = fs.readFileSync(timetablePath);
    const timetable = JSON.parse(rawData);

    // Array to keep track of valid buses from the JSON
    const syncedBusIds = [];

    // 2. Sync Timetable with Database
    for (const schedule of timetable) {
      const bus = await Bus.findOneAndUpdate(
        { 
          // Identify bus by Number + Departure Time
          busNumber: schedule.busNumber, 
          departureTime: schedule.departureTime 
        },
        {
          route: `${schedule.from} → ${schedule.to}`,
          driver: schedule.driver,
          arrivalTime: schedule.arrivalTime,
          totalSeats: 40,
          days: schedule.days, // Update operating days
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      
      // Add this valid bus ID to our list
      syncedBusIds.push(bus._id);
    }

    // 3. Cleanup: Remove "Extra" Stale Buses
    // We delete any bus that was NOT in the JSON we just processed.
    // CRITICAL: We exclude 'New Asset (Placeholder)' so we don't delete Fleet assets.
    const deleteResult = await Bus.deleteMany({
      _id: { $nin: syncedBusIds },
      route: { $ne: 'New Asset (Placeholder)' }
    });

    console.log(`Sync Complete: Updated ${syncedBusIds.length} buses.`);
    if (deleteResult.deletedCount > 0) {
      console.log(`Cleanup: Removed ${deleteResult.deletedCount} stale bus schedules.`);
    }

  } catch (error) {
    console.error('Error in bus scheduler:', error);
  }
};

// Initialize Cron Job
const initScheduler = () => {
  // Run daily at midnight to ensure any JSON changes are applied
  cron.schedule('0 0 * * *', () => {
    scheduleDailyBuses();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
  
  console.log('📅 Bus Synchronizer Initialized (Runs daily at 00:00 IST)');
};

export { initScheduler, scheduleDailyBuses };