const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const multer = require('multer');
const path = require('path');

const authRoutes = require('./routes/auth'); // Ensure the path is correct
// const studRoutes = require("./routes/student");
const parentRoutes = require('./routes/parent');
const teacherRoutes = require('./routes/teacher');
const healthRoutes = require('./routes/healthrecords');
const eventRoutes = require('./routes/events');
const libraryRoutes = require('./routes/library');
const healthRecordsRotes = require('./routes/health');
const attendanceRoutes = require('./routes/attendance.routes.js');
const forgotPasswordRouter = require('./routes/forgotPassword');
const Assignment = require('./models/assignmentsModel');
const SubmittedAssignment = require('./models/SubmittedAssignment');
const Notification = require('./models/notifications');

//student progress route
const progressRoutes = require("./routes/progress");

const Exam = require('./models/examModel');
const Subject = require('./models/subjectModel');
const subjectRoutes = require('./routes/subjects.js');

const Event = require('./models/eventModel');
const Branch = require('./models/branchModel'); // Already added, just confirming

const DriverProfile = require('./models/driverModel');
const Timetable = require('./models/timeTableModel');
const Periodtimetable = require('./models/periodTimeTableModel');

const Fee = require('./models/feeModel');
const Payment = require('./models/PaymentModel');
const User = require('./models/user.model');
const Class = require('./models/classModel.js');
const Student = require('./models/studentModel');
const HealthRecord = require('./models/healthRecordModel');
const BusModel = require('./models/BusModel');
const Teacher = require('./models/teacherModel');
const Attendance = require('./models/Attendance');
const HostelFee = require('./models/hostelFeeModel');
// const Class = require("./models/classModel");
const behavioralRecordsRoutes = require("./routes/behavioralRecords");
const BehavioralRecord = require("./models/BehavioralRecord");


const studRoutes = require('./routes/student');
const driverRoutes = require('./routes/driver.js');

const app = express();
app.use(express.json()); // ✅ Ensure JSON parsing is enabled
app.use(cors());

app.use('/api/auth', authRoutes); // ✅ This ensures routes are available
app.use('/api', studRoutes);
app.use('/api', parentRoutes);
app.use('/api', teacherRoutes);
// app.use('/api', healthRoutes);
app.use('/api', eventRoutes);
app.use('/api', libraryRoutes);
app.use('/api', healthRecordsRotes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api', subjectRoutes);
app.use("/api", behavioralRecordsRoutes);
app.use("/progress", progressRoutes);
app.use('/api', forgotPasswordRouter);
app.use('/driver', driverRoutes);
// MongoDB Connection
mongoose
  .connect(
    process.env.MONGODB_URI ||
      'mongodb+srv://kamalakar1625:mLGLdjUVs4oO6OR2@cluster0.gxwuk.mongodb.net/SMS-New?retryWrites=true&w=majority&appName=Cluster0'
  )
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + '-' + Date.now() + path.extname(file.originalname)
    );
  },
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Updated regex to include pdf
  const filetypes = /jpeg|jpg|png|gif|pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  // Check MIME type for PDF
  if (file.mimetype === 'application/pdf') {
    return cb(null, true);
  }

  // Check MIME type for images
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(
      'Error: Only images (jpeg, jpg, png, gif) and PDF files are allowed!',
      false
    );
  }
};

// Initialize Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  // No file size limit (remove the `limits` option)
});

// Middleware
// const authMiddleware = async (req, res, next) => {
//   const token = req.headers.authorization?.split(' ')[1];
//   if (!token) return res.status(401).json({ message: 'No token provided' });
//   try {
//     const decoded = jwt.verify(
//       token,
//       process.env.JWT_SECRET || 'your-secret-key'
//     );
//     const user = await User.findById(decoded.userId).populate(
//       'branchId',
//       'status'
//     );
//     if (!user) return res.status(401).json({ message: 'User not found' });
//     req.user = {
//       userId: user._id,
//       role: user.role,
//       branchId: user.branchId?._id,
//     };
//     next();
//   } catch (error) {
//     res.status(401).json({ message: 'Invalid token' });
//   }
// };

// const authMiddleware = async (req, res, next) => {
//   const token = req.headers.authorization?.split(' ')[1];
//   console.log('Token received:', token);
//   if (!token) return res.status(401).json({ message: 'No token provided' });

//   try {
//     const decoded = jwt.verify(
//       token,
//       process.env.JWT_SECRET || 'your-secret-key'
//     );
//     console.log('Decoded token:', decoded);
//     const user = await User.findById(decoded.userId).select('-password');
//     if (!user) return res.status(401).json({ message: 'User not found' });

//     // Check user status
//     if (user.status === 'inactive') {
//       return res.status(403).json({ message: 'Your account is inactive' });
//     }

//     // Check branch status if branchId exists (skip for admins and principals)
//     if (user.branchId && user.role !== 'admin' && user.role !== 'principal') {
//       const branch = await Branch.findById(user.branchId);
//       if (branch && branch.status === 'inactive') {
//         return res
//           .status(403)
//           .json({ message: 'Your branch is inactive, access denied' });
//       }
//     }

//     // Attach user info to request, including email
//     req.user = {
//       userId: user._id,
//       email: user.email, // Add email here
//       role: user.role,
//       branchId: user.branchId || null,
//     };
//     console.log('Authenticated user:', req.user);

//     next();
//   } catch (error) {
//     console.error('Token verification error:', error.message);
//     res.status(401).json({ message: 'Invalid token or server error' });
//   }
// };

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  // console.log("Token received:", token);
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    // console.log("Decoded token:", decoded);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });

    // Check user status
    if (user.status === "inactive") {
      return res.status(403).json({ message: "Your account is inactive" });
    }

    // Check branch status if branchId exists (skip for admins and principals)
    if (user.branchId && user.role !== "admin" && user.role !== "principal") {
      const branch = await Branch.findById(user.branchId);
      if (branch && branch.status === "inactive") {
        return res
          .status(403)
          .json({ message: "Your branch is inactive, access denied" });
      }
    }

    // Attach user info to request, including email
    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      branchId: user.branchId || null,
      children: user.role === "parent" ? user.children : undefined, // Add children for parents
    };
    // console.log("Authenticated user:", req.user);

    next();
  } catch (error) {
    // console.error("Token verification error:", error.message);
    res.status(401).json({ message: "Invalid token or server error" });
  }
};

const restrictToAdmin = (req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Access denied' });
  next();
};
const restrictToAdminOrPrincipal = (req, res, next) => {
  if (!['admin', 'principal'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Middleware to restrict access based on role
const restrictAccess = (req, res, next) => {
  if (
    !['teacher', 'principal', 'admin', 'student', 'parent', "driver"].includes(
      req.user.role
    )
  ) {
    return res
      .status(403)
      .json({ message: 'Access denied. Insufficient permissions.' });
  }
  next();
};

const restrictToTeacherOrPrincipal = (req, res, next) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'principal') {
    return res
      .status(403)
      .json({ message: 'Access denied. Teachers and Principals only.' });
  }
  next();
};

app.get(
  '/attendanceStatus/:email',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { email } = req.params;
      // console.log('Fetching attendance status for:', email);

      if (!email) {
        return res.status(400).json({ message: 'Teacher email is required' });
      }

      if (req.user.role === 'teacher' && req.user.email !== email) {
        return res.status(403).json({
          message: 'Access denied. You can only access your own class data.',
        });
      }

      const teacher = await Teacher.findOne({ email });
      // console.log('Teacher found:', teacher);
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found.' });
      }

      const { classTeacherFor: className, section } = teacher;
      // console.log('Class and section:', { className, section });
      if (!className || !section) {
        return res.status(400).json({
          message: 'Class and section not assigned to this teacher.',
        });
      }

      const query = req.user.branchId
        ? { className, section, branchId: req.user.branchId }
        : { className, section };
      // console.log('Student query:', query);

      const students = await Student.find(query)
        .select('rollNumber admissionNo name')
        .sort({ rollNumber: 1 });
      // console.log('Students found:', students);

      if (!students || students.length === 0) {
        return res
          .status(404)
          .json({ message: 'No students found for this class and section.' });
      }

      const todayDate = new Date().toISOString().split('T')[0];
      const attendanceQuery = req.user.branchId
        ? { teacherEmail: email, branchId: req.user.branchId }
        : { teacherEmail: email };
      // console.log('Attendance query:', attendanceQuery);

      const existingAttendance = await Attendance.findOne(attendanceQuery);
      // console.log('Existing attendance:', existingAttendance);
      let isSubmittedToday = false;

      if (existingAttendance) {
        isSubmittedToday = existingAttendance.attendance.some(
          (att) => att.date === todayDate
        );
      }

      res.status(200).json({
        students,
        isSubmittedToday,
      });
    } catch (error) {
      // console.error('Error fetching students for attendance:', error.message);
      res
        .status(500)
        .json({ message: 'Server error. Please try again later.' });
    }
  }
);

// GET /teacher-attendance/:email - Fetch teacher's attendance records
app.get(
  '/teacher-attendance/:email',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { email } = req.params;
      // console.log('📢 Fetching attendance for teacher:', email);

      if (!email) {
        return res
          .status(400)
          .json({ success: false, message: 'Teacher email is required' });
      }

      if (req.user.role === 'teacher' && req.user.email !== email) {
        return res.status(403).json({
          success: false,
          message:
            'Access denied. You can only view your own attendance records.',
        });
      }

      const query = req.user.branchId
        ? { teacherEmail: email, branchId: req.user.branchId }
        : { teacherEmail: email };

      const attendanceRecords = await Attendance.findOne(query);
      if (!attendanceRecords || attendanceRecords.attendance.length === 0) {
        // console.log('⚠️ No attendance records found for teacher:', email);
        return res
          .status(404)
          .json({ success: false, message: 'No attendance records found' });
      }

      // console.log('✅ Attendance Records Found:', attendanceRecords.attendance);
      res.json({ success: true, records: attendanceRecords.attendance });
    } catch (err) {
      // console.error('❌ Error fetching attendance:', err);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message,
      });
    }
  }
);
// POST /attendance - Submit or update attendance
app.post('/attendance', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { teacherEmail, attendanceRecords } = req.body;

    if (
      !teacherEmail ||
      !attendanceRecords ||
      !Array.isArray(attendanceRecords)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Teacher email and valid attendance records are required.',
      });
    }

    // Restrict teachers to their own data
    if (req.user.role === 'teacher' && req.user.email !== teacherEmail) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only submit attendance for yourself.',
      });
    }

    // Find the teacher
    const teacher = await Teacher.findOne({ email: teacherEmail });
    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: 'Teacher not found.' });
    }

    const { classTeacherFor: className, section } = teacher;
    if (!className || !section) {
      return res.status(400).json({
        success: false,
        message: 'Class and section not assigned to this teacher.',
      });
    }

    // Validate branchId if applicable
    if (
      req.user.branchId &&
      teacher.branchId?.toString() !== req.user.branchId?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Teacher does not belong to your branch.',
      });
    }

    // Get today's date
    const todayDate = new Date().toISOString().split('T')[0];

    // Retrieve student IDs based on admission numbers
    const admissionNumbers = attendanceRecords.map(
      (record) => record.admissionNo
    );
    const studentQuery = req.user.branchId
      ? { admissionNo: { $in: admissionNumbers }, branchId: req.user.branchId }
      : { admissionNo: { $in: admissionNumbers } };
    const students = await Student.find(studentQuery);

    // Map student admission numbers to student IDs
    const studentMap = {};
    students.forEach((student) => {
      studentMap[student.admissionNo] = student._id;
    });

    // Update attendance records with student IDs
    const updatedAttendanceRecords = attendanceRecords.map((record) => {
      if (!record.admissionNo || !record.attendanceStatus) {
        throw new Error(
          'Each attendance record must include admissionNo and attendanceStatus.'
        );
      }
      return {
        studentId: studentMap[record.admissionNo] || null,
        rollNumber: record.rollNumber || '',
        admissionNo: record.admissionNo,
        name: record.name || '',
        attendanceStatus: record.attendanceStatus,
        reason: record.reason || '',
      };
    });

    // Check for missing student IDs
    const missingStudents = updatedAttendanceRecords.filter(
      (r) => !r.studentId
    );
    if (missingStudents.length > 0) {
      // console.log(
      //   '⚠️ Students not found for admission numbers:',
      //   missingStudents.map((r) => r.admissionNo)
      // );
      return res.status(400).json({
        success: false,
        message: 'Some students not found for the provided admission numbers.',
        missing: missingStudents.map((r) => r.admissionNo),
      });
    }

    // Build query for existing attendance
    const attendanceQuery = req.user.branchId
      ? { teacherEmail, branchId: req.user.branchId }
      : { teacherEmail };

    let existingAttendanceRecord = await Attendance.findOne(attendanceQuery);

    if (existingAttendanceRecord) {
      let todayAttendance = existingAttendanceRecord.attendance.find(
        (att) => att.date === todayDate
      );

      if (todayAttendance) {
        // Update existing attendance
        updatedAttendanceRecords.forEach((record) => {
          const studentIndex = todayAttendance.attendanceRecords.findIndex(
            (r) => r.admissionNo === record.admissionNo
          );
          if (studentIndex !== -1) {
            todayAttendance.attendanceRecords[studentIndex] = record; // Update
          } else {
            todayAttendance.attendanceRecords.push(record); // Add new
          }
        });
      } else {
        // Add new attendance entry for today
        existingAttendanceRecord.attendance.push({
          date: todayDate,
          attendanceRecords: updatedAttendanceRecords,
        });
      }
      await existingAttendanceRecord.save();
    } else {
      // Create new attendance document
      const newAttendanceRecord = new Attendance({
        teacherId: teacher._id,
        teacherEmail,
        className,
        section,
        branchId: req.user.branchId || null,
        attendance: [
          { date: todayDate, attendanceRecords: updatedAttendanceRecords },
        ],
      });
      await newAttendanceRecord.save();
    }

    res
      .status(200)
      .json({ success: true, message: 'Attendance updated successfully!' });
  } catch (error) {
    // console.error('Error saving attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save attendance.',
      error: error.message,
    });
  }
});

