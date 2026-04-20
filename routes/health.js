const express = require("express");
const mongoose = require("mongoose");
const HealthRecord = require("../models/healthRecordModel"); // Assuming you have this model
const Student = require("../models/studentModel");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Middleware to restrict to Admin or Principal


const restrictAccess = (req, res, next) => {
  if (!['teacher', 'principal', 'admin', "parent", "student"].includes(req.user.role)) {
    return res
      .status(403)
      .json({ message: 'Access denied. Insufficient permissions.' });
  }
  next();
};

// Get health record by ID
router.get("/health-records/:id", authMiddleware, restrictAccess, async (req, res) => {
  try {
    const healthRecord = await HealthRecord.findById(req.params.id).populate("studentId", "name admissionNo");

    if (!healthRecord) {
      return res.status(404).json({ message: "Health record not found" });
    }

    // Restrict principal to their branch
    const student = await Student.findById(healthRecord.studentId);
    if (req.user.role === "principal" && student.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json(healthRecord);
  } catch (error) {
    // console.error("Error fetching health record:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get health record by student admission number
router.get(
  "/health-records/student/:admissionNo",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const admissionNo = req.params.admissionNo;

      // Validate admissionNo format (assuming 3 digits as per your form)
      if (!/^\d{3}$/.test(admissionNo)) {
        return res.status(400).json({ message: "Invalid admission number format" });
      }

      const student = await Student.findOne({ admissionNo });
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Restrict principal to their branch
      if (req.user.role === "principal" && student.branchId.toString() !== req.user.branchId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!student.healthRecord) {
        return res.status(404).json({ message: "No health record found for this student" });
      }

      const healthRecord = await HealthRecord.findById(student.healthRecord).populate(
        "studentId",
        "name admissionNo"
      );
      if (!healthRecord) {
        return res.status(404).json({ message: "Health record not found" });
      }

      res.status(200).json(healthRecord);
    } catch (error) {
      // console.error("Error fetching health record by admission number:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Get all health records
router.get("/health-records", authMiddleware, restrictAccess, async (req, res) => {
  try {
    const query = req.user.role === "principal" ? { branchId: req.user.branchId } : {};
    const students = await Student.find(query);
    const studentIds = students.map((student) => student._id);

    const healthRecords = await HealthRecord.find({ studentId: { $in: studentIds } }).populate(
      "studentId",
      "name admissionNo"
    );
    res.status(200).json(healthRecords);
  } catch (error) {
    // console.error("Error fetching all health records:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create new health record
router.post("/health-records", authMiddleware, restrictAccess, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentId, admissionNo, height, weight, bloodGroup, allergies, medicalConditions, medications, lastCheckupDate } = req.body;

    // Input validation
    if (!studentId || !admissionNo) {
      return res.status(400).json({ message: "Student ID and admission number are required" });
    }
    if (height && (isNaN(height) || height < 0)) {
      return res.status(400).json({ message: "Height must be a positive number" });
    }
    if (weight && (isNaN(weight) || weight < 0)) {
      return res.status(400).json({ message: "Weight must be a positive number" });
    }
    if (bloodGroup && !["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(bloodGroup)) {
      return res.status(400).json({ message: "Invalid blood group" });
    }

    const student = await Student.findById(studentId).session(session);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Restrict principal to their branch
    if (req.user.role === "principal" && student.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (student.healthRecord) {
      return res.status(400).json({
        message: "Student already has a health record. Use update endpoint instead.",
      });
    }

    const healthRecord = new HealthRecord({
      studentId,
      admissionNo,
      height: height || null,
      weight: weight || null,
      bloodGroup: bloodGroup || null,
      allergies: allergies || "",
      medicalConditions: medicalConditions || "",
      medications: medications || "",
      lastCheckupDate: lastCheckupDate || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const savedHealthRecord = await healthRecord.save({ session });
    student.healthRecord = savedHealthRecord._id;
    await student.save({ session });

    await session.commitTransaction();
    res.status(201).json(savedHealthRecord);
  } catch (error) {
    await session.abortTransaction();
    // console.error("Error creating health record:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    session.endSession();
  }
});

// Update existing health record
// ... (other imports and code remain the same)

// Update existing health record
router.put(
  "/healthrecord/:studentId",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const {
        height,
        weight,
        bloodGroup,
        allergies,
        chronicConditions,   // ← Array of { condition: string }
        medications,
        lastCheckup,
        emergencyNotes,
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ message: "Invalid student ID" });
      }

      const healthRecord = await HealthRecord.findOne({ studentId });
      if (!healthRecord) {
        return res.status(404).json({ message: "Health record not found" });
      }

      const student = await Student.findById(healthRecord.studentId || studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Branch restriction for Principal
      if (
        req.user.role === "principal" &&
        student.branchId?.toString() !== req.user.branchId?.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update fields with proper validation
      if (height !== undefined) {
        healthRecord.height = typeof height === "object" 
          ? height 
          : { value: parseFloat(height), unit: "cm" };
      }
      if (weight !== undefined) {
        healthRecord.weight = typeof weight === "object" 
          ? weight 
          : { value: parseFloat(weight), unit: "kg" };
      }

      if (bloodGroup !== undefined) {
        const validBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
        if (!validBloodGroups.includes(bloodGroup)) {
          return res.status(400).json({ message: "Invalid blood group" });
        }
        healthRecord.bloodGroup = bloodGroup;
      }

      if (allergies !== undefined) {
        healthRecord.allergies = Array.isArray(allergies) ? allergies : [allergies].filter(Boolean);
      }

      // **Important**: chronicConditions is now array of objects
     // For chronicConditions - comma separated
if (chronicConditions !== undefined) {
  let conditionsArray = [];
  if (typeof chronicConditions === 'string') {
    conditionsArray = chronicConditions
      .split(',')
      .map(c => c.trim())
      .filter(c => c !== '')
      .map(condition => ({ condition }));
  } else if (Array.isArray(chronicConditions)) {
    conditionsArray = chronicConditions
      .filter(c => c && c.condition)
      .map(c => ({ condition: c.condition.trim() }));
  }
  healthRecord.chronicConditions = conditionsArray;
}

// For medications - comma separated (only name for simplicity)
if (medications !== undefined) {
  let medsArray = [];
  if (typeof medications === 'string') {
    medsArray = medications
      .split(',')
      .map(name => ({ name: name.trim() }))
      .filter(m => m.name !== '');
  } else if (Array.isArray(medications)) {
    medsArray = medications
      .filter(m => m && m.name)
      .map(m => ({ name: m.name.trim() }));
  }
  healthRecord.medications = medsArray;
}


      healthRecord.updatedAt = Date.now();

      const updatedRecord = await healthRecord.save();

      res.status(200).json({
        message: "Health record updated successfully",
        data: updatedRecord
      });
    } catch (error) {
      console.error("Error updating health record:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);
  
  // ... (other routes remain unchanged)

// Delete health record
router.delete("/health-records/:id", authMiddleware, restrictAccess, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const healthRecord = await HealthRecord.findById(req.params.id).session(session);
    if (!healthRecord) {
      return res.status(404).json({ message: "Health record not found" });
    }

    const student = await Student.findById(healthRecord.studentId).session(session);
    if (!student) {
      return res.status(404).json({ message: "Associated student not found" });
    }

    // Restrict principal to their branch
    if (req.user.role === "principal" && student.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    student.healthRecord = undefined;
    await student.save({ session });
    await HealthRecord.findByIdAndDelete(req.params.id, { session });

    await session.commitTransaction();
    res.status(200).json({ message: "Health record deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    // console.error("Error deleting health record:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    session.endSession();
  }
});

// Get student by admission number
router.get(
  "/students/admission/:admissionNo",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const admissionNo = req.params.admissionNo;

      // Validate admissionNo format
      if (!/^\d{3}$/.test(admissionNo)) {
        return res.status(400).json({ message: "Invalid admission number format" });
      }

      const student = await Student.findOne({ admissionNo }).populate("healthRecord");
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Restrict principal to their branch
      if (req.user.role === "principal" && student.branchId.toString() !== req.user.branchId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.status(200).json(student);
    } catch (error) {
      // console.error("Error fetching student by admission number:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Link health record to student
router.put(
  "/students/:id/link-health-record",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { healthRecordId } = req.body;

      if (!healthRecordId) {
        return res.status(400).json({ message: "Health record ID is required" });
      }

      const healthRecord = await HealthRecord.findById(healthRecordId);
      if (!healthRecord) {
        return res.status(404).json({ message: "Health record not found" });
      }

      const student = await Student.findById(req.params.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Restrict principal to their branch
      if (req.user.role === "principal" && student.branchId.toString() !== req.user.branchId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (student.healthRecord) {
        return res.status(400).json({ message: "Student already has a linked health record" });
      }

      student.healthRecord = healthRecordId;
      healthRecord.studentId = student._id;
      healthRecord.admissionNo = student.admissionNo;

      await Promise.all([student.save(), healthRecord.save()]);
      res.status(200).json(student);
    } catch (error) {
      // console.error("Error linking health record to student:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

router.get(
  "/healthrecord/:studentId",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { studentId } = req.params;

      // Validate studentId (MongoDB ObjectId)
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ message: "Invalid student ID format" });
      }

      // Fetch health record with populated student data
      const healthRecord = await HealthRecord.findOne({ studentId })
        .populate({
          path: "studentId",
          select: "admissionNo branchId" // Select only necessary fields
        });

      if (!healthRecord) {
        return res.status(404).json({ message: "Health record not found" });
      }

      // Restrict principal to their branch if student data is available
      if (
        req.user.role === "principal" && 
        healthRecord.studentId?.branchId?.toString() !== req.user.branchId.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.status(200).json(healthRecord);
    } catch (error) {
      // console.error("Error fetching health record:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

module.exports = router;