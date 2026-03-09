const mongoose = require("mongoose");
const { Question, Comprehension } = require("../models/Question");
const { Subject, Chapter, Topic } = require("../models/SubNTopic");
const { MockTest } = require("../models/MockTest");
const { TestAttempt } = require("../models/TestAttempt");
const { PracticeAttempt } = require("../models/PracticeAttempt");
const { PerformanceAnalytics } = require("../models/PerformanceAnalytics");
const { TestLeaderboard } = require("../models/Leaderboard");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { paginatedQuery } = require("../utils/pagination");
const { cacheAside } = require("../services/cache");
const { REDIS_KEYS, CACHE_TTL } = require("../utils/constants");
const logger = require("../utils/logger");

// ══════════════════════════════════════════════════════════════════
//  STUDENT CONTROLLER — Practice, MockTest, Analytics
// ══════════════════════════════════════════════════════════════════

// ──── CURRICULUM BROWSING ────

/**
 * GET /student/subjects
 * Get all active subjects with chapter counts
 */
const getSubjects = asyncHandler(async (req, res) => {
    const cacheKey = REDIS_KEYS.QUESTION_CACHE + "subjects";
    const { data } = await cacheAside(cacheKey, async () => {
        return Subject.find({ isActive: true })
            .sort({ displayOrder: 1 })
            .populate({ path: "chapters", match: { isActive: true }, select: "name slug weightage importance" })
            .lean();
    }, CACHE_TTL.SUBJECTS);

    ApiResponse.ok(res, "Subjects retrieved", { subjects: data });
});

/**
 * GET /student/chapters/:subjectId
 * Get all chapters for a subject with topic counts
 */
const getChapters = asyncHandler(async (req, res) => {
    const { subjectId } = req.params;
    const cacheKey = REDIS_KEYS.QUESTION_CACHE + `chapters:${subjectId}`;
    const { data } = await cacheAside(cacheKey, async () => {
        return Chapter.find({ subjectId, isActive: true })
            .sort({ displayOrder: 1 })
            .populate({ path: "topics", match: { isActive: true }, select: "name slug" })
            .lean();
    }, CACHE_TTL.SUBJECTS);

    ApiResponse.ok(res, "Chapters retrieved", { chapters: data });
});

/**
 * GET /student/topics/:chapterId
 */
const getTopics = asyncHandler(async (req, res) => {
    const topics = await Topic.find({ chapterId: req.params.chapterId, isActive: true })
        .sort({ displayOrder: 1 }).lean();
    ApiResponse.ok(res, "Topics retrieved", { topics });
});

// ──── QUESTION PRACTICE ────

/**
 * GET /student/questions
 * Get questions with filters (subject, chapter, topic, difficulty, type)
 */
const getQuestions = asyncHandler(async (req, res) => {
    const {
        // Accept both naming styles from frontend
        subject, subjectId,
        chapter, chapterId,
        topic, topicId,
        difficulty, type, examCategory,
        search, excludeAttempted
    } = req.query;

    const filter = { isActive: true };
    if (subjectId || subject) filter.subjectId = subjectId || subject;
    if (chapterId || chapter) filter.chapterId = chapterId || chapter;
    if (topicId || topic) filter.topicId = topicId || topic;
    if (difficulty && difficulty !== 'All') filter.difficulty = difficulty;
    if (type && type !== 'All') filter.type = type;
    if (examCategory) filter.examCategory = examCategory;
    if (search) {
        filter.$or = [
            { 'content.en.text': { $regex: search, $options: 'i' } },
            { title: { $regex: search, $options: 'i' } },
            { tags: { $regex: search, $options: 'i' } }
        ];
    }

    // Optionally exclude already-attempted questions
    if (excludeAttempted === "true" && req.userId) {
        const attemptedIds = await PracticeAttempt.distinct("questionId", { userId: req.userId });
        filter._id = { $nin: attemptedIds };
    }

    const result = await paginatedQuery(Question, filter, req.query, {
        select: `title content type difficulty examCategory marks subjectId chapterId topicId stats tags solvedByCount`,
        populate: [
            { path: "subjectId", select: "name", transform: (doc) => doc },
            { path: "chapterId", select: "name", transform: (doc) => doc },
            { path: "topicId", select: "name", transform: (doc) => doc }
        ]
    });

    // ── Enrich with userStatus (solved / attempted / unsolved) ──
    let solvedSet = new Set();
    let attemptedSet = new Set();
    if (req.userId) {
        const userAttempts = await PracticeAttempt.find(
            { userId: req.userId, questionId: { $in: result.data.map(q => q._id) } },
            { questionId: 1, isCorrect: 1 }
        ).lean();
        for (const a of userAttempts) {
            const qId = a.questionId.toString();
            if (a.isCorrect) solvedSet.add(qId);
            else attemptedSet.add(qId);
        }
    }

    // STATUS_RANK: unsolved=0, attempted=1, solved=2 — for sorting unsolved first
    const STATUS_RANK = { unsolved: 0, attempted: 1, solved: 2 };

    const enriched = result.data.map(q => {
        const qId = q._id.toString();
        const userStatus = solvedSet.has(qId) ? 'solved'
            : attemptedSet.has(qId) ? 'attempted'
                : 'unsolved';

        // Auto-generate title if missing: "Chapter — Topic"
        const autoTitle = q.title
            || [q.chapterId?.name, q.topicId?.name].filter(Boolean).join(' — ')
            || `Question`;

        return {
            ...q,
            title: autoTitle,
            userStatus,
            subject: q.subjectId,
            chapter: q.chapterId,
            topic: q.topicId,
        };
    });

    // Sort: unsolved first, then attempted, then solved
    enriched.sort((a, b) => (STATUS_RANK[a.userStatus] ?? 0) - (STATUS_RANK[b.userStatus] ?? 0));

    ApiResponse.paginated(res, "Questions retrieved", enriched, result.pagination);
});

/**
 * GET /student/questions/daily
 * Get a single pinned 'daily problem' that changes every 24 hours
 */
const getDailyProblem = asyncHandler(async (req, res) => {
    const today = Math.floor(Date.now() / (1000 * 60 * 60 * 24));

    const cacheKey = REDIS_KEYS.QUESTION_CACHE + "daily:" + today;
    const { data } = await cacheAside(cacheKey, async () => {
        const totalActive = await Question.countDocuments({ isActive: true });
        if (totalActive === 0) return null;

        // Pseudo-random index based on today's date integer
        const skipCount = today % totalActive;

        return Question.findOne({ isActive: true })
            .skip(skipCount)
            .populate("subjectId", "name")
            .populate("chapterId", "name")
            .populate("topicId", "name")
            .lean();
    }, 86400);

    if (!data) throw ApiError.notFound("No daily problem available");

    // Optionally check if the user has attempted it to set userStatus
    let userStatus = "unattempted";
    if (req.userId) {
        const attempts = await PracticeAttempt.find({ userId: req.userId, questionId: data._id }).lean();
        if (attempts.length > 0) {
            userStatus = attempts.some(a => a.isCorrect) ? "solved" : "attempted";
        }
    }

    const enriched = {
        ...data,
        subject: data.subjectId,
        chapter: data.chapterId,
        topic: data.topicId,
        userStatus,
    };

    ApiResponse.ok(res, "Daily problem retrieved", { dailyProblem: enriched });
});


