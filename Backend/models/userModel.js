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
      required: false, // Not required for all roles
      unique: true,
      sparse: true, // Allows multiple nulls, but unique if a value exists
    },
    phone: {
      type: String,
      required: false, // Not required for all roles
      unique: true,
      sparse: true, // Allows multiple nulls, but unique if a value exists
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
    // --- NEW FIELD ---
    onHold: {
      type: Boolean,
      default: false,
    }
    // --- END NEW FIELD ---
  },
  {
    timestamps: true,
  }
);

// --- UPDATED: Validation Hook ---
userSchema.pre('save', async function (next) {
  // 1. Role-based field validation
  // We run this on 'new' or if role/email/phone is modified
  if (this.isNew || this.isModified('role') || this.isModified('email') || this.isModified('phone')) {
    
    // Both student and admin MUST have an @lnmiit.ac.in email
    if (this.role === 'student' || this.role === 'admin') {
      if (!this.email) {
        return next(new Error(`Role "${this.role}" must register with an email.`));
      }
      if (!/^[a-zA-Z0-9._%+-]+@lnmiit\.ac\.in$/.test(this.email)) {
        return next(new Error(`Role "${this.role}" must use a valid @lnmiit.ac.in email.`));
      }
      this.phone = null; // Ensure phone is null for students/admins
    } 
    // Conductor MUST have a phone number
    else if (this.role === 'conductor') {
      if (!this.phone) {
        return next(new Error('Conductors must register with a phone number.'));
      }
      this.email = null; // Ensure email is null for conductors
    }
  }

  // 2. Encrypt password using bcrypt before saving
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});
// --- END OF UPDATE ---

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;