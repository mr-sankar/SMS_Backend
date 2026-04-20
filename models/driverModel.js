const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const driverProfileSchema = new mongoose.Schema({
  driverName: { 
    type: String, 
    required: [true, 'Driver name is required'], 
    trim: true,
    match: [/^[A-Za-z\s]+$/, 'Driver name must contain only letters and spaces'],
  },
  phoneNumber: { 
    type: String, 
    required: [true, 'Phone number is required'], 
    match: [/^[6789]\d{9}$/, 'Phone number must start with 6, 7, 8, or 9 and be 10 digits'],
    unique: true,
  },
  fromLocation: { 
    type: String, 
    required: [true, 'From location is required'], 
    trim: true,
  },
  toLocation: { 
    type: String, 
    required: [true, 'To location is required'], 
    trim: true,
  },
  busNumber: { 
    type: String, 
    required: [true, 'Bus number is required'], 
    trim: true,
    match: [/^[A-Za-z0-9]+$/, 'Bus number must contain only letters and numbers'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    match: [/^[A-Za-z][A-Za-z0-9]*@[A-Za-z]{2,}\.[A-Za-z]{2,}$/, 'Email must start with a letter, allow numbers, @ followed by 3+ letters, . followed by 3+ letters'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    match: [/^(?=.*[A-Z])(?=.*[!@#$%^&*]).+$/, 'Password must contain at least one uppercase letter and one special character'],
  },
  profileImage: { 
    type: String, 
    default: '/uploads/default-driver.png',
  },
  branchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Branch', 
    required: [true, 'Branch ID is required'],
  },
  location: {
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    lastUpdated: {
      type: Date,
      default: null,
    },
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

driverProfileSchema.pre('save', async function(next) {
  this.fromLocation = this.fromLocation.trim().toLowerCase();
  this.toLocation = this.toLocation.trim().toLowerCase();
  this.driverName = this.driverName.trim();
  this.email = this.email.trim().toLowerCase();

  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

driverProfileSchema.pre('save', function(next) {
  if (this.fromLocation === this.toLocation) {
    return next(new Error('From and To locations cannot be the same'));
  }
  next();
});

module.exports = mongoose.model('DriverProfile', driverProfileSchema);