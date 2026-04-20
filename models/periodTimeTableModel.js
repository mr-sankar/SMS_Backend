const mongoose = require('mongoose');

const periodTimetableSchema = new mongoose.Schema({
  class: { type: String, required: true, unique: true },
  schedule: {
    Monday: { type: [String], default: [] },
    Tuesday: { type: [String], default: [] },
    Wednesday: { type: [String], default: [] },
    Thursday: { type: [String], default: [] },
    Friday: { type: [String], default: [] },
    Saturday: { type: [String], default: [] },
  },
  timeSlots: {
    type: [String],
    default: [
      '9:00 - 9:45',
      '9:45 - 10:30',
      '10:30 - 10:45',
      '10:45 - 11:30',
      '11:30 - 12:15',
      '12:15 - 1:15',
      '1:15 - 2:00',
      '2:00 - 2:45',
      '2:45 - 3:00',
      '3:00 - 3:45',
      '3:45 - 4:30',
    ],
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
});

module.exports = mongoose.model('PeriodTimetable', periodTimetableSchema);