/**
 * GET /student/questions/:questionId
 * Get single question with full details
 */
const getQuestionById = asyncHandler(async (req, res) => {
    const question = await Question.findOne({
        _id: req.params.questionId,
        isActive: true
    })
        .populate("subjectId", "name")
        .populate("chapterId", "name")
        .populate("topicId", "name")
        .lean();

    if (!question) throw ApiError.notFound("Question not found");

    // Pick the record that has isBookmarked=true or a note (most relevant state)
    // We check: bookmarked first, then has note, then any record
    let practiceRecord = await PracticeAttempt.findOne({
        userId: req.userId,
        questionId: question._id,
        isBookmarked: true,
    }).select('isBookmarked userNote').lean();

    if (!practiceRecord) {
        practiceRecord = await PracticeAttempt.findOne({
            userId: req.userId,
            questionId: question._id,
            userNote: { $nin: [null, ''] },
        }).select('isBookmarked userNote').lean();
    }

    if (!practiceRecord) {
        practiceRecord = await PracticeAttempt.findOne({
            userId: req.userId,
            questionId: question._id,
        }).select('isBookmarked userNote').lean();
    }

    const enriched = {
        ...question,
        // Alias populated refs to expected frontend names
        subject: question.subjectId,
        chapter: question.chapterId,
        topic: question.topicId,
        isBookmarked: practiceRecord?.isBookmarked || false,
        userNote: practiceRecord?.userNote || '',
        // Flatten marks for display: "+4 / -1"
        marksDisplay: `+${question.marks?.correct ?? 4} / ${question.marks?.incorrect ?? -1}`,
        // ── Stats exposed to Problem Stats widget ──
        solvedByCount: question.solvedByCount || 0,
        avgTimeTaken: question.stats?.avgTimeSpent || 0,  // seconds
        accuracy: question.stats?.accuracyRate || 0,  // 0-100
        totalAttempts: question.stats?.totalAttempts || 0,
    };

    ApiResponse.ok(res, "Question retrieved", { question: enriched });
});

/**
 * POST /student/practice/submit
 * Submit a practice attempt for a single question
 */
const submitPracticeAttempt = asyncHandler(async (req, res) => {
    const {
        questionId, selectedOptions, numericAnswer,
        isAttempted = true, timeSpent = 0, sessionId
    } = req.body;

    // ── Fetch question ──
    const question = await Question.findById(questionId).lean();
    if (!question) throw ApiError.notFound("Question not found");

    // ── Evaluate correctness ──
    let isCorrect = false;
    if (isAttempted) {
        switch (question.type) {
            case "SCQ":
                isCorrect = selectedOptions?.length === 1
                    && question.correctAnswer.optionKeys.includes(selectedOptions[0]);
                break;
            case "MCQ": {
                const studentOpts = [...(selectedOptions || [])].sort();
                const correctOpts = [...question.correctAnswer.optionKeys].sort();
                isCorrect = studentOpts.length === correctOpts.length
                    && studentOpts.every((opt, i) => opt === correctOpts[i]);
                break;
            }
            case "INTEGER":
                isCorrect = Number(numericAnswer) === question.correctAnswer.numericValue;
                break;
            case "NUMERICAL":
                if (question.correctAnswer.numericRange?.min != null) {
                    const n = Number(numericAnswer);
                    isCorrect = n >= question.correctAnswer.numericRange.min
                        && n <= question.correctAnswer.numericRange.max;
                } else {
                    isCorrect = Number(numericAnswer) === question.correctAnswer.numericValue;
                }
                break;
            default:
                isCorrect = false;
        }
    }

    const marksAwarded = isAttempted
        ? (isCorrect ? (question.marks?.correct ?? 4) : (question.marks?.incorrect ?? -1))
        : 0;

    // ── Check prior attempts by THIS user — needed to avoid double-counting ──
    const priorAttempts = await PracticeAttempt.find(
        { userId: req.userId, questionId },
        { isCorrect: 1 }
    ).lean();

    const hasPriorAttempt = priorAttempts.length > 0;
    const hasPriorCorrect = priorAttempts.some(a => a.isCorrect);
    const isFirstCorrectSolve = isCorrect && !hasPriorCorrect;
    const isFirstAttempt = !hasPriorAttempt;

    // Check prior attempts for bookmarks/notes to carry forward
    let existingNote = null;
    let existingBookmark = false;

    const priorRecord = await PracticeAttempt.findOne(
        { userId: req.userId, questionId },
        { userNote: 1, isBookmarked: 1 }
    ).lean();
    if (priorRecord) {
        existingNote = priorRecord.userNote;
        existingBookmark = priorRecord.isBookmarked;
    }

    // ── Save attempt record ──
    const attempt = await PracticeAttempt.create({
        userId: req.userId,
        questionId,
        subjectId: question.subjectId,
        chapterId: question.chapterId,
        topicId: question.topicId,
        selectedOptions: selectedOptions || [],
        numericAnswer,
        isAttempted,
        isCorrect,
        marksAwarded,
        difficulty: question.difficulty,
        timeSpent: timeSpent || 0,
        sessionId: sessionId || null,
        userNote: existingNote,
        isBookmarked: existingBookmark
    });

    // ── Update Question stats atomically (blocking to get updated doc) ──
    const newTotalAttempts = (question.stats?.totalAttempts || 0) + 1;
    const newCorrectAttempts = (question.stats?.correctAttempts || 0) + (isCorrect ? 1 : 0);
    const newAccuracyRate = newTotalAttempts > 0
        ? Math.round((newCorrectAttempts / newTotalAttempts) * 100)
        : 0;
    // Rolling average for time: new_avg = (old_avg * n + new) / (n+1)
    const n = question.stats?.totalAttempts || 0;
    const newAvgTime = n === 0
        ? timeSpent
        : Math.round(((question.stats?.avgTimeSpent || 0) * n + (timeSpent || 0)) / (n + 1));

    const statUpdate = {
        $inc: {
            "stats.totalAttempts": 1,
            "stats.correctAttempts": isCorrect ? 1 : 0,
            solvedByCount: isFirstCorrectSolve ? 1 : 0,
            uniqueAttemptCount: isFirstAttempt ? 1 : 0,
        },
        $set: {
            "stats.accuracyRate": newAccuracyRate,
            "stats.avgTimeSpent": newAvgTime,
        }
    };

    let updatedQuestionStats = null;
    try {
        const updatedDoc = await Question.findOneAndUpdate(
            { _id: questionId },
            statUpdate,
            { new: true, select: 'stats solvedByCount' }
        ).exec();
        if (updatedDoc) {
            updatedQuestionStats = {
                solvedByCount: updatedDoc.solvedByCount,
                avgTimeTaken: updatedDoc.stats?.avgTimeSpent || 0,
                accuracy: updatedDoc.stats?.accuracyRate || 0,
                totalAttempts: updatedDoc.stats?.totalAttempts || 0
            };
        }
    } catch (err) {
        console.error("Stats update error:", err);
    }

    // ── Update user streak (non-blocking) ──
    req.user.updateStreak();
    req.user.save().catch(() => { });

    // ── Respond ──
    const language = req.user?.profile?.preferredLanguage || "en";
    ApiResponse.created(res, "Practice attempt recorded", {
        attempt: {
            id: attempt._id,
            isCorrect,
            marksAwarded,
            isFirstSolve: isFirstCorrectSolve,
            correctAnswer: question.correctAnswer,
            solution: question.solution?.[language] || question.solution?.en || null,
            updatedStats: updatedQuestionStats
        }
    });
});