// GET: Fetch attendance records by date
app.get(
  '/attendance/:teacherEmail/:date',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { teacherEmail, date } = req.params;

      if (!teacherEmail || !date) {
        return res
          .status(400)
          .json({ message: 'Teacher email and date are required.' });
      }

      // Teachers can only access their own records, while admins/principals can access any
      if (req.user.role === 'teacher' && req.user.email !== teacherEmail) {
        return res.status(403).json({
          message:
            'Access denied. You can only access your own attendance records.',
        });
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res
          .status(400)
          .json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
      }

      const query = req.user.branchId
        ? { teacherEmail, branchId: req.user.branchId }
        : { teacherEmail };

      const attendanceRecords = await Attendance.findOne(query);

      if (
        !attendanceRecords ||
        !attendanceRecords.attendance ||
        attendanceRecords.attendance.length === 0
      ) {
        return res
          .status(404)
          .json({ message: 'No attendance records found.' });
      }

      const filteredRecords = attendanceRecords.attendance.filter(
        (record) => record.date === date
      );

      if (filteredRecords.length === 0) {
        return res
          .status(404)
          .json({ message: `No attendance records found for ${date}.` });
      }

      res.status(200).json(filteredRecords);
    } catch (error) {
      // console.error('Error fetching attendance by date:', error.message);
      res
        .status(500)
        .json({ message: 'Server error. Please try again later.' });
    }
  }
);

// GET /student-attendance/:studentId - Fetch attendance records for a student
app.get('/student-attendance/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Validate studentId format
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    // Retrieve the student document to get class and section
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const { className, section } = student;
    if (!className || !section) {
      return res
        .status(400)
        .json({ message: "Student's class or section is missing" });
    }

    // Query Attendance documents that match the student's class and section
    const attendanceDocs = await Attendance.find({
      className: className,
      section: section,
    }).select('attendance');

    if (!attendanceDocs || attendanceDocs.length === 0) {
      return res.status(404).json({
        message: 'No attendance records found for this class/section',
      });
    }

    // Filter through each Attendance document's nested attendance array
    // to extract records matching the given studentId
    let studentAttendance = [];
    attendanceDocs.forEach((doc) => {
      doc.attendance.forEach((entry) => {
        entry.attendanceRecords.forEach((record) => {
          if (record.studentId.toString() === studentId) {
            studentAttendance.push({
              date: entry.date,
              rollNumber: record.rollNumber,
              admissionNo: record.admissionNo,
              name: record.name,
              attendanceStatus: record.attendanceStatus,
              reason: record.reason,
            });
          }
        });
      });
    });

    if (studentAttendance.length === 0) {
      return res
        .status(404)
        .json({ message: 'No attendance records found for this student' });
    }

    // console.log(
    //   '📌 Fetched Attendance for Student',
    //   studentId,
    //   ':',
    //   studentAttendance
    // );
    res.status(200).json({ attendanceRecords: studentAttendance });
  } catch (error) {
    // console.error('❌ Error fetching student attendance:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// Events
app.post('/api/events', async (req, res) => {
  try {
    const { name, type, date, img, volunteers, participants } = req.body;

    if (!name || !type || !date) {
      return res
        .status(400)
        .json({ message: 'Name, Type, and Date are required.' });
    }

    const newEvent = new Event({
      name,
      type,
      date,
      img,
      volunteers,
      participants,
    });

    const savedEvent = await newEvent.save(); // Ensure it saves successfully

    res
      .status(201)
      .json({ message: 'Event created successfully', event: savedEvent });
  } catch (error) {
    // console.error('Server error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve static files

const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('✅ uploads folder created');
}

// GET /api/driver/me - Fetch driver details by email query parameter

app.get('/api/driver/me', async (req, res) => {
  // console.log('Request received for /api/driver/me');
  try {
    const { email } = req.query; // e.g., /api/driver/me?email=test@example.com
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email query parameter is required (e.g., ?email=test@example.com)',
      });
    }

    // Fetch driver profile by email
    const driverProfile = await DriverProfile.findOne({ email });
    if (!driverProfile) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found for the provided email',
      });
    }

    // Construct driver details (mock user data since no auth is used)
    const driverDetails = {
      user: {
        name: driverProfile.driverName || 'Unknown Driver',
        email: driverProfile.email,
        role: 'driver', // Hardcoded since no auth
        branchId: driverProfile.branchId || 'Unknown',
      },
      driverProfile: {
        driverName: driverProfile.driverName,
        phoneNumber: driverProfile.phoneNumber,
        fromLocation: driverProfile.fromLocation,
        toLocation: driverProfile.toLocation,
        busNumber: driverProfile.busNumber,
        profileImage: driverProfile.profileImage,
      },
    };

    res.status(200).json({
      success: true,
      message: 'Driver details fetched successfully',
      data: driverDetails,
    });
  } catch (error) {
    // console.error('Error fetching driver details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: error.message,
    });
  }
});

// GET all driver profiles (authenticated, filtered by branch)
app.get(
  '/driver-profiles',
  authMiddleware,
  // restrictToAdminOrPrincipal,
  restrictAccess,
  async (req, res) => {
    try {
      const branchId = req.user.branchId; // From decoded JWT
      const query = req.user.role === 'principal' ? { branchId } : {};
      const drivers = await DriverProfile.find(query).sort({ _id: -1 }); // Latest first
      res.status(200).json(drivers);
    } catch (error) {
      // console.error('Error fetching driver profiles:', error);
      res
        .status(500)
        .json({ message: 'Server error. Please try again later.' });
    }
  }
);

// POST a new driver profile (authenticated, auto-add branchId)
// POST a new driver profile
app.post(
  '/driver-profile',
  authMiddleware,
  restrictToAdminOrPrincipal,
  upload.single('profileImage'),
  async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { driverName, phoneNumber, fromLocation, toLocation, busNumber, email, password } = req.body;
      const branchId = req.user.branchId;

      if (!driverName || !phoneNumber || !fromLocation || !toLocation || !busNumber || !email || !password) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'All fields are required!' });
      }

      // if (!/^[6789]\d{9}$/.test(phoneNumber)) {
      //   await session.abortTransaction();
      //   session.endSession();
      //   return res.status(400).json({ message: 'Invalid phone number format!' });
      // }

      // if (fromLocation.trim().toLowerCase() === toLocation.trim().toLowerCase()) {
      //   await session.abortTransaction();
      //   session.endSession();
      //   return res.status(400).json({ message: 'From and To locations cannot be the same!' });
      // }

      // if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z-]+\.[a-zA-Z]{2,}$/.test(email)) {
      //   await session.abortTransaction();
      //   session.endSession();
      //   return res.status(400).json({ message: 'Invalid email format!' });
      // }

      // if (!/^(?=.*[A-Z])(?=.*[!@#$%^&*]).+$/.test(password)) {
      //   await session.abortTransaction();
      //   session.endSession();
      //   return res.status(400).json({ message: 'Password must contain at least one uppercase letter and one special character!' });
      // }

      const existingDriver = await DriverProfile.findOne({ phoneNumber, branchId });
      if (existingDriver) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Phone number already exists in this branch!' });
      }

      const existingEmail = await DriverProfile.findOne({ email });
      if (existingEmail) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Email already exists in driver profiles!' });
      }

      const existingUserEmail = await User.findOne({ email });
      if (existingUserEmail) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Email already exists in users!' });
      }

      // const existingRoute = await DriverProfile.findOne({ fromLocation, toLocation, branchId });
      // if (existingRoute) {
      //   await session.abortTransaction();
      //   session.endSession();
      //   return res.status(400).json({ message: 'This route (From-To) already exists in this branch!' });
      // }

      const profileImage = req.file ? `/uploads/${req.file.filename}` : '/uploads/default-driver.png';

      const newDriver = new DriverProfile({
        driverName,
        phoneNumber,
        fromLocation,
        toLocation,
        busNumber,
        email,
        password,
        profileImage,
        branchId,
      });
      await newDriver.save({ session });

      const newUser = new User({
        name: driverName,
        email,
        password,
        role: 'driver',
        roleId: newDriver._id,
        roleModel: 'DriverProfile',
        branchId,
      });
      await newUser.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({ message: 'Driver profile and user created successfully!', newDriver });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      // console.error('Error saving driver profile and user:', error);
      if (error.code === 11000) {
        return res.status(400).json({
          message: `Duplicate ${Object.keys(error.keyPattern)[0]} detected`,
        });
      }
      res.status(500).json({ message: 'Server error. Please try again later.', error: error.message });
    }
  }
);




// PUT update a driver profile (with User sync)


