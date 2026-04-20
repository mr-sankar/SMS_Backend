const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const User = require('../models/user.model');

router.post('/register', async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const user = new User(req.body);
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role, branchId: user.branchId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, roleId: user.roleId },
    });
  } catch (error) {
    next(error);
  }
});

// router.post('/login', async (req, res, next) => {
//   try {
//     const { email, password } = req.body;
//     const user = await User.findOne({ email });
//     if (!user) return res.status(401).json({ message: 'Invalid credentials' });

//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

//     const token = jwt.sign(
//       { userId: user._id, role: user.role, branchId: user.branchId },
//       process.env.JWT_SECRET || 'your-secret-key',
//       { expiresIn: '24h' }
//     );

//     res.json({
//       message: 'Login successful',
//       token,
//       user: { id: user._id, name: user.name, email: user.email, role: user.role, roleId: user.roleId },
//     });
//   } catch (error) {
//     console.log('Error in login:', error);
//     next(error);
//   }
// });

// router.post('/login', async (req, res, next) => {
//   try {
//     const { email, password } = req.body;
//     console.log('Login attempt:', { email });

//     // Find user with case-insensitive email
//     const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, "i") } })
//       .populate('branchId', 'status'); // Populate branchId with status field
//     if (!user) {
//       console.log('User not found for email:', email);
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }
//     console.log('User found:', { id: user._id, email: user.email, role: user.role, branchId: user.branchId });

//     // Check branch status (skip for admin if they manage all branches)
//     if (user.role !== 'admin' && user.branchId) {
//       if (user.branchId.status === 'inactive') {
//         console.log(`Login denied: Branch inactive for user ${email}`);
//         return res.status(403).json({ message: 'Your branch is inactive. Access denied.' });
//       }
//     }

//     // Verify password
//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) {
//       console.log('Password mismatch for user:', email);
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     // Generate token
//     const token = jwt.sign(
//       { userId: user._id, role: user.role, branchId: user.branchId?._id },
//       process.env.JWT_SECRET || 'your-secret-key',
//       { expiresIn: '24h' }
//     );

//     console.log('Login successful for:', email);
//     res.json({
//       message: 'Login successful',
//       token,
//       user: { id: user._id, name: user.name, email: user.email, role: user.role, roleId: user.roleId },
//     });
//   } catch (error) {
//     console.error('Error in login:', error.stack);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// router.post('/login', async (req, res, next) => {
//   try {
//     const { email, password } = req.body;
//     console.log('Login attempt:', { email });

//     const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, "i") } })
//       .populate('branchId', 'status');
//     if (!user) {
//       console.log('User not found for email:', email);
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }
//     console.log('User found:', { id: user._id, email: user.email, role: user.role, branchId: user.branchId });

//     if (user.role !== 'admin' && user.branchId) {
//       if (user.branchId.status === 'inactive') {
//         console.log(`Login denied: Branch inactive for user ${email}`);
//         return res.status(403).json({ message: 'Your branch is inactive. Access denied.' });
//       }
//     }

//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) {
//       console.log('Password mismatch for user:', email);
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const token = jwt.sign(
//       { userId: user._id, role: user.role, branchId: user.branchId?._id },
//       process.env.JWT_SECRET || 'your-secret-key',
//       { expiresIn: '24h' }
//     );

//     console.log('Login successful for:', email);
//     res.json({
//       message: 'Login successful',
//       token,
//       user: { id: user._id, name: user.name, email: user.email, role: user.role, roleId: user.roleId },
//     });
//   } catch (error) {
//     console.error('Error in login:', error.stack);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// New Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email });

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') },
    }).populate('branchId', 'status');

    if (!user) {
      // console.log('User not found for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // console.log('User found:', {
    //   id: user._id,
    //   email: user.email,
    //   role: user.role,
    //   branchId: user.branchId,
    // });

    if (user.role !== 'admin' && user.branchId?.status === 'inactive') {
      // console.log(`Login denied: Branch inactive for user ${email}`);
      return res.status(403).json({ message: 'Your branch is inactive. Access denied.' });
    }

    console.log('Entered password  :', password);
    console.log('Stored hash       :', user.password);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Password mismatch for user:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }



    const token = jwt.sign(
      { userId: user._id, role: user.role, branchId: user.branchId?._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // console.log('Login successful for:', email);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleId: user.roleId,
        children: user.children || [],
      },
    });
  } catch (error) {
    // console.error('Error in login:', error.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;