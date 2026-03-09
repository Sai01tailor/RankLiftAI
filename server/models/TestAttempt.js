const mongoose = require("mongoose");

// ══════════════════════════════════════════════════════════════════
//  TEST ATTEMPT SCHEMA — Records every mock test taken by a student
//  Tracks: Every response, time per question, scoring, rank
//  Optimized for: Percentile calc, leaderboard, analytics
// ══════════════════════════════════════════════════════════════════

// Sub-schema: Individual question response
const QuestionResponseSchema = new mongoose.Schema({
    _id: false,
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
        required: true
    },
    sectionIndex: { type: Number, required: true }, // Which section (0, 1, 2...)

    // --- Student's Answer ---
    selectedOptions: [{ type: String }],   // ["A"] or ["A","C"] for MCQ
    numericAnswer: { type: Number, default: null },       // For integer/numerical
    isAttempted: { type: Boolean, default: false },

    // --- Question State (UI flags) ---
    status: {
        type: String,
        enum: [
            "NOT_VISITED",       // Never opened
            "NOT_ANSWERED",      // Visited but no answer saved
            "ANSWERED",          // Answer saved
            "MARKED_FOR_REVIEW", // Marked but no answer
            "ANSWERED_AND_MARKED" // Both answered and marked
        ],
        default: "NOT_VISITED"
    },

    // --- Evaluation (Filled after submission) ---
    isCorrect: { type: Boolean, default: null },
    marksAwarded: { type: Number, default: 0 },

    // --- Time Tracking ---
    timeSpent: { type: Number, default: 0 } // Seconds spent on this question
});

// Main TestAttempt Schema
const TestAttemptSchema = new mongoose.Schema({
    // --- 1. REFERENCES ---
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    mockTestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MockTest",
        required: true,
        index: true
    },

    // --- 2. TEST SESSION ---
    status: {
        type: String,
        enum: [
            "IN_PROGRESS",   // Student is currently taking the test
            "SUBMITTED",     // Manually submitted by student
            "AUTO_SUBMITTED", // Auto-submitted on timer expiry
            "ABANDONED",     // Started but never submitted (TTL cleanup)
            "EVALUATED"      // Results calculated
        ],
        default: "IN_PROGRESS",
        index: true
    },

    // --- 3. TIMING ---
    startedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    submittedAt: {
        type: Date,
        default: null
    },
    // Server-enforced deadline (startedAt + test duration)
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    totalTimeTaken: {
        type: Number, // seconds
        default: 0
    },

    // --- 4. RESPONSES ---
    responses: [QuestionResponseSchema],

    // --- 5. SECTION-WISE SCORES (Filled after evaluation) ---
    sectionScores: [{
        _id: false,
        sectionName: { type: String },
        sectionIndex: { type: Number },
        score: { type: Number, default: 0 },
        maxMarks: { type: Number },
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
        incorrect: { type: Number, default: 0 },
        unattempted: { type: Number, default: 0 }
    }],

    // --- 6. SUBJECT-WISE SCORES ---
    subjectScores: [{
        _id: false,
        subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
        subjectName: { type: String },
        score: { type: Number, default: 0 },
        maxMarks: { type: Number },
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
        incorrect: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 } // percentage
    }],

    // --- 7. OVERALL SCORE ---
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, required: true },
    percentage: { type: Number, default: 0 },

    // --- 8. ATTEMPT STATS (Filled after evaluation) ---
    stats: {
        totalAttempted: { type: Number, default: 0 },
        totalCorrect: { type: Number, default: 0 },
        totalIncorrect: { type: Number, default: 0 },
        totalUnattempted: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },        // (correct/attempted) * 100
        negativeMarks: { type: Number, default: 0 }     // Total negative marks lost
    },

    // --- 9. RANK & PERCENTILE (Calculated post-submission) ---
    rank: { type: Number, default: null },
    percentile: { type: Number, default: null },

    // --- 10. META ---
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    tabSwitchCount: { type: Number, default: 0 }
    // Anti-cheating: Track tab switches during test

}, { timestamps: true });

// ══════════════════════════════════════════
//  INDEXES
// ══════════════════════════════════════════

// Fast lookup: "All my test attempts"
TestAttemptSchema.index({ userId: 1, createdAt: -1 });

// Leaderboard query: "All submissions for test X, sorted by score"
TestAttemptSchema.index({ mockTestId: 1, status: 1, totalScore: -1 });

