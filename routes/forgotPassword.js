// // src/routes/forgotPassword.js
// const express = require("express");
// const nodemailer = require("nodemailer");
// const User = require("../models/user.model");
// const bcrypt = require("bcryptjs");
// require("dotenv").config();

// const router = express.Router();

// // Create a transporter for sending emails
// let transporter;

// if (process.env.NODEMAILER_SERVICE === "custom") {
//   transporter = nodemailer.createTransport({
//     host: "smtp.gmail.com",
//     port: 587,
//     secure: false, // true for 465, false for other ports
//     auth: {
//       user: process.env.NODEMAILER_EMAIL,
//       pass: process.env.NODEMAILER_PASSWORD,
//     },
//   });
// } else {
//   transporter = nodemailer.createTransport({
//     service: process.env.NODEMAILER_SERVICE,
//     auth: {
//       user: process.env.NODEMAILER_EMAIL,
//       pass: process.env.NODEMAILER_PASSWORD,
//     },
//   });
// }

// // Function to send reset email
// const sendResetEmail = async (email, otp) => {
//   const mailOptions = {
//     from: process.env.NODEMAILER_EMAIL,
//     to: email,
//     subject: "Password Reset OTP",
//     text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
//       Your OTP is: ${otp}\n\n
//       If you did not request this, please ignore this email and your password will remain unchanged.\n`,
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     return true;
//   } catch (error) {
//     // console.error("Error sending email:", error);
//     return false;
//   }
// };

// // Generate and send OTP
// router.post("/otp/forgot-password", async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     return res.status(400).json({ error: "Email is required" });
//   }

//   try {
//     const user = await User.findOne({ email });

//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // Generate OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const otpExpires = Date.now() + 3600000; // OTP valid for 1 hour

//     user.otp = otp;
//     user.otpExpires = otpExpires;
//     await user.save();

//     // Send OTP email
//     const emailSent = await sendResetEmail(email, otp);

//     if (emailSent) {
//       res.status(200).json({ message: "Password reset OTP sent successfully" });
//     } else {
//       res.status(500).json({ error: "Failed to send password reset OTP" });
//     }
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// // Verify OTP and update password
// router.post("/otp/reset-password", async (req, res) => {
//   const { email, otp, newPassword } = req.body;

//   if (!email || !otp || !newPassword) {
//     return res
//       .status(400)
//       .json({ error: "Email, OTP, and new password are required" });
//   }

//   try {
//     const user = await User.findOne({ email });

//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     if (user.otp !== otp || user.otpExpires < Date.now()) {
//       return res.status(400).json({ error: "Invalid or expired OTP" });
//     }

//     // Check if the new password is the same as the existing password
//     const isSamePassword = await bcrypt.compare(newPassword, user.password);
//     if (isSamePassword) {
//       return res.status(400).json({ error: "New password must be different from the existing password" });
//     }

//     // Hash the new password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(newPassword, salt);

//     // Update the password in the User schema
//     user.password = newPassword;
//     user.otp = null;
//     user.otpExpires = null;
//     await user.save();

//     // Update the password in the role-specific schema
//     let roleSchema;
//     switch (user.role) {
//       case 'teacher':
//         roleSchema = require('../models/teacherModel');
//         break;
//       case 'student':
//         roleSchema = require("../models/studentModel");
//         break;
//       case 'parent':
//         roleSchema = require('../models/parentModel');
//         break;
//       case 'driver':
//         roleSchema = require('../models/driverModel');
//         break;
//       default:
//         return res.status(400).json({ error: "Invalid user role" });
//     }

//     const roleUser = await roleSchema.findOne({ email });
//     if (roleUser) {
//       roleUser.password = newPassword;
//       await roleUser.save();
//     }

//     res.status(200).json({ message: "Password updated successfully" });
//   } catch (error) {
//     // console.error("Error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// module.exports = router;



// src/routes/forgotPassword.js
const express = require("express");
const nodemailer = require("nodemailer");
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const mongoose = require('mongoose');
require("dotenv").config();

const router = express.Router();

// Create a transporter for sending emails
// ────────────────────────────────────────────────
let transporter;

if (process.env.NODEMAILER_SERVICE === "custom") {
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.NODEMAILER_EMAIL,
      pass: process.env.NODEMAILER_PASSWORD,
    },
    tls: {
      // ──── This is the important line ────
      rejectUnauthorized: false
    }
  });
} else {
  transporter = nodemailer.createTransport({
    service: process.env.NODEMAILER_SERVICE,
    auth: {
      user: process.env.NODEMAILER_EMAIL,
      pass: process.env.NODEMAILER_PASSWORD,
    },
    // Add it here too if you're using the "service" shorthand
    tls: {
      rejectUnauthorized: false
    }
  });
}

// Function to send reset email
const sendResetEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.NODEMAILER_EMAIL,
    to: email,
    subject: "Password Reset OTP",
    text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
      Your OTP is: ${otp}\n\n
      If you did not request this, please ignore this email and your password will remain unchanged.\n`,
  };
  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

router.post("/otp/forgot-password", async (req, res) => {
  const { email } = req.body;
  console.log(`Forgot password request for: ${email}`);

  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found: ${email}`);
      return res.status(404).json({ error: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Generated OTP for ${email}: ${otp}`);

    user.otp = otp;
    user.otpExpires = Date.now() + 3600000;
    await user.save();

    const emailSent = await sendResetEmail(email, otp);
    if (emailSent) {
      console.log(`OTP email sent to ${email}`);
      res.status(200).json({ message: "Password reset OTP sent successfully" });
    } else {
      console.log(`Failed to send email to ${email}`);
      res.status(500).json({ error: "Failed to send password reset OTP" });
    }
  } catch (error) {
    console.error("Forgot password route error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Verify OTP and update password
router.post("/otp/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res
      .status(400)
      .json({ error: "Email, OTP, and new password are required" });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = await User.findOne({ email }).session(session);

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ error: "User not found" });
    }

    // Check OTP validity
    if (
      user.otp !== otp ||
      !user.otpExpires ||
      new Date() > user.otpExpires
    ) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Check if new password equals old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      await session.abortTransaction();
      return res.status(400).json({
        error: "New password must be different from current password",
      });
    }

    // Role models mapping
    const roleModels = {
      teacher: require("../models/teacherModel"),
      student: require("../models/studentModel"),
      parent: require("../models/parentModel"),
      principal: require("../models/user.model.js"),
    };

    const RoleModel = roleModels[user.role?.toLowerCase()];

    // Update role-specific document (optional)
    if (RoleModel) {
      const roleDoc = await RoleModel.findOne({ email }).session(session);

      if (roleDoc) {
        roleDoc.password = newPassword; // schema of that model should hash
        await roleDoc.save({ session });
      }
    }

    // Update user password
    user.password = newPassword; // ❗ DO NOT HASH HERE
    user.otp = null;
    user.otpExpires = null;

    await user.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      message: "Password updated successfully",
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Password reset error:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  } finally {
    session.endSession();
  }
});

module.exports = router;