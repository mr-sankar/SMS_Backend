const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/user.model.js');
const Parent = require('../models/parentModel');
const Student = require('../models/studentModel');
const authMiddleware = require('../middleware/auth');
const mongoose = require('mongoose'); 
const nodemailer = require("nodemailer");
require('dotenv').config();
const transporter = nodemailer.createTransport({
  service: process.env.NODEMAILER_SERVICE,
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /\.(jpg|jpeg|png|gif)$/.test(file.originalname)),
});

const restrictAccess = (req, res, next) => {
  if (!['teacher', 'principal', 'admin', 'student', "parent"].includes(req.user.role)) {
    return res
      .status(403)
      .json({ message: 'Access denied. Insufficient permissions.' });
  }
  next();
};



router.get('/parent-count', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const parents = await Parent.find();
    res.json({ totalParents: parents.length });
  } catch (error) {
    // console.error('Error fetching parent count:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post(
  "/register-parent",
  authMiddleware,
  restrictAccess,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const { name, email, password, phone, address } = req.body;
      const branchId = req.user.role === 'admin' ? req.body.branchId : req.user.branchId;
      
      let children = [];
      try {
        children = JSON.parse(req.body.children);
      } catch (e) {
        return res.status(400).json({ error: "Invalid children data format" });
      }
      
      if (
        !name ||
        !email ||
        !password ||
        !phone ||
        !address ||
        !children.length ||
        !branchId
      ) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      // Find students with matching admission numbers and branch
      const students = await Student.find({
        admissionNo: {
          $in: children.map((no) => no.trim().toUpperCase()),
        },
        branchId: branchId
      });
      
      if (students.length !== children.length) {
        const foundAdmissionNumbers = students.map((s) => s.admissionNo);
        const invalidNumbers = children.filter(
          (num) => !foundAdmissionNumbers.includes(num.trim().toUpperCase())
        );
        return res.status(400).json({
          error: `Invalid admission numbers: ${invalidNumbers.join(", ")}`,
        });
      }
      
      // Check for existing user
      const existingUser = await User.findOne({
        email: email.trim().toLowerCase(),
      });
      if (existingUser) {
        return res.status(400).json({
          error: "User with this email already exists",
        });
      }
      
      // Create Parent document
      const parent = new Parent({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password, // Will be hashed by pre-save hook if Parent has similar hook
        phone: phone.trim(),
        address: address.trim(),
        profileImage: req.file ? `/uploads/${req.file.filename}` : null,
        children: students.map((s) => s._id),
        branchId: branchId
      });
      
      // Create User document
      const user = new User({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password, // Will be hashed by pre-save hook
        role: "parent",
        roleId: parent._id,
        roleModel: "Parent",
        children: students.map((s) => s._id) || [],
        branchId: branchId
      });
      
      // Save both documents
      await Promise.all([user.save(), parent.save()]);
      
      const mailOptions = {
  from: process.env.NODEMAILER_EMAIL,
  to: email,
  subject: "Parent Login Credentials",
  html: `
    <h3>Welcome to School Portal</h3>
    <p>Dear ${name},</p>
    <p>Your account has been created successfully.</p>
    <p><b>Username:</b> ${email}</p>
    <p><b>Password:</b> ${password}</p>
    <br/>
    <p>Please login and change your password.</p>
  `,
};

await transporter.sendMail(mailOptions);

      
      // Update students with parent reference
      await Student.updateMany(
        { _id: { $in: students.map((s) => s._id) } },
        { $push: { parents: parent._id } }
      );
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user._id, 
          email: user.email, 
          role: user.role,
          branchId: user.branchId
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );
      
      res.status(201).json({
        message: "Parent registered successfully!",
        parent: {
          id: parent._id,
          name: parent.name,
          email: parent.email,
          profileImage: parent.profileImage,
          branchId: parent.branchId
        },
        token,
      });
    } catch (error) {
      // console.error("❌ Error registering parent:", error.message);
      res.status(500).json({
        error: "Internal Server Error",
        details: error.message,
      });
    }
  }
);

