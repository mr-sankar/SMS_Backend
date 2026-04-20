const express = require("express");
const User = require("../models/user.model");
const TeacherAttendance = require("../models/teacherAttendance.model");
const Teacher = require("../models/teacherModel");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth.js");

const router = express.Router();

// Middleware to restrict access based on role
const restrictAccess = (req, res, next) => {
  if (!["teacher", "principal", "admin", 'student', 'parent'].includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied. Insufficient permissions." });
  }
  next();
};


// Fetch present days for a teacher in a specific month and year
router.get('/present-days/:teacherId',authMiddleware, restrictAccess, async (req, res) => {
  try {
    const teacherId = req.params.teacherId;

    // Aggregate to count present days for the specified teacher
    const presentDays = await TeacherAttendance.aggregate([
      {
        $unwind: '$attendanceRecords' // Unwind the attendanceRecords array
      },
      {
        $match: {
          'attendanceRecords.teacherId': teacherId,
          'attendanceRecords.status': 'Present'
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 } // Count the number of matching records
        }
      }
    ]);

    // If no records found, return 0
    const count = presentDays.length > 0 ? presentDays[0].count : 0;

    res.status(200).json({
      success: true,
      teacherId,
      presentDays: count
    });
    console.log("gfdghf",count);
  } catch (error) {
    console.error('Error fetching present days:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching present days',
      error: error.message
    });
  }
});



// Fetch all teachers (users with role "teacher")
router.get("/teachers", authMiddleware, restrictAccess, async (req, res) => {
  try {
    // console.log("✅ Fetching teachers...");

    const query = req.user.role === "principal" ? { role: "teacher", branchId: req.user.branchId } : { role: "teacher" };
    const users = await User.find(query, "name email roleId branchId").lean();
    if (!users.length) {
      // console.log("⚠️ No users with role 'teacher' found!");
      return res.status(404).json({ message: "No teachers found in User schema" });
    }

    // console.log("🔹 Users:", users);

    const emails = users.map(user => user.email);
    const teachers = await Teacher.find({ email: { $in: emails } }, "teacherId email").lean();
    if (!teachers.length) {
      // console.log("⚠️ No matching emails found in Teacher schema!");
      return res.status(404).json({ message: "No teacher records found" });
    }

    // console.log("🔹 Teachers:", teachers);

    const formattedTeachers = users.map(user => {
      const teacher = teachers.find(t => t.email === user.email);
      return {
        _id: user._id,
        teacherId: teacher ? teacher.teacherId : "N/A",
        name: user.name,
        roleId: user.roleId,
        email: user.email,
        branchId: user.branchId,
      };
    });

    res.status(200).json(formattedTeachers);
  } catch (error) {
    // console.error("❌ Error fetching teachers:", error);
    res.status(500).json({ message: "Error fetching teachers", error: error.message });
  }
});

// Mark attendance (POST with branchId)
router.post("/mark", authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { date, attendanceRecords } = req.body;

    if (!date || !attendanceRecords || !attendanceRecords.length) {
      return res.status(400).json({ message: "Invalid data. Date and attendance records are required." });
    }

    // console.log("🔹 Received Attendance:", attendanceRecords);

    // Add branchId from authenticated user
    const branchId = req.user.branchId;
    if (!branchId) {
      return res.status(400).json({ message: "Branch ID is required but not found in user data." });
    }

    const updatedRecords = attendanceRecords.map(record => {
      if (!record.teacherObjectId || !record.teacherId) {
        throw new Error("Attendance record is missing required teacher IDs.");
      }
      return {
        teacherObjectId: record.teacherObjectId,
        teacherId: record.teacherId,
        teacherName: record.teacherName,
        status: record.status,
        reason: record.reason || "", // Optional reason field
      };
    });

    let existingAttendance = await TeacherAttendance.findOne({ date, branchId });
    if (existingAttendance) {
      // console.log("⚠️ Updating existing attendance...");
      existingAttendance.attendanceRecords = updatedRecords;
      await existingAttendance.save();
    } else {
      // console.log("✅ Creating new attendance record...");
      const newAttendance = new TeacherAttendance({
        date,
        attendanceRecords: updatedRecords,
        branchId,
      });
      await newAttendance.save();
    }

    res.status(200).json({ message: "Attendance marked successfully" });
  } catch (error) {
    // console.error("❌ Error marking attendance:", error);
    res.status(500).json({ message: "Error marking attendance", error: error.message });
  }
});

// Fetch attendance records for a specific teacher by their User ObjectId
router.get("/teacher/attendance/:teacherId", authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Validate teacher ID format
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ message: "Invalid teacher ID format" });
    }

    // console.log("Fetching attendance for teacher ID:", teacherId);

    // Build query based on user role
    const query = { "attendanceRecords.teacherObjectId": teacherId };
    if (req.user.role === "principal") {
      query.branchId = req.user.branchId; // Filter by branchId for principal
    }

    // Fetch attendance records sorted by date (newest first)
    const attendanceRecords = await TeacherAttendance.find(query).sort({ date: -1 });

    // If no records found, return empty array
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(200).json([]);
    }

    // Extract relevant attendance data for the logged-in teacher
    const teacherAttendance = attendanceRecords
      .map((doc) => {
        const record = doc.attendanceRecords.find(
          (rec) => rec.teacherObjectId && rec.teacherObjectId.toString() === teacherId
        );

        // Skip records that don't have matching teacher data
        if (!record) return null;

        return {
          date: doc.date,
          teacherObjectId: record.teacherObjectId,
          teacherId: record.teacherId,
          teacherName: record.teacherName,
          status: record.status,
          reason: record.reason, // Include reason field
          branchId: doc.branchId, // Include branchId field
        };
      })
      .filter((record) => record !== null); // Remove any null entries

    // console.log("Attendance fetched:", teacherAttendance.length);

    // Return consistent data structure
    res.status(200).json(teacherAttendance);
  } catch (error) {
    // console.error("Error fetching teacher attendance:", error);
    res.status(500).json({ message: "Error fetching teacher attendance", error: error.message });
  }
});
// Fetch attendance by date
router.get("/fetch/:date", authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { date } = req.params;
    const query = { date };
    if (req.user.role === "principal") {
      query.branchId = req.user.branchId;
    }

    const attendance = await TeacherAttendance.findOne(query).populate(
      "attendanceRecords.teacherObjectId",
      "name email"
    );
    res.status(200).json(attendance || { message: "No records found for this date" });
  } catch (error) {
    // console.error("❌ Error fetching attendance:", error);
    res.status(500).json({ message: "Error fetching attendance", error: error.message });
  }
});

// Fetch all attendance records
router.get("/fetch-all", authMiddleware, restrictAccess, async (req, res) => {
  try {
    const query = req.user.role === "principal" ? { branchId: req.user.branchId } : {};
    const attendanceRecords = await TeacherAttendance.find(query)
      .populate("attendanceRecords.teacherObjectId", "name email")
      .sort({ date: -1 });

    if (!attendanceRecords.length) {
      return res.status(404).json({ message: "No attendance records found" });
    }

    res.status(200).json(attendanceRecords);
  } catch (error) {
    // console.error("❌ Error fetching attendance records:", error);
    res.status(500).json({ message: "Error fetching attendance records", error: error.message });
  }
});



module.exports = router;