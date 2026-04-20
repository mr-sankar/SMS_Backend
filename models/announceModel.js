const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  announcementDate: { type: Date, required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
});

module.exports = mongoose.model("Announcement", announcementSchema);