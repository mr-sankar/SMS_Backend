const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  admissionNo: { type: String, required: true, trim: true, uppercase: true },
  bloodGroup: { type: String, trim: true },
  height: { value: { type: Number }, unit: { type: String, enum: ['cm', 'in'], default: 'cm' } },
  weight: { value: { type: Number }, unit: { type: String, enum: ['kg', 'lb'], default: 'kg' } },
  allergies: [{ type: String, trim: true }],
  chronicConditions: [{ condition: { type: String, trim: true }}],
  medications: [{ name: { type: String, trim: true }, dosage: { type: String, trim: true }, frequency: { type: String, trim: true }, startDate: { type: Date }, endDate: { type: Date } }],
  immunizations: [{ name: { type: String, trim: true }, date: { type: Date }, nextDueDate: { type: Date } }],
  emergencyNotes: { type: String, trim: true },
  lastCheckup: { date: { type: Date }, doctor: { type: String, trim: true }, findings: { type: String, trim: true } },
  // branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('HealthRecord', healthRecordSchema);