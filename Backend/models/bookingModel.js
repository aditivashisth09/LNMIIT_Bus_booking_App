import mongoose from 'mongoose';

const bookingSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Bus',
    },
    busNumber: {
      type: String,
      required: true,
    },
    route: {
      type: String,
      required: true,
    },
    seatNumber: {
      type: Number,
      required: true,
    },
    departureTime: {
      type: String,
      required: true,
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'attended', 'absent'], // UPDATED
      default: 'confirmed',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a seat is booked only once per bus for a given departure
// A more complex system would also check for date
bookingSchema.index({ bus: 1, seatNumber: 1, departureTime: 1 }, { unique: true, partialFilterExpression: { status: 'confirmed' } });


const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;