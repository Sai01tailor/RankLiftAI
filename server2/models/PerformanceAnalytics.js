const mongoose = require("mongoose");

// ══════════════════════════════════════════════════════════════════
//  PERFORMANCE ANALYTICS SCHEMA
//  Pre-computed analytics snapshot for each student
//  WHY: Real-time aggregation over millions of attempts is too slow.
//       This schema stores periodic snapshots, updated via:
//       1. Post-test evaluation hooks
//       2. Nightly cron aggregation jobs
//  One document per user — upserted on every update
// ══════════════════════════════════════════════════════════════════

// Sub-schema: Per-subject breakdown
const SubjectAnalyticsSchema = new mongoose.Schema({
    _id: false,
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true
    },
    subjectName: { type: String, required: true },

    // Overall
    totalAttempted: { type: Number, default: 0 },
    totalCorrect: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }, // percentage

    // Time
    avgTimePerQuestion: { type: Number, default: 0 }, // seconds
    totalPracticeTime: { type: Number, default: 0 },   // seconds

    // Score trend (last 10 mock test scores in this subject)
    scoreTrend: [{ type: Number }],

    // Chapter-wise breakdown
    chapters: [{
        _id: false,
        chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },
        chapterName: { type: String },
        totalAttempted: { type: Number, default: 0 },
        totalCorrect: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        avgTimePerQuestion: { type: Number, default: 0 },

        // Topic-wise (finest granularity)
        topics: [{
            _id: false,
            topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
            topicName: { type: String },
            totalAttempted: { type: Number, default: 0 },
            totalCorrect: { type: Number, default: 0 },
            accuracy: { type: Number, default: 0 },
            isWeak: { type: Boolean, default: false } // Flagged by ML service
        }]
    }]
});

// Main PerformanceAnalytics Schema
const PerformanceAnalyticsSchema = new mongoose.Schema({
    // --- 1. USER REFERENCE (One doc per user) ---
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true // Exactly one analytics doc per user (also creates index)
    },

    // --- 2. OVERALL STATS ---
    overall: {
        totalMockTests: { type: Number, default: 0 },
        totalPracticeQuestions: { type: Number, default: 0 },
        totalCorrect: { type: Number, default: 0 },
        totalIncorrect: { type: Number, default: 0 },
        overallAccuracy: { type: Number, default: 0 },    // percentage
        totalStudyTime: { type: Number, default: 0 },      // seconds
        avgMockTestScore: { type: Number, default: 0 },
        bestMockTestScore: { type: Number, default: 0 },
        bestPercentile: { type: Number, default: 0 }
    },

    // --- 3. MOCK TEST PERFORMANCE HISTORY ---
    mockTestHistory: [{
        _id: false,
        testAttemptId: { type: mongoose.Schema.Types.ObjectId, ref: "TestAttempt" },
        mockTestId: { type: mongoose.Schema.Types.ObjectId, ref: "MockTest" },
        testTitle: { type: String },
        score: { type: Number },
        maxScore: { type: Number },
        percentage: { type: Number },
        percentile: { type: Number },
        rank: { type: Number },
        date: { type: Date }
    }],

    // --- 4. SUBJECT-WISE ANALYTICS ---
    subjects: [SubjectAnalyticsSchema],

    // --- 5. WEAK TOPICS (Populated by ML service) ---
    weakTopics: [{
        _id: false,
        topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
        topicName: { type: String },
        chapterName: { type: String },
        subjectName: { type: String },
        accuracy: { type: Number },
        totalAttempted: { type: Number },
        severity: {
            type: String,
            enum: ["mild", "moderate", "severe"],
            default: "mild"
        },
        recommendedAction: { type: String, default: null },
        detectedAt: { type: Date, default: Date.now }
    }],

    // --- 6. SCORE TREND (Last 20 mock tests — for graph) ---
    scoreTrend: [{
        _id: false,
        date: { type: Date },
        score: { type: Number },
        maxScore: { type: Number },
        percentage: { type: Number }
    }],

    // --- 7. DIFFICULTY BREAKDOWN ---
    difficultyBreakdown: {
        easy: {
            attempted: { type: Number, default: 0 },
            correct: { type: Number, default: 0 },
            accuracy: { type: Number, default: 0 }
        },
        medium: {
            attempted: { type: Number, default: 0 },
            correct: { type: Number, default: 0 },
            accuracy: { type: Number, default: 0 }
        },
        hard: {
            attempted: { type: Number, default: 0 },
            correct: { type: Number, default: 0 },
            accuracy: { type: Number, default: 0 }
        }
    },

    // --- 8. QUESTION TYPE BREAKDOWN ---
    questionTypeBreakdown: {
        SCQ: { attempted: { type: Number, default: 0 }, correct: { type: Number, default: 0 }, accuracy: { type: Number, default: 0 } },
        MCQ: { attempted: { type: Number, default: 0 }, correct: { type: Number, default: 0 }, accuracy: { type: Number, default: 0 } },
        INTEGER: { attempted: { type: Number, default: 0 }, correct: { type: Number, default: 0 }, accuracy: { type: Number, default: 0 } },
        NUMERICAL: { attempted: { type: Number, default: 0 }, correct: { type: Number, default: 0 }, accuracy: { type: Number, default: 0 } }
    },

    // --- 9. DAILY ACTIVITY (Last 30 days — for heatmap) ---
    dailyActivity: [{
        _id: false,
        date: { type: Date },
        questionsAttempted: { type: Number, default: 0 },
        timeSpent: { type: Number, default: 0 }, // seconds
        mockTestsTaken: { type: Number, default: 0 }
    }],

    // --- 10. ML PREDICTIONS ---
    mlPredictions: {
        predictedScore: { type: Number, default: null },
        predictedPercentile: { type: Number, default: null },
        readinessLevel: {
            type: String,
            enum: ["Not Ready", "Needs Improvement", "Almost Ready", "Ready", "Excellent"],
            default: null
        },
        lastPredictionAt: { type: Date, default: null },
        modelVersion: { type: String, default: null }
    },

    // --- 11. LAST COMPUTED ---
    lastComputedAt: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });

