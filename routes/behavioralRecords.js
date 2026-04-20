const express = require('express');
const router = express.Router();
const Teacher = require('../models/teacherModel');
const Class = require('../models/classModel');
const BehavioralRecord = require('../models/BehavioralRecord');
const Student = require('../models/studentModel');
const authMiddleware = require('../middleware/auth');

const restrictAccess = (req, res, next) => {
  if (!['teacher', 'principal', 'admin', 'student', 'parent'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
  }
  next();
};

// GET: Fetch behavioral records for teacher's class
router.get('/behavioralRecords/:email', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { email } = req.params;
    // console.log('Fetching behavioral records for teacher:', email);

    if (!email) {
      return res.status(400).json({ message: 'Teacher email is required' });
    }

    if (req.user.role === 'teacher' && req.user.email !== email) {
      return res.status(403).json({
        message: 'Access denied. You can only access your own class data.',
      });
    }

    const teacher = await Teacher.findOne({ email }).select('classTeacherFor section branchId');
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }

    const { classTeacherFor: className, section, branchId } = teacher;
    // console.log('Teacher class and section:', { className, section });

    if (!className || !section) {
      return res.status(400).json({
        message: 'Class and section not assigned to this teacher.',
      });
    }

    const classDoc = await Class.findOne({
      className,
      'sections.sectionName': section,
      branchId,
    });
    if (!classDoc) {
      return res.status(404).json({
        message: 'Class or section not found for this teacher.',
      });
    }

    const sectionData = classDoc.sections.find((sec) => sec.sectionName === section);
    const studentIds = sectionData.students;
    // console.log('Student IDs from Class collection:', studentIds);

    if (!studentIds || studentIds.length === 0) {
      return res.status(404).json({
        message: 'No students found in this class and section.',
      });
    }

    const behavioralRecords = await BehavioralRecord.find({
      student: { $in: studentIds },
      branchId,
    })
      .populate('student', 'name rollNumber admissionNo')
      .sort({ lastUpdated: -1 });

    // console.log('Behavioral records found:', behavioralRecords);

    if (!behavioralRecords || behavioralRecords.length === 0) {
      return res.status(404).json({
        message: 'No behavioral records found for these students.',
      });
    }

    res.status(200).json({
      records: behavioralRecords,
    });
  } catch (error) {
    // console.error('Error fetching behavioral records:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

router.get(
  "/students/:studentId/behavioral-records",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { studentId } = req.params;

      // Verify student exists
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      // Check branch access for principal
      if (
        req.user.role === "principal" &&
        student.branchId.toString() !== req.user.branchId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Student not in your branch",
        });
      }

      const records = await BehavioralRecord.find({
        student: studentId,
        branchId: req.user.branchId, // Filter by branch
      })
        .populate("student", "name admissionNo")
        .sort({ lastUpdated: -1 });

      res.status(200).json({
        success: true,
        count: records.length,
        data: records,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error retrieving behavioral records",
        error: error.message,
      });
    }
  }
);

// POST: Add a new behavioral record
router.post('/students/:studentId/behavioral-records', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { studentId } = req.params;
    // console.log('POST request received for studentId:', studentId);
    // console.log('Request body:', req.body);

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (req.user.role === 'teacher' && student.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Student not in your branch',
      });
    }

    const teacher = await Teacher.findOne({ email: req.user.email }).select('classTeacherFor section branchId');
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }

    const classDoc = await Class.findOne({
      className: teacher.classTeacherFor,
      'sections.sectionName': teacher.section,
      branchId: teacher.branchId,
    });
    if (!classDoc || !classDoc.sections.find((sec) => sec.sectionName === teacher.section).students.includes(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Student not in your class',
      });
    }

    const recordData = {
      ...req.body,
      student: studentId,
      branchId: req.user.branchId,
      recordedBy: req.body.recordedBy || req.user.name || req.user._id,
    };

    if (!recordData.term) {
      return res.status(400).json({ success: false, message: 'Term is required' });
    }
    if (!recordData.recordedBy) {
      return res.status(400).json({ success: false, message: 'recordedBy is required' });
    }

    const newRecord = new BehavioralRecord(recordData);
    await newRecord.save();

    await Student.findByIdAndUpdate(studentId, {
      $push: { behavioralRecords: newRecord._id },
    });

    res.status(201).json({
      success: true,
      data: newRecord,
      message: 'Behavioral record created successfully',
    });
  } catch (error) {
    // console.error('Error creating behavioral record:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error creating behavioral record',
      error: error.message,
    });
  }
});

