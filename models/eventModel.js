const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  date: { type: Date, required: true },
  img: { type: String },
  participants: [
    {
      role: {
        type: String,
        enum: ['Student', 'Teacher', 'Guest'],
        required: true,
      },
      count: { type: Number, required: true },
      guestNames: { type: String },
    },
  ],
  volunteers: [
    {
      name: { type: String, required: true },
      contact: { type: String, required: true },
      role: { type: String, required: true },
    },
  ],
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
});

module.exports = mongoose.model('Event', eventSchema);
