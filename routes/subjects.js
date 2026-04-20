const express = require("express");
const router = express.Router();
const Subject = require("../models/subjectModel");
const authMiddleware = require("../middleware/auth");

const restrictAccess = (req, res, next) => {
  if (
    !['teacher', 'principal', 'admin', 'student', 'parent'].includes(
      req.user.role
    )
  ) {
    return res
      .status(403)
      .json({ message: 'Access denied. Insufficient permissions.' });
  }
  next();
};


// GET subjects for a specific class and branch
router.get("/subjects/:className", authMiddleware, async (req, res) => {
  try {
    const { className } = req.params;
    const branchId = req.user.branchId; // Assume branchId comes from authenticated user

    if (!branchId) {
      return res.status(400).json({ message: "Branch ID is required" });
    }

    const subjectDoc = await Subject.findOne({ className, branchId });

    if (!subjectDoc) {
      return res.json({ subjects: [] }); // Return empty array if no subjects exist
    }

    res.json({ subjects: subjectDoc.subjects });
  } catch (error) {
    // console.error("Error fetching subjects:", error.message);
    res.status(500).json({ message: "Error fetching subjects", error: error.message });
  }
});

// POST a new subject to a class (restricted to admin/principal)
router.post("/subjects", authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { className, name } = req.body;
    const branchId = req.user.branchId; // From authenticated user

    if (!className || !name || !branchId) {
      return res.status(400).json({ message: "className, name, and branchId are required" });
    }

    let subjectDoc = await Subject.findOne({ className, branchId });

    if (!subjectDoc) {
      subjectDoc = new Subject({
        className,
        branchId,
        subjects: [{ name }],
      });
    } else {
      // Check if subject already exists in this branch and class
      const subjectExists = subjectDoc.subjects.some(sub => sub.name.toLowerCase() === name.toLowerCase());
      if (subjectExists) {
        return res.status(400).json({ message: "Subject already exists for this class and branch" });
      }
      subjectDoc.subjects.push({ name });
    }

    await subjectDoc.save();
    res.json({ message: "Subject added", data: subjectDoc });
  } catch (error) {
    // console.error("Error adding subject:", error.message);
    res.status(500).json({ message: "Error adding subject", error: error.message });
  }
});

// DELETE a subject from a class (restricted to admin/principal)
router.delete("/subjects/:className/:subjectId", authMiddleware, restrictAccess, async (req, res) => {
  try {
    const { className, subjectId } = req.params;
    const branchId = req.user.branchId; // From authenticated user

    if (!branchId) {
      return res.status(400).json({ message: "Branch ID is required" });
    }

    const subjectDoc = await Subject.findOne({ className, branchId });
    if (!subjectDoc) {
      return res.status(404).json({ message: "Class not found for this branch" });
    }

    const initialLength = subjectDoc.subjects.length;
    subjectDoc.subjects = subjectDoc.subjects.filter(
      (subject) => subject._id.toString() !== subjectId
    );

    if (subjectDoc.subjects.length === initialLength) {
      return res.status(404).json({ message: "Subject not found" });
    }

    await subjectDoc.save();
    res.json({ message: "Subject deleted", data: subjectDoc });
  } catch (error) {
    // console.error("Error deleting subject:", error.message);
    res.status(500).json({ message: "Error deleting subject", error: error.message });
  }
});

module.exports = router;