/**
 * GET /student/practice/bookmarks
 * Returns one entry per unique question that has isBookmarked=true or a non-empty userNote.
 * Uses $addFields rank trick so that for duplicates (multiple attempts), the bookmarked
 * record is always chosen first by $group/$first.
 */
const getBookmarks = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    let userObjId;
    try { userObjId = new mongoose.Types.ObjectId(req.userId); }
    catch (_) { return ApiResponse.paginated(res, 'Bookmarks retrieved', [], { total: 0, page, limit, totalPages: 0, hasNextPage: false, hasPrevPage: false }); }

    const pipeline = [
        // 1. Match only this user's records that are bookmarked or have a note
        {
            $match: {
                userId: userObjId,
                $or: [
                    { isBookmarked: true },
                    { userNote: { $nin: [null, ''] } },
                ],
            },
        },
        // 2. Rank: bookmarked records rank 0, note-only rank 1
        {
            $addFields: {
                _rank: { $cond: [{ $eq: ['$isBookmarked', true] }, 0, 1] },
            },
        },
        // 3. Sort so the best record per question comes first for $group
        { $sort: { questionId: 1, _rank: 1, createdAt: -1 } },
        // 4. Keep only the best record per question
        {
            $group: {
                _id: '$questionId',
                doc: { $first: '$$ROOT' },
            },
        },
        { $replaceRoot: { newRoot: '$doc' } },
        // 5. Final sort newest-first
        { $sort: { createdAt: -1 } },
        // 6. Single-trip pagination + population via $facet
        {
            $facet: {
                data: [
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $lookup: {
                            from: 'questions',
                            localField: 'questionId',
                            foreignField: '_id',
                            pipeline: [{ $project: { content: 1, type: 1, difficulty: 1 } }],
                            as: 'questionId',
                        },
                    },
                    { $unwind: '$questionId' },
                    {
                        $lookup: {
                            from: 'subjects',
                            localField: 'subjectId',
                            foreignField: '_id',
                            pipeline: [{ $project: { name: 1 } }],
                            as: 'subjectId',
                        },
                    },
                    { $unwind: { path: '$subjectId', preserveNullAndEmptyArrays: true } },
                ],
                totalCount: [{ $count: 'total' }],
            },
        },
    ];

    const [result] = await PracticeAttempt.aggregate(pipeline);
    const data = result?.data || [];
    const total = result?.totalCount?.[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    ApiResponse.paginated(res, 'Bookmarks retrieved', data, {
        total, page, limit, totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
    });
});

/**
 * PATCH /student/practice/:attemptId/bookmark
 * Toggle bookmark on a practice attempt
 */
const toggleBookmark = asyncHandler(async (req, res) => {
    const attempt = await PracticeAttempt.findOne({
        _id: req.params.attemptId,
        userId: req.userId
    });
    if (!attempt) throw ApiError.notFound("Attempt not found");

    attempt.isBookmarked = !attempt.isBookmarked;
    await attempt.save();

    ApiResponse.ok(res, attempt.isBookmarked ? "Bookmarked" : "Unbookmarked", {
        isBookmarked: attempt.isBookmarked
    });
});

// ──── MOCK TESTS ────

/**
 * GET /student/tests
 * List available mock tests
 */
const getAvailableTests = asyncHandler(async (req, res) => {
    const { examType, testType } = req.query;
    const filter = { isActive: true, isPublished: true };

    if (examType) filter.examType = examType;
    if (testType) filter.testType = testType;

    // Check user subscription for access level
    const user = await require('../models/Users').findById(req.userId).select('subscription');
    const userPlan = user?.subscription?.plan || "free";
    const accessLevels = { free: ["free"], basic: ["free", "basic"], premium: ["free", "basic", "premium"] };
    filter.accessLevel = { $in: accessLevels[userPlan] || ["free"] };

    const result = await paginatedQuery(MockTest, filter, req.query, {
        select: "title slug description examType testType duration totalMarks totalQuestions accessLevel stats schedule tags"
    });

    ApiResponse.paginated(res, "Mock tests retrieved", result.data, result.pagination);
});

/**
 * POST /student/tests/:testId/start
 * Start (or resume) a mock test
 */
