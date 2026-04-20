const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const Exam = require("../models/examModel");
const Student = require("../models/studentModel");
const jwt = require("jsonwebtoken");
const authMiddleware = require('../middleware/auth')


// Middleware to restrict access based on roles
const restrictAccess = (req, res, next) => {
  if (
    !['teacher', 'principal', 'admin', 'student', 'parent'].includes(
      req.user.role
    )
  ) {
    return res
      .status(403)
      .json({ message: 'Access denied. Insufficient permissions.' });
  }
  next();
};

// Get student details by rollNumber
router.get(
  "/details/:rollNumber",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const rollNumber = req.params.rollNumber;
      const student = await Student.findOne({ rollNumber }).lean();
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
      res.json({ name: student.name, studentId: student._id });
    } catch (err) {
      // console.error(err);
      res.status(500).json({ error: "Failed to fetch student details" });
    }
  }
);

// Get attendance for a specific student
router.get(
  "/attendance/:rollNumber",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const rollNumber = req.params.rollNumber;
      const student = await Student.findOne({ rollNumber }).lean();
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // For students, ensure they can only access their own data
      if (req.user.role === "student" && !req.user.id.equals(student._id)) {
        return res.status(403).json({ error: "Access denied: You can only view your own attendance" });
      }

      const attendanceRecords = await Attendance.find({
        "attendance.attendanceRecords.studentId": student._id,
      }).lean();

      const flattenedRecords = attendanceRecords
        .flatMap((record) =>
          record.attendance.flatMap((entry) =>
            entry.attendanceRecords.filter((rec) => rec.studentId.equals(student._id))
          )
        )
        .map((rec) => ({
          date: rec.date,
          attendanceStatus: rec.attendanceStatus,
        }));

      res.json(flattenedRecords);
    } catch (err) {
      // console.error(err);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  }
);

// Get exam scores for a specific student
router.get(
  "/exams/:rollNumber",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const rollNumber = req.params.rollNumber;
      const student = await Student.findOne({ rollNumber }).lean();
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // For students, ensure they can only access their own data
      if (req.user.role === "student" && !req.user.id.equals(student._id)) {
        return res.status(403).json({ error: "Access denied: You can only view your own exam scores" });
      }

      const exams = await Exam.find({
        "marks.studentId": student._id,
      }).lean();

      const flattenedExams = exams.map((exam) => {
        const studentMarks = exam.marks.find((mark) =>
          mark.studentId.equals(student._id)
        );
        return {
          name: exam.name,
          className: exam.className,
          section: exam.section,
          maxMarks: exam.maxMarks,
          createdAt: exam.createdAt,
          marks: studentMarks ? studentMarks.marks : [],
          studentId: student._id,
        };
      });

      res.json(flattenedExams);
    } catch (err) {
      // console.error(err);
      res.status(500).json({ error: "Failed to fetch exams" });
    }
  }
);

module.exports = router;