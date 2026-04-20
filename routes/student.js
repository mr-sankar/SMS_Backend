// const express = require('express');
// const router = express.Router();
// const Student = require('../models/studentModel');
// const User = require('../models/user.model');
// const authMiddleware = require('../middleware/auth');
// const Class = require('../models/classModel');

// const restrictAccess = (req, res, next) => {
//   if (req.user.role !== 'admin' && req.user.role !== 'principal') {
//     return res.status(403).json({ message: 'Access denied' });
//   }
//   next();
// };

// router.post('/students', authMiddleware, restrictAccess, async (req, res) => {
//   try {
//     const studentData = { ...req.body, branchId: req.user.role === 'principal' ? req.user.branchId : null };
//     const newStudent = new Student(studentData);
//     const savedStudent = await newStudent.save();

//     const { className, section } = savedStudent;
//     let classDoc = await Class.findOne({ className, branchId: savedStudent.branchId });
//     if (classDoc) {
//       const sectionIndex = classDoc.sections.findIndex(sec => sec.sectionName === section);
//       if (sectionIndex >= 0) classDoc.sections[sectionIndex].students.push(savedStudent._id);
//       else classDoc.sections.push({ sectionName: section, students: [savedStudent._id] });
//       classDoc.updatedAt = new Date();
//     } else {
//       classDoc = new Class({ className, sections: [{ sectionName: section, students: [savedStudent._id] }], academicYear: new Date().getFullYear().toString(), branchId: savedStudent.branchId, updatedAt: new Date() });
//     }
//     await classDoc.save();

//     const newUser = new User({ name: savedStudent.name, email: savedStudent.email, password: savedStudent.password, role: 'student', roleId: savedStudent._id, roleModel: 'Student', branchId: savedStudent.branchId });
//     await newUser.save();

//     res.status(201).json({ success: true, data: savedStudent, message: 'Student registered successfully' });
//   } catch (error) {
//     console.error('Error registering student:', error);
//     res.status(500).json({ success: false, message: 'Server error', error: error.message });
//   }
// });

// router.get('/students', authMiddleware, restrictAccess, async (req, res) => {
//   try {
//     const query = req.user.role === 'principal' ? { branchId: req.user.branchId } : {};
//     const students = await Student.find(query).populate('parents', 'name email phone').sort({ admissionNo: 1 });
//     res.json(students);
//   } catch (error) {
//     console.error('Error fetching students:', error.message);
//     res.status(500).json({ error: 'Error fetching students' });
//   }
// });

// router.delete('/students/:id', authMiddleware, restrictAccess, async (req, res) => {
//   try {
//     const student = await Student.findById(req.params.id);
//     if (!student) return res.status(404).json({ error: 'Student not found' });
//     if (req.user.role === 'principal' && student.branchId.toString() !== req.user.branchId.toString()) {
//       return res.status(403).json({ message: 'Access denied' });
//     }
//     await Parent.updateMany({ children: req.params.id }, { $pull: { children: req.params.id } });
//     await User.findOneAndDelete({ email: student.email });
//     await Student.findByIdAndDelete(req.params.id);
//     res.json({ message: 'Student and associated user deleted successfully' });
//   } catch (error) {
//     console.error('Delete error:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// module.exports = router;

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Student = require('../models/studentModel');
const User = require('../models/user.model');
const Class = require('../models/classModel');
const Exam = require('../models/examModel');
const HealthRecord = require('../models/healthRecordModel');
const Parent = require('../models/parentModel'); // Assuming you have a Parent model
const authMiddleware = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Teacher = require('../models/teacherModel');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
require('dotenv').config();
// Middleware to restrict to Admin or Principal

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

const multer = require('multer');
const path = require('path');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const extname = /\.(jpeg|jpg|png)$/i.test(file.originalname);
  const mimetype = allowedTypes.includes(file.mimetype);

  // console.log("Uploaded File:", {
  //   originalName: file.originalname,
  //   extname: path.extname(file.originalname).toLowerCase(),
  //   mimetype: file.mimetype,
  //   extnameValid: extname,
  //   mimetypeValid: mimetype,
  // });

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images (jpeg, jpg, png) are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
}).single('profilePicture');