const startMockTest = asyncHandler(async (req, res) => {
    const { testId } = req.params;

    // Check if test exists
    const mockTest = await MockTest.findOne({ _id: testId, isActive: true, isPublished: true });
    if (!mockTest) throw ApiError.notFound("Mock test not found");

    const user = await require('../models/Users').findById(req.userId).select('subscription');
    const userPlan = user?.subscription?.plan || "free";
    const accessLevels = { free: ["free"], basic: ["free", "basic"], premium: ["free", "basic", "premium"] };

    // Check if test tier exceeds user plan
    if (!(accessLevels[userPlan] || ["free"]).includes(mockTest.accessLevel)) {
        throw ApiError.forbidden(`This test requires a ${mockTest.accessLevel} subscription. Upgrade to access it.`);
    }

    // Check Basic plan quota restriction (5 tests/month)
    if (userPlan === "basic") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const testsTakenThisMonth = await TestAttempt.countDocuments({
            userId: req.userId,
            startedAt: { $gte: startOfMonth }
        });

        if (testsTakenThisMonth >= 5) {
            throw ApiError.forbidden("You have reached your limit of 5 mock tests this month on the Basic plan. Upgrade to Premium for unlimited tests.");
        }
    }

    // Check Free plan quota restriction (3 tests total)
    if (userPlan === "free") {
        const totalTestsTaken = await TestAttempt.countDocuments({
            userId: req.userId
        });

        if (totalTestsTaken >= 3) {
            throw ApiError.forbidden("You have reached your lifetime limit of 3 mock tests on the Free plan. Upgrade to Basic or Premium to take more tests.");
        }
    }

    // Check for existing in-progress attempt
    let attempt = await TestAttempt.findOne({
        userId: req.userId,
        mockTestId: testId,
        status: "IN_PROGRESS"
    });

    if (attempt) {
        // Resume existing attempt
        if (attempt.hasExpired()) {
            await attempt.autoSubmit();
            throw ApiError.badRequest("Your previous attempt has expired and been auto-submitted");
        }

        // Populate questions for resumed test too
        const populatedResume = await TestAttempt.findById(attempt._id)
            .populate({ path: 'responses.questionId', select: 'content options type marks title' }).lean();

        const qMapResume = {};
        for (const r of populatedResume.responses) {
            if (r.questionId && r.questionId._id) qMapResume[r.questionId._id.toString()] = r.questionId;
        }
        const sectionsResume = mockTest.sections.map((sec, sIdx) => ({
            name: sec.name, type: sec.type, instructions: sec.instructions,
            totalQuestions: sec.totalQuestions, maxQuestions: sec.maxQuestions,
            markingScheme: sec.markingScheme,
            questions: sec.questions.map((sq, order) => ({
                _id: sq.questionId,
                ...qMapResume[sq.questionId.toString()],
                order: sq.order ?? order,
                marks: sq.marks,
                sectionIndex: sIdx,
            }))
        }));

        return ApiResponse.ok(res, 'Resuming test', {
            attempt: {
                id: attempt._id,
                startedAt: attempt.startedAt,
                expiresAt: attempt.expiresAt,
                responses: populatedResume.responses,
                remainingTime: Math.max(0, Math.floor((attempt.expiresAt - Date.now()) / 1000))
            },
            mockTest: {
                title: mockTest.title,
                examType: mockTest.examType,
                sections: sectionsResume,
                duration: mockTest.duration,
                totalMarks: mockTest.totalMarks,
                instructions: mockTest.instructions
            }
        });
    }

    // Build responses array from test questions
    const responses = [];
    mockTest.sections.forEach((section, sIndex) => {
        section.questions.forEach(q => {
            responses.push({
                questionId: q.questionId,
                sectionIndex: sIndex,
                selectedOptions: [],
                numericAnswer: null,
                isAttempted: false,
                status: "NOT_VISITED",
                timeSpent: 0
            });
        });
    });

    // Create new attempt
    const now = new Date();
    attempt = await TestAttempt.create({
        userId: req.userId,
        mockTestId: testId,
        status: "IN_PROGRESS",
        startedAt: now,
        expiresAt: new Date(now.getTime() + mockTest.duration * 60 * 1000),
        responses,
        maxScore: mockTest.totalMarks,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]
    });

    // Populate full question data for the student
    const populatedAttempt = await TestAttempt.findById(attempt._id)
        .populate({
            path: 'responses.questionId',
            select: 'content options type marks title'
        }).lean();

    // Build a map: questionId → populated question doc
    const qMap = {};
    for (const r of populatedAttempt.responses) {
        if (r.questionId && r.questionId._id) {
            qMap[r.questionId._id.toString()] = r.questionId;
        }
    }

    // Rebuild sections with full question data embedded
    const sectionsWithQuestions = mockTest.sections.map((sec, sIdx) => ({
        name: sec.name,
        type: sec.type,
        instructions: sec.instructions,
        totalQuestions: sec.totalQuestions,
        maxQuestions: sec.maxQuestions,
        markingScheme: sec.markingScheme,
        questions: sec.questions.map((sq, order) => {
            const qDoc = qMap[sq.questionId.toString()];
            return {
                _id: sq.questionId,
                ...qDoc,
                order: sq.order ?? order,
                marks: sq.marks,
                sectionIndex: sIdx,
            };
        })
    }));

    logger.info(`Test started: user=${req.userId}, test=${testId}`);

    ApiResponse.created(res, 'Test started', {
        attempt: {
            id: attempt._id,
            startedAt: attempt.startedAt,
            expiresAt: attempt.expiresAt,
            remainingTime: mockTest.duration * 60,
            responses: populatedAttempt.responses
        },
        mockTest: {
            title: mockTest.title,
            examType: mockTest.examType,
            sections: sectionsWithQuestions,
            duration: mockTest.duration,
            totalMarks: mockTest.totalMarks,
            instructions: mockTest.instructions
        }
    });
});


/**
 * PATCH /student/tests/attempt/:attemptId/save
 * Save answers during test (auto-save or manual save)
 */
const saveTestProgress = asyncHandler(async (req, res) => {
    const { attemptId } = req.params;
    const { responses, tabSwitchCount } = req.body;

    const attempt = await TestAttempt.findOne({
        _id: attemptId,
        userId: req.userId,
        status: "IN_PROGRESS"
    });

    if (!attempt) throw ApiError.notFound("Active test attempt not found");

    // Check if expired
    if (attempt.hasExpired()) {
        await attempt.autoSubmit();
        return ApiResponse.ok(res, "Test has expired and been auto-submitted", {
            status: "AUTO_SUBMITTED"
        });
    }

    // Update responses
    if (responses && Array.isArray(responses)) {
        for (const update of responses) {
            const existingIdx = attempt.responses.findIndex(
                r => r.questionId.toString() === update.questionId
            );
            if (existingIdx !== -1) {
                if (update.selectedOptions) attempt.responses[existingIdx].selectedOptions = update.selectedOptions;
                if (update.numericAnswer !== undefined) attempt.responses[existingIdx].numericAnswer = update.numericAnswer;
                if (update.isAttempted !== undefined) attempt.responses[existingIdx].isAttempted = update.isAttempted;
                if (update.status) attempt.responses[existingIdx].status = update.status;
                if (update.timeSpent !== undefined) attempt.responses[existingIdx].timeSpent = update.timeSpent;
            }
        }
    }

    if (tabSwitchCount !== undefined) {
        attempt.tabSwitchCount = tabSwitchCount;
    }

    await attempt.save();

    ApiResponse.ok(res, "Progress saved");
});

/**
 * POST /student/tests/attempt/:attemptId/submit
 * Submit a mock test for evaluation
 */
