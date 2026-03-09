const mongoose = require("mongoose");

// ══════════════════════════════════════════════════════════════════
//  QUESTION SCHEMA — The heart of the platform
//  Supports: SCQ, MCQ, Integer, Numerical, Comprehension
//  Optimized for mock test generation + practice filtering
// ══════════════════════════════════════════════════════════════════

const QuestionSchema = new mongoose.Schema({
    // --- 1. HIERARCHY LINKS (Denormalized for blazing-fast filtering) ---
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: [true, "Subject is required"],
        index: true
    },
    chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chapter",
        required: [true, "Chapter is required"],
        index: true
    },
    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Topic",
        required: [true, "Topic is required"],
        index: true
    },

    // --- 1b. HUMAN-READABLE TITLE ---
    // Auto-generated if not provided: "[Chapter] - [Topic]"
    title: {
        type: String,
        trim: true,
        default: null,
        index: 'text',
    },

    // --- 2. QUESTION CONTENT (Multilingual Support) ---
    content: {
        en: {
            text: {
                type: String,
                required: [true, "English question text is required"],
                trim: true
            },
            imageUrl: { type: String, default: null }
        },
        // JEE Main + Advanced
        hi: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null } },
        // JEE Main regional languages
        gj: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null } },
        mr: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null } },
        ta: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null } },
        te: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null } },
        kn: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null } },
        bn: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null } },
        ur: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null } },
    },

    // --- 3. QUESTION TYPE (JEE Pattern) ---
    type: {
        type: String,
        required: true,
        enum: {
            values: ["SCQ", "MCQ", "INTEGER", "NUMERICAL", "COMPREHENSION"],
            message: "{VALUE} is not a valid question type"
        },
        index: true
        // SCQ = Single Correct (Main/Adv)
        // MCQ = Multiple Correct (Adv only)
        // INTEGER = Integer answer 0-9 (Old pattern)
        // NUMERICAL = Decimal answer (New pattern)
        // COMPREHENSION = Paragraph-based
    },

    // --- 4. OPTIONS (SCQ/MCQ only) ---
    options: [{
        _id: false,
        key: {
            type: String,
            required: true,
            enum: ["A", "B", "C", "D"]
        },
        text: {
            en: { type: String },
            hi: { type: String },
            gj: { type: String },
            mr: { type: String },
            ta: { type: String },
            te: { type: String },
            kn: { type: String },
            bn: { type: String },
            ur: { type: String },
        },
        imageUrl: { type: String, default: null },
        isCorrect: { type: Boolean, default: false }
    }],

    // --- 5. ANSWER KEY (Flexible for all types) ---
    correctAnswer: {
        // SCQ/MCQ: ["A"] or ["A", "C"]
        optionKeys: [{ type: String, enum: ["A", "B", "C", "D"] }],

        // INTEGER/NUMERICAL: exact value
        numericValue: { type: Number, default: null },

        // NUMERICAL: tolerance range (e.g., 4.4 to 4.6 for answer 4.5)
        numericRange: {
            min: { type: Number, default: null },
            max: { type: Number, default: null }
        }
    },

    // --- 6. SOLUTION / EXPLANATION ---
    solution: {
        en: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null }, videoUrl: { type: String, default: null } },
        hi: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null }, videoUrl: { type: String, default: null } },
        gj: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null }, videoUrl: { type: String, default: null } },
        mr: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null }, videoUrl: { type: String, default: null } },
        ta: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null }, videoUrl: { type: String, default: null } },
        te: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null }, videoUrl: { type: String, default: null } },
        kn: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null }, videoUrl: { type: String, default: null } },
        bn: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null }, videoUrl: { type: String, default: null } },
        ur: { text: { type: String, trim: true, default: null }, imageUrl: { type: String, default: null }, videoUrl: { type: String, default: null } },
    },

    // --- 7. MARKING SCHEME ---
    marks: {
        correct: { type: Number, default: 4 },   // +4 for correct
        incorrect: { type: Number, default: -1 }, // -1 for wrong
        unattempted: { type: Number, default: 0 }
    },

    // --- 8. METADATA ---
    difficulty: {
        type: String,
        enum: ["Easy", "Medium", "Hard"],
        required: true,
        index: true
    },
    examCategory: {
        type: String,
        enum: ["JEE Main", "JEE Advanced", "Both"],
        required: true,
        index: true
    },

    // Previous year question tagging
    previousYearTag: {
        year: { type: Number, default: null },
        exam: { type: String, default: null },
        paper: { type: String, default: null }, // "Paper 1", "Paper 2"
        shift: { type: String, default: null }  // "Shift 1", "Shift 2" (JEE Main)
    },

    // --- 9. COMPREHENSION PARENT (for paragraph-based questions) ---
    comprehensionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comprehension",
        default: null,
        index: true
    },

    // --- 10. USAGE ANALYTICS (real-time, updated on every submit) ---
    stats: {
        totalAttempts: { type: Number, default: 0 },   // all submissions
        correctAttempts: { type: Number, default: 0 },   // correct submissions (incl. re-tries)
        avgTimeSpent: { type: Number, default: 0 },   // seconds (rolling average)
        accuracyRate: { type: Number, default: 0, min: 0, max: 100 }
    },
    // Unique students who have solved this correctly at least once
    solvedByCount: { type: Number, default: 0, index: true },
    // Unique students who have attempted this (correct OR incorrect)
    uniqueAttemptCount: { type: Number, default: 0 },

    // --- 11. ADMIN AUDIT ---
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isTranslated: {
        type: Boolean,
        default: false
    },
    translationAudited: {
        type: Boolean,
        default: false
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }]

}, { timestamps: true });

// ══════════════════════════════════════════
//  COMPOUND INDEXES (Query-pattern optimized)
// ══════════════════════════════════════════

// Mock test generation: "Give me 30 Easy+Medium Physics MCQs for JEE Main"
QuestionSchema.index({ subjectId: 1, difficulty: 1, examCategory: 1, type: 1, isActive: 1 });

// Practice mode: "All questions from chapter X, sorted by difficulty"
QuestionSchema.index({ chapterId: 1, difficulty: 1, isActive: 1 });

// Topic-level drill: "All Kinematics questions"
QuestionSchema.index({ topicId: 1, isActive: 1 });

// Previous year filtering
QuestionSchema.index({ "previousYearTag.year": 1, "previousYearTag.exam": 1 });

// Tag-based search
QuestionSchema.index({ tags: 1 });

// ══════════════════════════════════════════
//  COMPREHENSION SCHEMA (Paragraph parent)
// ══════════════════════════════════════════

const ComprehensionSchema = new mongoose.Schema({
    paragraph: {
        en: { type: String, required: true, trim: true },
        hi: { type: String, trim: true, default: null }
    },
    imageUrl: { type: String, default: null },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true
    },
    questionCount: { type: Number, default: 0 }
}, { timestamps: true });

const Question = mongoose.model("Question", QuestionSchema);
const Comprehension = mongoose.model("Comprehension", ComprehensionSchema);

module.exports = { Question, Comprehension };