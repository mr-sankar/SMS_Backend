// const express = require('express');
// const router = express.Router();
// const mongoose = require("mongoose");
// const multer = require('multer');
// const path = require('path');

// // Configure Multer for image uploads
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, "uploads/"); // Ensure this directory exists
//     },
//     filename: (req, file, cb) => {
//         cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
//     },
// });

// const fileFilter = (req, file, cb) => {
//     const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
//     if (allowedTypes.includes(file.mimetype)) {
//         cb(null, true);
//     } else {
//         cb(new Error("Only .png, .jpg, and .jpeg formats are allowed"), false);
//     }
// };

// const upload = multer({ 
//     storage, 
//     fileFilter,
//     limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
// });

// // Book Schema
// const bookSchema = new mongoose.Schema({
//     name: { type: String, required: true },
//     author: { type: String, required: true },
//     image: { type: String }, // Optional, as not all books may have images
//     total: { type: Number, required: true, min: 1 },
//     available: { type: Number, required: true, min: 0 },
//     category: { type: String, required: true },
// });

// const Book = mongoose.model("Book", bookSchema);

// // Borrowed Book Schema
// const borrowedBookSchema = new mongoose.Schema({
//     book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
//     Borrowers: {
//         name: { type: String, required: true },
//         class: { type: String, required: true },
//         section: { type: String, required: true },
//         borrowDate: { type: Date, default: Date.now, required: true },
//         returnDate: { type: Date, required: true },
//     },
//     status: { type: String, default: "Borrowed", required: true },
//     fineAmount: { type: Number, default: 0 },
//     finePaid: { type: Boolean, default: false },
// });

// const BorrowedBook = mongoose.model("BorrowedBook", borrowedBookSchema);

// // Returned Book Schema
// const returnedBookSchema = new mongoose.Schema({
//     book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
//     Borrowers: {
//         name: { type: String, required: true },
//         class: { type: String, required: true },
//         section: { type: String, required: true },
//         borrowDate: { type: Date, required: true },
//         returnDate: { type: Date, required: true },
//     },
//     status: { type: String, default: "Returned", required: true },
//     fineAmount: { type: Number, default: 0 },
//     finePaid: { type: Boolean, default: false },
// });

// const ReturnedBook = mongoose.model("ReturnedBook", returnedBookSchema);

// // Fine Calculation Function
// const calculateFine = (borrowDate, actualReturnDate) => {
//     const borrow = new Date(borrowDate);
//     const dueDate = new Date(borrow);
//     dueDate.setDate(dueDate.getDate() + 5); // 5-day return period
//     const returnDate = new Date(actualReturnDate);

//     const daysLate = Math.max(0, Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24)));
//     const fine = daysLate * 10; // ₹10 per day
//     return fine;
// };

// // API Routes

// // Get all books
// router.get("/books", async (req, res) => {
//     try {
//         const books = await Book.find();
//         res.json(books);
//     } catch (error) {
//         console.error("Error fetching books:", error);
//         res.status(500).json({ message: "Server error while fetching books" });
//     }
// });

// // Add a new book with image upload
// router.post("/books", upload.single("image"), async (req, res) => {
//     const { name, author, total, category } = req.body;
//     const image = req.file ? `/uploads/${req.file.filename}` : undefined; // Store undefined if no image

//     try {
//         if (!name || !author || !total || !category) {
//             return res.status(400).json({ message: "All fields (name, author, total, category) are required" });
//         }

//         const newBook = new Book({
//             name,
//             author,
//             image,
//             total: parseInt(total),
//             available: parseInt(total),
//             category,
//         });

//         const savedBook = await newBook.save();
//         res.status(201).json(savedBook);
//     } catch (error) {
//         console.error("Error adding book:", error);
//         res.status(400).json({ message: error.message || "Failed to add book" });
//     }
// });

// // Update a book with image upload
// router.put("/books/:id", upload.single("image"), async (req, res) => {
//     const { id } = req.params;
//     const { name, author, total, category } = req.body;
//     let imagePath;

//     if (req.file) {
//         imagePath = `/uploads/${req.file.filename}`;
//     }

//     try {
//         const book = await Book.findById(id);
//         if (!book) {
//             return res.status(404).json({ message: "Book not found" });
//         }

//         const updateData = {
//             name: name || book.name,
//             author: author || book.author,
//             total: total !== undefined ? parseInt(total) : book.total,
//             category: category || book.category,
//             ...(imagePath && { image: imagePath }),
//         };

//         const updatedBook = await Book.findByIdAndUpdate(id, updateData, { new: true });
//         res.json(updatedBook);
//     } catch (error) {
//         console.error("Error updating book:", error);
//         res.status(400).json({ message: error.message || "Failed to update book" });
//     }
// });

// // Delete a book
// router.delete("/books/:id", async (req, res) => {
//     const { id } = req.params;