const submitMockTest = asyncHandler(async (req, res) => {
    const { attemptId } = req.params;

    const attempt = await TestAttempt.findOne({
        _id: attemptId,
        userId: req.userId,
        status: "IN_PROGRESS"
    });

    if (!attempt) throw ApiError.notFound("Active test attempt not found");

    // Save final responses if provided
    if (req.body.responses && Array.isArray(req.body.responses)) {
        for (const update of req.body.responses) {
            const existingIdx = attempt.responses.findIndex(
                r => r.questionId.toString() === update.questionId
            );
            if (existingIdx !== -1) {
                Object.assign(attempt.responses[existingIdx], {
                    selectedOptions: update.selectedOptions || attempt.responses[existingIdx].selectedOptions,
                    numericAnswer: update.numericAnswer ?? attempt.responses[existingIdx].numericAnswer,
                    isAttempted: update.isAttempted ?? attempt.responses[existingIdx].isAttempted,
                    status: update.status || attempt.responses[existingIdx].status,
                    timeSpent: update.timeSpent ?? attempt.responses[existingIdx].timeSpent
                });
            }
        }
    }

    attempt.status = "SUBMITTED";
    attempt.submittedAt = new Date();

    // Evaluate the test
    await attempt.evaluate();
    await attempt.save();

    // Calculate percentiles in background
    TestAttempt.calculatePercentiles(attempt.mockTestId).catch(() => { });

    // Update leaderboard (non-blocking)
    const mockTest = await MockTest.findById(attempt.mockTestId);
    if (mockTest) {
        TestLeaderboard.upsertEntry({
            mockTestId: attempt.mockTestId,
            userId: req.userId,
            testAttemptId: attempt._id,
            username: req.user.username,
            avatarUrl: req.user.avatarUrl,
            totalScore: attempt.totalScore,
            maxScore: attempt.maxScore,
            percentage: attempt.percentage,
            timeTaken: attempt.totalTimeTaken,
            accuracy: attempt.stats.accuracy,
            correctCount: attempt.stats.totalCorrect,
            incorrectCount: attempt.stats.totalIncorrect,
            submittedAt: attempt.submittedAt
        }).then(() => TestLeaderboard.rebuildForTest(attempt.mockTestId)).catch(() => { });

        // Update analytics (non-blocking)
        PerformanceAnalytics.updateAfterMockTest(req.userId, attempt, mockTest).catch(() => { });

        // Update mock test stats
        const newTotal = mockTest.stats.totalAttempts + 1;
        const newAvgScore = ((mockTest.stats.avgScore * mockTest.stats.totalAttempts) + attempt.totalScore) / newTotal;
        const newHighest = Math.max(mockTest.stats.highestScore || 0, attempt.totalScore);
        const newAvgTime = ((mockTest.stats.avgCompletionTime * mockTest.stats.totalAttempts) + (attempt.totalTimeTaken / 60)) / newTotal;

        MockTest.updateOne(
            { _id: attempt.mockTestId },
            { $set: { "stats.totalAttempts": newTotal, "stats.avgScore": newAvgScore, "stats.highestScore": newHighest, "stats.avgCompletionTime": newAvgTime } }
        ).catch(() => { });
    }

    // Update individual Question stats (non-blocking)
    const { Question } = require("../models/Question");
    attempt.responses.forEach(r => {
        if (!r.isAttempted) return;
        Question.findById(r.questionId).then(q => {
            if (q) {
                const newAttempts = (q.stats.totalAttempts || 0) + 1;
                const newCorrect = (q.stats.correctAttempts || 0) + (r.isCorrect ? 1 : 0);
                const newAccuracy = (newCorrect / newAttempts) * 100;
                const newAvgTime = (((q.stats.avgTimeSpent || 0) * (q.stats.totalAttempts || 0)) + (r.timeSpent || 0)) / newAttempts;
                Question.updateOne({ _id: q._id }, {
                    $set: { "stats.totalAttempts": newAttempts, "stats.correctAttempts": newCorrect, "stats.accuracyRate": newAccuracy, "stats.avgTimeSpent": newAvgTime }
                }).exec();
            }
        }).catch(() => { });
    });

    logger.info(`Test submitted: user=${req.userId}, test=${attempt.mockTestId}, score=${attempt.totalScore}/${attempt.maxScore}`);

    ApiResponse.ok(res, "Test submitted and evaluated", {
        result: {
            totalScore: attempt.totalScore,
            maxScore: attempt.maxScore,
            percentage: attempt.percentage,
            stats: attempt.stats,
            subjectScores: attempt.subjectScores,
            sectionScores: attempt.sectionScores,
            timeTaken: attempt.totalTimeTaken
        }
    });
});

/**
 * GET /student/tests/attempt/:attemptId/review
 * Get detailed review of a submitted test
 */
const getTestReview = asyncHandler(async (req, res) => {
    const attempt = await TestAttempt.findOne({
        _id: req.params.attemptId,
        userId: req.userId,
        status: { $in: ["SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"] }
    }).populate({
        path: "responses.questionId",
        select: "content options correctAnswer solution type difficulty stats subjectId chapterId tags previousYearTag"
    }).lean();

    if (!attempt) throw ApiError.notFound("Test attempt not found");

    const mockTest = await MockTest.findById(attempt.mockTestId).select("stats title timeLimit sections").lean();

    // Fetch Subject mapping for question labels
    const { Subject } = require('../models/SubNTopic');
    const subjects = await Subject.find().lean();
    const subMap = {};
    subjects.forEach(s => { subMap[s._id.toString()] = s.name; });

    // letter -> index conversion since frontend wants indices (0 for A, etc)
    const lti = { "A": 0, "B": 1, "C": 2, "D": 3 };

    const questions = attempt.responses.map(r => {
        const qDoc = r.questionId;
        const type = qDoc ? qDoc.type : "UNKNOWN";

        const uAnsArr = (r.selectedOptions || []).map(l => lti[l] ?? l);
        const uAns = (type === "INTEGER" || type === "NUMERICAL") ? r.numericAnswer : (uAnsArr.length === 1 ? uAnsArr[0] : uAnsArr);

        const cAnsArrRaw = qDoc?.correctAnswer?.optionKeys || [];
        const cAnsArr = cAnsArrRaw.map(l => lti[l] ?? l);
        const cAns = (qDoc?.correctAnswer?.numericValue !== undefined) ? qDoc.correctAnswer.numericValue : (cAnsArr.length === 1 ? cAnsArr[0] : cAnsArr);

        let subjectName = "Subject";
        if (qDoc && qDoc.subjectId) {
            subjectName = subMap[qDoc.subjectId.toString()] || subjectName;
        } else if (mockTest && mockTest.sections && mockTest.sections[r.sectionIndex]) {
            subjectName = mockTest.sections[r.sectionIndex].name.split(" ")[0];
        }

        return {
            _id: qDoc ? qDoc._id : null,
            subject: subjectName,
            type: type,
            timeTaken: r.timeSpent || 0,
            marksAwarded: r.marksAwarded || 0,
            content: qDoc ? qDoc.content : null,
            options: qDoc ? qDoc.options : [],
            // userAnswer & correctAnswer as letter keys ("A","B","C","D") for frontend comparison
            userAnswer: (type === "INTEGER" || type === "NUMERICAL") ? r.numericAnswer : (r.selectedOptions?.length === 1 ? r.selectedOptions[0] : r.selectedOptions),
            correctAnswer: (qDoc?.correctAnswer?.numericValue !== undefined && qDoc?.correctAnswer?.numericValue !== null)
                ? qDoc.correctAnswer.numericValue
                : (qDoc?.correctAnswer?.optionKeys?.length === 1 ? qDoc.correctAnswer.optionKeys[0] : qDoc?.correctAnswer?.optionKeys),
            correctAnswerNumeric: qDoc?.correctAnswer?.numericValue ?? null,
            userResult: r.isCorrect ? "correct" : (r.isAttempted ? "incorrect" : "unattended"),
            sectionIndex: r.sectionIndex,
            solution: qDoc ? qDoc.solution : null,
            stats: qDoc?.stats || { totalAttempts: 0, correctAttempts: 0, avgTimeSpent: 0, accuracyRate: 0 }
        };
    });

    const sections = (mockTest?.sections || []).map((sec, sIdx) => ({
        ...sec,
        questions: questions.filter(q => q.sectionIndex === sIdx)
    }));

    ApiResponse.ok(res, "Test review", {
        totalMarks: attempt.totalScore,
        maxMarks: attempt.maxScore,
        percentage: attempt.percentage,
        rank: attempt.rank,
        percentile: attempt.percentile,
        testTitle: mockTest ? mockTest.title : "Mock Test",
        sections: sections,
        questions: questions,
        timeReport: {
            totalTimeTaken: attempt.totalTimeTaken
        }
    });
});

