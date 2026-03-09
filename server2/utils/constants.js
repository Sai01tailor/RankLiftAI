// ══════════════════════════════════════════════
//  Application Constants
// ══════════════════════════════════════════════

module.exports = {
    // Roles
    ROLES: {
        STUDENT: "student",
        ADMIN: "admin"
    },

    // Question Types
    QUESTION_TYPES: {
        SCQ: "SCQ",
        MCQ: "MCQ",
        INTEGER: "INTEGER",
        NUMERICAL: "NUMERICAL",
        COMPREHENSION: "COMPREHENSION"
    },

    // Difficulty
    DIFFICULTY: {
        EASY: "Easy",
        MEDIUM: "Medium",
        HARD: "Hard"
    },

    // Exam Categories
    EXAM_CATEGORY: {
        MAIN: "JEE Main",
        ADVANCED: "JEE Advanced",
        BOTH: "Both"
    },

    // Test Status
    TEST_STATUS: {
        IN_PROGRESS: "IN_PROGRESS",
        SUBMITTED: "SUBMITTED",
        AUTO_SUBMITTED: "AUTO_SUBMITTED",
        ABANDONED: "ABANDONED",
        EVALUATED: "EVALUATED"
    },

    // Marking Scheme
    MARKING: {
        JEE_MAIN: { correct: 4, incorrect: -1, unattempted: 0 },
        JEE_ADVANCED_SCQ: { correct: 3, incorrect: -1, unattempted: 0 },
        JEE_ADVANCED_MCQ: { correct: 4, incorrect: -2, unattempted: 0 }
    },

    // Redis Key Prefixes
    REDIS_KEYS: {
        OTP: "otp:",
        OTP_ATTEMPTS: "otp_attempts:",
        SESSION: "session:",
        LEADERBOARD: "lb:",
        QUESTION_CACHE: "q:",
        AI_CACHE: "ai:",
        RATE_LIMIT: "rl:",
        TEST_SESSION: "test:"
    },

    // Cache TTLs (seconds)
    CACHE_TTL: {
        QUESTIONS: 3600,       // 1 hour
        LEADERBOARD: 300,      // 5 minutes
        AI_RESPONSE: 86400,    // 24 hours
        TEST_SESSION: 14400,   // 4 hours
        ANALYTICS: 600,        // 10 minutes
        SUBJECTS: 86400        // 24 hours
    },

    // Subscription Plans
    PLANS: {
        FREE: "free",
        BASIC: "basic",
        PREMIUM: "premium",
        ULTIMATE: "ultimate"
    }
};