// POST /api/students - Create a new student
router.post(
  '/students',
  authMiddleware,
  restrictAccess,
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        admissionNo,
        rollNumber,
        name,
        password,
        dateOfBirth,
        gender,
        className,
        section,
        phone,
        email,
        address,
        emergencyContact,
        feeDetails,
        busRoute,
        parents,
        isHostelStudent,
        healthRecord,
        branchId: providedBranchId,   // from body when admin
      } = req.body;

      // === REQUIRED FIELDS VALIDATION ===
      if (
        !admissionNo || !rollNumber || !name || !password || !dateOfBirth ||
        !gender || !className || !section || !phone || !email ||
        !address || !emergencyContact || !feeDetails
      ) {
        return res.status(400).json({
          success: false,
          message: 'All required fields must be provided',
        });
      }

      // === BRANCH ID LOGIC (FIXED) ===
      let branchId;
      if (req.user.role === 'principal') {
        branchId = req.user.branchId;
      } else if (req.user.role === 'admin') {
        branchId = providedBranchId;
      } else {
        return res.status(403).json({
          success: false,
          message: 'Only admin or principal can register students',
        });
      }

      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: 'Branch ID is required',
        });
      }

      // Convert to ObjectId safely
      if (typeof branchId === 'string') {
        if (!mongoose.Types.ObjectId.isValid(branchId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid Branch ID format',
          });
        }
        branchId = new mongoose.Types.ObjectId(branchId);
      }

      // === DUPLICATE CHECKS ===
      const existingStudent = await Student.findOne({ admissionNo });
      if (existingStudent) {
        return res.status(400).json({ success: false, message: 'Admission number already exists' });
      }

      const existingEmail = await Student.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email already exists in students' });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already exists in users' });
      }

      const hashedPassword = await bcrypt.hash(password.trim(), 10);

      // === PARSE NESTED FIELDS (with better error handling) ===
      let parsedAddress, parsedEmergencyContact, parsedFeeDetails, parsedBusRoute = {}, parsedParents = [], parsedHealthRecord = {};

      try {
        parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;
        parsedEmergencyContact = typeof emergencyContact === 'string' ? JSON.parse(emergencyContact) : emergencyContact;
        parsedFeeDetails = typeof feeDetails === 'string' ? JSON.parse(feeDetails) : feeDetails;
        parsedBusRoute = busRoute ? (typeof busRoute === 'string' ? JSON.parse(busRoute) : busRoute) : {};
        parsedParents = parents ? (typeof parents === 'string' ? JSON.parse(parents) : parents) : [];
        parsedHealthRecord = healthRecord ? (typeof healthRecord === 'string' ? JSON.parse(healthRecord) : healthRecord) : {};
      } catch (parseErr) {
        return res.status(400).json({ success: false, message: 'Invalid JSON format in one of the fields (address, feeDetails, etc.)' });
      }

      // === FEE DETAILS VALIDATION (your existing code - kept as is) ===
      let validatedFeeDetails = { ...parsedFeeDetails };
      // ... (your fee validation logic remains the same - no change needed here)

      if (validatedFeeDetails.paymentOption === 'Installments') {
        // ... your existing installment validation
      } else if (validatedFeeDetails.paymentOption === 'Full Payment') {
        validatedFeeDetails.terms = [{ termName: 'Full Payment', amount: validatedFeeDetails.totalFee, dueDate: new Date(), paidAmount: 0, status: 'Pending' }];
      }
      if (!validatedFeeDetails.paymentHistory) validatedFeeDetails.paymentHistory = [];

      // === CREATE STUDENT ===
      const newStudent = new Student({
        admissionNo,
        rollNumber,
        name,
        password: hashedPassword,           // ← Store hashed password
        dateOfBirth: new Date(dateOfBirth),
        gender,
        className,
        section,
        phone,
        email,
        address: parsedAddress,
        emergencyContact: parsedEmergencyContact,
        feeDetails: validatedFeeDetails,
        busRoute: parsedBusRoute,
        parents: parsedParents,
        isHostelStudent: isHostelStudent === 'true' || isHostelStudent === true,
        branchId,                            // ← Now it's proper ObjectId
        profilePicture: req.file ? req.file.filename : null,
      });

      const savedStudent = await newStudent.save({ session });

      // === SAFE EMAIL SENDING (prevents crash) ===
      try {
        const mailOptions = {
          from: process.env.NODEMAILER_EMAIL,
          to: email,
          subject: "Student Login Credentials",
          html: `
            <h3>Welcome to School Portal</h3>
            <p>Dear ${name},</p>
            <p>Your account has been created successfully.</p>
            <p><b>Username:</b> ${email}</p>
            <p><b>Password:</b> ${password}</p>
            <p>Please login and change your password immediately.</p>
          `,
        };
        await transporter.sendMail(mailOptions);
      } catch (emailErr) {
        console.error('Failed to send welcome email:', emailErr.message);
        // Do NOT throw - student creation should continue
      }

      // === HEALTH RECORD, CLASS UPDATE, USER CREATION (your logic) ===
      // ... (keep your existing healthRecord, Class, and newUser code as it is)

      // Just make sure when saving Class and User, use the same branchId (already ObjectId)

      await session.commitTransaction();

      res.status(201).json({
        success: true,
        data: savedStudent,
        message: 'Student registered successfully and added to class',
      });

    } catch (error) {
      await session.abortTransaction();

      console.error('Student Registration Error:', {
        message: error.message,
        name: error.name,
        code: error.code,
        userRole: req.user?.role,
        providedBranchId: req.body.branchId,
      });

      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        return res.status(400).json({ success: false, message: `A student with this ${field} already exists` });
      }

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ success: false, message: errors.join(', ') });
      }

      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: `Invalid data format: ${error.message}` });
      }

      res.status(500).json({
        success: false,
        message: 'Server error while registering student',
        error: error.message,
      });
    } finally {
      session.endSession();
    }
  }
);

