import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';

// Default passcodes if .env is empty
const CONDUCTOR_PASSCODE = process.env.CONDUCTOR_PASSCODE || 'LNMIIT_CONDUCTOR_2025';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'LNMIIT_ADMIN_2025';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const {
    name,
    email, // Compulsory for all
    phone, // Compulsory for all
    password,
    confirmPassword,
    role, 
    passcode,
  } = req.body;

  // Validation
  if (!name || !password || !confirmPassword || !phone || !email) {
    res.status(400);
    throw new Error('Please fill in all fields including Email and Phone Number');
  }

  if (password !== confirmPassword) {
    res.status(400);
    throw new Error('Passwords do not match');
  }

  // Check existing user by phone
  const phoneExists = await User.findOne({ phone });
  if (phoneExists) {
    res.status(400);
    throw new Error('User with this phone number already exists');
  }

  // Check existing user by email
  const emailExists = await User.findOne({ email });
  if (emailExists) {
    res.status(400);
    throw new Error('User with this email already exists');
  }

  let userRole = role || 'student'; 

  // --- PASSCODE VERIFICATION LOGIC ---
  if (userRole === 'conductor') {
    // Compare trimmed versions
    if (!passcode || passcode.trim() !== CONDUCTOR_PASSCODE) {
      res.status(401);
      throw new Error('Invalid Conductor Passcode.');
    }
  } else if (userRole === 'admin') {
    // Compare trimmed versions
    if (!passcode || passcode.trim() !== ADMIN_PASSCODE) {
      res.status(401);
      throw new Error('Invalid Admin Passcode.');
    }
  } else {
    // Students validation (implicit admin promotion via email)
    if (email === 'admin@lnmiit.ac.in') {
      userRole = 'admin';
    }
  }
  // --- END LOGIC ---

  const user = await User.create({
    name,
    email, // Saved for everyone
    phone, // Saved for everyone
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
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } else {
    res.status(401);
    throw new Error('Invalid credentials');
  }
});

export { registerUser, loginUser };