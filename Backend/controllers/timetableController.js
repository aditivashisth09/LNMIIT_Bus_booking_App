import asyncHandler from 'express-async-handler';
import Timetable from '../models/timetableModel.js';

// @desc    Get full timetable
// @route   GET /api/timetable
// @access  Private (Student)
const getTimetable = asyncHandler(async (req, res) => {
  const schedules = await Timetable.find({}).sort({ departureTime: 1 });
  res.json(schedules);
});

// @desc    Add a new schedule
// @route   POST /api/timetable
// @access  Private (Admin)
const addSchedule = asyncHandler(async (req, res) => {
  const { busNumber, route, departureTime, arrivalTime, from, to, days, status } = req.body;

  const schedule = new Timetable({
    busNumber,
    route,
    departureTime,
    arrivalTime,
    from,
    to,
    days,
    status
  });

  const createdSchedule = await schedule.save();
  res.status(201).json(createdSchedule);
});

// Implement PUT /:id and DELETE /:id routes as needed

export { getTimetable, addSchedule };