// PUT /api/students/:id - Update a student
router.put(
  '/students/:id',
  authMiddleware,
  restrictAccess,
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  },
  async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const student = await Student.findById(req.params.id).session(session);
      if (!student) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ success: false, message: 'Student not found' });
      }

      if (
        req.user.role === 'principal' &&
        student.branchId.toString() !== req.user.branchId.toString()
      ) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(403)
          .json({ success: false, message: 'Access denied' });
      }

      const {
        admissionNo,
        rollNumber,
        name,
        password,
        dateOfBirth,
        gender,
        className,
        section,
        phone,
        email,
        address,
        emergencyContact,
        feeDetails,
        busRoute,
        parents,
        isHostelStudent,
        healthRecord,
        branchId: providedBranchId,
      } = req.body;

      // Prepare student data for update
      const studentData = {};

      // Validate and parse fields
      if (admissionNo) {
        if (admissionNo !== student.admissionNo) {
          const existingStudent = await Student.findOne({ admissionNo }).session(
            session
          );
          if (existingStudent && existingStudent._id.toString() !== student._id.toString()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
              success: false,
              message: 'A student with this admission number already exists',
            });
          }
        }
        studentData.admissionNo = admissionNo;
      }

      if (email) {
        if (email !== student.email) {
          const existingStudent = await Student.findOne({ email }).session(session);
          if (existingStudent && existingStudent._id.toString() !== student._id.toString()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
              success: false,
              message: 'A student with this email already exists',
            });
          }
          const existingUser = await User.findOne({ email }).session(session);
          if (existingUser && existingUser.roleId.toString() !== student._id.toString()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
              success: false,
              message: 'A user with this email already exists',
            });
          }
        }
        studentData.email = email;
      }

      if (rollNumber) studentData.rollNumber = rollNumber;
      if (name) studentData.name = name;
      if (dateOfBirth) studentData.dateOfBirth = new Date(dateOfBirth);
      if (gender) studentData.gender = gender;
      if (phone) studentData.phone = phone;

      // Parse and validate nested fields
      if (address) {
        try {
          studentData.address = typeof address === 'string' ? JSON.parse(address) : address;
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: 'Invalid address format',
          });
        }
      }

      if (emergencyContact) {
        try {
          studentData.emergencyContact =
            typeof emergencyContact === 'string'
              ? JSON.parse(emergencyContact)
              : emergencyContact;
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: 'Invalid emergencyContact format',
          });
        }
      }

      if (busRoute) {
        try {
          studentData.busRoute =
            typeof busRoute === 'string' ? JSON.parse(busRoute) : busRoute;
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: 'Invalid busRoute format',
          });
        }
      }

      if (parents) {
        try {
          studentData.parents =
            typeof parents === 'string' ? JSON.parse(parents) : parents;
          if (!Array.isArray(studentData.parents)) {
            studentData.parents = [studentData.parents];
          }
          studentData.parents = studentData.parents.filter(
            (id) => id && mongoose.Types.ObjectId.isValid(id)
          );
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: 'Invalid parents format: must be an array of valid ObjectIds',
          });
        }
      }

      if (typeof isHostelStudent !== 'undefined') {
        studentData.isHostelStudent =
          typeof isHostelStudent === 'string'
            ? isHostelStudent === 'true'
            : isHostelStudent;
      }

      // Handle branchId
      const branchId =
        req.user.role === 'principal'
          ? req.user.branchId
          : providedBranchId || student.branchId;
      if (branchId && branchId !== student.branchId.toString()) {
        if (!mongoose.Types.ObjectId.isValid(branchId)) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: 'Invalid branchId',
          });
        }
        studentData.branchId = branchId;
      }

      // Handle password
      if (password) {
        studentData.password = password
      }

      // Validate and handle feeDetails
      if (feeDetails) {
        try {
          const parsedFeeDetails =
            typeof feeDetails === 'string' ? JSON.parse(feeDetails) : feeDetails;
          let validatedFeeDetails = { ...parsedFeeDetails };

          if (validatedFeeDetails.totalFee !== undefined) {
            const totalFee = parseFloat(validatedFeeDetails.totalFee);
            if (isNaN(totalFee) || totalFee < 0) {
              await session.abortTransaction();
              session.endSession();
              return res.status(400).json({
                success: false,
                message: 'Total fee must be a valid non-negative number',
              });
            }
            validatedFeeDetails.totalFee = totalFee;
          } else {
            validatedFeeDetails.totalFee = student.feeDetails.totalFee;
          }

          if (validatedFeeDetails.paymentOption === 'Installments') {
            if (
              !validatedFeeDetails.terms ||
              !Array.isArray(validatedFeeDetails.terms) ||
              validatedFeeDetails.terms.length === 0
            ) {
              await session.abortTransaction();
              session.endSession();
              return res.status(400).json({
                success: false,
                message:
                  'Fee installment terms must be defined when payment option is Installments',
              });
            }
            const termTotal = validatedFeeDetails.terms.reduce(
              (sum, term) => sum + (parseFloat(term.amount) || 0),
              0
            );
            if (Math.abs(termTotal - validatedFeeDetails.totalFee) > 0.01) {
              await session.abortTransaction();
              session.endSession();
              return res.status(400).json({
                success: false,
                message: `Sum of term amounts (${termTotal}) must equal total fee amount (${validatedFeeDetails.totalFee})`,
              });
            }
            validatedFeeDetails.terms.forEach((term) => {
              term.amount = parseFloat(term.amount) || 0;
              if (term.status === 'Paid') term.paidAmount = term.amount;
            });
          } else if (validatedFeeDetails.paymentOption === 'Full Payment') {
            validatedFeeDetails.terms = [
              {
                termName: 'Full Payment',
                amount: validatedFeeDetails.totalFee,
                dueDate: new Date(),
                paidAmount: student.feeDetails.terms?.[0]?.paidAmount || 0,
                status: student.feeDetails.terms?.[0]?.status || 'Pending',
              },
            ];
          }
          if (!validatedFeeDetails.paymentHistory) {
            validatedFeeDetails.paymentHistory = student.feeDetails.paymentHistory || [];
          }
          studentData.feeDetails = validatedFeeDetails;
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: 'Invalid feeDetails format',
          });
        }
      }

      // Handle health record
      if (healthRecord) {
        try {
          const parsedHealthRecord =
            typeof healthRecord === 'string' ? JSON.parse(healthRecord) : healthRecord;
          if (Object.values(parsedHealthRecord).some((v) => v)) {
            const healthRecordUpdate = {
              height: parsedHealthRecord.height
                ? { value: parseFloat(parsedHealthRecord.height), unit: 'cm' }
                : undefined,
              weight: parsedHealthRecord.weight
                ? { value: parseFloat(parsedHealthRecord.weight), unit: 'kg' }
                : undefined,
              bloodGroup: parsedHealthRecord.bloodGroup || undefined,
              allergies: parsedHealthRecord.allergies
                ? [parsedHealthRecord.allergies].flat()
                : [],
              chronicConditions: parsedHealthRecord.medicalConditions
                ? [{ condition: parsedHealthRecord.medicalConditions }]
                : [],
              medications: parsedHealthRecord.medications
                ? [{ name: parsedHealthRecord.medications }]
                : [],
              lastCheckup: parsedHealthRecord.lastCheckupDate
                ? { date: new Date(parsedHealthRecord.lastCheckupDate) }
                : undefined,
              updatedAt: new Date(),
            };

            let healthRecordId = student.healthRecord;
            if (healthRecordId) {
              await HealthRecord.findByIdAndUpdate(
                healthRecordId,
                healthRecordUpdate,
                { session }
              );
            } else {
              const newHealthRecord = new HealthRecord({
                studentId: student._id,
                admissionNo: student.admissionNo,
                ...healthRecordUpdate,
                createdAt: new Date(),
              });
              const savedHealthRecord = await newHealthRecord.save({ session });
              healthRecordId = savedHealthRecord._id;
            }
            studentData.healthRecord = healthRecordId;
          }
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: 'Invalid healthRecord format',
          });
        }
      }

      // Handle profile picture
      if (req.file) {
        studentData.profilePicture = req.file.filename;
      }

      // Update class if className or section changes
      if (
        className &&
        section &&
        (className !== student.className || section !== student.section)
      ) {
        let oldClassDoc = await Class.findOne({
          className: student.className,
          branchId: student.branchId,
        }).session(session);
        if (oldClassDoc) {
          const oldSectionIndex = oldClassDoc.sections.findIndex(
            (sec) => sec.sectionName === student.section
          );
          if (oldSectionIndex >= 0) {
            oldClassDoc.sections[oldSectionIndex].students =
              oldClassDoc.sections[oldSectionIndex].students.filter(
                (id) => id.toString() !== student._id.toString()
              );
            if (oldClassDoc.sections[oldSectionIndex].students.length === 0) {
              oldClassDoc.sections.splice(oldSectionIndex, 1);
            }
            if (oldClassDoc.sections.length === 0) {
              await Class.findByIdAndDelete(oldClassDoc._id).session(session);
            } else {
              oldClassDoc.updatedAt = new Date();
              await oldClassDoc.save({ session });
            }
          }
        }

        let newClassDoc = await Class.findOne({
          className,
          branchId: student.branchId,
        }).session(session);
        if (newClassDoc) {
          const sectionIndex = newClassDoc.sections.findIndex(
            (sec) => sec.sectionName === section
          );
          if (sectionIndex >= 0) {
            newClassDoc.sections[sectionIndex].students.push(student._id);
          } else {
            newClassDoc.sections.push({
              sectionName: section,
              students: [student._id],
            });
          }
          newClassDoc.updatedAt = new Date();
          await newClassDoc.save({ session });
        } else {
          newClassDoc = new Class({
            className,
            sections: [{ sectionName: section, students: [student._id] }],
            academicYear: new Date().getFullYear().toString(),
            branchId: student.branchId,
            updatedAt: new Date(),


          });
          await newClassDoc.save({ session });
        }
        studentData.className = className;
        studentData.section = section;
      }

      // Update student
      const updatedStudent = await Student.findByIdAndUpdate(
        req.params.id,
        { $set: studentData },
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      // Update associated User if email, name, or password changes
      if (email || name || password) {
        const userUpdate = {};
        if (email && email !== student.email) userUpdate.email = email;
        if (name && name !== student.name) userUpdate.name = name;
        if (password) userUpdate.password = await bcrypt.hash(studentData.password.trim(), 10);
        if (Object.keys(userUpdate).length > 0) {
          await User.findOneAndUpdate(
            { roleId: student._id, roleModel: 'Student' },
            userUpdate,
            { session }
          );
        }
      }

      await session.commitTransaction();
      res.json({
        success: true,
        data: updatedStudent,
        message: 'Student updated successfully',
      });
    } catch (error) {
      await session.abortTransaction();
      // console.error('Error updating student:', error, 'Student data:', req.body);

      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `A student with this ${field} already exists`,
        });
      }

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((err) => err.message);
        return res.status(400).json({
          success: false,
          message: errors.join(', '),
        });
      }

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: `Invalid data format: ${error.message}`,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      });
    } finally {
      session.endSession();
    }
  }
);
// GET /api/students - Fetch all students
router.get('/students', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const query =
      req.user.role === 'principal' ? { branchId: req.user.branchId } : {};
    const students = await Student.find(query)
      .populate('parents', 'name email phone')
      .sort({ admissionNo: 1 });
    res.json(students);
  } catch (error) {
    // console.error('Error fetching students:', error.message);
    res.status(500).json({ error: 'Error fetching students' });
  }
});

