const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const authMiddleware = require('../middleware/auth');

const restrictToAdminOrPrincipalOrTeacher = (req, res, next) => {
  if (!['admin', 'principal', 'teacher', "parent", "student"].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

router.post('/attendance', authMiddleware, restrictToAdminOrPrincipalOrTeacher, async (req, res) => {
  try {
    const attendance = new Attendance({ ...req.body, branchId: req.user.branchId });
    await attendance.save();
    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Error creating attendance', error });
  }
});

router.get('/attendance', authMiddleware, restrictToAdminOrPrincipalOrTeacher, async (req, res) => {
  try {
    const query = req.user.role === 'principal' || req.user.role === 'teacher' ? { branchId: req.user.branchId } : {};
    const attendance = await Attendance.find(query);
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attendance', error });
  }
});

module.exports = router;