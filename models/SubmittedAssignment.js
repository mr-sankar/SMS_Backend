const mongoose = require("mongoose");

const submittedAssignmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  className: { type: String, required: true },
  section: { type: String, required: true },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true, unique: true },
  teacherEmail: { type: String }, // ✅ Added teacher email
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true } // Added branchId
});

const SubmittedAssignment = mongoose.model("SubmittedAssignment", submittedAssignmentSchema);

module.exports = SubmittedAssignment;