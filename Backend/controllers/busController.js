import asyncHandler from 'express-async-handler';
import Bus from '../models/busModel.js';
import Booking from '../models/bookingModel.js';

// --- HELPER FUNCTION ---
const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (modifier === 'PM' && hours !== 12) {
    hours += 12;
  }
  if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
};

// Helper to get standardized date string (YYYY-MM-DD)
const getTodayDateString = () => {
  const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const dateObj = new Date(now);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
// --- END HELPER FUNCTIONS ---


// @desc    Get all buses with booked seat counts (Student Dashboard)
// @route   GET /api/buses
// @access  Private (Student/Admin)
const getAllBuses = asyncHandler(async (req, res) => {
  const allBuses = await Bus.find({}).populate('conductor', 'name phone');
  
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const travelDate = getTodayDateString();

  // Filter for students:
  // 1. Must be in the future
  // 2. MUST NOT be a placeholder asset
  const availableBuses = allBuses.filter(bus => {
    const isPlaceholder = bus.route === 'New Asset (Placeholder)';
    const departureMinutes = parseTime(bus.departureTime);
    return !isPlaceholder && departureMinutes > currentMinutes;
  });

  // Aggregate bookings ONLY for TODAY
  const bookings = await Booking.aggregate([
    { $match: { 
        status: { $in: ['confirmed', 'attended', 'absent'] },
        travelDate: travelDate 
    } },
    { $group: { _id: "$bus", bookedSeats: { $sum: 1 } } }
  ]);

  const busesWithCounts = availableBuses.map(bus => {
    const bookingInfo = bookings.find(b => b._id.toString() === bus._id.toString());
    return {
      id: bus._id,
      busNumber: bus.busNumber,
      route: bus.route,
      departureTime: bus.departureTime,
      arrivalTime: bus.arrivalTime,
      totalSeats: bus.totalSeats,
      bookedSeats: bookingInfo ? bookingInfo.bookedSeats : 0,
      driver: bus.driver,
      conductor: bus.conductor,
    };
  });

  // Sort buses by departure time (Ascending)
  busesWithCounts.sort((a, b) => parseTime(a.departureTime) - parseTime(b.departureTime));

  res.json(busesWithCounts);
});

// @desc    Get single bus details with seat layout
// @route   GET /api/buses/:id
// @access  Private (Student)
const getBusById = asyncHandler(async (req, res) => {
  const bus = await Bus.findById(req.params.id);
  const travelDate = getTodayDateString();

  if (!bus) {
    res.status(404);
    throw new Error('Bus not found');
  }

  const bookings = await Booking.find({ 
    bus: req.params.id, 
    travelDate: travelDate,
    status: { $in: ['confirmed', 'attended', 'absent'] } 
  });

  const bookedSeatNumbers = bookings.map(b => b.seatNumber);

  const totalSeats = bus.totalSeats;
  const seats = [];
  for (let i = 1; i <= totalSeats; i++) {
    const seatNumber = i;
    const isBooked = bookedSeatNumbers.includes(seatNumber);
    
    const row = Math.floor((i - 1) / 4) + 1;
    const col = ((i - 1) % 4) + 1;

    seats.push({
      id: `${row}-${col}`,
      row,
      number: seatNumber,
      status: isBooked ? 'booked' : 'available',
    });
  }

  res.json({
    bus,
    seats,
    availableCount: totalSeats - bookedSeatNumbers.length,
    bookedCount: bookedSeatNumbers.length,
  });
});

// @desc    Create a new bus schedule
// @route   POST /api/buses
// @access  Private (Admin)
const createBus = asyncHandler(async (req, res) => {
  const { busNumber, route, driver, totalSeats, departureTime, arrivalTime, conductor } = req.body;

  // --- FIX: Check for Overlapping Schedules for the same Bus ---
  if (route !== 'New Asset (Placeholder)') {
      const newStart = parseTime(departureTime);
      let newEnd = parseTime(arrivalTime);
      // Handle midnight crossing
      if (newEnd < newStart) newEnd += 24 * 60; 

      // Fetch all existing schedules for this bus (excluding placeholders)
      const existingSchedules = await Bus.find({ 
          busNumber: busNumber,
          route: { $ne: 'New Asset (Placeholder)' }
      });

      for (const schedule of existingSchedules) {
          const existingStart = parseTime(schedule.departureTime);
          let existingEnd = parseTime(schedule.arrivalTime);
          
          if (existingEnd < existingStart) existingEnd += 24 * 60;

          // Overlap Condition: (StartA < EndB) and (EndA > StartB)
          if (newStart < existingEnd && newEnd > existingStart) {
              res.status(400);
              throw new Error(`Bus ${busNumber} is already scheduled from ${schedule.departureTime} to ${schedule.arrivalTime}. Cannot overlap.`);
          }
      }
  }
  // -------------------------------------------------------------

  const bus = new Bus({
    busNumber,
    route,
    driver,
    totalSeats,
    departureTime,
    arrivalTime,
    conductor: conductor || null,
  });

  const createdBus = await bus.save();
  res.status(201).json(createdBus);
});

// @desc    Update a bus
// @route   PUT /api/buses/:id
// @access  Private (Admin)
const updateBus = asyncHandler(async (req, res) => {
  const { busNumber, route, driver, totalSeats, departureTime, arrivalTime, conductor } = req.body;

  const bus = await Bus.findById(req.params.id);

  if (bus) {
    bus.busNumber = busNumber || bus.busNumber;
    bus.route = route || bus.route;
    bus.driver = driver || bus.driver;
    bus.totalSeats = totalSeats || bus.totalSeats;
    bus.departureTime = departureTime || bus.departureTime;
    bus.arrivalTime = arrivalTime || bus.arrivalTime;
    
    if (req.body.hasOwnProperty('conductor')) {
      bus.conductor = conductor || null;
    }

    const updatedBus = await bus.save();
    res.json(updatedBus);
  } else {
    res.status(404);
    throw new Error('Bus not found');
  }
});

// @desc    Delete a bus schedule
// @route   DELETE /api/buses/:id
// @access  Private (Admin)
const deleteBus = asyncHandler(async (req, res) => {
  const bus = await Bus.findById(req.params.id);

  if (bus) {
    await bus.deleteOne();
    await Booking.deleteMany({ bus: req.params.id });
    res.json({ message: 'Bus schedule removed' });
  } else {
    res.status(404);
    throw new Error('Bus not found');
  }
});

// @desc    Get ALL buses assigned to the logged-in conductor (UPDATED)
// @route   GET /api/buses/mybus
// @access  Private (Conductor)
const getConductorBus = asyncHandler(async (req, res) => {
  const buses = await Bus.find({ conductor: req.user._id });

  const busIds = buses.map(b => b._id);
  const travelDate = getTodayDateString(); 

  const bookingCounts = await Booking.aggregate([
    { $match: { 
        bus: { $in: busIds }, 
        status: { $in: ['confirmed', 'attended', 'absent'] },
        travelDate: travelDate 
      } 
    },
    { $group: { _id: "$bus", count: { $sum: 1 } } }
  ]);

  const result = buses.map(bus => {
    const countObj = bookingCounts.find(c => c._id.toString() === bus._id.toString());
    return {
      id: bus._id,
      busNumber: bus.busNumber,
      route: bus.route,
      departureTime: bus.departureTime,
      arrivalTime: bus.arrivalTime,
      totalSeats: bus.totalSeats,
      bookedSeats: countObj ? countObj.count : 0,
    };
  });

  result.sort((a, b) => parseTime(a.departureTime) - parseTime(b.departureTime));

  res.json(result);
});

// @desc    Delete all schedules for a given bus number (Physical Bus Asset)
// @route   DELETE /api/buses/fleet/:busNumber
// @access  Private (Admin)
const deletePhysicalBusAsset = asyncHandler(async (req, res) => {
  const { busNumber } = req.params;

  const schedulesToDelete = await Bus.find({ busNumber: busNumber });

  if (schedulesToDelete.length === 0) {
    res.status(404);
    throw new Error(`Physical Bus Asset ${busNumber} not found.`);
  }

  const scheduleIds = schedulesToDelete.map(bus => bus._id);

  // --- UPDATED LOGIC: Preserve Past Bookings ---
  const today = getTodayDateString();
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Delete bookings strictly in the future (Tomorrow onwards)
  await Booking.deleteMany({ 
    bus: { $in: scheduleIds },
    travelDate: { $gt: today } 
  });

  // 2. Delete bookings TODAY that haven't happened yet
  const todayBookings = await Booking.find({
    bus: { $in: scheduleIds },
    travelDate: today
  });

  const futureBookingIdsToday = todayBookings.filter(b => {
    return parseTime(b.departureTime) > currentMinutes;
  }).map(b => b._id);

  if (futureBookingIdsToday.length > 0) {
    await Booking.deleteMany({ _id: { $in: futureBookingIdsToday } });
  }
  
  const deleteResult = await Bus.deleteMany({ busNumber: busNumber });

  res.json({ 
    message: `Physical Bus Asset ${busNumber} deleted. Future bookings cleared, past history preserved.`,
    deletedSchedulesCount: deleteResult.deletedCount
  });
});

export { 
  getAllBuses, 
  getBusById, 
  createBus, 
  updateBus, 
  deleteBus,
  getConductorBus,
  deletePhysicalBusAsset
};