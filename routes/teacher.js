const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Teacher = require('../models/teacherModel');
const User = require('../models/user.model');
const Student = require('../models/studentModel');
const Parent = require('../models/parentModel');
const Assignment = require('../models/assignmentsModel');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); // For generating unique identifiers
const nodemailer = require("nodemailer");
require('dotenv').config();
const transporter = nodemailer.createTransport({
  service: process.env.NODEMAILER_SERVICE,
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Enhanced Multer Configuration for profile pictures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './Uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `teacher-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed!'));
    }
  },
});

// Multer Configuration for payslip PDFs
const payslipStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const payslipDir = './Payslips/';
    if (!fs.existsSync(payslipDir)) {
      fs.mkdirSync(payslipDir, { recursive: true });
    }
    cb(null, payslipDir);
  },
  filename: (req, file, cb) => {
    const { payslipData, month, year } = req.body;
    let empId;
    try {
      const parsedPayslipData = typeof payslipData === 'string' ? JSON.parse(payslipData) : payslipData;
      empId = parsedPayslipData.empId;
    } catch (error) {
      return cb(new Error('Invalid payslipData format'));
    }
    if (!empId || !month || !year) {
      return cb(new Error('empId, month, and year are required for filename'));
    }
    const formattedFilename = `${empId}_salslip_${month}_${year}${path.extname(file.originalname)}`;
    cb(null, formattedFilename);
  },
});

const payslipUpload = multer({
  storage: payslipStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'));
    }
  },
});

// Middleware to handle multer errors
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Please upload a file smaller than 10MB.',
      });
    }
  }
  if (error.message.includes('Only image files') || error.message.includes('Only PDF files') || error.message.includes('empId, month, and year are required')) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
  next(error);
};

// Middleware to restrict access
const restrictAccess = (req, res, next) => {
  if (!['teacher', 'principal', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      message: 'Access denied. Insufficient permissions.'
    });
  }
  next();
};

// Middleware to verify teacher exists
const verifyTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    if (req.user.role === 'principal' && teacher.branchId?.toString() !== req.user.branchId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access teachers from your branch.',
      });
    }
    req.teacher = teacher;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// POST /teachers/assign-work - Create a new assignment
router.post(
  '/teachers/assign-work',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      // console.log('Received payload:', req.body);
      const {
        email,
        className,
        section,
        title,
        type,
        description,
        syllabus,
        dueDate,
      } = req.body;

      if (!email || !className || !title || !type || !dueDate) {
        // console.log('Missing fields:', {
        //   email,
        //   className,
        //   title,
        //   type,
        //   dueDate,
        // });
        return res.status(400).json({
          success: false,
          message:
            'Teacher email, class name, title, type, and due date are required.',
        });
      }

      // Restrict teachers to their own assignments
      if (req.user.role === 'teacher' && req.user.email !== email) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only assign work as yourself.',
        });
      }

      // Find the teacher
      const teacher = await Teacher.findOne({ email });
      if (!teacher) {
        return res
          .status(404)
          .json({ success: false, message: 'Teacher not found' });
      }

      // Use teacher's classTeacherFor and section if not provided
      const assignmentClassName = className || teacher.classTeacherFor;
      const assignmentSection = section || teacher.section;

      if (!assignmentClassName || !assignmentSection) {
        return res.status(400).json({
          success: false,
          message:
            'Class name and section must be provided or assigned to the teacher.',
        });
      }

      // Ensure branchId is available (from req.user or teacher)
      const branchId = req.user.branchId || teacher.branchId;
      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: 'Branch ID is required for assignment creation.',
        });
      }

      // Create new assignment
      const newAssignment = new Assignment({
        teacherEmail: email,
        className: assignmentClassName,
        section: assignmentSection,
        title,
        type,
        description,
        syllabus,
        dueDate,
        branchId,
      });

      const savedAssignment = await newAssignment.save();

      res.json({
        success: true,
        message: 'Assignment added successfully',
        data: savedAssignment,
      });
    } catch (error) {
      // console.error('Error assigning work:', error);
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((err) => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.join(', '),
        });
      }
      res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: error.message,
      });
    }
  }
);

// GET /teachers1 - Fetch teacher details by email
router.get('/teachers1', authMiddleware, restrictAccess, async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: 'Email query parameter is required' });
  }

  try {
    if (req.user.role === 'teacher' && req.user.email !== email) {
      return res
        .status(403)
        .json({
          message: 'Access denied. You can only view your own details.',
        });
    }

    const teacher = await Teacher.findOne({ email }).select('-password');
    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: 'Teacher not found' });
    }

    res.json({ success: true, data: teacher });
  } catch (error) {
    // console.error('Error fetching teacher details:', error);
    res
      .status(500)
      .json({
        success: false,
        message: 'Internal Server Error',
        error: error.message,
      });
  }
});

