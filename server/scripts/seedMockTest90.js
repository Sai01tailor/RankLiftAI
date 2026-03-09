/**
 * seedMockTest90.js
 * ─────────────────────────────────────────────────────────────────
 * Creates one full-length JEE Main mock test using the 90 seeded questions.
 *
 * JEE Main 2024 Pattern:
 *   Physics   : Section A — 20 SCQ (+4/−1) | Section B — 10 INTEGER (+4/0, attempt any 5)
 *   Chemistry : Section A — 20 SCQ (+4/−1) | Section B — 10 INTEGER (+4/0, attempt any 5)
 *   Mathematics: Section A — 20 SCQ (+4/−1) | Section B — 10 INTEGER (+4/0, attempt any 5)
 *   Duration  : 180 minutes
 *   Max Marks : 300  (60 SCQ × 4 + 15 INTEGER × 4 = 240 + 60 = 300)
 *
 * Usage: node scripts/seedMockTest90.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const config = require('../config');
const { MockTest } = require('../models/MockTest');
const { Question } = require('../models/Question');
const { Subject } = require('../models/SubNTopic');
const User = require('../models/Users');

async function run() {
    await mongoose.connect(config.mongo.uri);
    console.log('✅ MongoDB connected');

    // ── Admin user ──
    const admin = await User.findOne({ role: 'admin' }, '_id').lean();
    if (!admin) { console.error('No admin user found.'); process.exit(1); }

    // ── Fetch subject IDs ──
    const subjects = await Subject.find({}, 'name slug _id').lean();
    const subMap = Object.fromEntries(subjects.map(s => [s.slug, s._id]));

    const physicsId = subMap['physics'];
    const chemId = subMap['chemistry'];
    const mathId = subMap['mathematics'];

    // ── Fetch questions per subject & type ──
    const fetchQs = async (subjectId, type) =>
        Question.find({ subjectId, type, isActive: true, examCategory: 'JEE Main' }, '_id').lean();

    const [phySCQ, phyINT, chSCQ, chINT, maSCQ, maINT] = await Promise.all([
        fetchQs(physicsId, 'SCQ'),
        fetchQs(physicsId, 'INTEGER'),
        fetchQs(chemId, 'SCQ'),
        fetchQs(chemId, 'INTEGER'),
        fetchQs(mathId, 'SCQ'),
        fetchQs(mathId, 'INTEGER'),
    ]);

    console.log(`Physics  : ${phySCQ.length} SCQ, ${phyINT.length} INTEGER`);
    console.log(`Chemistry: ${chSCQ.length} SCQ,  ${chINT.length} INTEGER`);
    console.log(`Maths    : ${maSCQ.length} SCQ,  ${maINT.length} INTEGER`);

    // Validate minimums
    const validate = (name, scq, int_) => {
        if (scq.length < 20) throw new Error(`${name}: only ${scq.length} SCQ (need 20)`);
        if (int_.length < 10) throw new Error(`${name}: only ${int_.length} INTEGER (need 10)`);
    };
    validate('Physics', phySCQ, phyINT);
    validate('Chemistry', chSCQ, chINT);
    validate('Maths', maSCQ, maINT);

    // ── Build sections ──
    // Each subject has: Section A (20 SCQ, +4/−1) and Section B (10 INTEGER, +4/0, attempt 5)
    const buildSubjectSections = (subjectName, scqList, intList) => [
        {
            name: `${subjectName} — Section A`,
            type: 'SCQ',
            instructions: {
                en: `This section contains 20 Single Correct Question (SCQ) type questions. Each question has 4 options with ONLY ONE correct option. Full marks: +4 | Wrong answer: −1 | Unattempted: 0`,
                hi: `इस खंड में 20 एकल सही प्रश्न (SCQ) हैं। प्रत्येक प्रश्न में 4 विकल्प हैं, केवल एक सही है। सही: +4 | गलत: −1 | अनुत्तरित: 0`
            },
            totalQuestions: 20,
            maxQuestions: 20,
            markingScheme: { correct: 4, incorrect: -1, unattempted: 0 },
            questions: scqList.slice(0, 20).map((q, i) => ({
                questionId: q._id,
                order: i + 1,
                marks: { correct: 4, incorrect: -1, unattempted: 0 }
            }))
        },
        {
            name: `${subjectName} — Section B`,
            type: 'INTEGER',
            instructions: {
                en: `This section contains 10 Numerical Answer Type questions. Attempt any 5. No negative marking. Full marks: +4 | Wrong: 0 | Unattempted: 0`,
                hi: `इस खंड में 10 संख्यात्मक उत्तर प्रकार के प्रश्न हैं। कोई भी 5 प्रश्न हल करें। कोई नकारात्मक अंक नहीं। सही: +4 | गलत: 0`
            },
            totalQuestions: 10,
            maxQuestions: 5,  // JEE Main: attempt any 5 of 10
            markingScheme: { correct: 4, incorrect: 0, unattempted: 0 },
            questions: intList.slice(0, 10).map((q, i) => ({
                questionId: q._id,
                order: i + 1,
                marks: { correct: 4, incorrect: 0, unattempted: 0 }
            }))
        }
    ];

    const sections = [
        ...buildSubjectSections('Physics', phySCQ, phyINT),
        ...buildSubjectSections('Chemistry', chSCQ, chINT),
        ...buildSubjectSections('Mathematics', maSCQ, maINT),
    ];

    // Total marks: (20 SCQ × 4) + (5 INTEGER × 4) = 80 + 20 = 100 per subject × 3 = 300
    const totalMarks = 300;
    const totalQuestions = 90; // all questions in the test (students attempt 75 effectively)

    // ── Create MockTest ──
    const mockTest = new MockTest({
        title: 'JEE Main 2024 — Full Length Mock Test #1',
        description: {
            en: 'A full-length JEE Main mock test covering Physics, Chemistry, and Mathematics. 90 questions, 300 marks, 180 minutes. Section B: Attempt any 5 out of 10 numerical questions per subject.',
            hi: 'JEE Main का पूर्ण-लंबाई मॉक टेस्ट। भौतिकी, रसायन विज्ञान और गणित। 90 प्रश्न, 300 अंक, 180 मिनट।'
        },
        examType: 'JEE Main',
        testType: 'FULL_LENGTH',
        duration: 180,
        totalMarks,
        totalQuestions,
        sections,
        accessLevel: 'free',
        isActive: true,
        isPublished: true,
        createdBy: admin._id,
        tags: ['jee-main', 'full-length', 'physics', 'chemistry', 'mathematics', '2024'],
        instructions: {
            en: [
                'Duration: 3 hours (180 minutes).',
                'Total Questions: 90 | Total Marks: 300.',
                'Section A (each subject): 20 SCQ — All must be attempted. +4 marks for correct, −1 for incorrect.',
                'Section B (each subject): 10 Integer type — Attempt any 5. +4 for correct, 0 for incorrect.',
                'Do not close the browser during the test. Your progress is auto-saved every 30 seconds.',
                'Submit before the timer expires or the test will be auto-submitted.',
            ].join('\n'),
            hi: [
                'समय: 3 घंटे (180 मिनट)।',
                'कुल प्रश्न: 90 | कुल अंक: 300।',
                'खंड A (प्रत्येक विषय): 20 SCQ — सभी अनिवार्य। सही उत्तर: +4, गलत: −1।',
                'खंड B (प्रत्येक विषय): 10 संख्यात्मक — कोई भी 5 हल करें। सही: +4, गलत: 0।',
            ].join('\n')
        }
    });

    await mockTest.save();

    console.log(`\n✅ Mock Test created!`);
    console.log(`   Title     : ${mockTest.title}`);
    console.log(`   ID        : ${mockTest._id}`);
    console.log(`   Sections  : ${mockTest.sections.length} (6 sections: 2 per subject)`);
    console.log(`   Questions : ${totalQuestions} (90 total, effectively 75 scored)`);
    console.log(`   Marks     : ${totalMarks}`);
    console.log(`   Duration  : 180 min`);
    console.log(`   Published : true (available to students immediately)\n`);

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
