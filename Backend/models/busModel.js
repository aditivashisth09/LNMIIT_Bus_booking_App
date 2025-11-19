import mongoose from 'mongoose';

const busSchema = mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: true,
      // REMOVED: unique: true, 
      // Bus numbers can now be reused for different schedules
    },
    route: {
      type: String,
      required: true,
    },
    driver: {
      type: String,
      required: true,
    },
    totalSeats: {
      type: Number,
      required: true,
      default: 40,
    },
    departureTime: {
      type: String,
      required: true,
    },
    arrivalTime: {
      type: String,
      required: true,
    },
    conductor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Bus = mongoose.model('Bus', busSchema);

export default Bus;