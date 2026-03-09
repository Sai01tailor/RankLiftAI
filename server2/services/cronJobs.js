const cron = require("node-cron");
const axios = require("axios");
const mongoose = require("mongoose");
const config = require("../config");
const logger = require("../utils/logger");
const { User, TestAttempt, GlobalLeaderboard, TestLeaderboard } = require("../models");
const { getRedis } = require("../config/redis");

// ══════════════════════════════════════════════════════════════════
//  Cron Jobs Service
//  
//  Three scheduled tasks:
//  1. HOURLY   — Clean expired JWT refresh tokens from User docs
//  2. DAILY    — Rebuild global & subject-wise leaderboard rankings
//  3. WEEKLY   — Trigger ML model retraining via Flask service
//  
//  IMPORTANT: Only the PRIMARY worker should run crons.
//  Use cluster.isPrimary or a Redis lock to avoid duplicates.
// ══════════════════════════════════════════════════════════════════

const activeTasks = [];

// ── Helper: Wrap cron callback with error handling ──
const safeTask = (name, fn) => async () => {
    const startTime = Date.now();
    logger.info(`⏰ CRON [${name}] started`);
    try {
        await fn();
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        logger.info(`✅ CRON [${name}] completed in ${duration}s`);
    } catch (err) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        logger.error(`❌ CRON [${name}] failed after ${duration}s: ${err.message}`);
    }
};

// ══════════════════════════════════════════════
//  TASK 1: Clean Expired Refresh Tokens (Hourly)
//  Runs at: minute 0 of every hour
// ══════════════════════════════════════════════
const cleanExpiredTokens = async () => {
    const now = new Date();

    // Pull expired tokens from all user documents in bulk
    const result = await User.updateMany(
        { "refreshTokens.expiresAt": { $lte: now } },
        { $pull: { refreshTokens: { expiresAt: { $lte: now } } } }
    );

    logger.info(`  Cleaned expired tokens from ${result.modifiedCount} users`);

    // Also deactivate expired subscriptions
    const subResult = await User.updateMany(
        {
            "subscription.isActive": true,
            "subscription.expiresAt": { $lte: now }
        },
        {
            $set: {
                "subscription.isActive": false,
                "subscription.plan": "free"
            }
        }
    );

    if (subResult.modifiedCount > 0) {
        logger.info(`  Deactivated ${subResult.modifiedCount} expired subscriptions`);
    }
};

// ══════════════════════════════════════════════
//  TASK 2: Rebuild Leaderboards (Daily at midnight)
//  Runs at: 00:00 every day
//  
//  Steps:
//  a) Rebuild ranks for all test leaderboards with new submissions
//  b) Calculate daily/weekly/monthly/all-time global leaderboards
// ══════════════════════════════════════════════
const rebuildLeaderboards = async () => {
    const now = new Date();

    // ── 2a: Rebuild per-test leaderboards ──
    // Find tests with submissions in the last 24 hours
    const recentTests = await TestAttempt.distinct("mockTestId", {
        status: { $in: ["SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"] },
        updatedAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) }
    });

    for (const testId of recentTests) {
        await TestLeaderboard.rebuildForTest(testId);
    }
    logger.info(`  Rebuilt leaderboards for ${recentTests.length} tests`);

    // ── 2b: Rebuild global leaderboards ──
    const periods = [
        { name: "daily", startDate: startOfDay(now), lookback: 1 },
        { name: "weekly", startDate: startOfWeek(now), lookback: 7 },
        { name: "monthly", startDate: startOfMonth(now), lookback: 30 },
        { name: "all_time", startDate: new Date("2025-01-01"), lookback: 99999 }
    ];

    for (const period of periods) {
        await buildGlobalLeaderboard(period.name, period.startDate, period.lookback);
    }
    logger.info(`  Rebuilt all global leaderboard periods`);

    // ── 2c: Invalidate Redis leaderboard cache ──
    try {
        const redis = getRedis();
        if (redis) {
            const keys = await redis.keys("lb:*");
            if (keys.length > 0) {
                await redis.del(...keys);
                logger.info(`  Cleared ${keys.length} leaderboard cache keys`);
            }
        }
    } catch (err) {
        logger.warn(`  Redis cache clear failed: ${err.message}`);
    }
};

