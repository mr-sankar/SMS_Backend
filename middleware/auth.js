const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Branch = require('../models/branchModel');

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  // console.log('Token received:', token);
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );
    // console.log('Decoded token:', decoded);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });

    // Check user status
    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Your account is inactive' });
    }

    // Check branch status if branchId exists (skip for admins and principals)
    if (user.branchId && user.role !== 'admin' && user.role !== 'principal') {
      const branch = await Branch.findById(user.branchId);
      if (branch && branch.status === 'inactive') {
        return res
          .status(403)
          .json({ message: 'Your branch is inactive, access denied' });
      }
    }

    // Attach user info to request, including email
    req.user = {
      userId: user._id,
      email: user.email, // Add email here
      role: user.role,
      branchId: user.branchId || null,
    };
    // console.log('Authenticated user:', req.user);

    next();
  } catch (error) {
    // console.error('Token verification error:', error.message);
    res.status(401).json({ message: 'Invalid token or server error' });
  }
};

module.exports = authMiddleware;
