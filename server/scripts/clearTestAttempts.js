/**
 * clearTestAttempts.js
 * ─────────────────────────────────────────────
 * Drops ALL test attempts + leaderboard entries for every student.
 * Also resets MockTest stats and PerformanceAnalytics mock-test fields.
 *
 * Run: node scripts/clearTestAttempts.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    const db = mongoose.connection.db;

    // ── 1. Drop TestAttempts ──────────────────────────────────────────
    const attRes = await db.collection('testattempts').deleteMany({});
    console.log(`🗑  TestAttempts deleted : ${attRes.deletedCount}`);

    // ── 2. Drop TestLeaderboard entries ───────────────────────────────
    const lbRes = await db.collection('testleaderboards').deleteMany({});
    console.log(`🗑  Leaderboard entries  : ${lbRes.deletedCount}`);

    // ── 3. Reset MockTest stats counters ──────────────────────────────
    const mtRes = await db.collection('mocktests').updateMany({}, {
        $set: {
            'stats.totalAttempts': 0,
            'stats.avgScore': 0,
            'stats.highestScore': 0,
            'stats.avgCompletionTime': 0,
        }
    });
    console.log(`🔄 MockTest stats reset  : ${mtRes.modifiedCount} tests`);

    // ── 4. Reset PerformanceAnalytics mock-test related fields ─────────
    const paRes = await db.collection('performanceanalytics').updateMany({}, {
        $set: {
            mockTestsAttempted: 0,
            totalMockScore: 0,
            avgMockPercentage: 0,
            bestMockPercentage: 0,
            weakTopics: [],
        }
    });
    console.log(`🔄 PerformanceAnalytics  : ${paRes.modifiedCount} records reset`);

    console.log('\n✅ Done. Questions, users, and practice attempts are untouched.');
    await mongoose.disconnect();
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