// Prevent duplicate active attempts
TestAttemptSchema.index(
    { userId: 1, mockTestId: 1, status: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "IN_PROGRESS" }
    }
);

// Cleanup: Find expired in-progress tests for auto-submission
TestAttemptSchema.index({ status: 1, expiresAt: 1 });

// Percentile calculation: All evaluated attempts for a test
TestAttemptSchema.index({ mockTestId: 1, status: 1, totalScore: 1 });

// ══════════════════════════════════════════
//  METHODS
// ══════════════════════════════════════════

/**
 * Evaluate the test attempt against correct answers.
 * Call this method after submission to calculate scores.
 */
TestAttemptSchema.methods.evaluate = async function () {
    const Question = mongoose.model("Question");
    const MockTest = mongoose.model("MockTest");
    const Subject = mongoose.model("Subject");

    const mockTest = await MockTest.findById(this.mockTestId).lean();
    const sectionsConfig = mockTest ? mockTest.sections : [];

    const questionIds = this.responses.map(r => r.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } }).lean();

    const subjectIds = [...new Set(questions.map(q => q.subjectId?.toString()).filter(Boolean))];
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean();
    const subjectMap = {};
    subjects.forEach(s => { subjectMap[s._id.toString()] = s.name; });

    const questionMap = {};
    questions.forEach(q => { questionMap[q._id.toString()] = q; });

    let totalCorrect = 0, totalIncorrect = 0, totalUnattempted = 0;
    let totalScore = 0, negativeMarks = 0;

    // Trackers for structural scores
    const subjectTrack = {};
    const sectionTrack = {};

    for (const response of this.responses) {
        const question = questionMap[response.questionId.toString()];
        if (!question) continue;

        const subId = question.subjectId?.toString() || "unknown";
        const subName = subjectMap[subId] || "Unknown Subject";
        const sIndex = response.sectionIndex;
        const sectionConf = sectionsConfig[sIndex] || { name: `Section ${sIndex}`, type: question.type, markingScheme: { correct: 4, incorrect: -1, unattempted: 0 } };

        if (!subjectTrack[subId]) {
            subjectTrack[subId] = {
                subjectId: subId === "unknown" ? null : subId,
                subjectName: subName,
                score: 0,
                maxMarks: 0,
                attempted: 0,
                correct: 0,
                incorrect: 0,
                unattempted: 0,
                timeSpent: 0,
                sections: {}
            };
        }

        if (!subjectTrack[subId].sections[sIndex]) {
            subjectTrack[subId].sections[sIndex] = {
                name: sectionConf.name,
                type: sectionConf.type,
                sectionIndex: sIndex,
                score: 0,
                maxMarks: 0,
                attempted: 0,
                correct: 0,
                incorrect: 0,
                unattempted: 0,
                timeSpent: 0
            };
        }

        if (!sectionTrack[sIndex]) {
            sectionTrack[sIndex] = {
                sectionName: sectionConf.name,
                sectionIndex: sIndex,
                type: sectionConf.type,
                score: 0,
                maxMarks: 0,
                attempted: 0,
                correct: 0,
                incorrect: 0,
                unattempted: 0,
                timeSpent: 0
            };
        }

        subjectTrack[subId].maxMarks += (sectionConf.markingScheme?.correct || 4);
        subjectTrack[subId].sections[sIndex].maxMarks += (sectionConf.markingScheme?.correct || 4);
        sectionTrack[sIndex].maxMarks += (sectionConf.markingScheme?.correct || 4);

        const tSpent = response.timeSpent || 0;
        subjectTrack[subId].timeSpent += tSpent;
        subjectTrack[subId].sections[sIndex].timeSpent += tSpent;
        sectionTrack[sIndex].timeSpent += tSpent;

        if (!response.isAttempted) {
            response.isCorrect = null;
            response.marksAwarded = sectionConf.markingScheme?.unattempted || 0;
            totalUnattempted++;
            subjectTrack[subId].unattempted++;
            subjectTrack[subId].sections[sIndex].unattempted++;
            sectionTrack[sIndex].unattempted++;
            continue;
        }

        let correct = false;

        // Evaluate based on question type
        switch (question.type) {
            case "SCQ":
                correct = response.selectedOptions.length === 1
                    && question.correctAnswer.optionKeys.includes(response.selectedOptions[0]);
                break;
            case "MCQ":
                const studentOpts = [...response.selectedOptions].sort();
                const correctOpts = [...question.correctAnswer.optionKeys].sort();
                correct = studentOpts.length === correctOpts.length
                    && studentOpts.every((opt, i) => opt === correctOpts[i]);
                break;
            case "INTEGER":
                correct = response.numericAnswer === question.correctAnswer.numericValue;
                break;
            case "NUMERICAL":
                if (question.correctAnswer.numericRange?.min != null && question.correctAnswer.numericRange?.max != null) {
                    correct = response.numericAnswer >= question.correctAnswer.numericRange.min
                        && response.numericAnswer <= question.correctAnswer.numericRange.max;
                } else {
                    correct = response.numericAnswer === question.correctAnswer.numericValue;
                }
                break;
            default:
                correct = false;
        }

        response.isCorrect = correct;

        if (correct) {
            response.marksAwarded = sectionConf.markingScheme?.correct || 4;
            totalCorrect++;
            subjectTrack[subId].correct++;
            subjectTrack[subId].sections[sIndex].correct++;
            sectionTrack[sIndex].correct++;
        } else {
            response.marksAwarded = sectionConf.markingScheme?.incorrect || -1;
            negativeMarks += Math.abs(response.marksAwarded);
            totalIncorrect++;
            subjectTrack[subId].incorrect++;
            subjectTrack[subId].sections[sIndex].incorrect++;
            sectionTrack[sIndex].incorrect++;
        }

        subjectTrack[subId].attempted++;
        subjectTrack[subId].sections[sIndex].attempted++;
        sectionTrack[sIndex].attempted++;

        totalScore += response.marksAwarded;
        subjectTrack[subId].score += response.marksAwarded;
        subjectTrack[subId].sections[sIndex].score += response.marksAwarded;
        sectionTrack[sIndex].score += response.marksAwarded;
    }

    // Update stats
    this.totalScore = totalScore;
    this.percentage = this.maxScore > 0 ? Math.round((totalScore / this.maxScore) * 10000) / 100 : 0;
    this.stats = {
        totalAttempted: totalCorrect + totalIncorrect,
        totalCorrect,
        totalIncorrect,
        totalUnattempted,
        accuracy: (totalCorrect + totalIncorrect) > 0
            ? Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 10000) / 100
            : 0,
        negativeMarks
    };

    // Serialize subjectScores
    this.subjectScores = Object.values(subjectTrack).map(sub => {
        sub.accuracy = sub.attempted > 0 ? Math.round((sub.correct / sub.attempted) * 10000) / 100 : 0;
        sub.sections = Object.values(sub.sections); // convert to array to store correctly
        return sub;
    });

    // Serialize sectionScores
    this.sectionScores = Object.values(sectionTrack);

    this.status = "EVALUATED";
    this.submittedAt = this.submittedAt || new Date();
    this.totalTimeTaken = Math.floor((this.submittedAt - this.startedAt) / 1000);

    return this;
};

