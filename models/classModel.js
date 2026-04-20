const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  className: { type: String, required: true, trim: true, unique: true },
  sections: [
    {
      sectionName: { type: String, required: true, trim: true },
      students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    },
  ],
  academicYear: { type: String, required: true, trim: true },
  classTeacher: { type: String, trim: true },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

classSchema.index({ className: 1, 'sections.sectionName': 1 });

module.exports = mongoose.model('Class', classSchema);