// GET /teacher-count - Count total teachers
router.get(
  '/teacher-count',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const query =
        req.user.role === 'principal' ? { branchId: req.user.branchId } : {};
      const count = await Teacher.countDocuments(query);
      res.json({ totalTeachers: count });
    } catch (error) {
      // console.error('Error fetching teacher count:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// POST /teachers - Register a new teacher
router.post(
  '/teachers',
  authMiddleware,
  restrictAccess,
  upload.single('profilePic'),
  async (req, res) => {
    try {
      const {
        staffType,
        teacherId,
        name,
        email,
        phoneNo,
        qualification,
        classTeacherFor,
        section,
        joiningDate,
        gender,
        address,
        timetable,
        subject,
        dateOfBirth,
        designation,
        salary,
        location,
        password,
        panNumber,
        bankAccountNumber,
        bankName
      } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'A user with this email already exists',
          });
      }

      const parsedTimetable = timetable ? JSON.parse(timetable) : [];
      const branchId = req.user.role === 'principal' ? req.user.branchId : null;
      // const hashedPassword = await bcrypt.hash(password, 10);

      // Hash password once
      const hashedPassword = await bcrypt.hash(password.trim(), 10);


      const newTeacher = new Teacher({
        staffType,
        teacherId,
        name,
        email,
        phoneNo,
        joiningDate,
        dateOfBirth,
        gender,
        address,
        //password,
        salary,
        profilePic: req.file ? req.file.path : null,
        branchId,
        location,
        panNumber,
        bankAccountNumber,
        bankName,
        password
      });

      if (staffType === 'Teaching') {
        newTeacher.qualification = qualification;
        newTeacher.classTeacherFor = classTeacherFor;
        newTeacher.section = section;
        newTeacher.subject = subject;
        newTeacher.timetable = parsedTimetable;
      } else {
        newTeacher.designation = designation;
      }

      const savedTeacher = await newTeacher.save();

      const mailOptions = {
        from: process.env.NODEMAILER_EMAIL,
        to: email,
        subject: "Teacher Login Credentials",
        html: `
    <h3>Welcome to School Portal</h3>
    <p>Dear ${name},</p>
    <p>Your account has been created successfully.</p>
    <p><b>Username:</b> ${email}</p>
    <p><b>Password:</b> ${password}</p>
    <br/>
    <p>Please login and change your password.</p>
  `,
      };

      await transporter.sendMail(mailOptions);

      const newUser = new User({
        name,
        email,
        password, // Hashed password stored in User collection,
        role: 'teacher',
        roleId: savedTeacher._id,
        roleModel: 'Teacher',
        branchId,
      });
      await newUser.save();

      res.status(201).json({
        success: true,
        data: savedTeacher,
        message: 'Staff registered successfully and user account created',
      });
    } catch (error) {
      console.error('Error registering teacher:', error);
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res
          .status(400)
          .json({
            success: false,
            message: `A teacher with this ${field} already exists`,
          });
      }
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((err) => err.message);
        return res
          .status(400)
          .json({ success: false, message: errors.join(', ') });
      }
      res
        .status(500)
        .json({
          success: false,
          message: 'Server error',
          error: error.message,
        });
    }
  }
);

// GET /teachers - List all teachers
router.get(
  '/teachers',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const query =
        req.user.role === 'principal' ? { branchId: req.user.branchId } : {};
      const teachers = await Teacher.find(query).select('-password');
      res.json(teachers);
    } catch (error) {
      // console.error('Error fetching teachers:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// GET /teachers/search - Search teachers
router.get(
  '/teachers/search',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const query = req.query.q;
      const teachers = await Teacher.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { teacherId: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phoneNo: { $regex: query, $options: 'i' } },
        ],
        ...(req.user.role === 'principal'
          ? { branchId: req.user.branchId }
          : {}),
      }).select('-password');
      res.json(teachers);
    } catch (error) {
      // console.error('Error searching teachers:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// DELETE /teachers/:id - Delete a teacher
router.delete(
  '/teachers/:id',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const teacher = await Teacher.findById(req.params.id);
      if (!teacher) {
        return res
          .status(404)
          .json({ success: false, message: 'Staff not found' });
      }
      if (
        req.user.role === 'principal' &&
        teacher.branchId?.toString() !== req.user.branchId?.toString()
      ) {
        return res
          .status(403)
          .json({
            message:
              'Access denied. You can only delete teachers from your branch.',
          });
      }

      await User.findOneAndDelete({ email: teacher.email });
      await Teacher.findByIdAndDelete(req.params.id);
      res.json({
        success: true,
        message: 'User and Staff deleted successfully',
      });
    } catch (error) {
      // console.error('Error deleting teacher:', error);
      res
        .status(500)
        .json({
          success: false,
          message: 'Internal Server Error',
          error: error.message,
        });
    }
  }
);

