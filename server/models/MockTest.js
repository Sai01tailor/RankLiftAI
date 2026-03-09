const mongoose = require("mongoose");

// ══════════════════════════════════════════════════════════════════
//  MOCK TEST SCHEMA — Blueprint for full-length JEE tests
//  Supports: JEE Main (300 marks) & JEE Advanced (306 marks)
//  Features: Sections, marking schemes, timing, scheduling
// ══════════════════════════════════════════════════════════════════

// Sub-schema: Individual question slot in a section
const TestQuestionSchema = new mongoose.Schema({
    _id: false,
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
        required: true
    },
    order: { type: Number, required: true }, // Display order in section
    marks: {
        correct: { type: Number, required: true },
        incorrect: { type: Number, required: true },
        unattempted: { type: Number, default: 0 }
    }
});

// Sub-schema: Section within a test (e.g., "Section A — SCQ")
const SectionSchema = new mongoose.Schema({
    _id: false,
    name: {
        type: String,
        required: true,
        trim: true
        // e.g., "Section A", "Section B"
    },
    type: {
        type: String,
        required: true,
        enum: ["SCQ", "MCQ", "INTEGER", "NUMERICAL", "COMPREHENSION", "MIXED"]
    },
    instructions: {
        en: { type: String, trim: true },
        hi: { type: String, trim: true }
    },
    questions: [TestQuestionSchema],
    maxQuestions: {
        type: Number,
        default: null
        // If set, student must attempt only N out of total (JEE Main optional section)
    },
    totalQuestions: { type: Number, required: true },
    markingScheme: {
        correct: { type: Number, required: true, default: 4 },
        incorrect: { type: Number, required: true, default: -1 },
        unattempted: { type: Number, default: 0 }
    }
});

// Main MockTest Schema
const MockTestSchema = new mongoose.Schema({
    // --- 1. BASIC INFO ---
    title: {
        type: String,
        required: [true, "Test title is required"],
        trim: true,
        maxlength: [200, "Title too long"]
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        en: { type: String, trim: true, default: null },
        hi: { type: String, trim: true, default: null }
    },

    // --- 2. TEST CLASSIFICATION ---
    examType: {
        type: String,
        required: true,
        enum: ["JEE Main", "JEE Advanced"],
        index: true
    },
    testType: {
        type: String,
        required: true,
        enum: [
            "FULL_LENGTH",    // Complete 3-hour paper
            "SUBJECT_WISE",   // Single subject test
            "CHAPTER_WISE",   // Single chapter test
            "PREVIOUS_YEAR",  // Exact PYQ paper
            "CUSTOM"          // Admin-created custom test
        ],
        index: true
    },
    paper: {
        type: String,
        enum: ["Paper 1", "Paper 2", null],
        default: null
        // JEE Advanced has Paper 1 and Paper 2
    },

    // --- 3. SECTIONS ---
    sections: [SectionSchema],

    // --- 4. TIMING ---
    duration: {
        type: Number,
        required: [true, "Duration is required"],
        min: [1, "Duration must be at least 1 minute"]
        // In minutes: 180 for JEE Main, 180 per paper for JEE Advanced
    },

    // --- 5. SCORING ---
    totalMarks: {
        type: Number,
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },

    // --- 6. SCHEDULING & AVAILABILITY ---
    schedule: {
        startTime: { type: Date, default: null },
        endTime: { type: Date, default: null },
        // If both null, test is always available
        // If set, test is only accessible within this window
        isScheduled: { type: Boolean, default: false }
    },

    // --- 7. ACCESS CONTROL ---
    accessLevel: {
        type: String,
        enum: ["free", "basic", "premium"],
        default: "free",
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isPublished: {
        type: Boolean,
        default: false,
        index: true
    },

    // --- 8. SUBJECT FILTER (For subject-wise tests) ---
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        default: null
    },
    chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chapter",
        default: null
    },

    // --- 9. ANALYTICS (Denormalized, updated periodically) ---
    stats: {
        totalAttempts: { type: Number, default: 0 },
        avgScore: { type: Number, default: 0 },
        highestScore: { type: Number, default: 0 },
        avgCompletionTime: { type: Number, default: 0 } // minutes
    },

    // --- 10. ADMIN ---
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    tags: [{ type: String, trim: true, lowercase: true }],

    // --- 11. INSTRUCTIONS ---
    instructions: {
        en: { type: String, trim: true, default: null },
        hi: { type: String, trim: true, default: null },
        gj: { type: String, trim: true, default: null },
    }

}, { timestamps: true });

// ══════════════════════════════════════════
//  INDEXES
// ══════════════════════════════════════════
MockTestSchema.index({ examType: 1, testType: 1, isActive: 1, isPublished: 1 });
MockTestSchema.index({ accessLevel: 1, isActive: 1 });
MockTestSchema.index({ "schedule.startTime": 1, "schedule.endTime": 1 });
MockTestSchema.index({ tags: 1 });

// Auto-generate slug from title
MockTestSchema.pre("save", function (next) {
    if (this.isModified("title")) {
        this.slug = this.title
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            + "-" + Date.now().toString(36);
    }
    next();
});

// ══════════════════════════════════════════
//  JEE PATTERN PRESETS (Static methods)
// ══════════════════════════════════════════

/**
 * JEE Main Pattern (2024):
 * - 3 subjects: Physics, Chemistry, Maths
 * - Each subject: Section A (20 SCQ) + Section B (10 Numerical, attempt 5)
 * - Marking: +4/-1 for SCQ, +4/0 for Numerical
 * - Total: 90 questions, 300 marks, 180 minutes
 */
MockTestSchema.statics.JEE_MAIN_BLUEPRINT = {
    examType: "JEE Main",
    testType: "FULL_LENGTH",
    duration: 180,
    totalMarks: 300,
    totalQuestions: 75, // 20+5 per subject
    sectionsPerSubject: [
        {
            name: "Section A",
            type: "SCQ",
            totalQuestions: 20,
            maxQuestions: 20,
            markingScheme: { correct: 4, incorrect: -1, unattempted: 0 }
        },
        {
            name: "Section B",
            type: "NUMERICAL",
            totalQuestions: 10,
            maxQuestions: 5, // Choose any 5
            markingScheme: { correct: 4, incorrect: -1, unattempted: 0 }
        }
    ]
};

/**
 * JEE Advanced Pattern (2024):
 * - Paper 1 & Paper 2, each 3 hours
 * - Each paper: 3 subjects × 3-4 sections
 * - Multiple marking schemes per section
 */
MockTestSchema.statics.JEE_ADVANCED_BLUEPRINT = {
    examType: "JEE Advanced",
    testType: "FULL_LENGTH",
    duration: 180, // per paper
    totalMarks: 180, // per paper (varies by year)
    totalQuestions: 54 // approximate per paper
};

const MockTest = mongoose.model("MockTest", MockTestSchema);

module.exports = { MockTest };