// Helper: Build global leaderboard for a specific period
const buildGlobalLeaderboard = async (period, periodStartDate, lookbackDays) => {
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    // Aggregate test attempts within the period
    const aggregated = await TestAttempt.aggregate([
        {
            $match: {
                status: { $in: ["SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"] },
                submittedAt: { $gte: since }
            }
        },
        {
            $group: {
                _id: "$userId",
                totalScore: { $sum: "$totalScore" },
                testsCompleted: { $sum: 1 },
                avgPercentage: { $avg: "$percentage" },
                avgAccuracy: {
                    $avg: {
                        $cond: [
                            { $gt: [{ $add: ["$stats.totalCorrect", "$stats.totalIncorrect"] }, 0] },
                            {
                                $multiply: [
                                    { $divide: ["$stats.totalCorrect", { $add: ["$stats.totalCorrect", "$stats.totalIncorrect"] }] },
                                    100
                                ]
                            },
                            0
                        ]
                    }
                },
                questionsAttempted: { $sum: "$stats.totalAttempted" },
                studyTime: { $sum: "$timeTaken" }
            }
        },
        { $match: { testsCompleted: { $gte: 1 } } }
    ]);

    if (aggregated.length === 0) return;

    // Fetch user display info
    const userIds = aggregated.map(a => a._id);
    const users = await User.find({ _id: { $in: userIds } })
        .select("username avatarUrl streak.currentStreak")
        .lean();

    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    // Calculate rating and build bulk ops
    const entries = aggregated.map(a => {
        const user = userMap[a._id.toString()] || {};
        // Rating formula: (avgPercentage * 0.4) + (accuracy * 0.3) + (consistency * 0.3)
        const consistency = Math.min(a.testsCompleted / 10, 1) * 100; // Normalize to 100
        const rating = (a.avgPercentage * 0.4) + (a.avgAccuracy * 0.3) + (consistency * 0.3);

        return {
            userId: a._id,
            period,
            periodStartDate,
            username: user.username || "Unknown",
            avatarUrl: user.avatarUrl || null,
            totalScore: Math.round(a.totalScore),
            testsCompleted: a.testsCompleted,
            avgPercentage: Math.round(a.avgPercentage * 10) / 10,
            avgAccuracy: Math.round(a.avgAccuracy * 10) / 10,
            questionsAttempted: a.questionsAttempted,
            studyTime: Math.round(a.studyTime),
            rating: Math.round(rating * 10) / 10,
            currentStreak: user.streak?.currentStreak || 0
        };
    });

    // Sort by rating DESC
    entries.sort((a, b) => b.rating - a.rating);

    // Assign ranks and percentiles
    const total = entries.length;
    const bulkOps = entries.map((entry, index) => ({
        updateOne: {
            filter: { userId: entry.userId, period, periodStartDate },
            update: {
                $set: {
                    ...entry,
                    rank: index + 1,
                    percentile: Math.round(((total - index - 1) / total) * 10000) / 100
                }
            },
            upsert: true
        }
    }));

    await GlobalLeaderboard.bulkWrite(bulkOps, { ordered: false });
    logger.info(`  [${period}] ${entries.length} entries ranked`);
};

// Date helpers
const startOfDay = (d) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };
const startOfWeek = (d) => {
    const r = new Date(d);
    const day = r.getDay();
    r.setDate(r.getDate() - (day === 0 ? 6 : day - 1)); // Monday start
    r.setHours(0, 0, 0, 0);
    return r;
};
const startOfMonth = (d) => { const r = new Date(d); r.setDate(1); r.setHours(0, 0, 0, 0); return r; };

// ══════════════════════════════════════════════
//  TASK 3: Retrain ML Models (Weekly, Sunday 2 AM)
//  Runs at: 02:00 every Sunday
//  
//  Triggers /train endpoints on the Flask ML service
// ══════════════════════════════════════════════
const retrainMLModels = async () => {
    const mlUrl = config.ml.serviceUrl;

    // Check if ML service is healthy
    try {
        await axios.get(`${mlUrl}/health`, { timeout: 5000 });
    } catch {
        logger.warn("  ML service unreachable — skipping retraining");
        return;
    }

    // Retrain weak topic model
    try {
        logger.info("  Retraining weak topic model...");
        const weakRes = await axios.post(`${mlUrl}/train/weak-topics`, {}, { timeout: 120000 });
        logger.info(`  Weak topic model: ${JSON.stringify(weakRes.data.metrics || {})}`);
    } catch (err) {
        logger.error(`  Weak topic retrain failed: ${err.message}`);
    }

    // Retrain score prediction model
    try {
        logger.info("  Retraining score prediction model...");
        const scoreRes = await axios.post(`${mlUrl}/train/score`, {}, { timeout: 120000 });
        logger.info(`  Score model: ${JSON.stringify(scoreRes.data.metrics || {})}`);
    } catch (err) {
        logger.error(`  Score retrain failed: ${err.message}`);
    }
};

// ══════════════════════════════════════════════
//  INITIALIZE CRON JOBS
// ══════════════════════════════════════════════
const initCronJobs = () => {
    logger.info("📅 Initializing cron jobs...");

    // Every hour at :00
    const tokenCleanup = cron.schedule("0 * * * *", safeTask("Token Cleanup", cleanExpiredTokens), {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
    activeTasks.push(tokenCleanup);

    // Every day at midnight IST
    const leaderboard = cron.schedule("0 0 * * *", safeTask("Leaderboard Rebuild", rebuildLeaderboards), {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
    activeTasks.push(leaderboard);

    // Every Sunday at 2:00 AM IST
    const mlRetrain = cron.schedule("0 2 * * 0", safeTask("ML Retrain", retrainMLModels), {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
    activeTasks.push(mlRetrain);

    logger.info("   ✅ Hourly:  Expired token + subscription cleanup");
    logger.info("   ✅ Daily:   Leaderboard rebuild (midnight IST)");
    logger.info("   ✅ Weekly:  ML model retraining (Sunday 2 AM IST)");
};

// ── Graceful shutdown ──
const stopCronJobs = () => {
    logger.info("Stopping all cron jobs...");
    activeTasks.forEach(task => task.stop());
    activeTasks.length = 0;
    logger.info("All cron jobs stopped.");
};

module.exports = {
    initCronJobs,
    stopCronJobs,
    // Export individual tasks for manual triggering via admin API
    cleanExpiredTokens,
    rebuildLeaderboards,
    retrainMLModels
};
