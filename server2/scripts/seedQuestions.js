#!/usr/bin/env node

/**
 * ══════════════════════════════════════════════════════════════════
 *  JeeWallah — Question Seeder Script
 * 
 *  Reads questions.json and bulk-inserts into MongoDB.
 * 
 *  Usage:
 *    node scripts/seedQuestions.js                        # Default: scripts/questions.json
 *    node scripts/seedQuestions.js path/to/questions.json  # Custom file
 *    node scripts/seedQuestions.js --dry-run               # Validate only, don't insert
 * 
 *  What it does:
 *  1. Reads the JSON file
 *  2. Resolves subjectSlug/chapterSlug/topicSlug → MongoDB ObjectIds
 *  3. Validates each question against the 5 types (SCQ, MCQ, INTEGER, NUMERICAL, COMPREHENSION)
 *  4. Bulk inserts valid questions
 *  5. Reports success/failure counts with detailed error logs
 * ══════════════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// Load config (connects dotenv)
const config = require("../config");
const connectDB = require("../config/db");
const { Subject, Chapter, Topic, Question } = require("../models");

// ── CLI args ──
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const filePath = args.find(a => !a.startsWith("--")) || path.join(__dirname, "questions.json");

// ── ANSI colors for console ──
const c = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    dim: "\x1b[2m",
    bold: "\x1b[1m"
};

const log = {
    info: (msg) => console.log(`${c.cyan}ℹ${c.reset}  ${msg}`),
    success: (msg) => console.log(`${c.green}✅${c.reset} ${msg}`),
    warn: (msg) => console.log(`${c.yellow}⚠️${c.reset}  ${msg}`),
    error: (msg) => console.log(`${c.red}❌${c.reset} ${msg}`),
    progress: (current, total, msg) => {
        const pct = Math.round((current / total) * 100);
        const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
        process.stdout.write(`\r  ${c.dim}[${bar}]${c.reset} ${pct}% (${current}/${total}) ${msg}   `);
    }
};

// ══════════════════════════════════════════════
//  VALIDATION
// ══════════════════════════════════════════════
const VALID_TYPES = ["SCQ", "MCQ", "INTEGER", "NUMERICAL", "COMPREHENSION"];
const VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"];
const VALID_EXAM_CATEGORIES = ["JEE Main", "JEE Advanced", "Both"];

const validateQuestion = (q, index) => {
    const errors = [];

    // Required fields
    if (!q.content?.en?.text) errors.push("Missing content.en.text");
    if (!q.type || !VALID_TYPES.includes(q.type)) errors.push(`Invalid type: ${q.type}`);
    if (!q.difficulty || !VALID_DIFFICULTIES.includes(q.difficulty)) errors.push(`Invalid difficulty: ${q.difficulty}`);
    if (q.examCategory && !VALID_EXAM_CATEGORIES.includes(q.examCategory)) errors.push(`Invalid examCategory: ${q.examCategory}`);

    // Type-specific validation
    switch (q.type) {
        case "SCQ":
            if (!q.options || q.options.length < 2) errors.push("SCQ needs at least 2 options");
            if (!q.correctAnswer?.optionKeys || q.correctAnswer.optionKeys.length !== 1) {
                errors.push("SCQ must have exactly 1 correct option key");
            }
            // Verify at least one option is correct
            if (q.options) {
                const correctCount = q.options.filter(o => o.isCorrect).length;
                if (correctCount !== 1) errors.push(`SCQ has ${correctCount} correct options (need exactly 1)`);
            }
            break;

        case "MCQ":
            if (!q.options || q.options.length < 2) errors.push("MCQ needs at least 2 options");
            if (!q.correctAnswer?.optionKeys || q.correctAnswer.optionKeys.length < 2) {
                errors.push("MCQ must have at least 2 correct option keys");
            }
            break;

        case "INTEGER":
            if (q.correctAnswer?.numericValue === undefined && q.correctAnswer?.numericValue !== 0) {
                errors.push("INTEGER type needs correctAnswer.numericValue");
            }
            if (q.correctAnswer?.numericValue !== null && !Number.isInteger(q.correctAnswer?.numericValue)) {
                errors.push("INTEGER type needs a whole number as numericValue");
            }
            break;

        case "NUMERICAL":
            if (q.correctAnswer?.numericValue === undefined) {
                errors.push("NUMERICAL type needs correctAnswer.numericValue");
            }
            break;

        case "COMPREHENSION":
            // Comprehension questions may have sub-questions; basic validation
            if (!q.content?.en?.text) errors.push("COMPREHENSION needs passage text");
            break;
    }

    // Hierarchy references (must have at least slug or ID)
    if (!q.subjectId && !q.subjectSlug) errors.push("Missing subjectId or subjectSlug");
    if (!q.chapterId && !q.chapterSlug) errors.push("Missing chapterId or chapterSlug");
    if (!q.topicId && !q.topicSlug) errors.push("Missing topicId or topicSlug");

    return {
        isValid: errors.length === 0,
        errors,
        index
    };
};

// ══════════════════════════════════════════════
//  SLUG → ID RESOLUTION
// ══════════════════════════════════════════════
const buildLookupMaps = async () => {
    log.info("Building subject/chapter/topic lookup maps...");

    const subjects = await Subject.find({}).lean();
    const chapters = await Chapter.find({}).lean();
    const topics = await Topic.find({}).lean();

    const subjectMap = {};
    const chapterMap = {};
    const topicMap = {};

    // Map by slug and by name (case-insensitive)
    subjects.forEach(s => {
        if (s.slug) subjectMap[s.slug.toLowerCase()] = s._id;
        subjectMap[s.name.toLowerCase()] = s._id;
    });

    chapters.forEach(c => {
        if (c.slug) chapterMap[c.slug.toLowerCase()] = c._id;
        chapterMap[c.name.toLowerCase()] = c._id;
    });

    topics.forEach(t => {
        if (t.slug) topicMap[t.slug.toLowerCase()] = t._id;
        topicMap[t.name.toLowerCase()] = t._id;
    });

    log.info(`  Found: ${subjects.length} subjects, ${chapters.length} chapters, ${topics.length} topics`);

    return { subjectMap, chapterMap, topicMap };
};

const resolveIds = (q, maps) => {
    const resolved = { ...q };
    const errors = [];

    // Resolve Subject
    if (!q.subjectId) {
        const key = (q.subjectSlug || q.subjectName || "").toLowerCase();
        const id = maps.subjectMap[key];
        if (id) {
            resolved.subjectId = id;
        } else {
            errors.push(`Subject not found: "${q.subjectSlug || q.subjectName}"`);
        }
    }

    // Resolve Chapter
    if (!q.chapterId) {
        const key = (q.chapterSlug || q.chapterName || "").toLowerCase();
        const id = maps.chapterMap[key];
        if (id) {
            resolved.chapterId = id;
        } else {
            errors.push(`Chapter not found: "${q.chapterSlug || q.chapterName}"`);
        }
    }

    // Resolve Topic
    if (!q.topicId) {
        const key = (q.topicSlug || q.topicName || "").toLowerCase();
        const id = maps.topicMap[key];
        if (id) {
            resolved.topicId = id;
        } else {
            errors.push(`Topic not found: "${q.topicSlug || q.topicName}"`);
        }
    }

    return { resolved, resolveErrors: errors };
};

// ══════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════
const main = async () => {
    console.log(`\n${c.bold}═══════════════════════════════════════════${c.reset}`);
    console.log(`${c.bold}  JeeWallah Question Seeder${c.reset}`);
    console.log(`${c.bold}═══════════════════════════════════════════${c.reset}\n`);

    // 1. Read JSON file
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
        log.error(`File not found: ${fullPath}`);
        process.exit(1);
    }

    let questions;
    try {
        const raw = fs.readFileSync(fullPath, "utf8");
        questions = JSON.parse(raw);
        if (!Array.isArray(questions)) {
            log.error("JSON file must contain an array of questions");
            process.exit(1);
        }
    } catch (err) {
        log.error(`Failed to parse JSON: ${err.message}`);
        process.exit(1);
    }

    log.info(`Loaded ${c.bold}${questions.length}${c.reset} questions from ${path.basename(fullPath)}`);
    if (isDryRun) log.warn("DRY RUN mode — no data will be inserted\n");

    // 2. Connect to DB
    await connectDB();
    log.success("Connected to MongoDB\n");

    // 3. Build lookup maps
    const maps = await buildLookupMaps();

    // 4. Validate and resolve IDs
    const valid = [];
    const invalid = [];
    const skipped = [];

    console.log("");
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        log.progress(i + 1, questions.length, `Validating Q${i + 1}`);

        // Validate structure
        const validation = validateQuestion(q, i);
        if (!validation.isValid) {
            invalid.push({
                index: i,
                question: q.content?.en?.text?.substring(0, 80) || "No text",
                errors: validation.errors
            });
            continue;
        }

        // Resolve slug → ObjectId
        const { resolved, resolveErrors } = resolveIds(q, maps);
        if (resolveErrors.length > 0) {
            skipped.push({
                index: i,
                question: q.content?.en?.text?.substring(0, 80) || "No text",
                errors: resolveErrors
            });
            continue;
        }

        // Clean up slug fields (not in schema)
        delete resolved.subjectSlug;
        delete resolved.chapterSlug;
        delete resolved.topicSlug;
        delete resolved.subjectName;
        delete resolved.chapterName;
        delete resolved.topicName;

        // Set defaults
        if (!resolved.examCategory) resolved.examCategory = "Both";
        if (!resolved.marks) resolved.marks = { correct: 4, incorrect: -1, unattempted: 0 };
        if (!resolved.status) resolved.status = "published";

        valid.push(resolved);
    }
    console.log("\n"); // Clear progress bar

    // 5. Report validation results
    log.info(`${c.bold}Validation Results:${c.reset}`);
    log.success(`Valid:   ${c.bold}${valid.length}${c.reset}`);
    if (invalid.length > 0) {
        log.error(`Invalid: ${c.bold}${invalid.length}${c.reset}`);
        invalid.forEach(item => {
            console.log(`   ${c.red}Q${item.index + 1}:${c.reset} ${item.question}`);
            item.errors.forEach(e => console.log(`      ${c.dim}→ ${e}${c.reset}`));
        });
    }
    if (skipped.length > 0) {
        log.warn(`Skipped: ${c.bold}${skipped.length}${c.reset} (missing subjects/chapters/topics)`);
        skipped.forEach(item => {
            console.log(`   ${c.yellow}Q${item.index + 1}:${c.reset} ${item.question}`);
            item.errors.forEach(e => console.log(`      ${c.dim}→ ${e}${c.reset}`));
        });
    }
    console.log("");

    if (valid.length === 0) {
        log.error("No valid questions to insert. Exiting.");
        await mongoose.connection.close();
        process.exit(1);
    }

    if (isDryRun) {
        log.info("Dry run complete. No data was inserted.");
        await mongoose.connection.close();
        process.exit(0);
    }

    // 6. Bulk insert
    log.info(`Inserting ${valid.length} questions into MongoDB...`);

    try {
        // Use insertMany with ordered: false so one failure doesn't stop all inserts
        const result = await Question.insertMany(valid, {
            ordered: false,
            rawResult: true
        });

        const inserted = result.insertedCount || result.mongoose?.validationErrors?.length
            ? valid.length - (result.mongoose?.validationErrors?.length || 0)
            : valid.length;

        log.success(`${c.bold}${inserted}${c.reset} questions inserted successfully!`);
    } catch (err) {
        if (err.name === "MongoBulkWriteError" || err.name === "BulkWriteError") {
            const inserted = err.insertedDocs?.length || err.result?.insertedCount || 0;
            const failed = valid.length - inserted;
            log.success(`${inserted} questions inserted`);
            log.error(`${failed} questions failed:`);

            // Show first 5 errors
            const writeErrors = err.writeErrors || [];
            writeErrors.slice(0, 5).forEach(we => {
                console.log(`   ${c.red}Index ${we.index}:${c.reset} ${we.errmsg?.substring(0, 100)}`);
            });
            if (writeErrors.length > 5) {
                console.log(`   ${c.dim}... and ${writeErrors.length - 5} more errors${c.reset}`);
            }
        } else {
            log.error(`Insert failed: ${err.message}`);
        }
    }

    // 7. Summary
    console.log(`\n${c.bold}═══════════════════════════════════════════${c.reset}`);
    const totalInDB = await Question.countDocuments({});
    log.info(`Total questions in database: ${c.bold}${totalInDB}${c.reset}`);
    console.log(`${c.bold}═══════════════════════════════════════════${c.reset}\n`);

    await mongoose.connection.close();
    process.exit(0);
};

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