// PUT: Update a behavioral record
router.put('/behavioral-records/:recordId', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await BehavioralRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Behavioral record not found' });
    }

    if (req.user.role === 'teacher' && record.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Record not in your branch',
      });
    }

    const teacher = await Teacher.findOne({ email: req.user.email }).select('classTeacherFor section branchId');
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }

    const classDoc = await Class.findOne({
      className: teacher.classTeacherFor,
      'sections.sectionName': teacher.section,
      branchId: teacher.branchId,
    });
    if (!classDoc || !classDoc.sections.find((sec) => sec.sectionName === teacher.section).students.includes(record.student.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Student not in your class',
      });
    }

    const updateData = {
      ...req.body,
      lastUpdated: Date.now(),
      branchId: req.user.branchId,
    };

    const updatedRecord = await BehavioralRecord.findByIdAndUpdate(recordId, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: updatedRecord,
      message: 'Behavioral record updated successfully',
    });
  } catch (error) {
    // console.error('Error updating behavioral record:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating behavioral record',
      error: error.message,
    });
  }
});

// DELETE: Delete a behavioral record
router.delete('/behavioral-records/:recordId', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await BehavioralRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Behavioral record not found' });
    }

    if (req.user.role === 'teacher' && record.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Record not in your branch',
      });
    }

    const teacher = await Teacher.findOne({ email: req.user.email }).select('classTeacherFor section branchId');
    const classDoc = await Class.findOne({
      className: teacher.classTeacherFor,
      'sections.sectionName': teacher.section,
      branchId: teacher.branchId,
    });
    if (!teacher || !classDoc.sections.find((sec) => sec.sectionName === teacher.section).students.includes(record.student.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Student not in your class',
      });
    }

    await Student.findByIdAndUpdate(record.student, {
      $pull: { behavioralRecords: recordId },
    });

    await BehavioralRecord.findByIdAndDelete(recordId);

    res.status(200).json({
      success: true,
      message: 'Behavioral record deleted successfully',
    });
  } catch (error) {
    // console.error('Error deleting behavioral record:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error deleting behavioral record',
      error: error.message,
    });
  }
});

