const express = require('express');
const router = express.Router();
const Student = require('../models/studentModel');
const HealthRecord = require('../models/healthRecordModel');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => cb(null, `health-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 1000000 }, fileFilter: (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  cb(null, filetypes.test(file.mimetype) && filetypes.test(path.extname(file.originalname).toLowerCase()));
}});



const restrictAccess = (req, res, next) => {
  if (!['teacher', 'principal', 'admin', 'parent', 'student'].includes(req.user.role)) {
    return res
      .status(403)
      .json({ message: 'Access denied. Insufficient permissions.' });
  }
  next();
};

router.post('/health-records', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { admissionNo, ...healthData } = req.body;
    if (!admissionNo) return res.status(400).json({ success: false, message: 'Admission number is required' });

    const student = await Student.findOne({ admissionNo });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (req.user.role === 'principal' && student.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let healthRecord = student.healthRecord ? await HealthRecord.findByIdAndUpdate(
      student.healthRecord,
      { ...healthData, admissionNo, branchId: student.branchId, updatedAt: new Date() },
      { new: true, runValidators: true }
    ) : new HealthRecord({ studentId: student._id, admissionNo, ...healthData, branchId: student.branchId });

    if (!student.healthRecord) {
      await healthRecord.save();
      student.healthRecord = healthRecord._id;
      await student.save();
    }

    res.status(200).json({ success: true, data: healthRecord, message: 'Health record updated successfully' });
  } catch (error) {
    // console.error('Error updating health record:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

router.get('/health-records/:admissionNo', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const student = await Student.findOne({ admissionNo: req.params.admissionNo });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (req.user.role === 'principal' && student.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!student.healthRecord) return res.status(404).json({ success: false, message: 'No health record found' });

    const healthRecord = await HealthRecord.findById(student.healthRecord);
    res.status(200).json({ success: true, data: healthRecord });
  } catch (error) {
    // console.error('Error retrieving health record:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;