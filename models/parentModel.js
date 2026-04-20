const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const parentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, required: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  profileImage: { type: String, default: null },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  branchId: { 
    type: String, // or mongoose.Schema.Types.ObjectId if it's an ObjectId without ref
    required: true 
  }, // Added branchId as a simple string
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

parentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Parent', parentSchema);