router.post("/validate-children", authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { children } = req.body;
    const branchId = req.user.role === 'admin' ? req.body.branchId : req.user.branchId;
    
    if (!children || !children.length) {
      return res.status(400).json({
        valid: false,
        error: "No admission numbers provided",
      });
    }
    
    // Branch ID is now handled through middleware
    
    // Find students with matching admission numbers and branch
    const students = await Student.find({
      admissionNo: {
        $in: children.map((no) => no.trim().toUpperCase()),
      },
      branchId: branchId
    });
    
    const valid = children.every((admissionNo) =>
      students.some(
        (student) => student.admissionNo === admissionNo.trim().toUpperCase()
      )
    );
    
    res.json({
      valid,
      foundStudents: valid ? students : [],
    });
  } catch (error) {
    // console.error("❌ Error validating children:", error);
    res.status(500).json({ error: "Failed to validate children" });
  }
});
// Other parent routes (GET /parents, PUT /parents/:id, etc.) follow similar logic with `restrictAccess` and `branchId` checks.

router.get('/parents', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const query = req.user.role === 'principal' ? { children: { $in: await Student.find({ branchId: req.user.branchId }).distinct('_id') } } : {};
    const parents = await Parent.find(query).populate('children', 'admissionNo name className section').lean();
    res.json(parents.map(p => ({ ...p, children: p.children || [] })));
  } catch (error) {
    // console.error('Error fetching parents:', error.message);
    res.status(500).json({ error: 'Error fetching parents' });
  }
});
router.delete("/parent/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid parent ID format" });
    }

    // Find the parent by ID
    const parent = await Parent.findById(id);
    if (!parent) {
      return res.status(404).json({ error: "Parent not found or already deleted" });
    }

    // Remove Parent ID from associated students
    await Student.updateMany({ parents: id }, { $pull: { parents: id } });

    // Delete associated user record
    await User.findOneAndDelete({ roleId: id, role: "parent" });

    // Delete parent profile image if exists
    if (parent.profileImage) {
      const imagePath = path.join(__dirname, "../uploads", parent.profileImage);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    // Delete the parent record
    await Parent.findByIdAndDelete(id);

    res.json({ message: "Parent deleted successfully" });
  } catch (error) {
    // console.error("❌ Error deleting parent:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});



router.get(
  "/parents/:parentId",
  authMiddleware,
  restrictAccess, // Allow only specific roles
  async (req, res) => {
    try {
      const { parentId } = req.params;

      // Validate Parent ID format
      if (!parentId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: "Invalid parent ID format" });
      }

      // Fetch parent details with populated children
      const parent = await Parent.findById(parentId)
        .populate("children", "admissionNo name className section profileImage")
        .lean()
        .exec();

      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }

      // Ensure children field is an array, and set default profileImage if missing
      const formattedParent = {
        ...parent,
        children: (parent.children || []).map((child) => ({
          ...child,
          profileImage: child.profileImage || null,
        })),
      };

      res.json(formattedParent);
    } catch (error) {
      // console.error("❌ Error fetching parent:", error.message);
      res.status(500).json({
        error: "Internal Server Error",
        details: error.message,
      });
    }
  }
);

// Edit

router.put(
  "/parents/:id",
  authMiddleware,
  restrictAccess,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, address, password } = req.body; // Include password in destructuring

      // Validate Parent ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: "Invalid parent ID format" });
      }

      let parent = await Parent.findById(id);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }

      // Ensure role-based restrictions (optional)
      if (
        req.user.role === "principal" &&
        parent.branchId.toString() !== req.user.branchId.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Handle Profile Image Update
      if (req.file) {
        if (parent.profileImage) {
          const oldImagePath = path.join(__dirname, "../", parent.profileImage);
          if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
        }
        parent.profileImage = `/uploads/${req.file.filename}`;
      }

      // Update Parent Information
      parent.name = name.trim() || parent.name;
      parent.email = email.trim().toLowerCase() || parent.email;
      parent.phone = phone.trim() || parent.phone;
      parent.address = address.trim() || parent.address;

      // Handle Password Update (plain text)
      if (password && password.trim()) {
        parent.password = password.trim();
      }

      await parent.save();

      // Also update user info (linked to parent)
      const user = await User.findOne({ roleId: id, role: "parent" });
      if (user) {
        user.name = parent.name;
        user.email = parent.email;
        // Update password in User model as plain text if provided
        if (password && password.trim()) {
          user.password = password.trim();
        }
        await user.save();
      }

      res.status(200).json({
        message: "Parent updated successfully",
        parent,
      });
    } catch (error) {
      // console.error("❌ Error updating parent:", error.message);
      res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
    }
  }
);