// ──── ANALYTICS ────

/**
 * GET /student/analytics
 * Get comprehensive performance analytics
 */
const getAnalytics = asyncHandler(async (req, res) => {
    let analytics = await PerformanceAnalytics.findOne({ userId: req.userId }).lean();

    if (!analytics) {
        // Create initial analytics document
        analytics = await PerformanceAnalytics.create({ userId: req.userId });
    }

    ApiResponse.ok(res, "Analytics retrieved", { analytics });
});

/**
 * GET /student/analytics/weak-topics
 * Get weak topics (from ML or rule-based fallback)
 */
const getWeakTopics = asyncHandler(async (req, res) => {
    // First check if we have cached ML predictions
    const analytics = await PerformanceAnalytics.findOne({ userId: req.userId }).lean();
    if (analytics?.weakTopics?.length > 0) {
        return ApiResponse.ok(res, "Weak topics retrieved", {
            weakTopics: analytics.weakTopics,
            source: "cached"
        });
    }

    // Calculate from practice data
    const topicAccuracy = await PracticeAttempt.getTopicAccuracy(req.userId);

    // Use rule-based fallback
    const { fallbackWeakTopicDetection } = require("../services/ml");
    const weakTopics = fallbackWeakTopicDetection(topicAccuracy);

    // Populate topic/chapter/subject names
    for (const topic of weakTopics) {
        const [topicDoc, chapterDoc, subjectDoc] = await Promise.all([
            Topic.findById(topic.topicId).select("name").lean(),
            Chapter.findById(topic.chapterId).select("name").lean(),
            Subject.findById(topic.subjectId).select("name").lean()
        ]);
        topic.topicName = topicDoc?.name || "Unknown";
        topic.chapterName = chapterDoc?.name || "Unknown";
        topic.subjectName = subjectDoc?.name || "Unknown";
    }

    // Store in analytics (non-blocking)
    PerformanceAnalytics.findOneAndUpdate(
        { userId: req.userId },
        { $set: { weakTopics } },
        { upsert: true }
    ).catch(() => { });

    ApiResponse.ok(res, "Weak topics detected", {
        weakTopics,
        source: "calculated"
    });
});

// ──── LEADERBOARD ────

/**
 * GET /student/leaderboard/:testId
 * Get leaderboard for a specific test
 */
const getTestLeaderboard = asyncHandler(async (req, res) => {
    const { testId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const leaderboard = await TestLeaderboard.getTestLeaderboard(testId, page, limit);

    // Get current user's rank
    let myRank = null;
    if (req.userId) {
        myRank = await TestLeaderboard.getUserRank(testId, req.userId);
    }

    ApiResponse.ok(res, "Leaderboard retrieved", {
        leaderboard: leaderboard.entries,
        pagination: leaderboard.pagination,
        myRank
    });
});

/**
 * GET /student/test-history
 * Get user's test history
 */
const getTestHistory = asyncHandler(async (req, res) => {
    const result = await paginatedQuery(
        TestAttempt,
        {
            userId: req.userId,
            status: { $in: ["SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"] }
        },
        { ...req.query, sortBy: "submittedAt", sortOrder: "desc" },
        {
            select: "mockTestId totalScore maxScore percentage stats.accuracy rank percentile status submittedAt totalTimeTaken",
            populate: { path: "mockTestId", select: "title examType testType" }
        }
    );

    ApiResponse.paginated(res, "Test history", result.data, result.pagination);
});

// ──── NEW HANDLERS ────

/**
 * GET /student/dashboard
 * Aggregated dashboard data (streak + analytics + recent tests + practice stats)
 */
const getDashboard = asyncHandler(async (req, res) => {
    const [user, analytics, recentTests, practiceStats, totalQuestions] = await Promise.all([
        require('../models/Users').findById(req.userId).select('username email streak subscription profile avatarUrl createdAt').lean(),
        PerformanceAnalytics.findOne({ userId: req.userId }).lean(),
        TestAttempt.find({ userId: req.userId, status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] } })
            .sort({ submittedAt: -1 }).limit(5)
            .populate({ path: 'mockTestId', select: 'title examType' }).lean(),
        // Aggregate per-question attempt stats for this user
        PracticeAttempt.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
            { $sort: { questionId: 1, createdAt: -1 } },
            // One entry per question (latest attempt)
            {
                $group: {
                    _id: '$questionId',
                    isCorrect: { $first: '$isCorrect' },
                    isAttempted: { $first: '$isAttempted' },
                    hadCorrect: { $max: { $cond: ['$isCorrect', 1, 0] } },
                }
            },
            {
                $group: {
                    _id: null,
                    solved: { $sum: { $cond: [{ $eq: ['$hadCorrect', 1] }, 1, 0] } },
                    attempted: { $sum: { $cond: ['$isAttempted', 1, 0] } },
                    failedAttempted: { $sum: { $cond: [{ $and: ['$isAttempted', { $ne: ['$hadCorrect', 1] }] }, 1, 0] } },
                }
            },
        ]),
        Question.countDocuments({ isActive: true }),
    ]);

    const ps = practiceStats[0] || { solved: 0, attempted: 0, failedAttempted: 0 };

    // Compute avgScore from recent tests
    const avgScore = recentTests.length > 0
        ? Math.round(recentTests.reduce((sum, t) => sum + (t.totalScore || 0), 0) / recentTests.length)
        : undefined;

    ApiResponse.ok(res, 'Dashboard data retrieved', {
        user,
        analytics,
        recentTests,
        // Flat stats consumed directly by Dashboard.jsx
        solved: ps.solved,
        attempted: ps.attempted,
        failedAttempted: ps.failedAttempted,
        total: totalQuestions,
        mockTestsTaken: recentTests.length,
        avgScore,
        streak: user?.streak?.currentStreak ?? 0,
    });
});

/**
 * GET /student/streak
 * Get streak details for the current user
 */
const getStreak = asyncHandler(async (req, res) => {
    const user = await require('../models/Users').findById(req.userId)
        .select('streak').lean();
    ApiResponse.ok(res, 'Streak retrieved', { streak: user?.streak || {} });
});

/**
 * GET /student/tests/:testId
 * Get a single test's info (without starting an attempt)
 */
const getTestById = asyncHandler(async (req, res) => {
    const test = await MockTest.findOne({ _id: req.params.testId, isActive: true })
        .select('title description examType testType duration totalQuestions totalMarks accessLevel isPremium stats instructions tags schedule').lean();
    if (!test) throw ApiError.notFound('Mock test not found');
    ApiResponse.ok(res, 'Test retrieved', { test });
});

/**
 * POST /student/questions/:questionId/notes
/**
 * POST /student/questions/:questionId/notes
 * Add or overwrite a personal note on a question
 */