// ══════════════════════════════════════════
//  INDEXES
//  NOTE: `userId` already has `unique: true` inline — no need to redeclare.
// ══════════════════════════════════════════
PerformanceAnalyticsSchema.index({ "overall.overallAccuracy": -1 }); // For platform-level analytics
PerformanceAnalyticsSchema.index({ "overall.bestPercentile": -1 }); // Top performers

// ══════════════════════════════════════════
//  STATICS
// ══════════════════════════════════════════

/**
 * Update analytics after a mock test is evaluated.
 * Called from TestAttempt.evaluate() post-hook.
 */
PerformanceAnalyticsSchema.statics.updateAfterMockTest = async function (userId, testAttempt, mockTest) {
    const analytics = await this.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId } },
        { upsert: true, new: true }
    );

    // Add to mock test history (keep last 50)
    analytics.mockTestHistory.push({
        testAttemptId: testAttempt._id,
        mockTestId: testAttempt.mockTestId,
        testTitle: mockTest.title,
        score: testAttempt.totalScore,
        maxScore: testAttempt.maxScore,
        percentage: testAttempt.percentage,
        percentile: testAttempt.percentile,
        rank: testAttempt.rank,
        date: testAttempt.submittedAt
    });
    if (analytics.mockTestHistory.length > 50) {
        analytics.mockTestHistory = analytics.mockTestHistory.slice(-50);
    }

    // Update score trend (keep last 20)
    analytics.scoreTrend.push({
        date: testAttempt.submittedAt,
        score: testAttempt.totalScore,
        maxScore: testAttempt.maxScore,
        percentage: testAttempt.percentage
    });
    if (analytics.scoreTrend.length > 20) {
        analytics.scoreTrend = analytics.scoreTrend.slice(-20);
    }

    // Update overall stats
    analytics.overall.totalMockTests += 1;
    analytics.overall.bestMockTestScore = Math.max(
        analytics.overall.bestMockTestScore,
        testAttempt.totalScore
    );
    analytics.overall.bestPercentile = Math.max(
        analytics.overall.bestPercentile || 0,
        testAttempt.percentile || 0
    );

    // Recalculate average
    const allScores = analytics.mockTestHistory.map(h => h.percentage);
    analytics.overall.avgMockTestScore = allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length * 100) / 100
        : 0;

    analytics.lastComputedAt = new Date();
    await analytics.save();
    return analytics;
};

const PerformanceAnalytics = mongoose.model("PerformanceAnalytics", PerformanceAnalyticsSchema);

module.exports = { PerformanceAnalytics };