app.put(
  '/driver-profile/:id',
  authMiddleware,
  restrictToAdminOrPrincipal,
  upload.single('profileImage'),
  async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const { driverName, phoneNumber, fromLocation, toLocation, busNumber, email, password } = req.body;
      const branchId = req.user.branchId;

      const existingDriver = await DriverProfile.findById(id);
      if (!existingDriver) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Driver profile not found!' });
      }

      if (req.user.role === 'principal' && existingDriver.branchId.toString() !== branchId.toString()) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({ message: 'Access denied: Driver belongs to a different branch' });
      }

      if (!driverName || !phoneNumber || !fromLocation || !toLocation || !busNumber || !email) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'All fields except password are required!' });
      }

      if (!/^[6789]\d{9}$/.test(phoneNumber)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Invalid phone number format!' });
      }

      if (fromLocation.trim().toLowerCase() === toLocation.trim().toLowerCase()) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'From and To locations cannot be the same!' });
      }

      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z-]+\.[a-zA-Z]{2,}$/.test(email)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Invalid email format!' });
      }

      if (password && !/^(?=.*[A-Z])(?=.*[!@#$%^&*]).+$/.test(password)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Password must contain at least one uppercase letter and one special character!' });
      }

      const phoneExists = await DriverProfile.findOne({ phoneNumber, branchId, _id: { $ne: id } });
      if (phoneExists) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Phone number already exists in this branch!' });
      }

      const emailExistsInDriver = await DriverProfile.findOne({ email, _id: { $ne: id } });
      if (emailExistsInDriver) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Email already exists in driver profiles!' });
      }

      const emailExistsInUser = await User.findOne({ email, roleId: { $ne: id } });
      if (emailExistsInUser) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Email already exists in users!' });
      }

      // const routeExists = await DriverProfile.findOne({ fromLocation, toLocation, branchId, _id: { $ne: id } });
      // if (routeExists) {
      //   await session.abortTransaction();
      //   session.endSession();
      //   return res.status(400).json({ message: 'This route (From-To) already exists in this branch!' });
      // }

      const profileImage = req.file ? `/uploads/${req.file.filename}` : existingDriver.profileImage;

      // Hash the new password before updating
      let hashedPassword = existingDriver.password; // Keep existing password if not updated
      if (password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
      }

      const updateData = {
        driverName,
        phoneNumber,
        fromLocation,
        toLocation,
        busNumber,
        email,
        profileImage,
        branchId,
        password: hashedPassword, // Save hashed password
      };

      const updatedDriver = await DriverProfile.findByIdAndUpdate(id, updateData, { new: true, session });

      // Sync with User schema
      const userUpdateData = {
        name: driverName,
        email,
        password: hashedPassword, // Ensure user password is also updated
      };

      const updatedUser = await User.findOneAndUpdate(
        { roleId: id, role: 'driver' },
        userUpdateData,
        { new: true, session }
      );

      if (!updatedUser) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Corresponding user not found!' });
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({ message: 'Driver profile and user updated successfully!', updatedDriver });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      // console.error('Error updating driver profile and user:', error);
      if (error.code === 11000) {
        return res.status(400).json({
          message: `Duplicate ${Object.keys(error.keyPattern)[0]} detected`,
        });
      }
      res.status(500).json({ message: 'Server error. Please try again later.', error: error.message });
    }
  }
);


// DELETE a driver profile (authenticated, branchId check)
app.delete(
  '/driver-profile/:id',
  authMiddleware,
  restrictToAdminOrPrincipal,
  async (req, res) => {
    try {
      const { id } = req.params;
      const branchId = req.user.branchId;

      // Find the driver profile
      const existingDriver = await DriverProfile.findById(id);
      if (!existingDriver) {
        return res.status(404).json({ message: 'Driver profile not found!' });
      }

      // Check if principal has permission to delete (only their branch)
      if (
        req.user.role === 'principal' &&
        existingDriver.branchId.toString() !== branchId.toString()
      ) {
        return res.status(403).json({
          message: 'Access denied: Driver belongs to a different branch',
        });
      }

      // Delete the driver profile from DriverProfile table
      await DriverProfile.findByIdAndDelete(id);

      // Delete the associated user from User table
      const deletedUser = await User.findOneAndDelete({ email: existingDriver.email });

      res.status(200).json({ 
        message: 'Driver profile and user account deleted successfully!',
        deletedUser: deletedUser ? deletedUser.email : "No associated user found"
      });

    } catch (error) {
      // console.error('Error deleting driver profile:', error);
      res.status(500).json({
        message: 'Server error. Please try again later.',
        error: error.message,
      });
    }
  }
);

app.get('/driver-profiles', async (req, res) => {
  try {
    const drivers = await Driver.find(); // Fetch from MongoDB
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching drivers' });
  }
});

// Store bus driver details



