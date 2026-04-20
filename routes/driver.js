const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const DriverProfile = require('../models/driverModel');
const authMiddleware = require('../middleware/auth'); // Use your updated authMiddleware
const multer = require('multer');
const path = require('path');

// Multer Configuration for File Uploads
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) =>
    cb(null, `driver-${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 1000000 }, // 1MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    cb(null, mimetype && extname);
  },
});

// Middleware to restrict access to drivers only
const restrictAccess = (req, res, next) => {
    if (
      !['teacher', 'principal', 'admin', 'student', 'parent', 'driver'].includes(
        req.user.role
      )
    ) {
      return res
        .status(403)
        .json({ message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };


// Update driver location
router.put('/location', async (req, res) => {
  try {
    const { email, latitude, longitude } = req.body;

    if (!email || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, latitude, and longitude are required' 
      });
    }

    const driver = await DriverProfile.findOneAndUpdate(
      { email },
      {
        $set: {
          'location.latitude': latitude,
          'location.longitude': longitude,
          'location.lastUpdated': new Date()
        }
      },
      { new: true, runValidators: true }
    );

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: 'Driver not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: driver
    });
  } catch (error) {
    // console.error('Error updating location:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});


// Get driver location by bus number (route number)
router.get("/route/:busNumber/location", async (req, res) => {
  try {
    const { busNumber } = req.params;
    // console.log('Fetching location for bus:', busNumber);

    if (!busNumber) {
      return res.status(400).json({
        success: false,
        message: "Bus number is required",
      });
    }

    const waitForLocation = async (busNumber, maxRetries = 20, delay = 1000) => {
      let retries = 0;
      while (retries < maxRetries) {
        const driver = await DriverProfile.findOne({ busNumber });
        // console.log('Driver found:', driver);
        
        if (driver && driver.location && 
            typeof driver.location.latitude === "number" && 
            typeof driver.location.longitude === "number") {
          return driver.location;
        }
    
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
      }
      return null;
    };

    const driver = await DriverProfile.findOne({ busNumber });
    // console.log('Initial driver fetch:', driver);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found for the given bus number",
      });
    }
    
    const location = await waitForLocation(busNumber);
    // console.log('Location result:', location);
    
    if (!location) {
      return res.status(500).json({
        success: false,
        message: "Location not available for the driver",
      });
    }

    res.status(200).json({
      success: true,
      latitude: location.latitude,
      longitude: location.longitude,
    });
  } catch (error) {
    // console.error("Error fetching driver location:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


module.exports = router;