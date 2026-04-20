const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  examType: { type: String, enum: ['FA1', 'FA2', 'FA3', 'Quarterly', 'Half-Yearly', 'Annual'], required: true },
  marks: [{ type: Number, required: true }],
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
});

marksSchema.index({ studentId: 1, examType: 1 }, { unique: true });

module.exports = mongoose.model('Marks', marksSchema);