import asyncHandler from 'express-async-handler';
import Booking from '../models/bookingModel.js';
import Bus from '../models/busModel.js';
import WaitingList from '../models/waitingListModel.js';
import User from '../models/userModel.js';
import sendEmail from '../utils/sendEmail.js';

// --- HELPER FUNCTION (Correctly implemented) ---
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

// --- NEW HELPER FUNCTION for Date Formatting ---
const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
// --- END HELPER FUNCTION ---

// Helper function to process the waiting list
const processWaitingList = async (busId) => {
  const bus = await Bus.findById(busId);
  if (!bus) return;

  // Find all available seats (FIXED: Count all occupied statuses)
  const bookings = await Booking.find({ 
    bus: busId, 
    status: { $in: ['confirmed', 'attended', 'absent'] } 
  });
  const bookedSeatNumbers = bookings.map(b => b.seatNumber);
  
  let availableSeat = -1;
  for (let i = 1; i <= bus.totalSeats; i++) {
    if (!bookedSeatNumbers.includes(i)) {
      availableSeat = i;
      break;
    }
  }

  // If a seat is available, find the first person on the waiting list
  if (availableSeat !== -1) {
    const waitingUser = await WaitingList.findOne({ bus: busId }).sort({ createdAt: 1 });
    
    if (waitingUser) {
      // Create a booking for this user
      const newBooking = await Booking.create({
        user: waitingUser.user,
        bus: bus._id,
        busNumber: bus.busNumber,
        route: bus.route,
        seatNumber: availableSeat,
        departureTime: bus.departureTime,
        status: 'confirmed',
      });

      // Remove user from waiting list
      await waitingUser.deleteOne();

      // Send notification email
      const user = await User.findById(waitingUser.user);
      const bookingDateFormatted = formatDate(newBooking.bookingDate);

      if (user) {
        await sendEmail({
          email: user.email,
          subject: 'You\'re Off The Waiting List! - LNMIIT Bus System',
          message: 
`Dear ${user.name},

A seat has become available on bus ${bus.busNumber} for the ${bus.route} route, departing at ${bus.departureTime}.

Your seat has been automatically reserved. Please find your official e-ticket details below:

--- Official E-Ticket ---
Bus Number: ${bus.busNumber}
Route: ${bus.route}
Departure Time: ${bus.departureTime}
Booking Date (Travel Date): ${bookingDateFormatted}
--- Reservation Details ---
Seat Number: ${availableSeat}
Status: CONFIRMED
-------------------------

Thank you for choosing the LNMIIT Bus Service.
`,
        });
      }
    }
  }
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private (Student)
const createBooking = asyncHandler(async (req, res) => {
  const { busId, seatNumber } = req.body;
  const userId = req.user._id;

  const bus = await Bus.findById(busId);
  if (!bus) {
    res.status(404);
    throw new Error('Bus not found');
  }

  // Check if seat is already booked (FIXED: include all occupied statuses)
  const isBooked = await Booking.findOne({
    bus: busId,
    seatNumber,
    status: { $in: ['confirmed', 'attended', 'absent'] },
  });

  if (isBooked) {
    res.status(400);
    throw new Error('This seat is already booked');
  }

  // Check if user already has a booking on this bus (FIXED: include all occupied statuses)
  const userHasBooking = await Booking.findOne({
    user: userId,
    bus: busId,
    status: { $in: ['confirmed', 'attended', 'absent'] },
  });

  if (userHasBooking) {
    res.status(400);
    throw new Error('You already have a booking on this bus');
  }

  // Create booking
  const booking = await Booking.create({
    user: userId,
    bus: bus._id,
    busNumber: bus.busNumber,
    route: bus.route,
    seatNumber,
    departureTime: bus.departureTime,
    status: 'confirmed',
  });

  if (booking) {
    const bookingDateFormatted = formatDate(booking.bookingDate);

    // Send confirmation email 
    await sendEmail({
      email: req.user.email,
      subject: 'Booking Confirmation - LNMIIT Bus System',
      message: 
`Dear ${req.user.name},

Your bus seat reservation has been successfully confirmed. Please find your official e-ticket details below:

--- Official E-Ticket ---
Bus Number: ${bus.busNumber}
Route: ${bus.route}
Departure Time: ${bus.departureTime}
Booking Date (Travel Date): ${bookingDateFormatted}
--- Reservation Details ---
Seat Number: ${seatNumber}
Booking ID: ${booking._id}
Status: CONFIRMED
-------------------------

Please arrive at the pickup point at least 15 minutes before the departure time. Your booking is non-transferable.

Thank you for choosing the LNMIIT Bus Service.
`,
    });

    res.status(201).json(booking);
  } else {
    res.status(400);
    throw new Error('Invalid booking data');
  }
});

// @desc    Get logged in user's bookings
// @route   GET /api/bookings/mybookings
// @access  Private (Student)
const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(bookings);
});