// PUT /teachers/:id - Update a teacher
router.put(
  '/teachers/:id',
  authMiddleware,
  restrictAccess,
  upload.single('profilePic'),
  async (req, res) => {
    try {
      const {
        staffType,
        teacherId,
        name,
        email,
        phoneNo,
        qualification,
        classTeacherFor,
        section,
        joiningDate,
        gender,
        address,
        password,
        timetable,
        subject,
        dateOfBirth,
        designation,
        salary,
      } = req.body;

      const teacher = await Teacher.findById(req.params.id);
      if (!teacher) {
        return res
          .status(404)
          .json({ success: false, message: 'Teacher not found' });
      }
      if (
        req.user.role === 'principal' &&
        teacher.branchId?.toString() !== req.user.branchId?.toString()
      ) {
        return res
          .status(403)
          .json({
            message:
              'Access denied. You can only update teachers from your branch.',
          });
      }

      const parsedTimetable = timetable
        ? JSON.parse(timetable)
        : teacher.timetable;
      const updateData = {
        staffType: staffType || teacher.staffType,
        teacherId: teacherId || teacher.teacherId,
        name: name || teacher.name,
        email: email || teacher.email,
        phoneNo: phoneNo || teacher.phoneNo,
        joiningDate: joiningDate || teacher.joiningDate,
        dateOfBirth: dateOfBirth || teacher.dateOfBirth,
        gender: gender || teacher.gender,
        address: address || teacher.address,
        salary: salary || teacher.salary,
        timetable: parsedTimetable,
        profilePic: req.file ? req.file.path : teacher.profilePic,
      };

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }
      if (staffType === 'Teaching') {
        updateData.qualification = qualification || teacher.qualification;
        updateData.classTeacherFor = classTeacherFor || teacher.classTeacherFor;
        updateData.section = section || teacher.section;
        updateData.subject = subject || teacher.subject;
      } else {
        updateData.designation = designation || teacher.designation;
      }

      const updatedTeacher = await Teacher.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      const userUpdateData = { name: updateData.name, email: updateData.email };
      if (password) {
        userUpdateData.password = updateData.password;
      }
      await User.findOneAndUpdate({ email: teacher.email }, userUpdateData);

      res.json({
        success: true,
        data: updatedTeacher,
        message: 'Teacher updated successfully',
      });
    } catch (error) {
      // console.error('Error updating teacher:', error);
      res
        .status(500)
        .json({
          success: false,
          message: 'Server error',
          error: error.message,
        });
    }
  }
);

