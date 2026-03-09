const mongoose = require("mongoose");

// ══════════════════════════════════════════════════════════════════
//  PRACTICE ATTEMPT SCHEMA — Individual question practice tracking
//  Every single question a student practices (outside mock tests)
//  Used for: Weak topic detection, practice analytics, ML input
// ══════════════════════════════════════════════════════════════════

const PracticeAttemptSchema = new mongoose.Schema({
    // --- 1. WHO & WHAT ---
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
        required: true,
        index: true
    },

    // --- 2. DENORMALIZED HIERARCHY (Avoids populating Question every time) ---
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true,
        index: true
    },
    chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chapter",
        required: true,
        index: true
    },
    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Topic",
        required: true,
        index: true
    },

    // --- 3. STUDENT'S ANSWER ---
    selectedOptions: [{ type: String }],
    numericAnswer: { type: Number, default: null },
    isAttempted: { type: Boolean, default: true },

    // --- 4. EVALUATION ---
    isCorrect: {
        type: Boolean,
        required: true
    },
    marksAwarded: { type: Number, default: 0 },
    difficulty: {
        type: String,
        enum: ["Easy", "Medium", "Hard"],
        required: true
    },

    // --- 5. TIME TRACKING ---
    timeSpent: {
        type: Number,
        default: 0,
        min: 0
        // Seconds spent on this question
    },

    // --- 6. SESSION GROUPING ---
    sessionId: {
        type: String,
        index: true
        // Groups questions practiced in one sitting
        // Generated client-side: UUID per practice session
    },

    // --- 7. STUDENT ACTIONS ---
    isBookmarked: { type: Boolean, default: false },
    userNote: { type: String, trim: true, default: null },
    isFlagged: { type: Boolean, default: false },  // Flag for doubt/report
    flagReason: { type: String, trim: true, default: null },

    // --- 8. AI HELP ---
    usedAIExplanation: { type: Boolean, default: false },
    aiInteractionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AIInteractionLog",
        default: null
    }

}, { timestamps: true });

// ══════════════════════════════════════════
//  INDEXES (Query-pattern optimized for analytics)
// ══════════════════════════════════════════

// "All practice attempts by user X in subject Y"
PracticeAttemptSchema.index({ userId: 1, subjectId: 1, createdAt: -1 });

// "User X's attempts in chapter Y" (For chapter-level accuracy calc)
PracticeAttemptSchema.index({ userId: 1, chapterId: 1, isCorrect: 1 });

// "User X's attempts in topic Y" (For weak topic detection)
PracticeAttemptSchema.index({ userId: 1, topicId: 1, isCorrect: 1 });

// "Has user X already attempted question Y?" (Prevents showing same question)
PracticeAttemptSchema.index({ userId: 1, questionId: 1 });

// "All bookmarked questions by user X"
PracticeAttemptSchema.index(
    { userId: 1, isBookmarked: 1, createdAt: -1 },
    { partialFilterExpression: { isBookmarked: true } }
);

// Session grouping
PracticeAttemptSchema.index({ userId: 1, sessionId: 1 });

// ══════════════════════════════════════════
//  STATICS
// ══════════════════════════════════════════

/**
 * Get topic-wise accuracy for a user (Input for ML weak topic detection)
 */
PracticeAttemptSchema.statics.getTopicAccuracy = async function (userId) {
    return this.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), isAttempted: true } },
        {
            $group: {
                _id: {
                    topicId: "$topicId",
                    chapterId: "$chapterId",
                    subjectId: "$subjectId"
                },
                totalAttempts: { $sum: 1 },
                correctAttempts: { $sum: { $cond: ["$isCorrect", 1, 0] } },
                avgTimeSpent: { $avg: "$timeSpent" },
                // Difficulty distribution
                easyCount: { $sum: { $cond: [{ $eq: ["$difficulty", "Easy"] }, 1, 0] } },
                mediumCount: { $sum: { $cond: [{ $eq: ["$difficulty", "Medium"] }, 1, 0] } },
                hardCount: { $sum: { $cond: [{ $eq: ["$difficulty", "Hard"] }, 1, 0] } }
            }
        },
        {
            $addFields: {
                accuracy: {
                    $round: [
                        { $multiply: [{ $divide: ["$correctAttempts", "$totalAttempts"] }, 100] },
                        2
                    ]
                }
            }
        },
        { $sort: { accuracy: 1 } } // Weakest topics first
    ]);
};

/**
 * Get practice session summary
 */
PracticeAttemptSchema.statics.getSessionSummary = async function (userId, sessionId) {
    const result = await this.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), sessionId } },
        {
            $group: {
                _id: null,
                totalQuestions: { $sum: 1 },
                correct: { $sum: { $cond: ["$isCorrect", 1, 0] } },
                incorrect: { $sum: { $cond: [{ $and: ["$isAttempted", { $not: "$isCorrect" }] }, 1, 0] } },
                totalTime: { $sum: "$timeSpent" },
                avgTime: { $avg: "$timeSpent" }
            }
        },
        {
            $addFields: {
                accuracy: {
                    $round: [
                        { $multiply: [{ $divide: ["$correct", "$totalQuestions"] }, 100] }, 2
                    ]
                }
            }
        }
    ]);
    return result[0] || null;
};

const PracticeAttempt = mongoose.model("PracticeAttempt", PracticeAttemptSchema);

module.exports = { PracticeAttempt };
