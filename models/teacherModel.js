const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  role: { type: String, enum: ['teacher'], default: 'teacher' },
  staffType: { type: String, enum: ['Teaching', 'Non-Teaching'], default: 'Teaching' }, // New field
  teacherId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNo: { type: String, required: true },
  qualification: { type: String },
  classTeacherFor: { type: String },
  section: { type: String },
  joiningDate: { type: Date, default: Date.now },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  address: { type: String },
  profilePic: { type: String },
  password: { type: String, required: true },
  subject: { type: String }, // Add subject here
  designation: { type: String }, // New field for non-teaching staff
  timetable: [
    {
      time: { type: String, required: true },
      class: { type: String },
    },
  ],
  notifications: [{
    message: String,
    relatedLeaveRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'Student.leaveRequests' },
    date: { type: Date, default: Date.now }
  }],
  salary: { type: Number, required: true },
  
  
  bankName: { type: String, required: true },
  bankAccountNumber: { type: String, required: true },
  panNumber: { type: String, required: true },
  location: { type: String, required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  payslips: [
    {
      payslipId: { type: String, required: true, unique: true }, // Unique ID for payslip
      month: { type: String, required: true },
      year: { type: String, required: true },
      filename: { type: String, required: true },
      generatedDate: { type: Date, required: true },
      netPay: { type: Number, required: true },
      payslipData: {
        empId: { type: String, required: true },
        empName: { type: String, required: true },
        doj: { type: String, required: true },
        bankName: { type: String, required: true },
        accountNo: { type: String, required: true },
        location: { type: String, required: true },
        department: { type: String, required: true },
        designation: { type: String, required: true },
        panNo: { type: String, required: true },
        epfNo: { type: String, required: true },
        monthDays: { type: String, required: true },
        paidDays: { type: String, required: true },
        basic: { type: String, required: true },
        hra: { type: String, required: true },
        conveyance: { type: String, required: true },
        medical: { type: String, required: true },
        bonus: { type: String, required: true },
        pf: { type: String, required: true },
        esi: { type: String, required: true },
        ptax: { type: String, required: true },
      },
    },
  ],
});


const Teacher = mongoose.model('Teacher', teacherSchema);
module.exports = Teacher;