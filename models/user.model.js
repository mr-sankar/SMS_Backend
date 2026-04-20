
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  otp: { type: String },
  otpExpires: { type: Date },
  role: {
    type: String,
    enum: ["admin", "principal", "teacher", "student", "parent", "driver"],
    required: true,
  },
  roleId: { type: mongoose.Schema.Types.ObjectId, refPath: "roleModel" },
  roleModel: {
    type: String,
    enum: [
      "Student",
      "Teacher",
      "Parent",
      "User",
      "Principal",
      "DriverProfile",
    ],
  },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
  status: { type: String, enum: ["active", "inactive"], default: "active" }, // New field
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }], // Parent-Children Relationship
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// **Hash password before saving**
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// **Compare Password Method**
userSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
