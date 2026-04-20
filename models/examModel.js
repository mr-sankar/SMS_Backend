const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Removed enum constraint
  className: { type: String, required: true },
  section: { type: String, required: true },
  subjects: [{ type: String, required: true }],
  maxMarks: { type: Number, required: true },
  createdBy: { type: String, required: true }, // Teacher email
  createdAt: { type: Date, default: Date.now },
  branchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Branch", // Reference to Branch model
    required: true 
  },
  marks: [
    {
      studentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Student", // Reference Student model
        required: true 
      },
      marks: [
        {
          subject: { type: String, required: true },
          marks: { type: Number, required: true },
          grade: { type: String, required: true },
          status: { type: String, required: true }, // Passed or Failed
        },
      ],
    },
  ],
});

// Ensure uniqueness for studentId within the marks array for a given exam, scoped to branchId
examSchema.index({ "marks.studentId": 1, branchId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Exam', examSchema);