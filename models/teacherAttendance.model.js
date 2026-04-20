const mongoose = require("mongoose");

const teacherAttendanceSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true }, // Added branch reference
  attendanceRecords: [
    {
      teacherObjectId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      teacherId: { type: String, required: true }, // Custom teacher id from Teacher collection
      teacherName: { type: String, required: true },
      status: { type: String, enum: ["Present", "Absent"], required: true },
    }
  ]
});

const TeacherAttendance = mongoose.model("TeacherAttendance", teacherAttendanceSchema);
module.exports = TeacherAttendance;