// GET /api/teacher/dashboard - Teacher dashboard data
router.get(
  '/teacher/dashboard',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const email = req.user.email;
      const teacher = await Teacher.findOne({ email });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      const query = req.user.branchId
        ? {
          className: teacher.classTeacherFor,
          section: teacher.section,
          branchId: req.user.branchId,
        }
        : { className: teacher.classTeacherFor, section: teacher.section };

      const totalStudents = await Student.countDocuments(query);
      const totalAssignments = teacher.timetable.filter(
        (t) => t.assignment
      ).length; // Simple count of assignments
      const todayDate = new Date().toISOString().split('T')[0];
      const attendanceToday = await Student.countDocuments({
        ...query,
        'attendance.date': todayDate,
        'attendance.status': 'Present',
      });

      const recentSubmissions = teacher.timetable
        .filter((t) => t.assignment && t.submittedBy)
        .slice(0, 5)
        .map((t) => ({
          title: t.assignment,
          submittedBy: t.submittedBy,
          submittedAt: t.submittedAt || new Date(),
        }));

      res.json({
        stats: { totalStudents, totalAssignments, attendanceToday },
        recentSubmissions,
      });
    } catch (error) {
      // console.error('Error fetching dashboard data:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// GET /teacher/leave-requests/:email - Fetch leave requests for students under a teacher
router.get(
  '/teacher/leave-requests/:email',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { email } = req.params;
      // console.log('Email received in request:', email); // Debugging

      // Validate email parameter
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Valid teacher email is required.',
          });
      }

      // Verify token (handled by authMiddleware, but ensure it's present)
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res
          .status(401)
          .json({
            success: false,
            message: 'Authorization token is required.',
          });
      }

      // Restrict teachers to their own data unless admin/principal
      if (req.user.role === 'teacher' && req.user.email !== email) {
        return res.status(403).json({
          success: false,
          message:
            'Access denied. You can only view leave requests for your own students.',
        });
      }

      // Find the teacher
      const teacher = await Teacher.findOne({ email });
      // console.log('Teacher found:', teacher); // Debugging
      if (!teacher) {
        return res
          .status(404)
          .json({ success: false, message: 'Teacher not found.' });
      }

      // Fetch students under the teacher's class and section
      const students = await Student.find({
        className: teacher.classTeacherFor,
        section: teacher.section,
      }).select('name leaveRequests'); // Optimize by selecting only needed fields

      // Map leave requests from students
      const leaveRequests = students.flatMap((student) =>
        student.leaveRequests.map((request) => ({
          _id: request._id,
          studentId: { _id: student._id, name: student.name },
          reason: request.reason,
          fromDate: request.fromDate,
          toDate: request.toDate,
          status: request.status,
        }))
      );

      // Debugging: Log the final leave requests
      // console.log('Leave requests:', leaveRequests);

      res.json({ success: true, leaveRequests });
    } catch (error) {
      // console.error('Error fetching leave requests:', error); // Debugging
      res.status(500).json({
        success: false,
        message: 'Internal server error.',
        error: error.message,
      });
    }
  }
);


