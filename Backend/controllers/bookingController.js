// Backend/controllers/bookingController.js

import asyncHandler from 'express-async-handler';
import Booking from '../models/bookingModel.js';
import Bus from '../models/busModel.js';
import WaitingList from '../models/waitingListModel.js';
import User from '../models/userModel.js';
import sendEmail from '../utils/sendEmail.js';

// Helper to get standardized date string (YYYY-MM-DD) for Indian Time
const getTodayDateString = () => {
  const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const dateObj = new Date(now);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const processWaitingList = async (busId) => {
  const bus = await Bus.findById(busId);
  if (!bus) return;

  const travelDate = getTodayDateString();
  
  const bookings = await Booking.find({ 
    bus: busId, 
    travelDate: travelDate,
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

  if (availableSeat !== -1) {
    const waitingUser = await WaitingList.findOne({ bus: busId }).sort({ createdAt: 1 });
    
    if (waitingUser) {
      const newBooking = await Booking.create({
        user: waitingUser.user,
        bus: bus._id,
        busNumber: bus.busNumber,
        route: bus.route,
        seatNumber: availableSeat,
        departureTime: bus.departureTime,
        travelDate: travelDate,
        status: 'confirmed',
      });

      await waitingUser.deleteOne();

      const user = await User.findById(waitingUser.user);
      if (user) {
        await sendEmail({
          email: user.email,
          subject: 'You\'re Off The Waiting List! - LNMIIT Bus System',
          message: `Dear ${user.name},\n\nA seat has become available on bus ${bus.busNumber}. Your seat ${availableSeat} has been automatically confirmed for today.`,
        });
      }
    }
  }
};

// @desc    Create new booking
const createBooking = asyncHandler(async (req, res) => {
  const { busId, seatNumber } = req.body;
  const userId = req.user._id;

  // 1. Block users who are on hold
  if (req.user.onHold) {
    res.status(403);
    throw new Error('Booking denied. You have been marked absent 5 or more times. Please contact admin.');
  }

  const travelDate = getTodayDateString(); 

  const bus = await Bus.findById(busId);
  if (!bus) {
    res.status(404);
    throw new Error('Bus not found');
  }

  // --- NEW LOGIC: Check for Time Overlap with existing trips ---
  
  // Calculate new trip times in minutes
  const newTripStart = parseTime(bus.departureTime);
  let newTripEnd = parseTime(bus.arrivalTime);
  // Handle midnight crossing (e.g. 11 PM to 1 AM)
  if (newTripEnd < newTripStart) {
      newTripEnd += 24 * 60;
  }

  // Fetch all ACTIVE trips for this user today (Confirmed or Attended)
  const existingTrips = await Booking.find({
      user: userId,
      travelDate: travelDate,
      status: { $in: ['confirmed', 'attended'] } // Ignore 'absent' or 'cancelled'
  }).populate('bus'); // Populate to access arrivalTime

  for (const trip of existingTrips) {
      if (trip.bus) {
          const existingStart = parseTime(trip.departureTime);
          let existingEnd = parseTime(trip.bus.arrivalTime);
          
          // Handle midnight crossing for existing trip
          if (existingEnd < existingStart) {
              existingEnd += 24 * 60;
          }

          // Overlap Condition: (StartA < EndB) AND (EndA > StartB)
          if (newTripStart < existingEnd && newTripEnd > existingStart) {
               res.status(400);
               throw new Error(`Booking denied. You already have an active trip (${trip.busNumber}: ${trip.departureTime} - ${trip.bus.arrivalTime}) that overlaps with this time.`);
          }
      }
  }
  // -------------------------------------------------------------

  const isBooked = await Booking.findOne({
    bus: busId,
    seatNumber,
    travelDate, 
    status: { $in: ['confirmed', 'attended', 'absent'] },
  });

  if (isBooked) {
    res.status(400);
    throw new Error('This seat is already booked for today');
  }

  const userHasBooking = await Booking.findOne({
    user: userId,
    bus: busId,
    travelDate,
    status: { $in: ['confirmed', 'attended', 'absent'] },
  });

  if (userHasBooking) {
    res.status(400);
    throw new Error('You already have a booking on this bus for today');
  }

  const booking = await Booking.create({
    user: userId,
    bus: bus._id,
    busNumber: bus.busNumber,
    route: bus.route,
    seatNumber,
    departureTime: bus.departureTime,
    travelDate, 
    status: 'confirmed',
  });

  if (booking) {
    const bookingDateFormatted = formatDate(booking.bookingDate);
    await sendEmail({
      email: req.user.email,
      subject: 'Booking Confirmed - LNMIIT Bus Service',
      message: `Dear ${req.user.name},

We are pleased to confirm your seat booking with LNMIIT Bus Services.

Booking Details:
------------------------------------------------------
Bus Number    : ${booking.busNumber}
Route         : ${booking.route}
Seat Number   : ${seatNumber}
Date          : ${booking.travelDate}
Departure Time: ${booking.departureTime}
------------------------------------------------------

Please ensure you arrive at the pickup point at least 15 minutes before departure.

Safe Travels!

Best regards,
LNMIIT Transport Department`,
    });

    res.status(201).json(booking);
  } else {
    res.status(400);
    throw new Error('Invalid booking data');
  }
});

// @desc    Get logged in user's bookings
const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate('bus', 'arrivalTime') 
    .sort({ createdAt: -1 });
  res.json(bookings);
});

// @desc    Cancel a booking
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }
  
  if (booking.status === 'attended' || booking.status === 'absent') {
    res.status(400);
    throw new Error('Cannot cancel processed booking.');
  }

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const departureMinutes = parseTime(booking.departureTime);
  const todayStr = getTodayDateString();

  if (booking.travelDate === todayStr && (departureMinutes - currentMinutes < 30)) {
     res.status(400);
     throw new Error('Cannot cancel less than 30 minutes before departure.');
  }

  await sendEmail({
    email: req.user.email,
    subject: 'Booking Cancelled - LNMIIT Bus Service',
    message: `Dear ${req.user.name},

Your booking has been successfully cancelled as per your request.

Cancelled Trip Details:
------------------------------------------------------
Bus Number    : ${booking.busNumber}
Route         : ${booking.route}
Seat Number   : ${booking.seatNumber}
Date          : ${booking.travelDate}
------------------------------------------------------

We hope to serve you again soon.

Best regards,
LNMIIT Transport Department`,
  });

  await booking.deleteOne();
  processWaitingList(booking.bus);

  res.json({ message: 'Booking cancelled successfully' });
});

