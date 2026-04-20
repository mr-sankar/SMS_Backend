// backend/model/branchModel.js
const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
    branchName: { type: String, required: true },
    location: { type: String, required: true },
    phoneNumber: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    principal: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Optional
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
    },
  });

module.exports = mongoose.model('Branch', branchSchema);