/**
 * scripts/backfillTitles.js
 * ─────────────────────────────────────────────────────────────────
 * One-time script: generates and stores a title for every question
 * that doesn't have one yet.
 *
 * Format: "[Chapter Name] — [Topic Name]"
 * If chapter/topic are missing: falls back to subject name
 *
 * Usage:
 *   node scripts/backfillTitles.js
 *   node scripts/backfillTitles.js --force   (overwrite existing titles)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { Question } = require('../models/Question');
const { Chapter, Topic } = require('../models/SubNTopic');
const config = require('../config');

const FORCE = process.argv.includes('--force');

async function run() {
    await mongoose.connect(config.mongo.uri);
    console.log('✅ MongoDB connected');

    const filter = FORCE ? { isActive: true } : { isActive: true, $or: [{ title: null }, { title: '' }, { title: { $exists: false } }] };
    const total = await Question.countDocuments(filter);
    console.log(`📋 ${total} questions to title`);

    // Load all chapters and topics into memory for fast lookup
    const chapters = await Chapter.find({}, 'name').lean();
    const topics = await Topic.find({}, 'name').lean();
    const chapterMap = Object.fromEntries(chapters.map(c => [c._id.toString(), c.name]));
    const topicMap = Object.fromEntries(topics.map(t => [t._id.toString(), t.name]));

    let updated = 0;
    const cursor = Question.find(filter, 'chapterId topicId subjectId').lean().cursor();
    const OPS = [];

    for await (const q of cursor) {
        const chapterName = chapterMap[q.chapterId?.toString()] || '';
        const topicName = topicMap[q.topicId?.toString()] || '';
        const title = [chapterName, topicName].filter(Boolean).join(' — ') || 'General Question';

        OPS.push({
            updateOne: {
                filter: { _id: q._id },
                update: { $set: { title } },
            }
        });

        if (OPS.length >= 500) {
            await Question.bulkWrite(OPS);
            updated += OPS.length;
            OPS.length = 0;
            process.stdout.write(`\r  Processed ${updated}/${total}…`);
        }
    }

    if (OPS.length > 0) {
        await Question.bulkWrite(OPS);
        updated += OPS.length;
    }

    console.log(`\n✅ Done! ${updated} questions titled.`);
    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
