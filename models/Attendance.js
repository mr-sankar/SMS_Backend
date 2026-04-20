const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  teacherEmail: { type: String, required: true },
  className: { type: String, required: true },
  section: { type: String, required: true },
  attendance: [
    {
      date: { type: String, required: true },
      attendanceRecords: [
        {
          studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
          rollNumber: { type: String },
          admissionNo: { type: String },
          name: { type: String },
          attendanceStatus: { type: String },
          reason: { type: String },
        },
      ],
    },
  ],
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
});

module.exports = mongoose.model('Attendance', attendanceSchema);