// bus capacity update
app.get('/bus-seats/:busNumber', async (req, res) => {
  try {
    const { busNumber } = req.params;
    const bus = await BusModel.findOne({ busNumber }); // Fetch bus by number

    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const filledSeats = await BookingModel.countDocuments({ busNumber }); // Count booked seats
    const availableSeats = bus.busCapacity - filledSeats;

    res.json({ totalSeats: bus.busCapacity, availableSeats });
  } catch (error) {
    // console.error('Error fetching seat data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Update bus capacity when a student is assigned
app.post('/assign-student', async (req, res) => {
  try {
    const { busNumber } = req.body;

    // Find the driver based on the busNumber
    const driver = await DriverProfile.findOne({ busNumber });

    if (!driver) {
      return res.status(404).json({ message: 'Bus not found!' });
    }

    // Ensure we don't exceed total capacity
    if (driver.currentCapacity >= driver.busCapacity) {
      return res.status(400).json({ message: 'Bus is already full!' });
    }

    // Increase the current capacity by 1
    driver.currentCapacity += 1;
    await driver.save();

    return res
      .status(200)
      .json({ message: 'Student assigned successfully!', driver });
  } catch (error) {
    // console.error('Error assigning student:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET all timetables
app.get(
  '/timetables',
  authMiddleware,
  restrictToAdminOrPrincipal,
  async (req, res) => {
    try {
      const query =
        req.user.role === 'principal' ? { branchId: req.user.branchId } : {};
      const timetables = await Timetable.find(query);
      res.json(timetables);
    } catch (error) {
      // console.error('Error fetching timetables:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// GET a specific timetable
app.get(
  '/timetables/:id',
  authMiddleware,
  restrictToAdminOrPrincipal,
  async (req, res) => {
    try {
      const timetable = await Timetable.findById(req.params.id);
      if (!timetable) {
        return res.status(404).json({ message: 'Timetable not found' });
      }
      if (
        req.user.role === 'principal' &&
        timetable.branchId.toString() !== req.user.branchId.toString()
      ) {
        return res.status(403).json({ message: 'Access denied' });
      }
      res.json(timetable);
    } catch (error) {
      // console.error('Error fetching timetable:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// POST new timetable
app.post(
  '/timetables',
  authMiddleware,
  restrictToAdminOrPrincipal,
  async (req, res) => {
    try {
      const newTimetable = new Timetable({
        ...req.body,
        branchId: req.user.role === 'principal' ? req.user.branchId : null,
      });
      await newTimetable.save();
      res.status(201).json(newTimetable);
    } catch (error) {
      // console.error('Error creating timetable:', error);
      res.status(400).json({ message: 'Error creating timetable' });
    }
  }
);

// PUT update timetable
app.put(
  '/timetables/:id',
  authMiddleware,
  restrictToAdminOrPrincipal,
  async (req, res) => {
    try {
      const timetable = await Timetable.findById(req.params.id);
      if (!timetable)
        return res.status(404).json({ message: 'Timetable not found' });
      if (
        req.user.role === 'principal' &&
        timetable.branchId.toString() !== req.user.branchId.toString()
      ) {
        return res.status(403).json({ message: 'Access denied' });
      }
      const updatedTimetable = await Timetable.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      res.json(updatedTimetable);
    } catch (error) {
      // console.error('Error updating timetable:', error);
      res.status(400).json({ message: 'Error updating timetable' });
    }
  }
);

// DELETE timetable
app.delete(
  '/timetables/:id',
  authMiddleware,
  restrictToAdminOrPrincipal,
  async (req, res) => {
    try {
      const timetable = await Timetable.findById(req.params.id);
      if (!timetable)
        return res.status(404).json({ message: 'Timetable not found' });
      if (
        req.user.role === 'principal' &&
        timetable.branchId.toString() !== req.user.branchId.toString()
      ) {
        return res.status(403).json({ message: 'Access denied' });
      }
      await Timetable.findByIdAndDelete(req.params.id);
      res.status(204).send();
    } catch (error) {
      // console.error('Error deleting timetable:', error);
      res.status(500).json({ message: 'Error deleting timetable' });
    }
  }
);

// Endpoint to save the timetable

// Endpoint to save timetable and timeSlots (POST /studentTimeTable)
app.post(
  '/studentTimeTable',
  authMiddleware,
  restrictAccess, // Only teachers or admins can save/update
  async (req, res) => {
    const { class: className, day, schedule, timeSlots } = req.body;
    const branchId = req.user.branchId; // Assuming authMiddleware adds user info with branchId

    if (!className || !day || !Array.isArray(schedule)) {
      return res.status(400).json({ message: 'Invalid input' });
    }

    try {
      const existingEntry = await Periodtimetable.findOne({ class: className });

      if (existingEntry) {
        existingEntry.schedule[day] = schedule;
        if (timeSlots) existingEntry.timeSlots = timeSlots; // Update timeSlots if provided
        await existingEntry.save();
        return res.status(200).json({ message: 'Timetable updated successfully!', data: existingEntry });
      } else {
        const newSchedule = {
          Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: []
        };
        newSchedule[day] = schedule;
        const timetableEntry = new Periodtimetable({
          class: className,
          schedule: newSchedule,
          timeSlots: timeSlots || [
            "9:00 - 9:45", "9:45 - 10:30", "10:30 - 10:45", "10:45 - 11:30",
            "11:30 - 12:15", "12:15 - 1:15", "1:15 - 2:00", "2:00 - 2:45",
            "2:45 - 3:00", "3:00 - 3:45", "3:45 - 4:30"
          ],
          branchId // Use branchId from req.user
        });
        await timetableEntry.save();
        return res.status(200).json({ message: 'Timetable saved successfully!', data: timetableEntry });
      }
    } catch (error) {
      // console.error('Error saving timetable:', error);
      res.status(500).json({ message: 'Error saving timetable' });
    }
  }
);

// Endpoint to get timetable including timeSlots (GET /studentTimeTable/:className)
app.get(
  '/studentTimeTable/:className',
  authMiddleware,
  restrictAccess, // Students, parents, teachers, admins can view
  async (req, res) => {
    const className = req.params.className;
    try {
      const classTimetable = await Periodtimetable.findOne({ class: className });
      if (!classTimetable) {
        return res.status(404).json({ message: 'Timetable not found for this class' });
      }
      res.status(200).json({
        schedule: classTimetable.schedule,
        timeSlots: classTimetable.timeSlots
      });
    } catch (error) {
      // console.error('Error fetching timetable:', error);
      res.status(500).json({ message: 'Error fetching timetable' });
    }
  }
);

// Initial fee structure data
const initialFeeStructure = [
  { class: 'Nursery', tuition: 15000, library: 2000, transport: 5000 },
  { class: 'LKG', tuition: 16000, library: 2000, transport: 5000 },
  { class: 'UKG', tuition: 17000, library: 2500, transport: 5000 },
  { class: '1st Grade', tuition: 18000, library: 2500, transport: 5500 },
  { class: '2nd Grade', tuition: 19000, library: 2500, transport: 5500 },
  { class: '3rd Grade', tuition: 20000, library: 3000, transport: 6000 },
  { class: '4th Grade', tuition: 21000, library: 3000, transport: 6000 },
  { class: '5th Grade', tuition: 22000, library: 3500, transport: 6500 },
  { class: '6th Grade', tuition: 23000, library: 3500, transport: 6500 },
  { class: '7th Grade', tuition: 24000, library: 4000, transport: 7000 },
  { class: '8th Grade', tuition: 25000, library: 4000, transport: 7000 },
  { class: '9th Grade', tuition: 26000, library: 4500, transport: 7500 },
  { class: '10th Grade', tuition: 27000, library: 4500, transport: 7500 },
];

// Insert initial fee structure
const insertInitialFees = async (req, res) => {
  try {
    const branchId = req.user.branchId;

    // Check if fee structure exists for this branch
    const existingFees = await Fee.find({ branchId });
    
    if (existingFees.length > 0) {
      // console.log('Classes already exists for this branch in MongoDB.');
      return res
        .status(200)
        .json({ 
          message: 'Classes already exists for this branch.',
          data: existingFees 
        });
    }

    // Prepare fee data with branchId
    const feeDataWithBranchId = initialFeeStructure.map((fee) => ({
      ...fee,
      branchId,
      isInitial: true, // Adding flag to mark initial data
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Insert initial fee structure
    const insertedFees = await Fee.insertMany(feeDataWithBranchId);
    // console.log('Initial fee structure with branchId inserted into MongoDB!');
    
    res.status(201).json({ 
      message: 'Classes inserted successfully.',
      data: insertedFees 
    });
  } catch (err) {
    // console.error('Error inserting initial data:', err);
    res.status(500).json({ 
      message: 'Failed to insert Classes.',
      error: err.message 
    });
  }
};

// Route to insert fees, protected by authMiddleware
app.post('/api/fees/initialize', authMiddleware, insertInitialFees);
// GET all fee structures (authenticated, no branch filter)
app.get(
  '/fees',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      // console.log('Fetching all fees (no branch filter)');
      const fees = await Fee.find();
      // console.log('Fees found:', fees);
      res.status(200).json(fees);
    } catch (err) {
      // console.error('Error fetching fees:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT update fee structure (authenticated, no branch check)
app.put(
  '/fees/:id',
  authMiddleware,
  restrictToAdminOrPrincipal,
  async (req, res) => {
    try {
      const { tuition, library, transport } = req.body;

      // Validate required fields
      if (
        tuition === undefined ||
        library === undefined ||
        transport === undefined
      ) {
        return res.status(400).json({
          message: 'All fee fields (tuition, library, transport) are required',
        });
      }

      const existingFee = await Fee.findById(req.params.id);
      if (!existingFee) {
        return res.status(404).json({ message: 'Fee structure not found' });
      }

      const updatedFee = await Fee.findByIdAndUpdate(
        req.params.id,
        { tuition, library, transport }, // No branchId
        { new: true, runValidators: true }
      );

      res.status(200).json(updatedFee);
    } catch (err) {
      // console.error('Error updating fee:', err);
      if (err.name === 'ValidationError') {
        return res
          .status(400)
          .json({ message: Object.values(err.errors)[0].message });
      }
      res.status(500).json({ error: err.message });
    }
  }
);

// Initial hostel fee structure data (no branchId)
const initialHostelFeeStructure = [
  { class: 'Nursery', tuition: 15000, library: 2000, hostel: 10000 },
  { class: 'LKG', tuition: 16000, library: 2000, hostel: 11000 },
  { class: 'UKG', tuition: 17000, library: 2500, hostel: 12000 },
  { class: '1st Grade', tuition: 18000, library: 2500, hostel: 13000 },
  { class: '2nd Grade', tuition: 19000, library: 2500, hostel: 14000 },
  { class: '3rd Grade', tuition: 20000, library: 3000, hostel: 15000 },
  { class: '4th Grade', tuition: 21000, library: 3000, hostel: 16000 },
  { class: '5th Grade', tuition: 22000, library: 3500, hostel: 17000 },
  { class: '6th Grade', tuition: 23000, library: 3500, hostel: 18000 },
  { class: '7th Grade', tuition: 24000, library: 4000, hostel: 19000 },
  { class: '8th Grade', tuition: 25000, library: 4000, hostel: 20000 },
  { class: '9th Grade', tuition: 26000, library: 4500, hostel: 21000 },
  { class: '10th Grade', tuition: 27000, library: 4500, hostel: 22000 },
];

// Insert initial hostel fee data if not present
const insertInitialHostelFeeData = async () => {
  try {
    const count = await HostelFee.countDocuments();
    if (count === 0) {
      await HostelFee.insertMany(initialHostelFeeStructure);
      // console.log('Initial hostel fee structure inserted into MongoDB!');
    } else {
      // console.log('Hostel fee structure already exists in MongoDB.');
    }
  } catch (err) {
    // console.error('Error inserting initial hostel fee data:', err);
  }
};

insertInitialHostelFeeData();

// GET all hostel fee structures (authenticated, no branch filter)
app.get(
  '/api/hostelFees',
  authMiddleware,
  restrictToAdminOrPrincipal,
  async (req, res) => {
    try {
      // console.log('Fetching all hostel fees (no branch filter)');
      const fees = await HostelFee.find();
      // console.log('Hostel fees found:', fees);
      res.status(200).json(fees);
    } catch (err) {
      // console.error('Error fetching hostel fees:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT update hostel fee structure (authenticated, no branch check)
app.put(
  '/api/hostelFees/:id',
  authMiddleware,
  restrictToAdminOrPrincipal,
  async (req, res) => {
    try {
      const { tuition, library, hostel } = req.body;

      // Validate required fields
      if (
        tuition === undefined ||
        library === undefined ||
        hostel === undefined
      ) {
        return res.status(400).json({
          message: 'All fee fields (tuition, library, hostel) are required',
        });
      }

      const existingFee = await HostelFee.findById(req.params.id);
      if (!existingFee) {
        return res.status(404).json({ message: 'Hostel fee not found' });
      }

      const updatedFee = await HostelFee.findByIdAndUpdate(
        req.params.id,
        { tuition, library, hostel }, // No branchId
        { new: true, runValidators: true }
      );

      res.status(200).json(updatedFee);
    } catch (err) {
      // console.error('Error updating hostel fee:', err);
      if (err.name === 'ValidationError') {
        return res
          .status(400)
          .json({ message: Object.values(err.errors)[0].message });
      }
      res.status(500).json({ error: err.message });
    }
  }
);
//atttendance filter
app.get('/api/attendance/teacher-stats', async (req, res) => {
  const { teacherId, month, year } = req.query;
  try {
    const records = await Attendance.find({
      'attendanceRecords.teacherId': teacherId,
      date: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1),
      },
    });
    console.log('Found records:', records); // Debug log
    const presentCount = records.reduce((sum, record) => {
      const teacherRecord = record.attendanceRecords.find(r => r.teacherId === teacherId);
      return sum + (teacherRecord?.status === 'Present' ? 1 : 0);
    }, 0);
    const absentCount = records.reduce((sum, record) => {
      const teacherRecord = record.attendanceRecords.find(r => r.teacherId === teacherId);
      return sum + (teacherRecord?.status === 'Absent' ? 1 : 0);
    }, 0);
    res.json({ presentCount, absentCount });
  } catch (err) {
    console.error('Error fetching teacher stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

//grades

app.get(
  '/api/teacher/dashboard',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const email = req.user.email;
      const teacher = await Teacher.findOne({ email });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      const { classTeacherFor: className, section } = teacher;
      if (!className || !section) {
        return res
          .status(400)
          .json({ message: 'Class and section not assigned' });
      }

      const query = req.user.branchId
        ? { className, section, branchId: req.user.branchId }
        : { className, section };

      // Total students
      const totalStudents = await Student.countDocuments(query);

      // Total assignments
      const totalAssignments = await Assignment.countDocuments({
        teacherEmail: email,
        className,
        section,
      });

      // Attendance today
      const todayDate = new Date().toISOString().split('T')[0];
      const attendanceRecord = await Attendance.findOne({
        teacherEmail: email,
        'attendance.date': todayDate,
      });
      const attendanceToday = attendanceRecord
        ? attendanceRecord.attendance.find((att) => att.date === todayDate)
            ?.attendanceRecords.length || 0
        : 0;

      // Recent submissions (assuming Assignment has a submissions field)
      const recentSubmissions = await Assignment.find({
        teacherEmail: email,
        className,
        section,
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('title submittedBy submittedAt');

      res.status(200).json({
        stats: { totalStudents, totalAssignments, attendanceToday },
        recentSubmissions,
      });
    } catch (error) {
      // console.error('Error fetching dashboard data:', error.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

app.get(
  '/api/teacher/notifications/:email',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { email } = req.params;
      if (req.user.role === 'teacher' && req.user.email !== email) {
        return res.status(403).json({
          message: 'Access denied. You can only view your own notifications.',
        });
      }

      const notifications = await Notification.find({ recipientEmail: email }) // Assuming a Notification model
        .sort({ date: -1 })
        .limit(10);

      if (!notifications || notifications.length === 0) {
        return res.status(404).json({ message: 'No notifications found' });
      }

      res.status(200).json({ notifications });
    } catch (error) {
      // console.error('Error fetching notifications:', error.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Exam&Grade
// Get teacher details by email
// Get teacher details by email
app.get('/api/teachers/:email', authMiddleware, async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ email: req.params.email });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    res.json(teacher);
  } catch (error) {
    // console.error('Teacher Fetch Error:', error.message);
    res.status(500).json({ message: 'Server error fetching teacher' });
  }
});


// Get subjects by class and branch
app.get('/api/subjects/:className', authMiddleware, async (req, res) => {
  try {
    const { className } = req.params;
    const branchId = req.user.branchId;

    const subjectDoc = await Subject.findOne({ className, branchId });
    if (!subjectDoc) {
      return res.status(404).json({ message: 'Subjects not found for this class and branch' });
    }
    res.json({ subjects: subjectDoc.subjects });
  } catch (error) {
    // console.error('Subjects Fetch Error:', error.message);
    res.status(500).json({ message: 'Server error fetching subjects' });
  }
});

// Get exams by teacher email and branch
app.get('/api/exams/:email', authMiddleware, async (req, res) => {
  try {
    const { email } = req.params;
    const branchId = req.user.branchId;

    const exams = await Exam.find({ createdBy: email, branchId });
    res.json(exams);
  } catch (error) {
    // console.error('Exams Fetch Error:', error.message);
    res.status(500).json({ message: 'Server error fetching exams' });
  }
});

// Get students by teacher email and branch
app.get('/api/stu/:email', authMiddleware, async (req, res) => {
  try {
    const { email } = req.params;
    const branchId = req.user.branchId;

    const teacher = await Teacher.findOne({ email });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const classDoc = await Class.findOne({
      className: teacher.classTeacherFor,
      branchId,
    }).populate({
      path: 'sections.students',
      select: '_id admissionNo name',
    });

    if (!classDoc) {
      // console.log(`Class ${teacher.classTeacherFor} not found in branch ${branchId}`);
      return res.status(404).json({ message: 'Class not found' });
    }

    const section = classDoc.sections.find(s => s.sectionName === teacher.section);
    if (!section) return res.status(404).json({ message: 'Section not found' });

    const students = section.students.map(student => ({
      _id: student._id,
      admissionNo: student.admissionNo,
      name: student.name,
    }));
    res.json(students);
  } catch (error) {
    // console.error('Students Fetch Error:', error.message);
    res.status(500).json({ message: 'Server error fetching students' });
  }
});

// Create a new exam
app.post('/api/exams', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const examData = {
      ...req.body,
      branchId: req.user.branchId,
    };
    const exam = new Exam(examData);
    const savedExam = await exam.save();
    // console.log('Created Exam:', savedExam);
    res.status(201).json({ data: savedExam });
  } catch (error) {
    // console.error('Exam Creation Error:', error.message);
    res.status(400).json({ message: 'Failed to create exam', error: error.message });
  }
});

// Delete an exam
app.delete('/api/exams/:examId', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({
      _id: req.params.examId,
      branchId: req.user.branchId,
    });
    if (!exam) return res.status(404).json({ message: 'Exam not found in this branch' });
    res.json({ message: 'Exam deleted' });
  } catch (error) {
    // console.error('Exam Deletion Error:', error.message);
    res.status(500).json({ message: 'Server error deleting exam' });
  }
});

// Grade and Status calculation functions
function getGrade(marks, maxMarks) {
  const percentage = (marks / maxMarks) * 100;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 68) return 'B';
  if (percentage >= 55) return 'C';
  if (percentage >= 30) return 'D';
  return 'F';
}

function getStatus(marks, maxMarks) {
  return marks < maxMarks * 0.5 ? 'Failed' : 'Passed';
}

// Save marks for a student
app.post('/api/saveMarks', authMiddleware, async (req, res) => {
  const { studentId, examId, className, section, marks } = req.body; // Changed examType to examId
  const branchId = req.user.branchId;
  const createdBy = req.user.email; // Teacher email from auth middleware

  try {
    // console.log('Received Payload:', { studentId, examId, className, section, marks });

    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ message: 'Invalid studentId or examId format' });
    }
    if (!className || !section || !Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({ message: 'Invalid className, section, or marks data' });
    }

    const student = await Student.findOne({ _id: studentId, branchId });
    if (!student) {
      return res.status(404).json({ message: 'Student not found in this branch' });
    }

    // Find exam by _id, className, section, and createdBy
    const exam = await Exam.findOne({ 
      _id: examId, 
      className, 
      section, 
      createdBy, 
      branchId 
    });
    if (!exam) {
      return res.status(404).json({ 
        message: 'Exam not found with the specified ID, class, section, and teacher' 
      });
    }

    // Filter marks to only include subjects from exam.subjects
    const examSubjects = new Set(exam.subjects);
    const filteredMarks = marks.filter(mark => examSubjects.has(mark.subject));
    if (filteredMarks.length === 0) {
      return res.status(400).json({ message: 'No valid subjects provided for this exam' });
    }

    // Log excluded subjects
    const submittedSubjects = marks.map(m => m.subject);
    const excludedSubjects = submittedSubjects.filter(sub => !examSubjects.has(sub));
    if (excludedSubjects.length > 0) {
      // console.log('Excluded Subjects:', excludedSubjects);
    }

    // Validate marks values and ensure all required fields are present
    const updatedMarks = filteredMarks.map(mark => {
      if (typeof mark.marks !== 'number' || mark.marks < 0 || mark.marks > exam.maxMarks) {
        throw new Error(`Invalid marks for ${mark.subject}: must be between 0 and ${exam.maxMarks}`);
      }
      return {
        subject: mark.subject,
        marks: mark.marks,
        grade: getGrade(mark.marks, exam.maxMarks),
        status: getStatus(mark.marks, exam.maxMarks),
      };
    });

    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const studentMarksIndex = exam.marks.findIndex(m => m.studentId.toString() === studentObjectId.toString());

    if (studentMarksIndex > -1) {
      exam.marks[studentMarksIndex].marks = updatedMarks;
    } else {
      exam.marks.push({ studentId: studentObjectId, marks: updatedMarks });
    }

    const savedExam = await exam.save();
    // console.log('Updated Exam After Save:', savedExam);
    res.status(200).json({ message: 'Marks saved successfully' });
  } catch (error) {
    // console.error('Save Marks Error:', error.message);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate entry for student marks in this exam' });
    }
    res.status(500).json({ message: 'Server error saving marks', error: error.message });
  }
});

// Get marks for a student
app.get('/api/getMarks/:studentId/:examId', authMiddleware, async (req, res) => {
  const { studentId, examId } = req.params;
  const branchId = req.user.branchId;

  try {
    const exam = await Exam.findOne({ _id: examId, branchId });
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found in this branch' });
    }

    const studentMarks = exam.marks.find(m => m.studentId.toString() === studentId);
    res.json({ marks: studentMarks ? studentMarks.marks : [] });
  } catch (error) {
    // console.error('Get Marks Error:', error.message);
    res.status(500).json({ message: 'Server error fetching marks' });
  }
});
// Fix typo in /api/teacher endpoint
app.get('/api/teacher/:email', authMiddleware, async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ email: req.params.email });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin score page routes
app.get(
  '/api/fees/classes',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const classNames = await Fee.distinct('class', {
        branchId: req.user.branchId,
      });
      // console.log('Returning class names from Fee:', classNames);
      res.json(classNames);
    } catch (error) {
      // console.error('Error in /api/fees/classes:', error.message);
      res.status(500).json({ message: error.message });
    }
  }
);

app.get(
  '/api/classSections/:className',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    const { className } = req.params;
    const branchId = req.user.branchId;

    try {
      const classDoc = await Class.findOne({ className, branchId });
      res.json(classDoc || { sections: [] });
    } catch (error) {
      // console.error('Error in /api/classSections:', error.message);
      res.status(500).json({ message: error.message });
    }
  }
);

app.get(
  '/api/exams/byClassSection/:className/:section',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    const { className, section } = req.params;
    const branchId = req.user.branchId;

    try {
      const exams = await Exam.find({ className, section, branchId });
      res.json(exams);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

app.get(
  '/api/students/:className/:section',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    const { className, section } = req.params;
    const branchId = req.user.branchId;

    try {
      const classDoc = await Class.findOne({ className, branchId }).populate({
        path: 'sections.students',
        select: 'admissionNo name',
      });
      if (!classDoc)
        return res
          .status(404)
          .json({ message: 'Class not found in this branch' });

      const sectionData = classDoc.sections.find(
        (s) => s.sectionName === section
      );
      if (!sectionData)
        return res.status(404).json({ message: 'Section not found' });

      res.json(sectionData.students);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Student score progress
app.get(
  '/api/student/:email',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    const { email } = req.params;
    const branchId = req.user.branchId;

    try {
      const student = await Student.findOne({ email, branchId });
      if (!student) {
        return res
          .status(404)
          .json({ message: 'Student not found in this branch' });
      }
      res.json({
        _id: student._id,
        admissionNo: student.admissionNo,
        name: student.name,
        email: student.email,
        className: student.className,
        section: student.section,
        rollNumber: student.rollNumber,
      });
    } catch (error) {
      // console.error('Error in /api/student:', error.message);
      res.status(500).json({ message: error.message });
    }
  }
);

app.get(
  '/api/timetable/:className/:section',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      // Decode and trim parameters
      const className = decodeURIComponent(req.params.className).trim();
      const section = decodeURIComponent(req.params.section).trim();

      // Validate inputs
      if (!className || !section) {
        return res.status(400).json({
          success: false,
          message: 'Class name and section are required',
        });
      }

      // Get branchId from authenticated user
      const branchId = req.user.branchId;
      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: 'Branch ID is required for timetable lookup',
        });
      }

      // console.log(
      //   `Fetching timetable for: Class - ${className}, Section - ${section}, Branch - ${branchId}`
      // );

      // Fetch timetable with branchId filter
      const timetable = await Timetable.find({
        className: { $regex: new RegExp(`^${className}$`, 'i') },
        section: { $regex: new RegExp(`^${section}$`, 'i') },
        branchId: branchId, // Add branchId to query
      }).lean(); // Use lean() for faster query if no Mongoose document features needed

      if (!timetable || timetable.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No timetable found for ${className} - ${section} in branch ${branchId}`,
        });
      }

      // Format the response
      const formattedTimetable = timetable.map((entry) => ({
        id: entry._id,
        examName: entry.examName,
        className: entry.className,
        section: entry.section,
        schedule: entry.schedule,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      }));

      // console.log(
      //   'Timetable Data:',
      //   JSON.stringify(formattedTimetable, null, 2)
      // );
      res.status(200).json({
        success: true,
        data: formattedTimetable,
        message: `Timetable retrieved successfully for ${className} - ${section}`,
      });
    } catch (error) {
      // console.error('Error fetching timetable:', {
      //   message: error.message,
      //   stack: error.stack,
      //   params: req.params,
      //   user: req.user,
      // });
      res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: error.message,
      });
    }
  }
);

// Earnings route (placeholder, adjust as needed)
app.get('/api/earnings', authMiddleware, (req, res) => {
  res.json({ totalEarnings: 10000 }); // Replace with real logic
});

// Kamal Added
// === Branch Routes ===
// === Branch Statistics Route ===
// Stats Endpoint
app.get(
  '/api/branches/stats',
  authMiddleware,
  restrictToAdmin,
  async (req, res) => {
    try {
      // console.log('Fetching branches...');
      const branches = await Branch.find().populate('principal', 'name email');
      // console.log('Branches fetched:', branches.length);
      if (!branches.length) {
        return res.json([]);
      }

      // console.log('Calculating stats...');
      for (const branch of branches) {
        try {
          // console.log(`Processing branch: ${branch.branchName}`);
          const principals = await User.countDocuments({
            role: 'principal',
            branchId: branch._id,
          });
          const teachers = await User.countDocuments({
            role: 'teacher',
            branchId: branch._id,
          });
          const students = await User.countDocuments({
            role: 'student',
            branchId: branch._id,
          });
          const parents = await User.countDocuments({
            role: 'parent',
            branchId: branch._id,
          });
          // console.log(`Branch ${branch.branchName} counts:`, {
          //   principals,
          //   teachers,
          //   students,
          //   parents,
          // });
        } catch (err) {
          // console.error(`Error processing branch ${branch.branchName}:`, err);
        }
      }
      const stats = await Promise.all(
        branches.map(async (branch) => {
          // console.log(`Processing branch: ${branch.branchName}`);
          const principals = await User.countDocuments({
            role: 'principal',
            branchId: branch._id,
          });
          const teachers = await User.countDocuments({
            role: 'teacher',
            branchId: branch._id,
          });
          const students = await User.countDocuments({
            role: 'student',
            branchId: branch._id,
          });
          const parents = await User.countDocuments({
            role: 'parent',
            branchId: branch._id,
          });
          return {
            branchId: branch._id,
            branchName: branch.branchName,
            status: branch.status,
            counts: { principals, teachers, students, parents },
          };
        })
      );
      // console.log('Stats calculated:', stats);
      res.json(stats);
    } catch (error) {
      // console.error('Stats Endpoint Error:', error);
      // console.error('Error Stack:', error.stack);
      res.status(500).json({
        message: 'Error fetching branch stats',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
);
app.get('/api/branches', authMiddleware, restrictToAdmin, async (req, res) => {
  try {
    const branches = await Branch.find().populate('principal', 'name email');
    res.json(branches);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching branches', error: error.message });
  }
});

app.post('/api/branches', authMiddleware, restrictToAdmin, async (req, res) => {
  try {
    const { branchName, location, address, principal, status, phoneNumber, email  } = req.body;
    const normalizedPhoneNumber = phoneNumber?.toString().trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (
      !branchName ||
      !location ||
      !normalizedPhoneNumber ||
      !normalizedEmail ||
      !address ||
      !address.street ||
      !address.city ||
      !address.state ||
      !address.zipCode ||
      !address.country
    ) {
      return res.status(400).json({
        message: 'branchName, location, phoneNumber, email, and all address fields are required',
      });
    }

    const phoneRegex = /^[6-9][0-9]{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!phoneRegex.test(normalizedPhoneNumber)) {
      return res.status(400).json({
        message:
          'Phone number must start with 6, 7, 8, or 9 and be exactly 10 digits.',
      });
    }

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: 'Invalid email format.',
      });
    }

    const branch = new Branch({
      branchName,
      location,
      phoneNumber: normalizedPhoneNumber,
      email: normalizedEmail,
      status: status || 'active',
      address,
      principal: principal || null, // Optional
    });
    await branch.save();
    res.status(201).json(branch);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error creating branch', error: error.message });
  }
});

app.put(
  "/api/branches/:id",
  authMiddleware,
  restrictToAdmin,
  async (req, res) => {
    try {
      const { branchName, location, status, address, principal, phoneNumber, email  } = req.body;
      
      const normalizedPhoneNumber = phoneNumber?.toString().trim();
      const normalizedEmail = email?.trim().toLowerCase();

      const phoneRegex = /^[6-9][0-9]{9}$/;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (normalizedPhoneNumber && !phoneRegex.test(normalizedPhoneNumber)) {
        return res.status(400).json({
          message:
            "Phone number must start with 6, 7, 8, or 9 and be exactly 10 digits.",
        });
      }

      if (normalizedEmail && !emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          message: "Invalid email format.",
        });
      }
      
      if (principal) {
        const principalUser = await User.findById(principal);
        if (!principalUser || principalUser.role !== "principal") {
          return res
            .status(400)
            .json({
              message: "Invalid principal ID or user is not a principal",
            });
        }
      }
      const updatedBranch = await Branch.findByIdAndUpdate(
        req.params.id,
        {
          branchName,
          location,
          ...(normalizedPhoneNumber
            ? { phoneNumber: normalizedPhoneNumber }
            : {}),
          ...(normalizedEmail ? { email: normalizedEmail } : {}),
         
          status,
          address,
          principal: principal || null,
          updatedAt: Date.now(),
        },
        { new: true, runValidators: true }
      );
      if (!updatedBranch)
        return res.status(404).json({ message: "Branch not found" });

      if (status) {
        const newUserStatus = status === "active" ? "active" : "inactive";
        await User.updateMany(
          { branchId: updatedBranch._id, role: { $ne: "admin" } },
          { status: newUserStatus, updatedAt: Date.now() }
        );
      }
      res.json({ message: "Branch updated successfully", data: updatedBranch });
    } catch (error) {
      if (error.code === 11000)
        return res.status(400).json({ message: "Branch name already exists" });
      res
        .status(500)
        .json({ message: "Error updating branch", error: error.message });
    }
  }
);

// GET /api/branches/:id
app.get(
  "/api/branches/:id",
  authMiddleware,
  restrictToAdmin,
  async (req, res) => {
    try {
      const branch = await Branch.findById(req.params.id).populate(
        "principal",
        "name email"
      );
      if (!branch) return res.status(404).json({ message: "Branch not found" });
      res.json(branch);
    } catch (error) {
      res.status(500).json({ message: "Error fetching branch" });
    }
  }
);

// DELETE /api/branches/:id
app.delete('/api/branches/:id', authMiddleware, restrictToAdmin, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    // 🔹 Check if `principal` is assigned
    if (branch.principal !== null) {
      return res.status(400).json({ message: 'Cannot delete branch with an assigned principal' });
    }

    await Branch.findByIdAndDelete(req.params.id);
    res.json({ message: 'Branch deleted successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Error deleting branch', error: error.message });
  }
});



// DELETE /api/branches/principal/:branchId
app.delete(
  "/api/branches/principal/:branchId",
  authMiddleware,
  restrictToAdmin,
  async (req, res) => {
    try {
      const branch = await Branch.findById(req.params.branchId);
      if (!branch) return res.status(404).json({ message: "Branch not found" });
      if (!branch.principal)
        return res
          .status(400)
          .json({ message: "No principal assigned to this branch" });

      const principalId = branch.principal;
      branch.principal = null;
      branch.updatedAt = Date.now();
      await branch.save();

      const deletedPrincipal = await User.findByIdAndDelete(principalId);
      if (!deletedPrincipal)
        return res.status(404).json({ message: "Principal user not found" });

      res.json({
        message: "Principal unassigned and deleted successfully",
        data: branch,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Error unassigning and deleting principal",
          error: error.message,
        });
    }
  }
);

// Users

app.get('/api/users', authMiddleware, restrictToAdmin, async (req, res) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    const users = await User.find(query).populate(
      'branchId',
      'branchName status'
    );
    res.json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching users', error: error.message });
  }
});

app.get('/api/users/:id', authMiddleware, restrictToAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      'branchId',
      'branchName'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user' });
  }
});

app.put('/api/users/:id', authMiddleware, restrictToAdmin, async (req, res) => {
  try {
    const { name, email, branchId } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, branchId, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated successfully', data: user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user' });
  }
});

// === Principal Creation Route ===
app.post(
  '/api/principals',
  authMiddleware,
  restrictToAdmin,
  async (req, res) => {
    try {
      const { name, email, password, branchId } = req.body;
      if (!name || !email || !password || !branchId) {
        return res.status(400).json({
          message: 'Name, email, password, and branchId are required',
        });
      }

      const branch = await Branch.findById(branchId);
      if (!branch) return res.status(404).json({ message: 'Branch not found' });
      if (branch.principal) {
        return res
          .status(400)
          .json({ message: 'Branch already has a principal assigned' });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res.status(400).json({ message: 'Email already in use' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const newPrincipal = new User({
        name,
        email,
        password: password,
        role: 'principal',
        branchId,
        status: branch.status, // Sync with branch status
        roleModel: 'User',
      });
      await newPrincipal.save();

      // Assign principal to branch
      branch.principal = newPrincipal._id;
      await branch.save();

      const token = jwt.sign(
        { userId: newPrincipal._id, role: 'principal', branchId },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'Principal created and assigned to branch successfully',
        principal: {
          id: newPrincipal._id,
          name,
          email,
          branchId,
          status: newPrincipal.status,
        },
        token,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Error creating principal', error: error.message });
    }
  }
);

// Login (for token generation)
// app.post("/api/auth/login", async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     const user = await User.findOne({ email });
//     if (!user || !(await user.comparePassword(password))) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }
//     const token = jwt.sign(
//       { userId: user._id, role: user.role, branchId: user.branchId },
//       process.env.JWT_SECRET || "your-secret-key",
//       { expiresIn: "24h" }
//     );
//     res.json({ token });
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// });

// Tulasi updates

// Submit Assignment
// Submit Assignment
app.post(
  "/submit-assignment",
  authMiddleware, // Ensure the user is authenticated
  restrictAccess, // Restrict access based on roles/permissions
  upload.single("file"), // Handle file upload
  async (req, res) => {
    try {
      // Validate request body
      const { name, email, assignmentId } = req.body;

      if (!name || !email || !assignmentId) {
        return res
          .status(400)
          .json({ error: "Missing student details. Please try again." });
      }

      // Check if the file was uploaded
      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded. Please upload a valid PDF file.",
        });
      }

      // Find the student in the database
      const student = await Student.findOne({ email });
      if (!student) {
        return res.status(404).json({ error: "Student not found." });
      }

      // Find the assignment in the database
      const assignment = await Assignment.findById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found." });
      }

      // Ensure teacherEmail is correctly assigned
      const teacherEmail = assignment.teacherEmail || assignment.email;
      // console.log("Saving submission with teacherEmail:", teacherEmail);

      // Save the submission details
      const newSubmission = new SubmittedAssignment({
        name,
        email,
        className: student.className,
        section: student.section,
        assignmentId,
        teacherEmail, // Ensure correct teacher email is saved
        branchId: assignment.branchId,
        fileName: req.file.filename, // Save the filename
        filePath: req.file.path, // Save the file path
      });

      await newSubmission.save();

      // Respond with success message
      res.status(200).json({
        message: "Assignment submitted successfully",
        submission: {
          id: newSubmission._id,
          name: newSubmission.name,
          email: newSubmission.email,
          className: newSubmission.className,
          section: newSubmission.section,
          assignmentId: newSubmission.assignmentId,
          teacherEmail: newSubmission.teacherEmail, // Ensure this is included
          branchId: newSubmission.branchId,
          fileName: newSubmission.fileName,
          submittedAt: newSubmission.createdAt,
        },
      });
    } catch (error) {
      // console.error("Error submitting assignment:", error);

      // Handle Multer errors
      if (error instanceof multer.MulterError) {
        return res
          .status(400)
          .json({ error: `File upload error: ${error.message}` });
      }

      // Handle other errors
      res
        .status(500)
        .json({ error: "Failed to submit assignment", details: error.message });
    }
  }
);

// Get Submitted Assignments by Teacher Email (Query Param)
app.get(
  '/get/submitted-assignments',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) {
        return res
          .status(400)
          .json({ error: 'Missing teacher email in request.' });
      }

      const query = { teacherEmail: email };
      if (req.user.role === 'principal') {
        query.branchId = req.user.branchId; // Restrict to principal's branch
      }

      const submittedAssignments = await SubmittedAssignment.find(query).lean();
      res.status(200).json(submittedAssignments);
    } catch (error) {
      // console.error('Error fetching submitted assignments:', error.message);
      res.status(500).json({
        error: 'Failed to fetch submitted assignments',
        details: error.message,
      });
    }
  }
);

// Get Submitted Assignments by Student Email (Param)
app.get(
  '/get/submitted-assignments/:email',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { email } = req.params;
      // console.log('Fetching submissions for student email:', email);
      const submissions = await SubmittedAssignment.find({ email }).lean();
      // console.log('Found submissions:', submissions);
      res.status(200).json(submissions);
    } catch (error) {
      // console.error('Error fetching submitted assignments:', error.message);
      res.status(500).json({
        message: 'Failed to fetch submitted assignments',
        details: error.message,
      });
    }
  }
);

app.delete('/delete/submitted-assignment/:id', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the submission
    const submission = await SubmittedAssignment.findById(id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    // Check if the logged-in teacher is the owner of the assignment
    if (req.user.role !== 'teacher' || req.user.email !== submission.teacherEmail) {
      return res.status(403).json({ message: "Unauthorized to delete this submission." });
    }

    // Delete the file from the server (optional)
    const fs = require("fs");
    if (submission.filePath && fs.existsSync(submission.filePath)) {
      fs.unlinkSync(submission.filePath); // Delete the file
    }

    // Delete the assignment from DB
    await SubmittedAssignment.findByIdAndDelete(id);

    res.status(200).json({ message: "Submission deleted successfully." });
  } catch (error) {
    // console.error("Error deleting submission:", error);
    res.status(500).json({ message: "Failed to delete submission.", error: error.message });
  }
});

// Add or Update Assignment
app.post(
  '/add/assignment',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { email, assignment } = req.body;

      if (!email || !assignment.title || !assignment.dueDate) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const branchId = req.user.branchId; // Add branchId from authenticated user
      if (!branchId) {
        return res.status(400).json({
          message: 'Branch ID is required but not found in user data.',
        });
      }

      const existingAssignment = await Assignment.findOne({
        email,
        'assignment.title': assignment.title,
        branchId,
      });

      if (existingAssignment) {
        existingAssignment.assignment = assignment;
        await existingAssignment.save();
        return res.status(200).json({
          message: 'Assignment updated successfully',
          updatedAssignment: existingAssignment,
        });
      } else {
        const newAssignment = new Assignment({ email, assignment, branchId });
        await newAssignment.save();
        return res
          .status(201)
          .json({ message: 'Assignment created successfully', newAssignment });
      }
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Internal Server Error', details: error.message });
    }
  }
);

// Get Assignments by Teacher Email
app.get(
  '/get/assignments',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const query = { email };
      if (req.user.role === 'principal') {
        query.branchId = req.user.branchId; // Restrict to principal's branch
      }

      const assignments = await Assignment.find(query).lean();
      res.status(200).json({ assignments });
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Internal Server Error', details: error.message });
    }
  }
);

// Get Assignments for a Student
app.get(
  '/get/student-assignments/:email',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { email } = req.params;
      const student = await Student.findOne({ email });
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const today = new Date().toISOString().split('T')[0];
      const query = {
        'assignment.className': student.className,
        'assignment.section': student.section,
        'assignment.dueDate': { $gte: today }, // MongoDB query for future due dates
      };

      if (req.user.role === 'principal') {
        query.branchId = req.user.branchId; // Restrict to principal's branch
      }

      const assignments = await Assignment.find(query).lean();
      res.status(200).json(assignments);
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Internal Server Error', details: error.message });
    }
  }
);

// Delete Assignment
app.delete(
  '/delete/assignment',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { email, title } = req.body;
      if (!email || !title) {
        return res
          .status(400)
          .json({ message: 'Email and Title are required' });
      }

      const branchId = req.user.branchId;
      if (!branchId) {
        return res.status(400).json({
          message: 'Branch ID is required but not found in user data.',
        });
      }

      const deletedAssignment = await Assignment.findOneAndDelete({
        email,
        'assignment.title': title,
        branchId,
      });

      if (!deletedAssignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }

      res.status(200).json({ message: 'Assignment deleted successfully' });
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Internal Server Error', details: error.message });
    }
  }
);


// Fee Management 
const generateOrderId = () => {
  return "ORDER_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
};

const generateReceiptId = () => {
  return "RCPT_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
};

// CashFree Configuration
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_API_VERSION = "2022-01-01";
const CASHFREE_BASE_URL =
  process.env.CASHFREE_ENV === "PRODUCTION"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

// POST /initiate-payment
app.post(
  "/api/fees/initiate-payment",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      // console.log("Received payment request:", req.body);
      const {
        studentId,
        termId,
        amount,
        customerName,
        customerEmail,
        customerPhone,
      } = req.body;

      if (!amount || !customerEmail || !customerPhone) {
        return res.status(400).json({
          success: false,
          message: "Amount, customer email, and phone are required",
        });
      }

      // Get branchId from authenticated user
      const branchId = req.user.branchId;
      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: "Branch ID is required for payment initiation",
        });
      }

      const orderId = generateOrderId();
      const receiptId = generateReceiptId();

      let termName = null;
      if (studentId && termId) {
        const student = await Student.findById(studentId);
        if (student && student.feeDetails?.terms) {
          const term = student.feeDetails.terms.find(
            (t) => t._id.toString() === termId.toString()
          );
          termName = term ? term.termName : null;
        }
      }

      const payment = new Payment({
        studentId: studentId || null,
        orderId,
        receiptId,
        amount,
        termId: termId || null,
        termName,
        paymentStatus: "PENDING",
        branchId,
      });
      await payment.save();

      const data = {
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: studentId || "guest",
          customer_name: customerName || "Guest",
          customer_email: customerEmail,
          customer_phone: customerPhone,
        },
        order_meta: {
          return_url:
            "http://localhost:3000/payment-status?order_id={order_id}&order_token={order_token}",
        },
      };

      const headers = {
        "x-api-version": CASHFREE_API_VERSION,
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
        "Content-Type": "application/json",
      };
      const response = await axios.post(`${CASHFREE_BASE_URL}/orders`, data, {
        headers,
      });

      res.json({
        success: true,
        paymentLink: response.data.payment_link,
        orderId,
        receiptId,
      });
    } catch (error) {
      // console.error("Error initiating payment:", error);
      Sentry.captureException(error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  }
);

// ALL /payment-callback
app.all(
  "/api/fees/payment-callback",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      // console.log("⭐ CALLBACK RECEIVED", req.method, req.query, req.body);
      const order_id = req.query.order_id || req.body.order_id;
      if (!order_id) {
        return res.status(400).json({
          success: false,
          message: "Missing order_id",
        });
      }

      const headers = {
        "x-api-version": CASHFREE_API_VERSION,
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
      };
      
      const response = await axios.get(
        `${CASHFREE_BASE_URL}/orders/${order_id}`,
        { headers }
      );
      const paymentsResponse = await axios.get(
        `${CASHFREE_BASE_URL}/orders/${order_id}/payments`,
        { headers }
      );

      const payment = await Payment.findOne({ orderId: order_id });
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      const latestPayment = paymentsResponse.data[0] || {};
      const paymentStatus =
        latestPayment.payment_status === "SUCCESS" ? "SUCCESS" : "FAILED";

      if (payment.paymentStatus !== paymentStatus || !payment.paymentMethod) {
        payment.paymentStatus = paymentStatus;
        payment.paymentMethod = latestPayment.payment_method
          ? `${Object.keys(latestPayment.payment_method)[0]} - ${
              latestPayment.payment_method[
                Object.keys(latestPayment.payment_method)[0]
              ]?.channel
            }`
          : "Unknown";
        payment.paymentGatewayResponse = response.data;
        if (paymentStatus === "FAILED" && latestPayment.error_details) {
          payment.failureDetails = {
            errorCode: latestPayment.error_details.error_code,
            errorMessage:
              latestPayment.error_details.error_description || "Payment failed",
            errorSource: latestPayment.error_details.error_source,
          };
        }
        payment.updatedAt = new Date();
        await payment.save();

        if (payment.studentId) {
          await updateStudentFeeDetails(payment, latestPayment);
        }
      }

      const redirectURL = `http://localhost:3000/payment-status?status=${paymentStatus}&orderId=${order_id}`;
      return res.redirect(redirectURL);
    } catch (error) {
      // console.error("⭐ Callback Error:", error);
      return res.redirect(
        `http://localhost:3000/#/payment-status?status=FAILED&orderId=${order_id}`
      );
    }
  }
);

// GET /verify-payment
app.get(
  "/api/fees/verify-payment",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { order_id } = req.query;
      if (!order_id) {
        return res.status(400).json({
          success: false,
          message: "Missing order_id parameter",
        });
      }

      const headers = {
        "x-api-version": CASHFREE_API_VERSION,
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
      };

      const orderResponse = await axios.get(
        `${CASHFREE_BASE_URL}/orders/${order_id}`,
        { headers }
      );
      const paymentsResponse = await axios.get(
        `${CASHFREE_BASE_URL}/orders/${order_id}/payments`,
        { headers }
      );

      const payment = await Payment.findOne({ orderId: order_id }).populate(
        "studentId",
        "name admissionNo className section"
      );
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found",
        });
      }

      const latestPayment = paymentsResponse.data[0] || {};
      const paymentStatus =
        latestPayment.payment_status === "SUCCESS" ? "SUCCESS" : "FAILED";

      if (payment.paymentStatus !== paymentStatus || !payment.paymentMethod) {
        payment.paymentStatus = paymentStatus;
        payment.paymentMethod = latestPayment.payment_method
          ? `${Object.keys(latestPayment.payment_method)[0]} - ${
              latestPayment.payment_method[
                Object.keys(latestPayment.payment_method)[0]
              ]?.channel
            }`
          : "Unknown";
        payment.paymentGatewayResponse = orderResponse.data;
        if (paymentStatus === "FAILED" && latestPayment.error_details) {
          payment.failureDetails = {
            errorCode: latestPayment.error_details.error_code,
            errorMessage:
              latestPayment.error_details.error_description || "Payment failed",
            errorSource: latestPayment.error_details.error_source,
          };
        }
        payment.updatedAt = new Date();
        await payment.save();

        if (payment.studentId) {
          await updateStudentFeeDetails(payment, latestPayment);
        }
      }

      const paymentDetails = {
        status: payment.paymentStatus,
        orderId: payment.orderId,
        receiptId: payment.receiptId,
        amount: payment.amount,
        studentName: payment.studentId ? payment.studentId.name : "Guest",
        studentId: payment.studentId ? payment.studentId._id.toString() : null,
        termId: payment.termId ? payment.termId.toString() : null,
        termName: payment.termName,
        paymentMethod: payment.paymentMethod,
        date: payment.updatedAt || payment.createdAt,
        failureReason: payment.failureDetails?.errorMessage || null,
        branchId: payment.branchId,
      };

      return res.json({
        success: true,
        data: paymentDetails,
      });
    } catch (error) {
      // console.error("⭐ Verify-payment Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  }
);

// GET /:studentId
app.get(
  "/api/fees/:studentId",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const studentId = req.params.studentId;

      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID format",
        });
      }

      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      return res.json({
        success: true,
        data: student,
      });
    } catch (error) {
      // console.error("⭐ Error fetching student details:", error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  }
);

