/**
 * scripts/translateAllQuestions.js
 * ───────────────────────────────────────────────────────────────
 * Auto-translate all questions respecting NTA language policy:
 *   - JEE Advanced: only → hi (Hindi)
 *   - JEE Main / Both: → hi, gj, mr, ta, te, kn, bn, ur
 *
 * Usage:
 *   node scripts/translateAllQuestions.js
 *   node scripts/translateAllQuestions.js --force          (re-translate all)
 *   node scripts/translateAllQuestions.js --lang hi        (only one language)
 *   node scripts/translateAllQuestions.js --advanced-only  (JEE Advanced only)
 *   node scripts/translateAllQuestions.js --main-only      (JEE Main / Both only)
 *
 * Safe to run multiple times — skips already-translated fields unless --force.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { Question } = require('../models/Question');
const { translateQuestion, JEE_ADVANCED_LANGS, JEE_MAIN_LANGS } = require('../services/translate');
const logger = require('../utils/logger');
const config = require('../config');

const args = process.argv.slice(2);
const force = args.includes('--force');
const langArg = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : null;
const onlyAdvanced = args.includes('--advanced-only');
const onlyMain = args.includes('--main-only');

// Explicit --lang overrides everything
const FORCED_LANGS = langArg ? [langArg] : null;

const BATCH_SIZE = 1;   // One question at a time to avoid rate limits with 8 languages
const DELAY_MS = 8000; // 8s between questions — safe for free-tier Gemini

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
    const mongoUri = config.mongo.uri;
    if (!mongoUri) { console.error('❌ No MongoDB URI configured.'); process.exit(1); }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const filter = { isActive: true };
    if (!force) filter.isTranslated = { $ne: true };
    if (onlyAdvanced) filter.examCategory = 'JEE Advanced';
    if (onlyMain) filter.examCategory = { $in: ['JEE Main', 'Both'] };

    const total = await Question.countDocuments(filter);
    console.log(`📋 ${total} question(s) to translate\n`);
    console.log(`🌐 Mode: ${onlyAdvanced ? 'Advanced only' : onlyMain ? 'Main/Both only' : 'All'} | Force: ${force}`);
    console.log(`   JEE Advanced → [${JEE_ADVANCED_LANGS.join(', ')}]`);
    console.log(`   JEE Main/Both → [${JEE_MAIN_LANGS.join(', ')}]\n`);

    if (total === 0) {
        console.log('✅ All questions already translated. Use --force to re-translate.');
        process.exit(0);
    }

    let processed = 0, succeeded = 0, failed = 0;
    const cursor = Question.find(filter).lean().cursor();

    let batch = [];
    for await (const question of cursor) {
        batch.push(question);
        if (batch.length >= BATCH_SIZE) {
            for (const q of batch) {
                const ok = await translateAndSave(q, FORCED_LANGS, force)
                    .then(() => true).catch(() => false);
                ok ? succeeded++ : failed++;
            }
            processed += batch.length;
            console.log(`  ↳ Progress: ${processed}/${total}  ✓${succeeded}  ✗${failed}`);
            batch = [];
            await sleep(DELAY_MS);
        }
    }

    // Remaining
    if (batch.length > 0) {
        for (const q of batch) {
            const ok = await translateAndSave(q, FORCED_LANGS, force)
                .then(() => true).catch(() => false);
            ok ? succeeded++ : failed++;
        }
        processed += batch.length;
    }

    console.log(`\n✅ Done! ${succeeded} translated, ${failed} failed out of ${total} total.`);
    await mongoose.disconnect();
    process.exit(0);
}

async function translateAndSave(question, forcedLangs, force) {
    try {
        // Pass null = auto-detect. Pass forcedLangs array = override.
        const updates = await translateQuestion(question, forcedLangs, force);
        if (Object.keys(updates).length > 0) {
            await Question.findByIdAndUpdate(question._id, { $set: updates });
            const exam = question.examCategory;
            console.log(`  ✓ [${exam}] ${question._id} → ${Object.keys(updates).filter(k => k !== 'isTranslated' && k !== 'translationAudited').length} fields`);
        } else {
            console.log(`  - ${question._id} → nothing to update`);
        }
    } catch (err) {
        console.error(`  ✗ ${question._id} → ${err.message}`);
        throw err;
    }
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