const addNote = asyncHandler(async (req, res) => {
    const { note } = req.body;
    if (!note) throw ApiError.badRequest('Note content is required');

    let existing = await PracticeAttempt.findOne({
        userId: req.userId,
        questionId: req.params.questionId,
    });

    if (existing) {
        await PracticeAttempt.updateMany(
            { userId: req.userId, questionId: req.params.questionId },
            { $set: { userNote: note } }
        );
        return ApiResponse.ok(res, 'Note saved', { userNote: note });
    } else {
        const question = await Question.findById(req.params.questionId).select('subjectId chapterId topicId difficulty').lean();
        if (!question) throw ApiError.notFound("Question not found");

        const attempt = await PracticeAttempt.create({
            userId: req.userId,
            questionId: req.params.questionId,
            subjectId: question.subjectId,
            chapterId: question.chapterId,
            topicId: question.topicId,
            isAttempted: false,
            isCorrect: false,
            difficulty: question.difficulty,
            userNote: note,
        });
        return ApiResponse.ok(res, 'Note saved', { userNote: note });
    }
});

/**
 * PATCH /student/questions/:questionId/notes
 * Update an existing note
 */
const updateNote = asyncHandler(async (req, res) => {
    const { note } = req.body;
    const result = await PracticeAttempt.updateMany(
        { userId: req.userId, questionId: req.params.questionId },
        { $set: { userNote: note } }
    );
    if (result.matchedCount === 0) throw ApiError.notFound('No practice record found for this question');
    ApiResponse.ok(res, 'Note updated', { userNote: note });
});

/**
 * DELETE /student/questions/:questionId/notes
 * Remove a personal note
 */
const deleteNote = asyncHandler(async (req, res) => {
    await PracticeAttempt.updateMany(
        { userId: req.userId, questionId: req.params.questionId },
        { $unset: { userNote: '' } }
    );
    ApiResponse.ok(res, 'Note deleted');
});

/**
 * GET /student/leaderboard/global
 * Global all-time / period leaderboard across all tests
 */
const getGlobalLeaderboard = asyncHandler(async (req, res) => {
    const { period = 'weekly', limit = 50 } = req.query;
    const lim = Math.min(parseInt(limit), 100);

    // Calculate date cutoff
    const cutoffs = { daily: 1, weekly: 7, monthly: 30 };
    const days = cutoffs[period];
    const since = days ? new Date(Date.now() - days * 86400000) : null;

    const matchStage = {
        status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] },
        ...(since ? { submittedAt: { $gte: since } } : {})
    };

    const rankings = await TestAttempt.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$userId',
                totalScore: { $sum: '$totalScore' },
                testsTaken: { $sum: 1 },
                avgScore: { $avg: '$percentage' },
                bestScore: { $max: '$totalScore' }
            }
        },
        { $sort: { totalScore: -1 } },
        { $limit: lim },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        {
            $project: {
                userId: '$_id',
                username: '$user.username',
                totalScore: 1, testsTaken: 1, avgScore: 1, bestScore: 1
            }
        }
    ]);

    const withRank = rankings.map((r, i) => ({ ...r, rank: i + 1 }));

    // Find current user's rank if not in top N
    let userRank = withRank.find(r => r.userId.toString() === req.userId.toString()) || null;

    ApiResponse.ok(res, 'Global leaderboard retrieved', { rankings: withRank, userRank });
});

/**
 * POST /student/questions/:questionId/bookmark
 * Toggle bookmark on a question (upserts into PracticeAttempt)
 */
const toggleQuestionBookmark = asyncHandler(async (req, res) => {
    const existing = await PracticeAttempt.findOne({
        userId: req.userId,
        questionId: req.params.questionId,
    });
    if (existing) {
        const newBookmarkState = !existing.isBookmarked;
        await PracticeAttempt.updateMany(
            { userId: req.userId, questionId: req.params.questionId },
            { $set: { isBookmarked: newBookmarkState } }
        );
        ApiResponse.ok(res, newBookmarkState ? 'Bookmarked' : 'Bookmark removed', { isBookmarked: newBookmarkState });
    } else {
        const question = await Question.findById(req.params.questionId).select('subjectId chapterId topicId difficulty').lean();
        if (!question) throw ApiError.notFound("Question not found");

        const attempt = await PracticeAttempt.create({
            userId: req.userId,
            questionId: req.params.questionId,
            subjectId: question.subjectId,
            chapterId: question.chapterId,
            topicId: question.topicId,
            isAttempted: false,
            isCorrect: false,
            difficulty: question.difficulty,
            isBookmarked: true,
        });
        ApiResponse.ok(res, 'Bookmarked', { isBookmarked: attempt.isBookmarked });
    }
});

// ──── FULL ANALYTICS ────
/**
 * GET /student/analytics/full
 * Comprehensive analytics: subject-wise, chapter heatmap, time mgmt, mistake patterns,
 * score trend, consistency score, attempt strategy, momentum, risk index
 */