// @desc    Cancel a booking (Added time and status check)
// @route   DELETE /api/bookings/:id
// @access  Private (Student)
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Check if user owns this booking
  if (booking.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to cancel this booking');
  }
  
  // Check if attendance has already been marked
  if (booking.status === 'attended' || booking.status === 'absent') {
    res.status(400);
    throw new Error('Cannot cancel booking after attendance has been marked by the conductor.');
  }

  // Check time restriction (30 mins prior)
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const departureMinutes = parseTime(booking.departureTime);

  if (departureMinutes - currentMinutes < 30) {
    res.status(400);
    throw new Error('Cannot cancel booking less than 30 minutes before departure.');
  }

  // "Delete" the booking 
  await booking.deleteOne();
  
  const bookingDateFormatted = formatDate(booking.bookingDate);

  // Send cancellation email 
  await sendEmail({
    email: req.user.email,
    subject: 'Booking Cancellation Confirmed - LNMIIT Bus System',
    message: 
`Dear ${req.user.name},

Your bus seat reservation has been successfully cancelled as per your request. Please find the details of the cancelled booking below:

--- Cancellation Details ---
Bus Number: ${booking.busNumber}
Route: ${booking.route}
Departure Time: ${booking.departureTime}
Booking Date (Travel Date): ${bookingDateFormatted}
Seat Number: ${booking.seatNumber}
Booking ID: ${booking._id}
Status: CANCELLED
----------------------------

Your seat is now released for other students.

Thank you for using the LNMIIT Bus Service.
`,
  });

  // Trigger waiting list processing 
  processWaitingList(booking.bus);

  res.json({ message: 'Booking cancelled successfully' });
});

// @desc    Join waiting list for a bus
// @route   POST /api/bookings/waitlist
// @access  Private (Student)
const joinWaitingList = asyncHandler(async (req, res) => {
  const { busId } = req.body;
  const userId = req.user._id;

  const bus = await Bus.findById(busId);
  if (!bus) {
    res.status(404);
    throw new Error('Bus not found');
  }

  // Check if bus is actually full (FIXED: Count all occupied statuses)
  const bookingCount = await Booking.countDocuments({ 
    bus: busId, 
    status: { $in: ['confirmed', 'attended', 'absent'] } 
  });

  if (bookingCount < bus.totalSeats) {
    res.status(400);
    throw new Error('This bus is not full. Please book a seat directly.');
  }

  // Check if user is already on the list
  const alreadyWaiting = await WaitingList.findOne({ user: userId, bus: busId });
  if (alreadyWaiting) {
    res.status(400);
    throw new Error('You are already on the waiting list for this bus');
  }
  
  // Check if user already has a booking (FIXED: Count all occupied statuses)
  const hasBooking = await Booking.findOne({ 
    user: userId, 
    bus: busId, 
    status: { $in: ['confirmed', 'attended', 'absent'] } 
  });

  if(hasBooking) {
    res.status(400);
    throw new Error('You already have a confirmed booking on this bus');
  }

  // Add to waiting list
  await WaitingList.create({
    user: userId,
    bus: busId,
  });

  res.status(201).json({ message: 'Successfully joined waiting list' });
});

export { createBooking, getMyBookings, cancelBooking, joinWaitingList };