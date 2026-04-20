const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  // Key Identifiers
  admissionNo: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    uppercase: true,
  },
  rollNumber: { type: String, required: true, unique: true, trim: true },

  role: { type: String, enum: ["student"], default: "student" },

  // Basic Information
  name: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, required: true, enum: ["Male", "Female", "Other"] },
  className: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true },

  // Contact Information
  phone: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  profilePicture: {
    type: String, // Store the file path or URL
    required: false,
  },

  // Address
  address: {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zipCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
  },

  // Emergency Contact
  emergencyContact: {
    name: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  feeDetails: {
    totalFee: { type: Number, required: true },
    paymentOption: {
      type: String,
      required: true,
      enum: ["Full Payment", "Installments"],
      trim: true,
    },
    terms: [
      {
        termName: { type: String, required: true, trim: true },
        amount: { type: Number, required: true },
        dueDate: { type: Date},
        paidAmount: { type: Number, default: 0 },
        status: { type: String, enum: ["Paid", "Pending"], default: "Pending" },
      },
    ],
    paymentHistory: [
      {
        amountPaid: { type: Number, required: true },
        paymentDate: { type: Date, required: true },
        paymentMethod: { type: String, required: true, trim: true },
        receiptNumber: {
          type: String,
          required: true,
          // unique: true,
          trim: true,
        },
        status: {
          type: String,
          required: true,
          enum: ["PENDING", "SUCCESS", "FAILED"],
          default: "PENDING",
        },
        failureReason: {
          type: String,
          required: false,
          trim: true,
        },
        termPaid: {
          // Corrected field
          type: mongoose.Schema.Types.ObjectId, // Use ObjectId, not Number
          ref: "Student.feeDetails.terms",
          required: false, // Optional to avoid breaking existing data
        },
        termName: {
          type: String,
          required: false,
          trim: true,
        },
      },
    ],
  },
  behavioralRecords: [
    { type: mongoose.Schema.Types.ObjectId, ref: "BehavioralRecord" },
  ],

  // Bus Route
  busRoute: {
    routeNumber: { type: String, trim: true },
    pickupLocation: { type: String, trim: true },
    dropLocation: { type: String, trim: true },
    driverName: { type: String, trim: true },
    driverContact: { type: String, trim: true },
  },

  // Parents Reference
  parents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Parent" }],

  // Health Record (Initially Empty, Gets Updated Later)
  healthRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HealthRecord",
  },
  leaveRequests: [
    {
      fromDate: Date,
      toDate: Date,
      reason: String,
      status: { type: String, default: "pending" },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
      approvedAt: Date,
    },
  ],
  // Added isHostelStudent field
  isHostelStudent: {
    type: Boolean,
    default: false,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
  },
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
