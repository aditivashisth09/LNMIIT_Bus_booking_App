import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the JSON file
const timetablePath = path.join(__dirname, '../data/busTimetable.json');

// @desc    Get full timetable
// @route   GET /api/timetable
// @access  Private (Student)
const getTimetable = asyncHandler(async (req, res) => {
  try {
    // 1. Read the JSON file
    if (!fs.existsSync(timetablePath)) {
      res.status(404);
      throw new Error('Timetable data not found');
    }

    const rawData = fs.readFileSync(timetablePath);
    const timetable = JSON.parse(rawData);

    // 2. Format data for the frontend
    // The frontend expects: _id, route (string), from, to, days, status
    const formattedTimetable = timetable.map((item, index) => ({
      _id: `static-${index}`, // Generate a unique ID
      busNumber: item.busNumber,
      route: `${item.from} → ${item.to}`, // Create the route string
      from: item.from,
      to: item.to,
      departureTime: item.departureTime,
      arrivalTime: item.arrivalTime,
      days: item.days,
      status: 'active', // Default status for static timetable
    }));

    // 3. Sort by departure time (Optional, but good for UX)
    // Simple sort by string comparison works for "06:00 AM" format usually, 
    // but a parse helper is better if strictly needed. 
    // For now, we assume JSON is roughly ordered or simple string sort is enough.

    res.json(formattedTimetable);
  } catch (error) {
    console.error('Error serving timetable:', error);
    res.status(500);
    throw new Error('Failed to fetch timetable data');
  }
});

// @desc    Add a new schedule (Disabled/Legacy as we now use JSON)
// @route   POST /api/timetable
// @access  Private (Admin)
const addSchedule = asyncHandler(async (req, res) => {
  res.status(400).json({ message: "Adding schedules via API is disabled. Please update busTimetable.json directly." });
});

export { getTimetable, addSchedule };