// ══════════════════════════════════════════════════════════════════
//  CENTRAL MODEL INDEX — Import all models from one place
//  Usage: const { User, Question, MockTest } = require("./models");
// ══════════════════════════════════════════════════════════════════

const User = require("./Users");
const { Subject, Chapter, Topic } = require("./SubNTopic");
const { Question, Comprehension } = require("./Question");
const { MockTest } = require("./MockTest");
const { TestAttempt } = require("./TestAttempt");
const { PracticeAttempt } = require("./PracticeAttempt");
const { PerformanceAnalytics } = require("./PerformanceAnalytics");
const { TestLeaderboard, GlobalLeaderboard } = require("./Leaderboard");
const { AIInteractionLog } = require("./AIInteractionLog");
const Settings = require("./Settings");

module.exports = {
    // Auth & Users
    User,

    // Academic Hierarchy
    Subject,
    Chapter,
    Topic,

    // Questions
    Question,
    Comprehension,

    // Testing
    MockTest,
    TestAttempt,

    // Practice
    PracticeAttempt,

    // Analytics
    PerformanceAnalytics,

    // Ranking
    TestLeaderboard,
    GlobalLeaderboard,

    // AI
    AIInteractionLog,

    // Settings
    Settings
};
