import asyncHandler from 'express-async-handler';
import Booking from '../models/bookingModel.js';
import Bus from '../models/busModel.js';
import User from '../models/userModel.js';

// --- HELPER FUNCTIONS ---
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

// NEW: Helper to get standardized date string (YYYY-MM-DD)
const getTodayDateString = () => {
  const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const dateObj = new Date(now);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
// --- END HELPER FUNCTIONS ---


// @desc    Get all bookings for a specific bus (for conductor)
// @route   GET /api/conductor/bus/:id/bookings
// @access  Private (Conductor)
const getBusBookingsForConductor = asyncHandler(async (req, res) => {
  const busId = req.params.id;
  const travelDate = getTodayDateString(); // Get today's date
  
  // Find the bus and check if this conductor is assigned to it
  const bus = await Bus.findById(busId);
  if (!bus) {
    res.status(404);
    throw new Error('Bus not found');
  }

  if (!bus.conductor || bus.conductor.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view bookings for this bus');
  }

  // --- FIX: Filter by TODAY'S DATE ---
  const bookings = await Booking.find({ 
    bus: busId,
    travelDate: travelDate 
  }).populate('user', 'name email');
  // -----------------------------------
    
  // Get all seats for the layout
  const allSeats = [];
  for (let i = 1; i <= bus.totalSeats; i++) {
    const row = Math.floor((i - 1) / 4) + 1;
    const col = ((i - 1) % 4) + 1;
    allSeats.push({
      id: `${row}-${col}`,
      row,
      number: i,
      status: 'available', // Default status
      bookingId: null,
      userName: null,
    });
  }

  // Merge booking info into the seat list
  bookings.forEach(booking => {
    // Only process non-cancelled bookings
    if (booking.status !== 'cancelled') {
      const seat = allSeats.find(s => s.number === booking.seatNumber);
      if (seat) {
        seat.status = booking.status; // 'confirmed', 'attended', 'absent'
        seat.bookingId = booking._id;
        seat.userName = booking.user ? booking.user.name : 'N/A';
      }
    }
  });

  res.json({
    bus: {
      _id: bus._id,
      busNumber: bus.busNumber,
      route: bus.route,
    },
    seats: allSeats,
  });
});

// @desc    Update booking status (attended/absent)
// @route   PUT /api/conductor/bookings/:id/status
// @access  Private (Conductor)
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const bookingId = req.params.id;

  if (status !== 'attended' && status !== 'absent') {
    res.status(400);
    throw new Error('Invalid status. Must be "attended" or "absent".');
  }

  const booking = await Booking.findById(bookingId).populate('bus');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Check if conductor is assigned to this booking's bus
  if (!booking.bus || !booking.bus.conductor || booking.bus.conductor.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this booking');
  }

  // --- Check time restriction (10 mins prior) ---
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const departureMinutes = parseTime(booking.bus.departureTime); 

  if (departureMinutes - currentMinutes > 10) {
    res.status(400);
    throw new Error('Attendance can only be started 10 minutes before departure.');
  }
  // --- END UPDATE ---

  // Update status
  booking.status = status;
  await booking.save();
  
  // --- NEW LOGIC: Absentee Check and Ban (With Amnesty Date Support) ---
  if (status === 'absent') {
    const userId = booking.user;
    
    // Fetch the user to check if they have an amnestyDate
    const user = await User.findById(userId);

    // Build the query
    const countQuery = {
      user: userId,
      status: 'absent',
    };

    // If user was previously reset, only count bookings created AFTER the amnestyDate
    if (user && user.amnestyDate) {
       countQuery.createdAt = { $gt: user.amnestyDate };
    }
    
    // Count total 'absent' bookings based on the query
    const absentCount = await Booking.countDocuments(countQuery);

    if (absentCount >= 5) {
      // Find and update the user to put them on hold
      await User.findByIdAndUpdate(userId, { onHold: true });
      console.log(`User ${userId} reached ${absentCount} absent marks and has been placed on hold.`);
    }
  }
  // --- END NEW LOGIC ---

  res.json({ message: `Booking marked as ${status}` });
});

export { getBusBookingsForConductor, updateBookingStatus };