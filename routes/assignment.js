const express = require('express');
const router = express.Router();
const Assignment = require('../models/assignmentModel');
const authMiddleware = require('../middleware/auth');

const restrictToAdminOrPrincipalOrTeacher = (req, res, next) => {
  if (!['admin', 'principal', 'teacher'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

router.post('/assignments', authMiddleware, restrictToAdminOrPrincipalOrTeacher, async (req, res) => {
  try {
    const assignment = new Assignment({ ...req.body, branchId: req.user.branchId });
    await assignment.save();
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ message: 'Error creating assignment', error });
  }
});

router.get('/assignments', authMiddleware, restrictToAdminOrPrincipalOrTeacher, async (req, res) => {
  try {
    const query = req.user.role === 'principal' || req.user.role === 'teacher' ? { branchId: req.user.branchId } : {};
    const assignments = await Assignment.find(query);
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assignments', error });
  }
});

module.exports = router;