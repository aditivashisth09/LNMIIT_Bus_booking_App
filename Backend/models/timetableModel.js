import mongoose from 'mongoose';

const timetableSchema = mongoose.Schema({
  busNumber: {
    type: String,
    required: true,
  },
  route: {
    type: String,
    required: true,
  },
  departureTime: {
    type: String,
    required: true,
  },
  arrivalTime: {
    type: String,
  },
  from: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
  days: [
    {
      type: String,
      enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      required: true,
    },
  ],
  status: {
    type: String,
    enum: ['active', 'delayed', 'cancelled'],
    default: 'active',
  },
});

const Timetable = mongoose.model('Timetable', timetableSchema);

export default Timetable;