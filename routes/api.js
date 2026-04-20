const express = require('express');
const router = express.Router();
const Event = require('../models/eventModel');
const Announcement = require('../models/announceModel');
const authMiddleware = require('../middleware/auth');

// Restrict to Admin or Principal
const restrictToAdminOrPrincipal = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'principal') {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// GET all events (filtered by branch for principals)
router.get('/events', authMiddleware, restrictToAdminOrPrincipal, async (req, res) => {
  try {
    const query = req.user.role === 'principal' ? { branchId: req.user.branchId } : {};
    const events = await Event.find(query);
    res.status(200).json(events);
  } catch (error) {
    // console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// PUT update event
router.put('/events/:id', authMiddleware, restrictToAdminOrPrincipal, async (req, res) => {
  try {
    const { name, type, date, img } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (req.user.role === 'principal' && event.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, { name, type, date, img }, { new: true });
    res.json({ message: 'Event updated successfully', updatedEvent });
  } catch (error) {
    // console.error(error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE event
router.delete('/events/:id', authMiddleware, restrictToAdminOrPrincipal, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (req.user.role === 'principal' && event.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    // console.error(error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// GET all announcements (filtered by branch for principals)
router.get('/announcements', authMiddleware, restrictToAdminOrPrincipal, async (req, res) => {
  try {
    const query = req.user.role === 'principal' ? { branchId: req.user.branchId } : {};
    const announcements = await Announcement.find(query);
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching announcements', error });
  }
});

// POST new announcement
router.post('/announcements', authMiddleware, restrictToAdminOrPrincipal, async (req, res) => {
  try {
    const { title, message, announcementDate } = req.body;
    const newAnnouncement = new Announcement({
      title,
      message,
      announcementDate,
      branchId: req.user.role === 'principal' ? req.user.branchId : null, // System-wide if admin
    });
    await newAnnouncement.save();
    res.status(201).json({ message: 'Announcement added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding announcement', error });
  }
});

// DELETE announcement
router.delete('/announcements/:id', authMiddleware, restrictToAdminOrPrincipal, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
    if (req.user.role === 'principal' && announcement.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting announcement' });
  }
});

// PUT update announcement
router.put('/announcements/:id', authMiddleware, restrictToAdminOrPrincipal, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
    if (req.user.role === 'principal' && announcement.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await Announcement.findByIdAndUpdate(req.params.id, req.body);
    res.json({ message: 'Announcement updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating announcement' });
  }
});

module.exports = router;