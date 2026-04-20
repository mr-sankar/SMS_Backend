const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    email: { type: String, required: true },
    assignment: {
        description: { type: String },
        dueDate: { type: Date },
        subject: { type: String, required: true },
        syllabus: { type: String },
        className: { type: String },
        section: { type: String }, 
        title: { type: String },
        type: { type: String, enum: ["Assignment", "Project", "Homework"] }, // Added type
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true } // Added branchId
});

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;