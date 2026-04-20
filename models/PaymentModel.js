const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: false,
  },
  orderId: { type: String, required: true, unique: true },
  receiptId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  termId: { type: mongoose.Schema.Types.ObjectId, required: false },
  termName: { type: String, required: false, trim: true },
  paymentStatus: {
    type: String,
    enum: ["PENDING", "SUCCESS", "FAILED"],
    default: "PENDING",
  },
  paymentMethod: { type: String, required: false, trim: true },
  paymentGatewayResponse: { type: Object, required: false },
  failureDetails: {
    errorCode: String,
    errorMessage: String,
    errorSource: String,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch", // Reference to Branch model
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexing for better query performance
PaymentSchema.index({ orderId: 1, branchId: 1 });

module.exports = mongoose.model("Payment", PaymentSchema);
