import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Bus from '../models/busModel.js';
import Booking from '../models/bookingModel.js';

// Resolve path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load timetable
const timetablePath = path.join(__dirname, '../data/busTimetable.json');

const scheduleDailyBuses = async () => {
  console.log('--- 🚌 Running Daily Bus Scheduler ---');
  
  try {
    // 1. Get Today's Day (Mon, Tue, etc.)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    // We use 'en-US' with Indian Time Zone to get the correct day in India
    const todayString = now.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' });
    
    console.log(`Today is: ${todayString}`);

    // 2. Read JSON
    const rawData = fs.readFileSync(timetablePath);
    const timetable = JSON.parse(rawData);

    // 3. Filter buses for today
    const todaysBuses = timetable.filter(bus => bus.days.includes(todayString));

    if (todaysBuses.length === 0) {
      console.log('No buses scheduled for today.');
      return;
    }

    // 4. Clear EXISTING Daily Schedules (Keep Placeholders)
    // We delete any bus that is NOT a placeholder asset
    await Bus.deleteMany({ route: { $ne: 'New Asset (Placeholder)' } });
    
    // OPTIONAL: Clear old bookings? 
    // Usually we keep bookings for history. If you want to clear bookings, uncomment below:
    // await Booking.deleteMany({}); 

    // 5. Insert New Schedules
    const busesToInsert = todaysBuses.map(schedule => ({
      busNumber: schedule.busNumber,
      route: `${schedule.from} → ${schedule.to}`, // Format route string
      driver: schedule.driver,
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
      totalSeats: 40, // Default seats
      conductor: null, // Reset conductor assignment
    }));

    await Bus.insertMany(busesToInsert);

    console.log(`Successfully scheduled ${busesToInsert.length} buses for ${todayString}.`);

  } catch (error) {
    console.error('Error in daily scheduler:', error);
  }
};

// Initialize Cron Job
// Run at 00:01 AM every day (Asia/Kolkata time ideally, dependent on server time)
const initScheduler = () => {
  // Schedule: 0 minutes, 0 hours (Midnight)
  cron.schedule('0 0 * * *', () => {
    scheduleDailyBuses();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
  
  console.log('📅 Bus Scheduler Initialized (Runs daily at 00:00 IST)');
};

// Export function to run manually on server start if needed
export { initScheduler, scheduleDailyBuses };