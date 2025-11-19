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
// --- END HELPER FUNCTION ---


// @desc    Get all buses with booked seat counts (Student Dashboard)
// @route   GET /api/buses
// @access  Private (Student/Admin)
const getAllBuses = asyncHandler(async (req, res) => {
  const allBuses = await Bus.find({}).populate('conductor', 'name phone');
  
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Filter for students:
  // 1. Must be in the future
  // 2. MUST NOT be a placeholder asset
  const availableBuses = allBuses.filter(bus => {
    const isPlaceholder = bus.route === 'New Asset (Placeholder)';
    const departureMinutes = parseTime(bus.departureTime);
    return !isPlaceholder && departureMinutes > currentMinutes;
  });

  const bookings = await Booking.aggregate([
    { $match: { status: { $in: ['confirmed', 'attended', 'absent'] } } },
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

  res.json(busesWithCounts);
});

// @desc    Get single bus details with seat layout
// @route   GET /api/buses/:id
// @access  Private (Student)
const getBusById = asyncHandler(async (req, res) => {
  const bus = await Bus.findById(req.params.id);

  if (!bus) {
    res.status(404);
    throw new Error('Bus not found');
  }

  const bookings = await Booking.find({ 
    bus: req.params.id, 
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

  const existingSchedule = await Bus.findOne({ busNumber, departureTime });
  
  // Allow creating the placeholder even if one exists (though frontend prevents it), 
  // but block duplicate real schedules.
  if (existingSchedule && route !== 'New Asset (Placeholder)') {
    res.status(400);
    throw new Error(`A schedule for Bus ${busNumber} departing at ${departureTime} already exists.`);
  }

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
    // Delete the specific schedule
    await bus.deleteOne();
    // Delete bookings ONLY for this specific schedule
    await Booking.deleteMany({ bus: req.params.id });
    
    res.json({ message: 'Bus schedule removed' });
  } else {
    res.status(404);
    throw new Error('Bus not found');
  }
});

// @desc    Get bus assigned to the logged-in conductor
// @route   GET /api/buses/mybus
// @access  Private (Conductor)
const getConductorBus = asyncHandler(async (req, res) => {
  const buses = await Bus.find({ conductor: req.user._id });

  if (!buses || buses.length === 0) {
    res.status(404);
    throw new Error('You are not assigned to any bus.');
  }

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const sortedBuses = buses.sort((a, b) => parseTime(a.departureTime) - parseTime(b.departureTime));

  // Conductor shouldn't see placeholders either
  let selectedBus = sortedBuses.find(bus => 
    bus.route !== 'New Asset (Placeholder)' && 
    parseTime(bus.departureTime) > currentMinutes
  );

  if (!selectedBus) {
    selectedBus = sortedBuses.find(bus => bus.route !== 'New Asset (Placeholder)') || sortedBuses[0];
  }

  const bus = selectedBus;

  const bookingInfo = await Booking.aggregate([
    { $match: { bus: bus._id, status: { $in: ['confirmed', 'attended', 'absent'] } } },
    { $group: { _id: null, bookedSeats: { $sum: 1 } } }
  ]);

  res.json({
    id: bus._id,
    busNumber: bus.busNumber,
    route: bus.route,
    departureTime: bus.departureTime,
    arrivalTime: bus.arrivalTime,
    totalSeats: bus.totalSeats,
    bookedSeats: bookingInfo.length > 0 ? bookingInfo[0].bookedSeats : 0,
  });
});

// @desc    Delete all schedules for a given bus number (Physical Bus Asset)
// @route   DELETE /api/buses/fleet/:busNumber
// @access  Private (Admin)
const deletePhysicalBusAsset = asyncHandler(async (req, res) => {
  const { busNumber } = req.params;

  // Find all schedules (including placeholder) for this bus number
  const schedulesToDelete = await Bus.find({ busNumber: busNumber });

  if (schedulesToDelete.length === 0) {
    res.status(404);
    throw new Error(`Physical Bus Asset ${busNumber} not found.`);
  }

  const scheduleIds = schedulesToDelete.map(bus => bus._id);

  // Delete all bookings for ALL schedules of this bus
  await Booking.deleteMany({ bus: { $in: scheduleIds } });

  // Delete all schedules (Real + Placeholder)
  const deleteResult = await Bus.deleteMany({ busNumber: busNumber });

  res.json({ 
    message: `Physical Bus Asset ${busNumber} and all ${deleteResult.deletedCount} schedules deleted successfully.`,
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