//     try {
//         const deletedBook = await Book.findByIdAndDelete(id);
//         if (!deletedBook) {
//             return res.status(404).json({ message: "Book not found" });
//         }
//         res.json({ message: "Book deleted successfully" });
//     } catch (error) {
//         console.error("Error deleting book:", error);
//         res.status(400).json({ message: error.message || "Failed to delete book" });
//     }
// });

// // Borrow a book
// router.post("/borrow", async (req, res) => {
//     const { bookId, Borrowers } = req.body;

//     try {
//         if (!bookId || !Borrowers || !Borrowers.name || !Borrowers.class || !Borrowers.section || !Borrowers.returnDate) {
//             return res.status(400).json({ message: "Missing required fields" });
//         }

//         const book = await Book.findById(bookId);
//         if (!book || book.available < 1) {
//             return res.status(400).json({ message: "Book not available" });
//         }

//         const borrowedBook = new BorrowedBook({
//             book: bookId,
//             Borrowers,
//             status: "Borrowed",
//             fineAmount: 0,
//             finePaid: false,
//         });

//         await borrowedBook.save();

//         book.available -= 1;
//         await book.save();

//         res.status(201).json(borrowedBook);
//     } catch (error) {
//         console.error("Error borrowing book:", error);
//         res.status(400).json({ message: error.message || "Failed to borrow book" });
//     }
// });

// // Return a book
// router.post("/return", async (req, res) => {
//     const { borrowId, finePaid, fineAmount } = req.body;

//     try {
//         if (!borrowId) {
//             return res.status(400).json({ message: "Borrow ID is required" });
//         }

//         const borrowedBook = await BorrowedBook.findById(borrowId).populate("book");
//         if (!borrowedBook) {
//             return res.status(404).json({ message: "Borrow record not found" });
//         }

//         const actualReturnDate = new Date();
//         const fine = calculateFine(borrowedBook.Borrowers.borrowDate, actualReturnDate);

//         const returnedBook = new ReturnedBook({
//             book: borrowedBook.book._id,
//             Borrowers: {
//                 ...borrowedBook.Borrowers,
//                 returnDate: actualReturnDate,
//             },
//             status: "Returned",
//             fineAmount: fineAmount !== undefined ? fineAmount : fine, // Use provided or calculated fine
//             finePaid: finePaid || false,
//         });

//         await returnedBook.save();

//         const book = await Book.findById(borrowedBook.book._id);
//         book.available += 1;
//         await book.save();

//         await BorrowedBook.findByIdAndDelete(borrowId);

//         res.status(201).json(returnedBook);
//     } catch (error) {
//         console.error("Error returning book:", error);
//         res.status(400).json({ message: error.message || "Failed to return book" });
//     }
// });

// // Get borrowed books
// router.get("/borrowed", async (req, res) => {
//     try {
//         const borrowedBooks = await BorrowedBook.find().populate("book");
//         const updatedBorrowedBooks = borrowedBooks.map(book => {
//             const fine = calculateFine(book.Borrowers.borrowDate, new Date());
//             return { ...book._doc, fineAmount: fine };
//         });
//         res.json(updatedBorrowedBooks);
//     } catch (error) {
//         console.error("Error fetching borrowed books:", error);
//         res.status(500).json({ message: error.message || "Server error while fetching borrowed books" });
//     }
// });

// // Get returned books
// router.get("/returned", async (req, res) => {
//     try {
//         const returnedBooks = await ReturnedBook.find().populate("book");
//         res.json(returnedBooks);
//     } catch (error) {
//         console.error("Error fetching returned books:", error);
//         res.status(500).json({ message: error.message || "Server error while fetching returned books" });
//     }
// });

// module.exports = router;


const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  name: { type: String, required: true },
  author: { type: String, required: true },
  image: { type: String },
  total: { type: Number, required: true, min: 1 },
  available: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
});

const borrowedBookSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  Borrowers: {
    name: { type: String, required: true },
    class: { type: String, required: true },
    section: { type: String, required: true },
    borrowDate: { type: Date, default: Date.now, required: true },
    returnDate: { type: Date, required: true },
  },
  status: { type: String, default: 'Borrowed', required: true },
  fineAmount: { type: Number, default: 0 },
  finePaid: { type: Boolean, default: false },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
});

const returnedBookSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  Borrowers: {
    name: { type: String, required: true },
    class: { type: String, required: true },
    section: { type: String, required: true },
    borrowDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
  },
  status: { type: String, default: 'Returned', required: true },
  fineAmount: { type: Number, default: 0 },
  finePaid: { type: Boolean, default: false },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
});

module.exports.Book = mongoose.model('Book', bookSchema);
module.exports.BorrowedBook = mongoose.model('BorrowedBook', borrowedBookSchema);
module.exports.ReturnedBook = mongoose.model('ReturnedBook', returnedBookSchema);