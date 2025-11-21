import asyncHandler from 'express-async-handler';
import Bus from '../models/busModel.js';
import Booking from '../models/bookingModel.js'; 
import User from '../models/userModel.js'; 
import WaitingList from '../models/waitingListModel.js';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

// ... (Keep your helper functions: parseTime, getTodayDateString) ...

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

const getTodayDateString = () => {
  const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const dateObj = new Date(now);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
// --- END HELPER FUNCTIONS ---

// ... (Keep getDashboardStats, downloadReport, getConductors, getAllBusSchedules, getHoldList as they were) ...

const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const travelDate = getTodayDateString(); 

  const allBuses = await Bus.find({});
  
  const activeRecords = allBuses.filter(bus => 
    bus.route === 'New Asset (Placeholder)' || 
    parseTime(bus.departureTime) > currentMinutes
  );
  const activeBusIds = activeRecords.map(bus => bus._id);

  const uniqueBuses = await Bus.aggregate([
    { $match: { _id: { $in: activeBusIds } } },
    { $group: { _id: '$busNumber' } },
    { $count: 'totalUniqueBuses' }
  ]);
  const totalBuses = uniqueBuses.length > 0 ? uniqueBuses[0].totalUniqueBuses : 0;

  const totalBookings = await Booking.countDocuments({ 
    travelDate: travelDate, 
    status: { $in: ['confirmed', 'attended', 'absent'] } 
  });
  
  const totalWaiting = await WaitingList.countDocuments({ bus: { $in: activeBusIds } });
  
  const allDailyTrips = allBuses.filter(b => b.route !== 'New Asset (Placeholder)');
  const totalCapacity = allDailyTrips.reduce((acc, bus) => acc + bus.totalSeats, 0);
  
  const occupancyRate = totalCapacity > 0 ? ((totalBookings / totalCapacity) * 100).toFixed(0) : 0;

  res.json({
    totalBuses, 
    totalBookings,
    totalWaiting,
    totalCapacity,
    occupancyRate
  });
});

const downloadReport = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({})
    .populate('user', 'name email')
    .populate('bus', 'busNumber route');
    
  if (!bookings || bookings.length === 0) {
    res.status(404);
    throw new Error('No bookings found to generate report');
  }

  const data = bookings.map(b => ({
    'Booking ID': b._id,
    'Student Name': b.user.name,
    'Student Email': b.user.email,
    'Bus Number': b.bus.busNumber,
    'Route': b.bus.route,
    'Seat Number': b.seatNumber,
    'Status': b.status,
    'Date': b.bookingDate.toISOString().split('T')[0],
  }));

  const { type = 'pdf' } = req.query;

  if (type === 'csv') {
    const csv = Papa.unparse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment('bookings_report.csv');
    res.send(csv);
  } else {
    const doc = new jsPDF();
    doc.autoTable({
      head: [['Booking ID', 'Student', 'Bus', 'Seat', 'Status', 'Date']],
      body: data.map(b => [b['Booking ID'], b['Student Name'], b['Bus Number'], b['Seat Number'], b['Status'], b['Date']]),
    });
    const pdfData = doc.output();
    res.header('Content-Type', 'application/pdf');
    res.attachment('bookings_report.pdf');
    res.send(Buffer.from(pdfData, 'binary'));
  }
});

const getConductors = asyncHandler(async (req, res) => {
  const conductors = await User.find({ role: 'conductor' }).select('_id name phone');
  res.json(conductors);
});

const getAllBusSchedules = asyncHandler(async (req, res) => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const travelDate = getTodayDateString(); 

  const allBuses = await Bus.find({}).populate('conductor', 'name phone');
  
  const activeRecords = allBuses.filter(bus => 
    bus.route === 'New Asset (Placeholder)' || 
    parseTime(bus.departureTime) > currentMinutes
  );

  const busesWithCounts = await Promise.all(activeRecords.map(async (bus) => {
      const bookings = await Booking.aggregate([
          { $match: { 
              bus: bus._id, 
              status: { $in: ['confirmed', 'attended', 'absent'] },
              travelDate: travelDate 
            } 
          },
          { $group: { _id: null, bookedSeats: { $sum: 1 } } }
      ]);
      
      return {
          id: bus._id,
          busNumber: bus.busNumber,
          route: bus.route,
          departureTime: bus.departureTime,
          arrivalTime: bus.arrivalTime,
          totalSeats: bus.totalSeats,
          bookedSeats: bookings.length > 0 ? bookings[0].bookedSeats : 0,
          driver: bus.driver,
          conductor: bus.conductor,
      };
  }));

  busesWithCounts.sort((a, b) => parseTime(a.departureTime) - parseTime(b.departureTime));

  res.json(busesWithCounts);
});

const getHoldList = asyncHandler(async (req, res) => {
  const holdList = await User.find({ role: 'student', onHold: true }).select('_id name email');
  
  const usersWithAbsentCount = await Promise.all(holdList.map(async (user) => {
    // Note: This count might still show > 5 in the UI until they are reset, 
    // but that is accurate (they *are* absent that many times). 
    // The "amnesty" logic only applies when calculating the *next* ban.
    const absentCount = await Booking.countDocuments({
      user: user._id,
      status: 'absent',
    });
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      absentCount: absentCount,
    };
  }));

  res.json(usersWithAbsentCount);
});

// @desc    Remove a student from the hold list
// @route   PUT /api/admin/remove-hold/:id
// @access  Private (Admin)
const removeUserHold = asyncHandler(async (req, res) => {
  try {
    const userId = req.params.id;
    console.log(`Attempting to remove hold for user ID: ${userId}`);

    const user = await User.findById(userId);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.role !== 'student') {
      res.status(400);
      throw new Error('Only student users can be placed on hold.');
    }

    // --- FIX: Remove hold AND Set Amnesty Date ---
    // We do NOT modify past bookings. We just set a flag date.
    // Future bans will only count bookings created AFTER this date.
    await User.findByIdAndUpdate(userId, { 
        onHold: false,
        amnestyDate: new Date() 
    });
    
    console.log(`User ${user.name} released from hold. Amnesty granted at ${new Date()}`);

    res.json({ 
      message: `${user.name} has been removed from hold status. Count reset.`,
      userId: userId 
    });

  } catch (error) {
    console.error("Error in removeUserHold:", error); 
    res.status(500);
    throw new Error(error.message || 'Server Error during hold removal');
  }
});

export { 
  getDashboardStats, 
  downloadReport, 
  getConductors, 
  getAllBusSchedules,
  getHoldList, 
  removeUserHold 
};