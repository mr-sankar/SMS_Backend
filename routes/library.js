const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const { Book, BorrowedBook, ReturnedBook } = require('../models/library');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  const extname = /\.(jpeg|jpg|png)$/i.test(file.originalname);
  const mimetype = allowedTypes.includes(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images (jpeg, jpg, png) are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter,
}).single('image');   // ← Important: field name is 'image'

// Restrict to Principal or Admin
const restrictToAdminOrPrincipal = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'principal') {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Middleware to restrict access based on role
const restrictAccess = (req, res, next) => {
  if (!['teacher', 'principal', 'admin', 'student',  'parent'].includes(req.user.role)) {
    return res
      .status(403)
      .json({ message: 'Access denied. Insufficient permissions.' });
  }
  next();
};

// GET all books
router.get('/books', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const query = req.user.role === 'principal' ? { branchId: req.user.branchId } : {};
    const books = await Book.find(query);
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST new book
router.post(
  '/books',
  authMiddleware,
  restrictAccess,
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Image upload failed',
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { name, author, total, category, branchId: providedBranchId } = req.body;

      if (!name || !author || !total || !category) {
        return res.status(400).json({
          success: false,
          message: 'Name, author, total, and category are required',
        });
      }

      const branchId = req.user.role === 'principal'
        ? req.user.branchId
        : providedBranchId || null;

      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: 'Branch ID is required',
        });
      }

      // Save image path if uploaded
      const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

      const newBook = new Book({
        name,
        author,
        image: imagePath,
        total: parseInt(total),
        available: parseInt(total),
        category,
        branchId,
      });

      const savedBook = await newBook.save();

      res.status(201).json({
        success: true,
        message: 'Book added successfully',
        data: savedBook,
      });
    } catch (error) {
      console.error('Error adding book:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      });
    }
  }
);

// PUT update book
// PUT - Update Book (with optional image update)
router.put(
  '/books/:id',
  authMiddleware,
  restrictAccess,
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Image upload failed',
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { name, author, total, category } = req.body;
      const book = await Book.findById(req.params.id);

      if (!book) {
        return res.status(404).json({ success: false, message: 'Book not found' });
      }

      // Branch access check
      if (req.user.role === 'principal' && book.branchId.toString() !== req.user.branchId.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const updateData = {
        name,
        author,
        total: total ? parseInt(total) : book.total,
        category,
        available: total ? parseInt(total) : book.available, // Optional: reset available if total changes
      };

      // Update image only if a new one is uploaded
      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
      }

      const updatedBook = await Book.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'Book updated successfully',
        data: updatedBook,
      });
    } catch (error) {
      console.error('Error updating book:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      });
    }
  }
);

// DELETE book
router.delete('/books/:id', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    if (req.user.role === 'principal' && book.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST borrow book
router.post('/borrow', authMiddleware, restrictAccess, async (req, res) => {
  const { bookId, Borrowers } = req.body;
  try {
    const book = await Book.findById(bookId);
    if (!book || book.available < 1) return res.status(400).json({ message: 'Book not available' });
    if (req.user.role === 'principal' && book.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const borrowedBook = new BorrowedBook({
      book: bookId, Borrowers, status: 'Borrowed', branchId: book.branchId,
    });
    await borrowedBook.save();
    book.available -= 1;
    await book.save();
    res.status(201).json(borrowedBook);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST return book

router.post('/return', authMiddleware, restrictAccess, async (req, res) => {
  const { borrowId, fineAmount, finePaid } = req.body;
  try {
    const borrowedBook = await BorrowedBook.findById(borrowId).populate('book');
    if (!borrowedBook) return res.status(404).json({ message: 'Borrow record not found' });
    if (req.user.role === 'principal' && borrowedBook.branchId.toString() !== req.user.branchId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const returnedBook = new ReturnedBook({
      book: borrowedBook.book._id,
      Borrowers: { ...borrowedBook.Borrowers, returnDate: new Date() },
      status: 'Returned',
      branchId: borrowedBook.branchId,
      fineAmount: fineAmount || 0, // Store fineAmount
      finePaid: finePaid || false, // Store finePaid
    });
    await returnedBook.save();
    const book = await Book.findById(borrowedBook.book._id);
    book.available += 1;
    await book.save();
    await BorrowedBook.findByIdAndDelete(borrowId);
    res.status(201).json(returnedBook);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET borrowed books
router.get('/borrowed', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const query = req.user.role === 'principal' ? { branchId: req.user.branchId } : {};
    const borrowedBooks = await BorrowedBook.find(query).populate('book');
    res.json(borrowedBooks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET returned books
router.get('/returned', authMiddleware, restrictAccess, async (req, res) => {
  try {
    const query = req.user.role === 'principal' ? { branchId: req.user.branchId } : {};
    const returnedBooks = await ReturnedBook.find(query).populate('book');
    res.json(returnedBooks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;