// GET /receipt/:receiptId
app.get(
  "/api/fees/receipt/:receiptId",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { receiptId } = req.params;
      const payment = await Payment.findOne({ receiptId })
        .populate({
          path: "studentId",
          select: "name email phone address branchId",
          populate: {
            path: "branchId",
            select: "branchName location phoneNumber email address",
          },
        })
        .populate("branchId", "branchName location phoneNumber email address");

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Receipt not found",
        });
      }

      const studentBranch = payment.studentId?.branchId;
      const paymentBranch = payment.branchId;
      const resolvedBranch = studentBranch || paymentBranch;

      const receiptData = {
        receiptId: payment.receiptId,
        orderId: payment.orderId,
        amount: payment.amount,
        termId: payment.termId,
        termName: payment.termName,
        studentId: payment.studentId ? payment.studentId._id : null,
        studentName: payment.studentId ? payment.studentId.name : "Guest",
        studentEmail: payment.studentId ? payment.studentId.email : null,
        studentPhone: payment.studentId ? payment.studentId.phone : null,
        paymentDate: payment.updatedAt || payment.createdAt,
        paymentMethod: payment.paymentMethod || "Online",
        paymentStatus: payment.paymentStatus,
        transactionId:
          payment.paymentGatewayResponse?.cf_order_id || payment.orderId,
        branchId: resolvedBranch?._id || payment.branchId || null,
        branchName: resolvedBranch?.branchName || null,
        branchLocation: resolvedBranch?.location || null,
        branchPhoneNumber: resolvedBranch?.phoneNumber || null,
        branchEmail: resolvedBranch?.email || null,
      };

      return res.json({
        success: true,
        data: receiptData,
      });
    } catch (error) {
      // console.error("Error fetching receipt:", error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  }
);
// GET /payment-history/:studentId
app.get(
  "/api/fees/payment-history/:studentId",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      const payments = await Payment.find({ studentId }).sort({ updatedAt: -1 });
      const formattedHistory = payments.map((payment) => {
        const historyEntry = student.feeDetails.paymentHistory.find(
          (entry) => entry.receiptNumber === payment.receiptId
        );

        return {
          receiptId: payment.receiptId,
          orderId: payment.orderId,
          amount: payment.amount,
          termPaid: payment.termId || (historyEntry ? historyEntry.termPaid : null),
          termName:
            payment.termName ||
            (historyEntry ? historyEntry.termName : "Unknown Term"),
          paymentDate: payment.updatedAt || payment.createdAt,
          paymentMethod:
            payment.paymentMethod ||
            (historyEntry ? historyEntry.paymentMethod : "Unknown"),
          status: payment.paymentStatus,
          failureReason: payment.failureDetails?.errorMessage || null,
          branchId: payment.branchId,
        };
      });

      return res.json({
        success: true,
        data: {
          paymentHistory: formattedHistory,
          student: {
            id: student._id,
            name: student.name,
            className: student.className,
            section: student.section,
            admissionNo: student.admissionNo,
          },
        },
      });
    } catch (error) {
      // console.error("Error fetching payment history:", error);
      Sentry.captureException(error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  }
);