/**
 * Check if the test has expired (timer ran out)
 */
TestAttemptSchema.methods.hasExpired = function () {
    return new Date() > this.expiresAt;
};

/**
 * Auto-submit expired test
 */
TestAttemptSchema.methods.autoSubmit = async function () {
    if (this.status !== "IN_PROGRESS") return this;
    this.status = "AUTO_SUBMITTED";
    this.submittedAt = this.expiresAt; // Submitted exactly at expiry
    await this.evaluate();
    await this.save();
    return this;
};

// ══════════════════════════════════════════
//  STATICS
// ══════════════════════════════════════════

/**
 * Calculate percentile for all attempts of a mock test.
 * Percentile = ((Total students scored less than you) / Total students) × 100
 */
TestAttemptSchema.statics.calculatePercentiles = async function (mockTestId) {
    const attempts = await this.find({
        mockTestId,
        status: { $in: ["SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"] }
    }).sort({ totalScore: 1 }).select("_id totalScore");

    const total = attempts.length;
    if (total === 0) return;

    const bulkOps = attempts.map((attempt, index) => ({
        updateOne: {
            filter: { _id: attempt._id },
            update: {
                $set: {
                    rank: total - index, // Rank 1 = highest score
                    percentile: Math.round((index / total) * 10000) / 100
                }
            }
        }
    }));

    await this.bulkWrite(bulkOps);
};

const TestAttempt = mongoose.model("TestAttempt", TestAttemptSchema);

module.exports = { TestAttempt };
