// backend/models/BehavioralRecord.js
const mongoose = require('mongoose');

const behavioralRecordSchema = new mongoose.Schema(
  {
    // Reference to Student
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },

    // Reference to Branch
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch', // Assuming you have a Branch model
      required: true,
    },

    // Academic Period
    // term: {
    //   type: String,
    //   required: true,
    //   trim: true,
    //   enum: ['Term 1', 'Term 2', 'Term 3'],
    // },
    term: {
      type: String,
      required: true,
      // Possibly an enum like: enum: ["Term 1", "Term 2", "Term 3"]
    },

    // Behavioral & Conduct Tracking
    punctuality: {
      status: {
        type: String,
        trim: true,
        enum: [
          'Excellent',
          'Good',
          'Satisfactory',
          'Needs Improvement',
          'Poor',
          '',
        ],
      },
      comments: {
        type: String,
        trim: true,
      },
    },

    disciplineRecords: [
      {
        type: {
          type: String,
          required: true,
          trim: true,
          enum: [
            'Verbal Warning',
            'Written Warning',
            'Detention',
            'Parent Conference',
            'Suspension',
            'Expulsion',
            'Other',
          ],
        },
        description: {
          type: String,
          required: true,
          trim: true,
        },
        date: {
          type: Date,
          required: true,
        },
      },
    ],

    classroomBehaviour: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 3,
      },
      comments: {
        type: String,
        trim: true,
      },
    },

    peerInteraction: {
      quality: {
        type: String,
        trim: true,
        enum: [
          'Very Interactive',
          'Friendly',
          'Neutral',
          'Occasional Conflicts',
          'Isolated',
          'Bullying Behavior',
          '',
        ],
      },
      comments: {
        type: String,
        trim: true,
      },
    },

    // Additional Notes
    teacherComments: {
      type: String,
      trim: true,
    },

    // Metadata
    recordedBy: {
      type: String,
      required: true,
      trim: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Updated index to include branchId for better query performance and uniqueness
behavioralRecordSchema.index(
  { student: 1, term: 1, branchId: 1 },
  { unique: true }
);

const BehavioralRecord = mongoose.model(
  'BehavioralRecord',
  behavioralRecordSchema
);

module.exports = BehavioralRecord;
