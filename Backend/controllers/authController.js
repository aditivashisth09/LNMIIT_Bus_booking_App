import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';

// --- NEW ---
// This is the secret code conductors must enter to sign up.
// !! ADD THIS to your .env file in the Backend folder !!
// e.g., CONDUCTOR_PASSCODE=LNMIIT_BUS_STAFF_123
const CONDUCTOR_PASSCODE = process.env.CONDUCTOR_PASSCODE || 'LNMIIT_CONDUCTOR_2025';
// --- END NEW ---

// @desc    Register a new user (Student, Admin, or Conductor)
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  // UPDATED: Destructure all possible fields from your new forms
  const {
    name,
    email,
    phone,
    password,
    confirmPassword,
    role, // This will be 'student' or 'conductor'
    passcode,
  } = req.body;

  if (!name || !password || !confirmPassword) {
    res.status(400);
    throw new Error('Please fill in name and password fields');
  }

  if (password !== confirmPassword) {
    res.status(400);
    throw new Error('Passwords do not match');
  }

  // Check if user exists by email (if provided)
  if (email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      res.status(400);
      throw new Error('User with this email already exists');
    }
  }
  // Check if user exists by phone (if provided)
  if (phone) {
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      res.status(400);
      throw new Error('User with this phone number already exists');
    }
  }

  let userRole = role || 'student'; // Default to student

  // --- Role-specific logic ---
  if (userRole === 'conductor') {
    // 1. Check for the passcode
    if (passcode !== CONDUCTOR_PASSCODE) {
      res.status(401);
      throw new Error('Invalid Conductor Passcode. Registration failed.');
    }
    // 2. The 'userModel' will enforce that 'phone' is present
  } else {
    // Auto-assign admin role if email matches
    if (email === 'admin@lnmiit.ac.in') {
      userRole = 'admin';
    }
    // 3. The 'userModel' will enforce that 'email' is present and valid
  }
  // --- End role logic ---

  // Create user
  // The userModel 'pre' hook will validate the required fields
  const user = await User.create({
    name,
    email: email || null,
    phone: phone || null,
    password,
    role: userRole,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  // UPDATED: 'loginId' can be either email or phone
  const { loginId, password } = req.body;

  if (!loginId || !password) {
    res.status(400);
    throw new Error('Please provide your login ID and password');
  }

  // Check if loginId is an email or phone
  const isEmail = loginId.includes('@');
  
  // Find user by either email or phone
  const user = await User.findOne(
    isEmail ? { email: loginId } : { phone: loginId }
  );

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone, // Send phone to frontend
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } else {
    res.status(401);
    throw new Error('Invalid credentials');
  }
});

export { registerUser, loginUser };