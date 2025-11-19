import mongoose from 'mongoose';

const waitingListSchema = mongoose.Schema(
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
  },
  {
    timestamps: true, // We will use createdAt to determine who is first
  }
);

// User can only be on the waiting list once per bus
waitingListSchema.index({ user: 1, bus: 1 }, { unique: true });

const WaitingList = mongoose.model('WaitingList', waitingListSchema);

export default WaitingList;