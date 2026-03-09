const mongoose = require("mongoose");

// ══════════════════════════════════════════════════════════════════
//  AI INTERACTION LOG SCHEMA
//  Logs every AI explanation request to Gemini API
//  Used for: Analytics, caching repeated requests, cost tracking,
//            improving question explanations, audit trail
// ══════════════════════════════════════════════════════════════════

const AIInteractionLogSchema = new mongoose.Schema({
    // --- 1. WHO ---
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    // --- 2. WHAT (Context) ---
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
        required: true,
        index: true
    },
    interactionType: {
        type: String,
        enum: [
            "EXPLAIN_SOLUTION",    // Explain the solution step-by-step
            "EXPLAIN_CONCEPT",     // Explain the underlying concept
            "HINT",                // Give a hint without revealing answer
            "DOUBT",               // Student asks a specific doubt
            "ALTERNATIVE_METHOD",  // Show another way to solve
            "SIMILAR_QUESTION"     // Generate a similar question for practice
        ],
        required: true,
        index: true
    },

    // --- 3. REQUEST ---
    request: {
        prompt: { type: String, required: true }, // What was sent to Gemini
        questionText: { type: String },            // Question text (for logging)
        studentDoubt: { type: String, default: null }, // Student's specific doubt
        language: {
            type: String,
            enum: ["en", "hi"],
            default: "en"
        },
        context: {
            // Additional context sent to the AI
            subjectName: { type: String },
            chapterName: { type: String },
            topicName: { type: String },
            difficulty: { type: String },
            studentAnswer: { type: String, default: null },
            correctAnswer: { type: String, default: null }
        }
    },

    // --- 4. RESPONSE ---
    response: {
        text: { type: String },                  // AI's response
        tokensUsed: {
            input: { type: Number, default: 0 },
            output: { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        },
        modelUsed: { type: String, default: "gemini-2.0-flash" },
        latencyMs: { type: Number, default: 0 }, // Response time in milliseconds
        cached: { type: Boolean, default: false } // Was this served from cache?
    },

    // --- 5. STATUS ---
    status: {
        type: String,
        enum: ["SUCCESS", "ERROR", "TIMEOUT", "RATE_LIMITED", "CACHED"],
        default: "SUCCESS",
        index: true
    },
    errorMessage: { type: String, default: null },

    // --- 6. FEEDBACK ---
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: null
        },
        isHelpful: { type: Boolean, default: null },
        comment: { type: String, trim: true, default: null }
    },

    // --- 7. CACHE KEY ---
    // Hash of (questionId + interactionType + language) for dedup
    cacheKey: {
        type: String,
        index: true
    }

}, { timestamps: true });

// ══════════════════════════════════════════
//  INDEXES
// ══════════════════════════════════════════

// "All AI interactions for user X" (ordered by most recent)
AIInteractionLogSchema.index({ userId: 1, createdAt: -1 });

// Cache lookup: "Has someone already asked for explanation of question Y?"
AIInteractionLogSchema.index({ cacheKey: 1, status: 1 });

// Analytics: "How many AI calls this month?"
AIInteractionLogSchema.index({ createdAt: -1 });

// Feedback analytics: "Which explanations got bad ratings?"
AIInteractionLogSchema.index(
    { "feedback.rating": 1 },
    { partialFilterExpression: { "feedback.rating": { $exists: true, $ne: null } } }
);

// Cost tracking: Token usage per day
AIInteractionLogSchema.index({ createdAt: 1, "response.tokensUsed.total": 1 });

// TTL: Auto-delete logs older than 6 months (configurable)
// Comment out if you want to keep all logs
// AIInteractionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15552000 });

// ══════════════════════════════════════════
//  STATICS
// ══════════════════════════════════════════

/**
 * Find a cached AI response for the same question + type + language
 */
AIInteractionLogSchema.statics.findCachedResponse = async function (cacheKey) {
    return this.findOne({
        cacheKey,
        status: { $in: ["SUCCESS", "CACHED"] },
        "response.text": { $ne: null }
    })
        .sort({ createdAt: -1 })
        .lean();
};

/**
 * Generate a cache key from question + interaction type + language
 */
AIInteractionLogSchema.statics.generateCacheKey = function (questionId, interactionType, language = "en") {
    const crypto = require("crypto");
    const raw = `${questionId}:${interactionType}:${language}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
};

/**
 * Get usage stats for a date range (for admin dashboard)
 */
AIInteractionLogSchema.statics.getUsageStats = async function (startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    status: "$status"
                },
                count: { $sum: 1 },
                totalTokens: { $sum: "$response.tokensUsed.total" },
                avgLatency: { $avg: "$response.latencyMs" }
            }
        },
        {
            $group: {
                _id: "$_id.date",
                totalCalls: { $sum: "$count" },
                totalTokens: { $sum: "$totalTokens" },
                avgLatency: { $avg: "$avgLatency" },
                statusBreakdown: {
                    $push: {
                        status: "$_id.status",
                        count: "$count"
                    }
                }
            }
        },
        { $sort: { _id: -1 } }
    ]);
};

/**
 * Get AI cost estimate (based on token usage)
 */
AIInteractionLogSchema.statics.getTokenUsageSummary = async function (days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: null,
                totalCalls: { $sum: 1 },
                totalInputTokens: { $sum: "$response.tokensUsed.input" },
                totalOutputTokens: { $sum: "$response.tokensUsed.output" },
                totalTokens: { $sum: "$response.tokensUsed.total" },
                cachedResponses: { $sum: { $cond: ["$response.cached", 1, 0] } },
                avgLatency: { $avg: "$response.latencyMs" },
                errorCount: {
                    $sum: { $cond: [{ $eq: ["$status", "ERROR"] }, 1, 0] }
                }
            }
        }
    ]);
};

const AIInteractionLog = mongoose.model("AIInteractionLog", AIInteractionLogSchema);

module.exports = { AIInteractionLog };
