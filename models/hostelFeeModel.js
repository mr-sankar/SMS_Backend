const mongoose = require('mongoose');

const hostelFeeSchema = new mongoose.Schema({
  class: { type: String, required: true, unique: true },
  tuition: { type: Number, required: true },
  library: { type: Number, required: true },
  hostel: { type: Number, required: true },
  // branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }, // Optional
});

module.exports = mongoose.model('HostelFee', hostelFeeSchema);