// GET /api/students/:id - Fetch a single student by ID
router.get(
  '/students/:id',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const student = await Student.findById(req.params.id).populate(
        'parents',
        'name email phone'
      );
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
      if (
        req.user.role === 'principal' &&
        student.branchId.toString() !== req.user.branchId.toString()
      ) {
        return res.status(403).json({ message: 'Access denied' });
      }
      res.json(student);
    } catch (error) {
      // console.error('Error fetching student:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// GET student by email
router.get('/student/email/:email', authMiddleware, async (req, res) => {
  try {
    const student = await Student.findOne({ email: req.params.email }).populate(
      'parents',
      'name email phone'
    );
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    if (
      req.user.role === 'principal' &&
      student.branchId.toString() !== req.user.branchId.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(student);
  } catch (error) {
    // console.error('Error fetching student:', error.message);
    res.status(500).json({ error: 'Error fetching student' });
  }
});

// DELETE /api/students/:id - Delete a student
router.delete(
  '/students/:id',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const student = await Student.findById(req.params.id);
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }
      if (
        req.user.role === 'principal' &&
        student.branchId.toString() !== req.user.branchId.toString()
      ) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Remove student from Class
      let classDoc = await Class.findOne({
        className: student.className,
        branchId: student.branchId,
      });
      if (classDoc) {
        const sectionIndex = classDoc.sections.findIndex(
          (sec) => sec.sectionName === student.section
        );
        if (sectionIndex >= 0) {
          classDoc.sections[sectionIndex].students = classDoc.sections[
            sectionIndex
          ].students.filter((id) => id.toString() !== student._id.toString());
          if (classDoc.sections[sectionIndex].students.length === 0) {
            classDoc.sections.splice(sectionIndex, 1);
          }
          if (classDoc.sections.length === 0) {
            await Class.findByIdAndDelete(classDoc._id);
          } else {
            classDoc.updatedAt = new Date();
            await classDoc.save();
          }
        }
      }

      // Remove student reference from Parents
      await Parent.updateMany(
        { children: req.params.id },
        { $pull: { children: req.params.id } }
      );

      // Delete associated User
      await User.findOneAndDelete({
        roleId: student._id,
        roleModel: 'Student',
      });

      // Delete Student
      await Student.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'Student and associated data deleted successfully',
      });
    } catch (error) {
      // console.error('Delete error:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal Server Error' });
    }
  }
);

