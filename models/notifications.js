// models/Notification.js (example)
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  senderRole: { type: String, enum: ['admin', 'principal', 'teacher', 'student', 'parent'], required: true },
  targetRoles: [{ type: String, enum: ['admin', 'principal', 'teacher', 'student', 'parent'] }],
  recipientIds: [{ type: mongoose.Schema.Types.ObjectId }],
  recipientEmails: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  hiddenFor: [{ type: String, enum: ['admin', 'principal', 'teacher', 'student', 'parent'] }], // New field
});

module.exports = mongoose.model('Notification', notificationSchema);