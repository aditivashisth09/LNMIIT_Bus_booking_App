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
    // --- NEW: Track the actual travel date (e.g., "2025-11-20") ---
    travelDate: {
      type: String, 
      required: true,
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'attended', 'absent'],
      default: 'confirmed',
    },
  },
  {
    timestamps: true,
  }
);

// --- UPDATED INDEX ---
// Ensure a seat on a specific bus is only booked once PER DATE
// We added 'travelDate' to the uniqueness check
bookingSchema.index(
  { bus: 1, seatNumber: 1, departureTime: 1, travelDate: 1 }, 
  { unique: true, partialFilterExpression: { status: 'confirmed' } }
);

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;