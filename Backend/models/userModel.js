import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true, // Required for ALL roles
      unique: true,
    },
    phone: {
      type: String,
      required: true, // Required for ALL roles
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['student', 'admin', 'conductor'],
      default: 'student',
    },
    onHold: {
      type: Boolean,
      default: false,
    },
    // --- NEW FIELD: Stores the date when the user's absent count was last reset ---
    amnestyDate: {
      type: Date,
      default: null
    }
    // -----------------------------------------------------------------------------
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  // 1. Role-based field validation
  if (this.isNew || this.isModified('role') || this.isModified('email') || this.isModified('phone')) {
    
    // Ensure fields exist (double check)
    if (!this.email) return next(new Error('Email is required for all users.'));
    if (!this.phone) return next(new Error('Phone number is required for all users.'));

    // Specific Domain Validation for Student and Admin
    if (this.role === 'student' || this.role === 'admin') {
      if (!/^[a-zA-Z0-9._%+-]+@lnmiit\.ac\.in$/.test(this.email)) {
        return next(new Error(`Role "${this.role}" must use a valid @lnmiit.ac.in email.`));
      }
    }
  }

  // 2. Encrypt password using bcrypt before saving
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;