async function updateStudentFeeDetails(payment, paymentData) {
  try {
    const student = await Student.findById(payment.studentId);
    if (!student) {
      throw new Error(`Student not found: ${payment.studentId}`);
    }

    if (!student.feeDetails || !student.feeDetails.terms) {
      student.feeDetails = student.feeDetails || {};
      student.feeDetails.terms = student.feeDetails.terms || [];
      student.feeDetails.paymentHistory = student.feeDetails.paymentHistory || [];
    }

    if (payment.paymentStatus === "SUCCESS" && payment.termId) {
      const termIndex = student.feeDetails.terms.findIndex(
        (term) => term._id.toString() === payment.termId.toString()
      );
      if (termIndex !== -1) {
        student.feeDetails.terms[termIndex].paidAmount =
          (student.feeDetails.terms[termIndex].paidAmount || 0) + payment.amount;
        student.feeDetails.terms[termIndex].status =
          student.feeDetails.terms[termIndex].paidAmount >=
          student.feeDetails.terms[termIndex].amount
            ? "Paid"
            : "Pending";
      }
    }

    student.feeDetails.paymentHistory.push({
      amountPaid: payment.amount,
      paymentDate: new Date(),
      paymentMethod: payment.paymentMethod || "Unknown",
      receiptNumber: payment.receiptId,
      status: payment.paymentStatus,
      failureReason: payment.failureDetails?.errorMessage || null,
      termPaid: payment.termId || null,
      termName:
        payment.termName ||
        (payment.termId &&
          student.feeDetails.terms.find(
            (t) => t._id.toString() === payment.termId.toString()
          )?.termName) ||
        "N/A",
      branchId: payment.branchId,
    });

    await student.save();
    // console.log("⭐ Student payment history updated:", student.feeDetails.paymentHistory);
    return true;
  } catch (error) {
    // console.error("Error updating student fee details:", error);
    throw error;
  }
}