// Add child to parent
router.put(
  "/parents/:id/add-child",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { admissionNo } = req.body;

      // Validate inputs
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid parent ID format" });
      }
      if (!admissionNo) {
        return res.status(400).json({ error: "Admission number is required" });
      }

      const parent = await Parent.findById(id).populate('children', 'admissionNo');
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }

      // Role-based access control
      if (
        req.user.role === "principal" &&
        parent.branchId.toString() !== req.user.branchId.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Find student by admission number and branch
      const student = await Student.findOne({
        admissionNo: admissionNo.trim().toUpperCase(),
        branchId: parent.branchId
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Check if child with this admission number is already associated
      const isAlreadyAdded = parent.children.some(
        child => child.admissionNo.toUpperCase() === admissionNo.trim().toUpperCase()
      );
      
      if (isAlreadyAdded) {
        return res.status(400).json({ 
          error: "This admission number is already associated with the parent" 
        });
      }

      // Check if child's ID is already in the array (additional safety check)
      if (parent.children.some(child => child._id.equals(student._id))) {
        return res.status(400).json({ 
          error: "This student is already associated with the parent" 
        });
      }

      // Update parent and student
      parent.children.push(student._id);
      student.parents.push(parent._id);

      await Promise.all([parent.save(), student.save()]);

      // Populate updated parent data
      const updatedParent = await Parent.findById(id)
        .populate("children", "admissionNo name className section")
        .lean();

      res.status(200).json({
        message: "Child added successfully",
        parent: {
          ...updatedParent,
          children: updatedParent.children || []
        }
      });
    } catch (error) {
      // console.error("❌ Error adding child:", error.message);
      res.status(500).json({
        error: "Internal Server Error",
        details: error.message
      });
    }
  }
);

// Remove child from parent
router.put(
  "/parents/:id/remove-child",
  authMiddleware,
  restrictAccess,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { admissionNo } = req.body;

      // Validate inputs
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid parent ID format" });
      }
      if (!admissionNo) {
        return res.status(400).json({ error: "Admission number is required" });
      }

      const parent = await Parent.findById(id);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }

      // Role-based access control
      if (
        req.user.role === "principal" &&
        parent.branchId.toString() !== req.user.branchId.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Find student by admission number
      const student = await Student.findOne({
        admissionNo: admissionNo.trim().toUpperCase(),
        branchId: parent.branchId
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Check if child exists in parent's children array
      const childIndex = parent.children.indexOf(student._id);
      if (childIndex === -1) {
        return res.status(400).json({ error: "Child not associated with parent" });
      }

      // Remove child from parent and parent from child
      parent.children.splice(childIndex, 1);
      const parentIndex = student.parents.indexOf(parent._id);
      if (parentIndex !== -1) {
        student.parents.splice(parentIndex, 1);
      }

      await Promise.all([parent.save(), student.save()]);

      // Populate updated parent data
      const updatedParent = await Parent.findById(id)
        .populate("children", "admissionNo name className section")
        .lean();

      res.status(200).json({
        message: "Child removed successfully",
        parent: {
          ...updatedParent,
          children: updatedParent.children || []
        }
      });
    } catch (error) {
      // console.error("❌ Error removing child:", error.message);
      res.status(500).json({
        error: "Internal Server Error",
        details: error.message
      });
    }
  }
);
module.exports = router;
