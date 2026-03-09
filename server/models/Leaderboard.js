const mongoose = require("mongoose");

// ══════════════════════════════════════════════════════════════════
//  LEADERBOARD SCHEMA
//  Two types of leaderboards:
//   1. PER-TEST: Rankings for a specific mock test
//   2. GLOBAL:   Overall platform rankings (daily/weekly/monthly/all-time)
//
//  Design: Write-optimized with bulk upserts after test evaluations.
//          Read-optimized via compound indexes + Redis caching layer.
// ══════════════════════════════════════════════════════════════════

// --- PER-TEST LEADERBOARD ENTRY ---
const TestLeaderboardSchema = new mongoose.Schema({
    // --- References ---
    mockTestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MockTest",
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    testAttemptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TestAttempt",
        required: true
    },

    // --- Display Data (Denormalized for fast reads) ---
    username: { type: String, required: true },
    avatarUrl: { type: String, default: null },

    // --- Scores ---
    totalScore: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    percentage: { type: Number, required: true },
    timeTaken: { type: Number, required: true }, // seconds

    // --- Breakdown ---
    accuracy: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },

    // --- Ranking (Calculated in batch) ---
    rank: { type: Number, default: null },
    percentile: { type: Number, default: null },

    // --- Submission Time ---
    submittedAt: { type: Date, required: true }

}, { timestamps: true });

// Unique: One entry per user per test
TestLeaderboardSchema.index({ mockTestId: 1, userId: 1 }, { unique: true });

// Leaderboard query: Sort by score DESC, then time ASC (tiebreaker)
TestLeaderboardSchema.index({ mockTestId: 1, totalScore: -1, timeTaken: 1 });

// User's rank across tests
TestLeaderboardSchema.index({ userId: 1, percentile: -1 });


// --- GLOBAL LEADERBOARD ENTRY ---
const GlobalLeaderboardSchema = new mongoose.Schema({
    // --- References ---
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // --- Time Period ---
    period: {
        type: String,
        enum: ["daily", "weekly", "monthly", "all_time"],
        required: true,
        index: true
    },
    periodStartDate: {
        type: Date,
        required: true,
        index: true
        // e.g., Start of the week/month for weekly/monthly boards
    },

    // --- Display Data ---
    username: { type: String, required: true },
    avatarUrl: { type: String, default: null },

    // --- Aggregated Scores ---
    totalScore: { type: Number, default: 0 },       // Sum of all test scores in period
    testsCompleted: { type: Number, default: 0 },    // Number of tests in period
    avgPercentage: { type: Number, default: 0 },     // Average percentage across tests
    avgAccuracy: { type: Number, default: 0 },
    questionsAttempted: { type: Number, default: 0 }, // Total questions practiced + tested
    studyTime: { type: Number, default: 0 },          // Total seconds

    // --- Computed Rating (Weighted score for fair ranking) ---
    // Formula: (avgPercentage * 0.4) + (accuracy * 0.3) + (consistency * 0.3)
    rating: { type: Number, default: 0, index: true },

    // --- Ranking ---
    rank: { type: Number, default: null },
    percentile: { type: Number, default: null },

    // --- Streak ---
    currentStreak: { type: Number, default: 0 }

}, { timestamps: true });

// Unique: One entry per user per period per start date
GlobalLeaderboardSchema.index(
    { userId: 1, period: 1, periodStartDate: 1 },
    { unique: true }
);

// Leaderboard display: Top users by rating in a period
GlobalLeaderboardSchema.index({ period: 1, periodStartDate: 1, rating: -1 });

// Auto-cleanup: Remove daily/weekly boards older than 90 days
GlobalLeaderboardSchema.index(
    { period: 1, periodStartDate: 1 },
    {
        expireAfterSeconds: 7776000, // 90 days
        partialFilterExpression: { period: { $in: ["daily", "weekly"] } }
    }
);

// ══════════════════════════════════════════
//  STATICS
// ══════════════════════════════════════════

/**
 * Rebuild test leaderboard after new submissions.
 * Assigns ranks and percentiles in batch.
 */
TestLeaderboardSchema.statics.rebuildForTest = async function (mockTestId) {
    // Get all entries sorted by score DESC, time ASC
    const entries = await this.find({ mockTestId })
        .sort({ totalScore: -1, timeTaken: 1 })
        .lean();

    const total = entries.length;
    if (total === 0) return;

    const bulkOps = entries.map((entry, index) => ({
        updateOne: {
            filter: { _id: entry._id },
            update: {
                $set: {
                    rank: index + 1,
                    percentile: Math.round(((total - index - 1) / total) * 10000) / 100
                }
            }
        }
    }));

    await this.bulkWrite(bulkOps, { ordered: false });
};

/**
 * Add or update a user's entry after test evaluation.
 */
TestLeaderboardSchema.statics.upsertEntry = async function (data) {
    return this.findOneAndUpdate(
        { mockTestId: data.mockTestId, userId: data.userId },
        { $set: data },
        { upsert: true, new: true }
    );
};

/**
 * Get paginated leaderboard for a test.
 */
TestLeaderboardSchema.statics.getTestLeaderboard = async function (mockTestId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
        this.find({ mockTestId })
            .sort({ totalScore: -1, timeTaken: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments({ mockTestId })
    ]);

    return {
        entries,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
        }
    };
};

/**
 * Get a user's rank in a specific test.
 */
TestLeaderboardSchema.statics.getUserRank = async function (mockTestId, userId) {
    return this.findOne({ mockTestId, userId }).lean();
};

const TestLeaderboard = mongoose.model("TestLeaderboard", TestLeaderboardSchema);
const GlobalLeaderboard = mongoose.model("GlobalLeaderboard", GlobalLeaderboardSchema);

module.exports = { TestLeaderboard, GlobalLeaderboard };