app.get("/api/attendance/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid student ID" });
    }

    const attendanceDocs = await Attendance.find({
      "attendance.attendanceRecords.studentId": studentId,
    }).select("attendance className section teacherEmail");

    if (!attendanceDocs || attendanceDocs.length === 0) {
      return res
        .status(404)
        .json({ message: "No attendance records found for this student" });
    }

    let studentAttendance = [];
    attendanceDocs.forEach((doc) => {
      doc.attendance.forEach((entry) => {
        entry.attendanceRecords.forEach((record) => {
          if (record.studentId.toString() === studentId) {
            studentAttendance.push({
              date: entry.date,
              className: doc.className,
              section: doc.section,
              teacherEmail: doc.teacherEmail,
              rollNumber: record.rollNumber,
              admissionNo: record.admissionNo,
              name: record.name,
              attendanceStatus: record.attendanceStatus,
              reason: record.reason,
            });
          }
        });
      });
    });

    if (studentAttendance.length === 0) {
      return res
        .status(404)
        .json({ message: "No attendance records found for this student" });
    }

    // console.log(
    //   "📌 Fetched Attendance for Student",
    //   studentId,
    //   ":",
    //   studentAttendance
    // );
    res.status(200).json(studentAttendance);
  } catch (error) {
    // console.error("❌ Error fetching student attendance:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});


// Get Exam Progress by Student ID
app.get('/api/exams/byStudent/:studentId', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { studentId } = req.params;
    const exams = await Exam.find({ 'marks.studentId': studentId }).lean();
    res.status(200).json(exams);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', details: error.message });
  }
});