// Approve or reject leave request (with email notifications)
// Approve or reject leave request (with email notifications)
router.put("/teacher/leave-request/:id", async (req, res) => {
  // console.log(req.params.id);

  // console.log(req.body);

  try {
    const requestId = req.params.id;
    const { status, email } = req.body;

    if (!status || !email) {
      return res.status(400).json({ error: "Missing required fields: status or email" });
    }

    const student = await Student.findOne({ "leaveRequests._id": requestId });
    if (!student) {
      return res.status(404).json({ error: "Leave request not found" });
    }
    const teacher = await Teacher.findOne({ email: email })

    const leaveRequest = student.leaveRequests.id(requestId);
    leaveRequest.status = status;
    await student.save();
    const fromDate = new Date(leaveRequest.fromDate).toISOString().split('T')[0];
    const toDate = new Date(leaveRequest.toDate).toISOString().split('T')[0];

    // Send email to student
    const studentEmail = student.email;
    const studentSubject = `Leave Request ${status}`;
    const studentHtml = `
   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #4CAF50; text-align: center;">Leave Request ${status}</h2>
      <p style="font-size: 16px; color: #333;">Dear ${student.name},</p>
      <p style="font-size: 16px; color: #333;">Your leave request has been <strong style="color: ${status === "Approved" ? "#4CAF50" : "red"};">${status}</strong> by <strong>${teacher.name}</strong> (Teacher).</p>
      
      <div style="background: #f8f8f8; padding: 15px; border-radius: 5px;">
        <p><strong>📅 From:</strong> ${fromDate}</p>
        <p><strong>📅 To:</strong> ${toDate}</p>
        <p><strong>📝 Reason:</strong> ${leaveRequest.reason}</p>
      </div>
    
    </div>
 
`;


    await sendEmail(studentEmail, studentSubject, studentHtml);

    // Send email to teacher
    const teacherEmail = "teacher@example.com"; // Replace with actual teacher email
    const teacherSubject = `Leave Request ${status}`;
    const teacherHtml = `
      <h1>Leave Request ${status}</h1>
      <p>You have ${status} a leave request from ${student.name}.</p>
      <p>From: ${leaveRequest.fromDate}</p>
      <p>To: ${leaveRequest.toDate}</p>
      <p>Reason: ${leaveRequest.reason}</p>
    `;

    await sendEmail(teacherEmail, teacherSubject, teacherHtml);

    res.status(200).json({ message: `Leave request ${status} successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/teacher/notifications/:email - Fetch teacher notifications
router.get(
  '/teacher/notifications/:email',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { email } = req.params;
      if (req.user.role === 'teacher' && req.user.email !== email) {
        return res
          .status(403)
          .json({
            message: 'Access denied. You can only view your own notifications.',
          });
      }

      const teacher = await Teacher.findOne({ email });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      res.json({ notifications: teacher.notifications || [] });
    } catch (error) {
      // console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);



// POST /:teacherId/payslips - Generate and save a payslip
router.post('/teachers/:teacherId/payslips', authMiddleware, restrictAccess, verifyTeacher, (req, res, next) => {
  payslipUpload.single('payslipPdf')(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req, res) => {
  try {
    const { month, year, netPay, payslipData } = req.body;
    const teacher = req.teacher;

    // Validate required fields
    if (!month || !year || !netPay || !payslipData || !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: month, year, netPay, payslipData, or payslipPdf',
      });
    }

    // Parse payslipData if it's a JSON string
    let parsedPayslipData;
    try {
      parsedPayslipData = typeof payslipData === 'string' ? JSON.parse(payslipData) : payslipData;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payslipData format',
      });
    }

    // Validate payslipData fields
    const requiredFields = [
      'empId', 'empName', 'doj', 'bankName', 'accountNo', 'location',
      'department', 'designation', 'panNo', 'epfNo', 'monthDays',
      'paidDays', 'basic', 'hra', 'conveyance', 'medical', 'bonus',
      'pf', 'esi', 'ptax',
    ];
    const missingFields = requiredFields.filter(field => !parsedPayslipData[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing payslipData fields: ${missingFields.join(', ')}`,
      });
    }

    // Validate that the filename matches the expected format
    const expectedFilename = `${parsedPayslipData.empId}_salslip_${month}_${year}.pdf`;
    if (req.file.filename !== expectedFilename) {
      return res.status(400).json({
        success: false,
        message: `Filename must be in the format: ${expectedFilename}`,
      });
    }

    // Generate unique payslipId
    const payslipId = uuidv4();

    // Create payslip object
    const newPayslip = {
      payslipId,
      month,
      year,
      filename: req.file.filename,
      generatedDate: new Date(),
      netPay: Number(netPay),
      payslipData: parsedPayslipData,
    };

    // Add payslip to teacher's payslips array
    teacher.payslips.push(newPayslip);
    await teacher.save();

    res.status(201).json({
      success: true,
      data: newPayslip,
      message: 'Payslip generated and saved successfully',
    });
  } catch (error) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded PDF:', unlinkError);
      }
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// GET /:teacherId/payslips - Retrieve all payslips for a teacher
router.get('/teachers/:teacherId/payslips', authMiddleware, restrictAccess, verifyTeacher, async (req, res) => {
  try {
    const teacher = req.teacher;
    res.status(200).json({
      success: true,
      data: teacher.payslips,
      message: 'Payslips retrieved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// GET /:teacherId/payslips/:payslipId - View details of a specific payslip
router.get('/teachers/:teacherId/payslips/:payslipId', authMiddleware, restrictAccess, verifyTeacher, async (req, res) => {
  try {
    const teacher = req.teacher;
    const payslip = teacher.payslips.find(p => p.payslipId === req.params.payslipId);
    if (!payslip) {
      return res.status(404).json({
        success: false,
        message: 'Payslip not found',
      });
    }
    res.status(200).json({
      success: true,
      data: payslip,
      message: 'Payslip details retrieved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// GET /:teacherId/payslips/:payslipId/download - Download a payslip PDF
router.get('/teachers/:teacherId/payslips/:payslipId/download', authMiddleware, restrictAccess, verifyTeacher, async (req, res) => {
  try {
    const teacher = req.teacher;
    const payslip = teacher.payslips.find(p => p.payslipId === req.params.payslipId);
    if (!payslip) {
      return res.status(404).json({
        success: false,
        message: 'Payslip not found',
      });
    }
    const filePath = path.join(__dirname, '..', 'Payslips', payslip.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'PDF file not found',
      });
    }
    res.download(filePath, payslip.filename);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// DELETE /:teacherId/payslips/:payslipId - Delete a payslip
router.delete('/teachers/:teacherId/payslips/:payslipId', authMiddleware, restrictAccess, verifyTeacher, async (req, res) => {
  try {
    const teacher = req.teacher;
    const payslipIndex = teacher.payslips.findIndex(p => p.payslipId === req.params.payslipId);
    if (payslipIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Payslip not found',
      });
    }
    const payslip = teacher.payslips[payslipIndex];
    const filePath = path.join(__dirname, '..', 'Payslips', payslip.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('Error deleting PDF file:', unlinkError);
      }
    }
    teacher.payslips.splice(payslipIndex, 1);
    await teacher.save();
    res.status(200).json({
      success: true,
      message: 'Payslip deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// GET /payslips/:filename - Serve payslip PDF for viewing
router.get('/teachers/payslips/:filename', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'Payslips', req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'PDF file not found',
      });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${req.params.filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;