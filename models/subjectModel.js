const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  className: { 
    type: String,  
    required: true 
  },
  subjects: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      name: { type: String, required: true, trim: true }
    }
  ],
  branchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Branch", // Reference to Branch model
    required: true 
  },
  createdAt: { type: Date, default: Date.now }
});

// Indexing for better performance, scoped to branchId
subjectSchema.index({ className: 1, branchId: 1 });

module.exports = mongoose.model("Subject", subjectSchema);