// Get Attendance by Student ID
app.get('/api/student-attendance/:studentId', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { studentId } = req.params;
    const attendance = await Attendance.find({ 'attendance.attendanceRecords.studentId': studentId }).lean();
    res.status(200).json({ attendanceRecords: attendance.flatMap(a => a.attendance.flatMap(b => b.attendanceRecords)) });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', details: error.message });
  }
});

// Get Assignments by Student ID
app.get('/api/student-assignments/:studentId', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const assignments = await Assignment.find({
      'assignment.className': student.className,
      'assignment.section': student.section,
    }).lean();
    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', details: error.message });
  }
});

// Get Submitted Assignments by Student ID (Using Email)
app.get('/api/submitted-assignments/:studentId', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const submittedAssignments = await SubmittedAssignment.find({ email: student.email }).lean();
    res.status(200).json(submittedAssignments);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', details: error.message });
  }
});

// Get Student Details by ID
app.get('/api/student/byId/:studentId', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId).lean();
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', details: error.message });
  }
});


// +++++++++++++++++++++++++++++++++++++++++++++

// Notification

app.get('/api/users/:role', authMiddleware, async (req, res) => {
  try {
    let users;
    switch (req.params.role) {
      case 'teacher':
        users = await Teacher.find().select('_id name role email');
        break;
      case 'student':
        users = await Student.find().select('_id name role email');
        break;
      case 'parent':
        users = await Parent.find().select('_id name role email');
        break;
      default:
        users = await User.find({ role: req.params.role }).select('_id name role email');
    }
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Backend (server.js or routes file)
app.get('/api/student', authMiddleware, async (req, res) => {
  try {
    const students = await Student.find();
    // console.log('Students fetched:', students); // Debug
    res.json(students);
  } catch (error) {
    // console.error("Error fetching students:", error);
    res.status(500).json({ error: "Error fetching students", details: error.message });
  }
});


// Get parent count (from your snippet)
app.get("/api/parent-count", authMiddleware, async (req, res) => {
  try {
    const count = await Parent.find();
    res.json({ totalParents: count.length });
  } catch (error) {
    // console.error("Error fetching parent count:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all teachers (from your snippet)
app.get('/api/teachers', authMiddleware, async (req, res) => {
  try {
    const teachers = await Teacher.find();
    // console.log('Teachers fetched:', teachers); // Debug
    res.json(teachers);
  } catch (error) {
    // console.error("Error fetching teachers:", error);
    res.status(500).json({ error: "Error fetching teachers", details: error.message });
  }
});



// Get Notifications for Admin
app.get('/api/notifications/role/principal', authMiddleware, async (req, res) => {
  try {
    // console.log('Fetching admin notifications for user:', req.user);
    const notifications = await Notification.find({ targetRoles: 'admin' }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    // console.error('Error in /api/notifications/role/admin:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.delete('/api/notifications/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role; // Role of the user making the request (e.g., 'student', 'teacher', 'principal')

  try {
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // For principal/admin, allow full deletion if desired (optional)
    if (['admin', 'principal'].includes(userRole)) {
      await Notification.findByIdAndDelete(id);
      // console.log(`Notification ${id} fully deleted by ${userRole}`);
      return res.status(200).json({ message: 'Notification deleted successfully' });
    }

    // For other roles (student, teacher, parent), hide it for that role
    if (!notification.hiddenFor.includes(userRole)) {
      notification.hiddenFor.push(userRole);
      await notification.save();
      // console.log(`Notification ${id} hidden for ${userRole}`);
    }

    res.status(200).json({ message: `Notification hidden from ${userRole} portal` });
  } catch (err) {
    // console.error('Error in /api/notifications/:id:', err);
    res.status(500).json({ error: 'Failed to hide/delete notification', details: err.message });
  }
});

//prashanth notifi
app.get("/api/students/:className/:section", authMiddleware, restrictAccess, async (req, res) => {
  const { className, section } = req.params;
  const branchId = req.user.branchId;

  try {
    const classDoc = await Class.findOne({ className, branchId })
      .populate({
        path: "sections.students",
        select: "admissionNo name",
        // Adding populate for notifications if they exist in your Student model
        populate: {
          path: "notifications", // Assuming 'notifications' is a field in your Student model
          select: "title message createdAt", // Adjust fields based on your notification schema
          options: { sort: { createdAt: -1 } } // Optional: sort notifications by latest first
        }
      });
    
    if (!classDoc) return res.status(404).json({ message: "Class not found in this branch" });

    const sectionData = classDoc.sections.find((s) => s.sectionName === section);
    if (!sectionData) return res.status(404).json({ message: "Section not found" });

    res.json(sectionData.students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/notifications/role/:role', authMiddleware, async (req, res) => {
  try {
    const { role } = req.params;
    const { page = 1, limit = 10 } = req.query;
    // console.log('Fetching notifications for role:', role, 'by user:', req.user);

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'principal' && req.user.role !== role) {
      return res.status(403).json({ error: 'Unauthorized: Insufficient role permissions' });
    }

    const skip = (page - 1) * limit;
    const notifications = await Notification.find({
      $and: [
        { $or: [{ senderRole: role }, { targetRoles: role }] },
        { hiddenFor: { $ne: role } }, // Exclude notifications hidden for this role
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments({
      $and: [
        { $or: [{ senderRole: role }, { targetRoles: role }] },
        { hiddenFor: { $ne: role } },
      ],
    });

    // console.log('Notifications fetched:', notifications);
    res.json({
      notifications,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    // console.error('Error in /api/notifications/role/:role:', {
    //   message: error.message,
    //   stack: error.stack,
    // });
    res.status(500).json({ error: 'Error fetching notifications', details: error.message });
  }
});


// app.get('/api/notifications/role/:role', authMiddleware, async (req, res) => {
//   try {
//     const { role } = req.params;
//     console.log('Fetching notifications for role:', role, 'by user:', req.user);

//     if (req.user.role !== 'admin' && req.user.role !== 'principal' && req.user.role !== role) {
//       return res.status(403).json({ error: 'Unauthorized' });
//     }

//     const notifications = await Notification.find({
//       $or: [{ senderRole: role }, { targetRoles: role }],
//     }).sort({ createdAt: -1 });

//     console.log('Notifications fetched:', notifications); // Debug
//     res.json(notifications);
//   } catch (error) {
//     console.error('Error in /api/notifications/role/:role:', {
//       message: error.message,
//       stack: error.stack,
//     });
//     res.status(500).json({ error: 'Error fetching notifications', details: error.message });
//   }
// });

// Updated send notification endpoint
app.post('/api/notifications/send', authMiddleware, async (req, res) => {
  try {
    const { message, senderRole, targetRoles, recipientIds, recipientEmails } = req.body;
    // console.log('Sending notification by user:', req.user);
    // console.log('Request body:', { message, senderRole, targetRoles, recipientIds, recipientEmails });

    if (!['admin', 'principal'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admins or principals can send notifications' });
    }

    const notification = new Notification({
      message,
      senderRole: req.user.role || senderRole,
      targetRoles,
      recipientIds,
      recipientEmails,
    });

    // console.log('Saving notification:', notification);
    await notification.save();

    res.status(201).json({ message: 'Notification sent successfully' });
  } catch (error) {
    // console.error('Error in /api/notifications/send:', {
    //   message: error.message,
    //   stack: error.stack,
    // });
    res.status(500).json({ error: 'Error sending notification', details: error.message });
  }
});

app.get('/api/parents', authMiddleware, async (req, res) => {
  try {
    const parents = await Parent.find();
    // console.log('Parents fetched:', parents); // Debug
    res.json(parents);
  } catch (error) {
    // console.error("Error fetching parents:", error);
    res.status(500).json({ error: "Error fetching parents", details: error.message });
  }
});

///--end of notifications

// +++++++++++++++++++++++++++++++++++++++++++++++++++


// Cross Mark

//add parent

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// DELETE endpoint
app.delete('/api/parent/child', authenticateToken, async (req, res) => {
  try {
    const { admissionNo, parentId } = req.body;

    // Validate input
    if (!admissionNo || !parentId) {
      return res.status(400).json({ error: 'Admission number and parent ID are required' });
    }

    // Check if parentId is valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ error: 'Invalid parent ID' });
    }

    // Update parent
    const result = await Parent.updateOne(
      { _id: parentId },
      { $pull: { children: admissionNo } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Parent not found or child not associated' });
    }

    res.json({ message: 'Student removed successfully' });
  } catch (error) {
    // console.error('Error in DELETE /api/parent/child:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// 


// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


// .............................................
// Start Server

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
