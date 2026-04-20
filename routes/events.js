const express = require("express");
const router = express.Router();
const Event = require("../models/eventModel");
const Announcement = require("../models/announceModel");
const authMiddleware = require("../middleware/auth");
const multer = require('multer');
const path = require('path');

router.use(express.json());

// ====================== MULTER CONFIGURATION FOR EVENTS ======================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');   // Make sure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const extname = /\.(jpeg|jpg|png)$/i.test(file.originalname);
  const mimetype = allowedTypes.includes(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images (jpeg, jpg, png) are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
}).single('image');   // Field name must be 'image' in form-data

// ====================== ROUTES ======================

// GET all events
router.get("/events", authMiddleware, async (req, res) => {
  try {
    const query = req.user.role === "admin" ? {} : { branchId: req.user.branchId };
    const events = await Event.find(query).sort({ date: -1 });
    res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Failed to fetch events" });
  }
});

// POST /events - Create new event (Principal only)
router.post(
  "/events",
  authMiddleware,
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed",
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { name, type, date, imageUrl, volunteers, participants } = req.body;

      if (!name || !type || !date) {
        return res.status(400).json({ 
          success: false, 
          message: "Name, Type, and Date are required." 
        });
      }

      if (req.user.role !== "principal") {
        return res.status(403).json({ 
          success: false, 
          message: "Only principals can create events" 
        });
      }

      const parsedVolunteers = volunteers ? JSON.parse(volunteers) : [];
      const parsedParticipants = participants ? JSON.parse(participants) : [];

      let imgPath = "";

      if (req.file) {
        imgPath = `/uploads/${req.file.filename}`;
      } else if (imageUrl && imageUrl.trim() !== "") {
        if (!imageUrl.match(/^https?:\/\/.+/i)) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid image URL. Must start with http:// or https://" 
          });
        }
        imgPath = imageUrl.trim();
      } else {
        return res.status(400).json({ 
          success: false, 
          message: "Either image file or image URL is required." 
        });
      }

      const newEvent = new Event({
        name,
        type,
        date: new Date(date),
        img: imgPath,
        volunteers: parsedVolunteers,
        participants: parsedParticipants,
        branchId: req.user.branchId,
      });

      const savedEvent = await newEvent.save();

      res.status(201).json({
        success: true,
        message: "Event created successfully",
        event: savedEvent,
      });
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal Server Error",
        error: error.message 
      });
    }
  }
);

// PUT /events/:id - Update event (Principal only)
router.put(
  "/events/:id",
  authMiddleware,
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed",
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (req.user.role !== "principal") {
        return res.status(403).json({ 
          success: false, 
          message: "Only principals can update events" 
        });
      }

      const { name, type, date, imageUrl, volunteers, participants } = req.body;

      const parsedVolunteers = volunteers ? JSON.parse(volunteers) : [];
      const parsedParticipants = participants ? JSON.parse(participants) : [];

      let updateData = {
        name,
        type,
        date: date ? new Date(date) : undefined,
        volunteers: parsedVolunteers,
        participants: parsedParticipants,
      };

      // Handle image update
      if (req.file) {
        updateData.img = `/uploads/${req.file.filename}`;
      } else if (imageUrl && imageUrl.trim() !== "") {
        if (!imageUrl.match(/^https?:\/\/.+/i)) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid image URL" 
          });
        }
        updateData.img = imageUrl.trim();
      }
      // If no new image, existing image remains unchanged

      const updatedEvent = await Event.findOneAndUpdate(
        { _id: req.params.id, branchId: req.user.branchId },
        updateData,
        { new: true }
      );

      if (!updatedEvent) {
        return res.status(404).json({ 
          success: false, 
          message: "Event not found or you don’t have permission" 
        });
      }

      res.json({
        success: true,
        message: "Event updated successfully",
        updatedEvent,
      });
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update event",
        error: error.message 
      });
    }
  }
);

// DELETE event
router.delete("/events/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "principal") {
      return res.status(403).json({ 
        success: false, 
        message: "Only principals can delete events" 
      });
    }

    const deletedEvent = await Event.findOneAndDelete({
      _id: req.params.id,
      branchId: req.user.branchId,
    });

    if (!deletedEvent) {
      return res.status(404).json({ 
        success: false, 
        message: "Event not found or you don’t have permission" 
      });
    }

    res.json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete event" 
    });
  }
});

// ====================== ANNOUNCEMENTS ROUTES (No upload needed) ======================

router.get("/announcements", authMiddleware, async (req, res) => {
  try {
    const query = req.user.role === "admin" ? {} : { branchId: req.user.branchId };
    const announcements = await Announcement.find(query).sort({ announcementDate: -1 });
    res.json(announcements);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ message: "Error fetching announcements" });
  }
});

router.post("/announcements", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "principal") {
      return res.status(403).json({ 
        success: false, 
        message: "Only principals can create announcements" 
      });
    }

    const { title, message, announcementDate } = req.body;

    const newAnnouncement = new Announcement({
      title,
      message,
      announcementDate: announcementDate ? new Date(announcementDate) : new Date(),
      branchId: req.user.branchId,
    });

    await newAnnouncement.save();

    res.status(201).json({ 
      success: true, 
      message: "Announcement added successfully" 
    });
  } catch (error) {
    console.error("Error adding announcement:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error adding announcement" 
    });
  }
});

router.put("/announcements/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "principal") {
      return res.status(403).json({ 
        success: false, 
        message: "Only principals can update announcements" 
      });
    }

    const updatedAnnouncement = await Announcement.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      req.body,
      { new: true }
    );

    if (!updatedAnnouncement) {
      return res.status(404).json({ 
        success: false, 
        message: "Announcement not found or you don’t have permission" 
      });
    }

    res.json({ 
      success: true, 
      message: "Announcement updated successfully",
      announcement: updatedAnnouncement 
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error updating announcement" 
    });
  }
});

router.delete("/announcements/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "principal") {
      return res.status(403).json({ 
        success: false, 
        message: "Only principals can delete announcements" 
      });
    }

    const deletedAnnouncement = await Announcement.findOneAndDelete({
      _id: req.params.id,
      branchId: req.user.branchId,
    });

    if (!deletedAnnouncement) {
      return res.status(404).json({ 
        success: false, 
        message: "Announcement not found or you don’t have permission" 
      });
    }

    res.json({ success: true, message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error deleting announcement" 
    });
  }
});

module.exports = router;