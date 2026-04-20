const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  class: { type: String },
  tuition: { type: Number },
  library: { type: Number },
  transport: { type: Number },
  totalAmount: { type: Number },
  termFee: { type: Number },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }, // Optional
});

module.exports = mongoose.model('Fee', feeSchema);