// GET: Fetch all students in the teacher's class and section
router.get('/class-students/:email', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ message: 'Teacher email is required' });
    }

    if (req.user.role === 'teacher' && req.user.email !== email) {
      return res.status(403).json({
        message: 'Access denied. You can only access your own class data.',
      });
    }

    const teacher = await Teacher.findOne({ email }).select('classTeacherFor section branchId');
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found.' });
    }

    const { classTeacherFor: className, section, branchId } = teacher;

    if (!className || !section) {
      return res.status(400).json({
        message: 'Class and section not assigned to this teacher.',
      });
    }

    const classDoc = await Class.findOne({
      className,
      'sections.sectionName': section,
      branchId,
    });
    if (!classDoc) {
      return res.status(404).json({
        message: 'Class or section not found for this teacher.',
      });
    }

    const sectionData = classDoc.sections.find((sec) => sec.sectionName === section);
    const studentIds = sectionData.students;

    if (!studentIds || studentIds.length === 0) {
      return res.status(404).json({
        message: 'No students found in this class and section.',
      });
    }

    const students = await Student.find({ _id: { $in: studentIds } }).select('name rollNumber admissionNo');

    res.status(200).json({
      students,
    });
  } catch (error) {
    // console.error('Error fetching class students:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

module.exports = router;


// const express = require("express");
// const router = express.Router();
// const mongoose = require("mongoose");
// const BehavioralRecord = require("../models/BehavioralRecord");
// const Student = require("../models/studentModel");
// const authMiddleware = require("../middleware/auth"); 

// const restrictAccess = (req, res, next) => {
//   if (
//     !['teacher', 'principal', 'admin', 'student', 'parent'].includes(
//       req.user.role
//     )
//   ) {
//     return res
//       .status(403)
//       .json({ message: 'Access denied. Insufficient permissions.' });
//   }
//   next();
// };
// // Create a new behavioral record
// router.post(
//   "/students/:studentId/behavioral-records",
//   authMiddleware,
//   restrictAccess,
//   async (req, res) => {
//     console.log("POST request received for studentId:", req.params.studentId);
//     console.log("Request body:", req.body); // Debug the incoming data
//     try {
//       const { studentId } = req.params;

//       // Verify student exists
//       const student = await Student.findById(studentId);
//       if (!student) {
//         return res.status(404).json({
//           success: false,
//           message: "Student not found",
//         });
//       }

//       // Check branch access for principal
//       if (
//         req.user.role === "principal" &&
//         student.branchId.toString() !== req.user.branchId.toString()
//       ) {
//         return res.status(403).json({
//           success: false,
//           message: "Access denied: Student not in your branch",
//         });
//       }

//       const recordData = {
//         ...req.body,
//         student: studentId,
//         branchId: req.user.branchId,
//         recordedBy: req.body.recordedBy || req.user.name || req.user._id, // Fallback to user ID if not provided
//       };

//       // Validate required fields manually if needed
//       if (!recordData.recordedBy) {
//         return res.status(400).json({
//           success: false,
//           message: "recordedBy is required",
//         });
//       }

//       const newRecord = new BehavioralRecord(recordData);
//       await newRecord.save();

//       // Update student's behavioralRecords array
//       await Student.findByIdAndUpdate(studentId, {
//         $push: { behavioralRecords: newRecord._id },
//       });

//       res.status(201).json({
//         success: true,
//         data: newRecord,
//         message: "Behavioral record created successfully",
//       });
//     } catch (error) {
//       console.error("Error details:", error); // Log full error for debugging
//       res.status(500).json({
//         success: false,
//         message: "Error creating behavioral record",
//         error: error.message,
//       });
//     }
//   }
// );

// // Get student by admission number (with branch restriction)
// router.get(
//   "/students/:admissionNo",
//   authMiddleware,
//   restrictAccess,
//   async (req, res) => {
//     try {
//       const { admissionNo } = req.params;
//       const student = await Student.findOne({ admissionNo });

//       if (!student) {
//         return res.status(404).json({
//           success: false,
//           message: "Student not found",
//         });
//       }

//       // Check branch access for principal
//       if (
//         req.user.role === "principal" &&
//         student.branchId.toString() !== req.user.branchId.toString()
//       ) {
//         return res.status(403).json({
//           success: false,
//           message: "Access denied: Student not in your branch",
//         });
//       }

//       res.status(200).json({
//         success: true,
//         data: student,
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: "Error retrieving student",
//         error: error.message,
//       });
//     }
//   }
// );

// // Get all behavioral records for a student
// router.get(
//   "/students/:studentId/behavioral-records",
//   authMiddleware,
//   restrictAccess,
//   async (req, res) => {
//     try {
//       const { studentId } = req.params;

//       // Verify student exists
//       const student = await Student.findById(studentId);
//       if (!student) {
//         return res.status(404).json({
//           success: false,
//           message: "Student not found",
//         });
//       }

//       // Check branch access for principal
//       if (
//         req.user.role === "principal" &&
//         student.branchId.toString() !== req.user.branchId.toString()
//       ) {
//         return res.status(403).json({
//           success: false,
//           message: "Access denied: Student not in your branch",
//         });
//       }

//       const records = await BehavioralRecord.find({
//         student: studentId,
//         branchId: req.user.branchId, // Filter by branch
//       })
//         .populate("student", "name admissionNo")
//         .sort({ lastUpdated: -1 });

//       res.status(200).json({
//         success: true,
//         count: records.length,
//         data: records,
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: "Error retrieving behavioral records",
//         error: error.message,
//       });
//     }
//   }
// );

// // Get a single behavioral record
// router.get(
//   "/behavioral-records/:recordId",
//   authMiddleware,
//   restrictAccess,
//   async (req, res) => {
//     try {
//       const { recordId } = req.params;

//       const record = await BehavioralRecord.findById(recordId).populate(
//         "student",
//         "name admissionNo"
//       );

//       if (!record) {
//         return res.status(404).json({
//           success: false,
//           message: "Behavioral record not found",
//         });
//       }

//       // Check branch access for principal
//       if (
//         req.user.role === "principal" &&
//         record.branchId.toString() !== req.user.branchId.toString()
//       ) {
//         return res.status(403).json({
//           success: false,
//           message: "Access denied: Record not in your branch",
//         });
//       }

//       res.status(200).json({
//         success: true,
//         data: record,
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: "Error retrieving behavioral record",
//         error: error.message,
//       });
//     }
//   }
// );

// // Update a behavioral record
// router.put(
//   "/behavioral-records/:recordId",
//   authMiddleware,
//   restrictAccess,
//   async (req, res) => {
//     try {
//       const { recordId } = req.params;

//       if (!mongoose.Types.ObjectId.isValid(recordId)) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid record ID",
//         });
//       }

//       const record = await BehavioralRecord.findById(recordId);
//       if (!record) {
//         return res.status(404).json({
//           success: false,
//           message: "Behavioral record not found",
//         });
//       }

//       // Check branch access for principal
//       if (
//         req.user.role === "principal" &&
//         record.branchId.toString() !== req.user.branchId.toString()
//       ) {
//         return res.status(403).json({
//           success: false,
//           message: "Access denied: Record not in your branch",
//         });
//       }

//       const updateData = {
//         ...req.body,
//         lastUpdated: Date.now(),
//         branchId: req.user.branchId, // Ensure branchId remains consistent
//       };

//       const updatedRecord = await BehavioralRecord.findByIdAndUpdate(
//         recordId,
//         updateData,
//         { new: true, runValidators: true }
//       );

//       res.status(200).json({
//         success: true,
//         data: updatedRecord,
//         message: "Behavioral record updated successfully",
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: "Error updating behavioral record",
//         error: error.message,
//       });
//     }
//   }
// );

// // Delete a behavioral record
// router.delete(
//   "/behavioral-records/:recordId",
//   authMiddleware,
//   restrictAccess,
//   async (req, res) => {
//     try {
//       const { recordId } = req.params;

//       const record = await BehavioralRecord.findById(recordId);
//       if (!record) {
//         return res.status(404).json({
//           success: false,
//           message: "Behavioral record not found",
//         });
//       }

//       // Check branch access for principal
//       if (
//         req.user.role === "principal" &&
//         record.branchId.toString() !== req.user.branchId.toString()
//       ) {
//         return res.status(403).json({
//           success: false,
//           message: "Access denied: Record not in your branch",
//         });
//       }

//       // Remove reference from student
//       await Student.findByIdAndUpdate(record.student, {
//         $pull: { behavioralRecords: recordId },
//       });

//       await BehavioralRecord.findByIdAndDelete(recordId);

//       res.status(200).json({
//         success: true,
//         message: "Behavioral record deleted successfully",
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: "Error deleting behavioral record",
//         error: error.message,
//       });
//     }
//   }
// );


// router.get(
//   "/students/:admissionNo",
//   authMiddleware,
//   restrictAccess,
//   async (req, res) => {
//     try {
//       const { admissionNo } = req.params;
//       const student = await Student.findOne({ admissionNo });
//       if (!student) {
//         return res.status(404).json({
//           success: false,
//           message: "Student not found",
//         });
//       }
//       res.status(200).json({
//         success: true,
//         data: student,
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: "Error retrieving student",
//         error: error.message,
//       });
//     }
//   }
// );

// module.exports = router;




// Get all behavioral records for a student