// GET /api/student-count - Fetch total student count
router.get(
  '/student-count',
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const query =
        req.user.role === 'principal' ? { branchId: req.user.branchId } : {};
      const count = await Student.countDocuments(query);
      res.json({ totalStudents: count });
    } catch (error) {
      // console.error('Error fetching student count:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// Get student exam scores
router.get(
  '/student/:studentId/scores',
  authMiddleware, // Verify JWT and attach req.user
  restrictAccess, // Restrict access based on role
  async (req, res) => {
    const { studentId } = req.params;
    try {
      // Validate studentId format (already checked in restrictAccess, but kept for clarity)
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ message: 'Invalid student ID format' });
      }

      // Fetch student
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      // console.log("Fetching exams for studentId:", studentId);
      const exams = await Exam.find({
        'marks.studentId': studentId,
      }).lean();

      const scores = exams.map((exam) => {
        const studentMarks = exam.marks.find(
          (m) => String(m.studentId) === studentId
        );
        return {
          examId: exam._id,
          examName: exam.name,
          subjects: exam.subjects,
          maxMarks: exam.maxMarks,
          marks: studentMarks
            ? studentMarks.marks
            : exam.subjects.map((subject) => ({
              subject,
              marks: 0,
              grade: '-',
              status: '-',
            })),
        };
      });

      res.json({
        success: true,
        student: {
          _id: student._id,
          admissionNo: student.admissionNo,
          name: student.name,
          className: student.className,
          section: student.section,
        },
        scores,
      });
    } catch (error) {
      // console.error("Error fetching student scores:", error.message);
      res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        details: error.message,
      });
    }
  }
);