const getFullAnalytics = asyncHandler(async (req, res) => {
    const userId = req.userId;
    let uid;
    try { uid = new mongoose.Types.ObjectId(userId); } catch (_) { uid = userId; }

    const user = await require('../models/Users').findById(userId).select('subscription');
    const userPlan = user?.subscription?.plan || "free";
    if (userPlan === "free") {
        throw ApiError.forbidden("Full analytics are only available on Basic and Premium plans.");
    }

    const [practiceAttempts, testAttempts] = await Promise.all([
        PracticeAttempt.find({ userId: uid, isAttempted: true })
            .populate('questionId', 'difficulty type marks')
            .populate('subjectId', 'name')
            .populate('chapterId', 'name')
            .populate('topicId', 'name')
            .sort({ createdAt: -1 }).limit(500).lean(),
        TestAttempt.find({ userId: uid, status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] } })
            .populate('mockTestId', 'title examType duration')
            .sort({ submittedAt: -1 }).limit(20).lean(),
    ]);

    // Subject-wise breakdown
    const subjectMap = {};
    for (const pa of practiceAttempts) {
        const subName = pa.subjectId?.name || 'Unknown';
        if (!subjectMap[subName]) subjectMap[subName] = { correct: 0, wrong: 0, totalTime: 0, byDiff: { Easy: { c: 0, w: 0 }, Medium: { c: 0, w: 0 }, Hard: { c: 0, w: 0 } } };
        const s = subjectMap[subName];
        pa.isCorrect ? s.correct++ : s.wrong++;
        s.totalTime += pa.timeSpent || 0;
        const diff = pa.questionId?.difficulty || 'Medium';
        if (s.byDiff[diff]) pa.isCorrect ? s.byDiff[diff].c++ : s.byDiff[diff].w++;
    }
    const subjectStats = Object.entries(subjectMap).map(([name, s]) => ({
        name, total: s.correct + s.wrong, correct: s.correct, wrong: s.wrong,
        accuracy: s.correct + s.wrong > 0 ? Math.round((s.correct / (s.correct + s.wrong)) * 100) : 0,
        avgTime: s.correct + s.wrong > 0 ? Math.round(s.totalTime / (s.correct + s.wrong)) : 0,
        byDifficulty: s.byDiff,
    }));

    // Chapter heatmap
    const chapterMap = {};
    for (const pa of practiceAttempts) {
        const ch = pa.chapterId?.name || 'Unknown'; const sub = pa.subjectId?.name || 'Unknown';
        const key = sub + '::' + ch;
        if (!chapterMap[key]) chapterMap[key] = { subject: sub, chapter: ch, correct: 0, wrong: 0, totalTime: 0 };
        pa.isCorrect ? chapterMap[key].correct++ : chapterMap[key].wrong++;
        chapterMap[key].totalTime += pa.timeSpent || 0;
    }
    const chapterHeatmap = Object.values(chapterMap).map(c => ({
        ...c, total: c.correct + c.wrong,
        accuracy: c.correct + c.wrong > 0 ? Math.round((c.correct / (c.correct + c.wrong)) * 100) : 0,
        avgTime: c.correct + c.wrong > 0 ? Math.round(c.totalTime / (c.correct + c.wrong)) : 0,
    })).sort((a, b) => a.accuracy - b.accuracy);

    // Weak topics
    const topicMap = {};
    for (const pa of practiceAttempts) {
        const tp = pa.topicId?.name || 'Unknown'; const sub = pa.subjectId?.name || 'Unknown';
        const key = sub + '::' + tp;
        if (!topicMap[key]) topicMap[key] = { topic: tp, subject: sub, correct: 0, wrong: 0 };
        pa.isCorrect ? topicMap[key].correct++ : topicMap[key].wrong++;
    }
    const weakTopics = Object.values(topicMap)
        .filter(t => t.correct + t.wrong >= 1)
        .map(t => ({ ...t, total: t.correct + t.wrong, accuracy: Math.round((t.correct / (t.correct + t.wrong)) * 100) }))
        .sort((a, b) => a.accuracy - b.accuracy).slice(0, 10);

    // Mistake classification
    const wrong = practiceAttempts.filter(pa => !pa.isCorrect);
    const careless = wrong.filter(pa => (pa.timeSpent || 0) < 30 && pa.questionId?.difficulty === 'Easy').length;
    const conceptual = wrong.filter(pa => pa.questionId?.difficulty === 'Hard').length;
    const timeouts = wrong.filter(pa => (pa.timeSpent || 0) > 180).length;
    const mistakePatterns = {
        careless: { count: careless, pct: wrong.length > 0 ? Math.round((careless / wrong.length) * 100) : 0 },
        conceptual: { count: conceptual, pct: wrong.length > 0 ? Math.round((conceptual / wrong.length) * 100) : 0 },
        timeout: { count: timeouts, pct: wrong.length > 0 ? Math.round((timeouts / wrong.length) * 100) : 0 },
    };

    // Time per question type
    const timeByType = {};
    for (const pa of practiceAttempts) {
        const t = pa.questionId?.type || 'SCQ';
        if (!timeByType[t]) timeByType[t] = { total: 0, count: 0 };
        timeByType[t].total += pa.timeSpent || 0; timeByType[t].count++;
    }
    const timeAnalytics = Object.entries(timeByType).map(([type, d]) => ({ type, avgTime: Math.round(d.total / d.count), count: d.count }));

    // Score trend
    const scoreTrend = testAttempts
        .filter(ta => ta.totalScore !== undefined).slice(0, 10).reverse()
        .map((ta, idx) => ({ idx: idx + 1, title: ta.mockTestId?.title || ('Test ' + (idx + 1)), score: ta.totalScore || 0, date: ta.submittedAt }));

    // Consistency score
    let consistencyScore = null;
    if (scoreTrend.length >= 2) {
        const scores = scoreTrend.slice(-5).map(t => t.score || 0);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const sd = Math.sqrt(scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length);
        consistencyScore = Math.max(0, Math.round(100 - sd));
    }

    // Risk-taking index
    const highRisk = practiceAttempts.filter(pa => !pa.isCorrect && ['Hard', 'Medium'].includes(pa.questionId?.difficulty)).length;
    const riskTakingIndex = practiceAttempts.length > 0 ? Math.round((highRisk / practiceAttempts.length) * 100) : 0;

    // Attempt strategy
    let mAttempted = 0, mSkipped = 0, mCorrect = 0;
    for (const ta of testAttempts.slice(0, 5)) {
        for (const r of (ta.responses || [])) {
            if (r.isAttempted) { mAttempted++; if (r.isCorrect) mCorrect++; } else mSkipped++;
        }
    }
    const attemptStrategy = {
        attempted: mAttempted, skipped: mSkipped,
        attemptRate: mAttempted + mSkipped > 0 ? Math.round((mAttempted / (mAttempted + mSkipped)) * 100) : 0,
        hitRate: mAttempted > 0 ? Math.round((mCorrect / mAttempted) * 100) : 0,
    };

    // Momentum
    const now = Date.now(); const weekMs = 7 * 24 * 60 * 60 * 1000;
    const thisWeekArr = practiceAttempts.filter(pa => new Date(pa.createdAt).getTime() > now - weekMs);
    const prevWeekArr = practiceAttempts.filter(pa => { const d = new Date(pa.createdAt).getTime(); return d > now - 2 * weekMs && d <= now - weekMs; });
    const wAcc = (arr) => arr.length > 0 ? Math.round(arr.filter(p => p.isCorrect).length / arr.length * 100) : null;
    const momentum = { thisWeek: wAcc(thisWeekArr), prevWeek: wAcc(prevWeekArr), questionsThisWeek: thisWeekArr.length };

    ApiResponse.ok(res, 'Full analytics retrieved', {
        overview: {
            totalPracticed: practiceAttempts.length,
            totalCorrect: practiceAttempts.filter(p => p.isCorrect).length,
            overallAccuracy: practiceAttempts.length > 0 ? Math.round(practiceAttempts.filter(p => p.isCorrect).length / practiceAttempts.length * 100) : 0,
            mockTestsTaken: testAttempts.length,
            consistencyScore,
            riskTakingIndex,
        },
        subjectStats,
        chapterHeatmap,
        weakTopics,
        mistakePatterns,
        timeAnalytics,
        scoreTrend,
        attemptStrategy,
        momentum,
    });
});

module.exports = {
    // Curriculum
    getSubjects, getChapters, getTopics,
    // Dashboard & Streak
    getDashboard, getStreak,
    // Practice
    getQuestions, getQuestionById, getDailyProblem,
    submitPracticeAttempt, getBookmarks, toggleBookmark,
    // Notes
    addNote, updateNote, deleteNote,
    // Bookmark
    toggleQuestionBookmark,
    // MockTest
    getAvailableTests, getTestById,
    startMockTest, saveTestProgress, submitMockTest, getTestReview,
    // Analytics
    getAnalytics, getWeakTopics, getFullAnalytics,
    // Leaderboard
    getTestLeaderboard, getGlobalLeaderboard,
    getTestHistory
};
