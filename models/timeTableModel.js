const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  examName: { type: String, required: true },
  className: { type: String },
  section: { type: String, required: true },
  schedule: [
    {
      date: { type: String, required: true },
      day: { type: String, required: true },
      from: { type: String, required: true },
      to: { type: String, required: true },
      subject: { type: String, required: true },
    },
  ],
  saved: { type: Boolean, default: false },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
});

module.exports = mongoose.model('TimeTable', timetableSchema);