// @desc    Join waiting list
const joinWaitingList = asyncHandler(async (req, res) => {
  const { busId } = req.body;
  const userId = req.user._id;

  // Block users who are on hold
  if (req.user.onHold) {
    res.status(403);
    throw new Error('Waiting list denied. You have been marked absent 5 or more times.');
  }

  const travelDate = getTodayDateString();

  const bus = await Bus.findById(busId);
  if (!bus) {
    res.status(404);
    throw new Error('Bus not found');
  }

  const bookingCount = await Booking.countDocuments({ 
    bus: busId, 
    travelDate: travelDate,
    status: { $in: ['confirmed', 'attended', 'absent'] } 
  });

  if (bookingCount < bus.totalSeats) {
    res.status(400);
    throw new Error('This bus is not full. Please book a seat directly.');
  }

  const alreadyWaiting = await WaitingList.findOne({ user: userId, bus: busId });
  if (alreadyWaiting) {
    res.status(400);
    throw new Error('You are already on the waiting list');
  }
  
  const hasBooking = await Booking.findOne({ 
    user: userId, 
    bus: busId, 
    travelDate: travelDate,
    status: { $in: ['confirmed', 'attended', 'absent'] } 
  });

  if(hasBooking) {
    res.status(400);
    throw new Error('You already have a confirmed booking on this bus');
  }

  await WaitingList.create({ user: userId, bus: busId });
  res.status(201).json({ message: 'Successfully joined waiting list' });
});

export { createBooking, getMyBookings, cancelBooking, joinWaitingList };