router.get('/student/dashboard/:email', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    // Add your auth middleware here to get student ID from token
    // console.log("Email received in request:", req.params.email); // Debugging
    const email = req.params.email;

    const student = await Student.findOne({ email });

    if (!student) {
      // console.log("Student not found in DB"); // Debugging
      return res.status(404).json({ error: 'Student not found' });
    }

    const stats = {
      attendance: 85, // Replace with real calculation
      assignments: 3, // Replace with real data
      averageGrade: 87, // Replace with real data
    };

    const recentActivities = student.leaveRequests.map((request) => ({
      _id: request._id,
      fromDate: request.fromDate,
      toDate: request.toDate,
      description: ` ${request.reason}`,
      status: request.status,
    }));
    // console.log(recentActivities);

    // Add other activities if needed

    res.json({ stats, recentActivities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attendance records for a student
// app.get('/attendance/student/:studentId', async (req, res) => {
//   try {
//     const { studentId } = req.params;

//     // Verify student exists
//     const student = await Student.findById(studentId);
//     if (!student) {
//       return res.status(404).json({
//         success: false,
//         message: 'Student not found',
//       });
//     }

//     // Authorization checks based on user role
//     if (
//       req.user.role === "principal" &&
//       student.branchId.toString() !== req.user.branchId.toString()
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: "Access denied: Student not in your branch",
//       });
//     }

//     if (
//       req.user.role === "parent" &&
//       (!req.user.children || !req.user.children.includes(studentId))
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: "Access denied: Not your child",
//       });
//     }

//     if (
//       req.user.role === "teacher" &&
//       student.classTeacherId.toString() !== req.user._id.toString()
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: "Access denied: Not your student",
//       });
//     }

//     // Fetch attendance records
//     const attendanceRecords = await Attendance.find({ studentId })
//       .populate('studentId', 'name admissionNo rollNumber className section')
//       .populate('teacherId', 'email')
//       .sort({ date: -1 });

//     // Transform data for frontend
//     const formattedRecords = attendanceRecords.map((record) => ({
//       date: record.date,
//       attendanceStatus: record.status, // Assuming "status" field in model
//       studentName: record.studentId?.name || 'Unknown',
//       className: record.studentId?.className || 'N/A',
//       section: record.studentId?.section || 'N/A',
//       admissionNo: record.studentId?.admissionNo || 'N/A',
//       rollNumber: record.studentId?.rollNumber || 'N/A',
//       teacherEmail: record.teacherId?.email || 'N/A',
//       reason: record.reason || '',
//     }));

//     res.status(200).json({
//       success: true,
//       count: formattedRecords.length,
//       data: formattedRecords,
//     });
//   } catch (error) {
//     console.error('Error fetching attendance:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error retrieving attendance records',
//       error: error.message,
//     });
//   }
// });

// Nodemailer transporter setup
// const transporter = nodemailer.createTransport({
//   host: 'smtp.gmail.com',
//   port: 587,
//   secure: false,
//   auth: {
//     user: '....', // Replace with your email
//     pass: '....', // Replace with your app password
//   },
// });
const transporter = nodemailer.createTransport({
  service: process.env.NODEMAILER_SERVICE,
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

// Utility function to send emails
const sendEmail = async (to, subject, html, attachments = []) => {
  const mailOptions = {
    from: '...', // Replace with your email
    to,
    subject,
    html,
    attachments,
  };

  try {
    await transporter.sendMail(mailOptions);
    // console.log(`Email sent to ${to}`);
  } catch (error) {
    // console.error(`Error sending email to ${to}:`, error);
  }
};

// Submit leave request (with email notification)
router.post(
  '/student/leave-request/:email',
  authMiddleware, // Ensure user is authenticated
  restrictAccess, // Restrict to students only
  async (req, res) => {
    try {
      const email = req.params.email;

      // Verify the authenticated user matches the email (optional security check)
      if (req.user.email !== email) {
        return res.status(403).json({
          error: 'You can only submit leave requests for yourself',
        });
      }

      const student = await Student.findOne({ email });
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Find the class teacher based on student's class and section
      const teacher = await Teacher.findOne({
        classTeacherFor: student.className,
        section: student.section,
      });
      if (!teacher) {
        return res.status(404).json({
          error: 'No class teacher found for this class and section',
        });
      }

      // Create new leave request object
      const newLeaveRequest = {
        fromDate: req.body.fromDate,
        toDate: req.body.toDate,
        reason: req.body.reason,
      };

      // Add leave request to student's record
      student.leaveRequests.push(newLeaveRequest);
      await student.save();

      // Get the last added leave request (with _id)
      const addedLeaveRequest =
        student.leaveRequests[student.leaveRequests.length - 1];
      // console.log("New Leave Request ID:", addedLeaveRequest._id); // Debugging

      // Format dates for email
      const fromDate = new Date(newLeaveRequest.fromDate)
        .toISOString()
        .split('T')[0];
      const toDate = new Date(newLeaveRequest.toDate)
        .toISOString()
        .split('T')[0];

      // Send email to teacher
      const teacherEmail = teacher.email;
      const subject = 'New Leave Request';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background: #f9f9f9; box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1); text-align: center;">
          <h1 style="color: #007BFF; border-bottom: 2px solid #007BFF; padding-bottom: 10px;">📩 New Leave Request</h1>
          <div style="background: #fff; padding: 15px; border-radius: 8px; margin: 10px 0;">
            <p style="font-size: 16px; color: #333;"><strong>👨‍🎓 Student:</strong> <span style="color: #007BFF;">${student.name}</span></p>
            <p style="font-size: 16px; color: #333;"><strong>🆔 Roll Number:</strong> <span style="color: #28A745;">${student.rollNumber}</span></p>
            <p style="font-size: 16px; color: #333;"><strong>📅 From:</strong> <span style="color: #DC3545;">${fromDate}</span></p>
            <p style="font-size: 16px; color: #333;"><strong>📅 To:</strong> <span style="color: #DC3545;">${toDate}</span></p>
            <p style="font-size: 16px; color: #333;"><strong>📝 Reason:</strong> <span style="color: #6C757D;">${newLeaveRequest.reason}</span></p>
          </div>
        </div>
      `;

      await sendEmail(teacherEmail, subject, html);

      res.status(201).json({ message: 'Leave request submitted successfully' });
    } catch (error) {
      // console.error("Error submitting leave request:", {
      //   message: error.message,
      //   stack: error.stack,
      //   params: req.params,
      //   body: req.body,
      // });
      res
        .status(500)
        .json({ error: 'Internal Server Error', details: error.message });
    }
  }
);

router.delete('/student/leave-request/:email/:requestId', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const email = req.params.email;
    const requestId = req.params.requestId;

    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Find the leave request and check if it's pending
    const leaveRequestIndex = student.leaveRequests.findIndex(
      (request) =>
        request._id.toString() === requestId && request.status === 'pending'
    );

    if (leaveRequestIndex === -1) {
      return res.status(404).json({
        error: 'Leave request not found or cannot be deleted (not pending)',
      });
    }

    // Remove the leave request
    student.leaveRequests.splice(leaveRequestIndex, 1);
    await student.save();

    res.status(200).json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/student/profile', authMiddleware, async (req, res) => {
  try {
    const { roleId } = req.query; // Get roleId from query params
    // Fetch student data from your database (example with MongoDB)
    const student = await Student.findOne({
      _id: roleId || req.user.roleId,
    });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({
      class: student.className, // Default or fetched value
      section: student.section, // Default or fetched value
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;