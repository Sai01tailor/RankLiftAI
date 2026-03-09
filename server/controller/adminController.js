const { Question } = require("../models/Question");
const { Subject, Chapter, Topic } = require("../models/SubNTopic");
const { MockTest } = require("../models/MockTest");
const User = require("../models/Users");
const { TestAttempt } = require("../models/TestAttempt");
const { PracticeAttempt } = require("../models/PracticeAttempt");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { paginatedQuery } = require("../utils/pagination");
const { deleteCachePattern } = require("../services/cache");
const { REDIS_KEYS } = require("../utils/constants");
const logger = require("../utils/logger");
const { translateQuestion: autoTranslate } = require('../services/translate');

// ═════ ADMIN CONTROLLER ═════

// POST /admin/subjects
const createSubject = asyncHandler(async (req, res) => {
    const subject = await Subject.create(req.body);
    await deleteCachePattern(REDIS_KEYS.QUESTION_CACHE + "subjects*");
    ApiResponse.created(res, "Subject created", { subject });
});

// POST /admin/chapters
const createChapter = asyncHandler(async (req, res) => {
    const subject = await Subject.findById(req.body.subjectId);
    if (!subject) throw ApiError.notFound("Subject not found");
    const chapter = await Chapter.create(req.body);
    await deleteCachePattern(REDIS_KEYS.QUESTION_CACHE + `chapters:${req.body.subjectId}*`);
    ApiResponse.created(res, "Chapter created", { chapter });
});

// POST /admin/topics
const createTopic = asyncHandler(async (req, res) => {
    const chapter = await Chapter.findById(req.body.chapterId);
    if (!chapter) throw ApiError.notFound("Chapter not found");
    const topic = await Topic.create(req.body);
    ApiResponse.created(res, "Topic created", { topic });
});

// DELETE /admin/subjects/:id
const deleteSubject = asyncHandler(async (req, res) => {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) throw ApiError.notFound("Subject not found");
    await deleteCachePattern(REDIS_KEYS.QUESTION_CACHE + "subjects*");
    ApiResponse.ok(res, "Subject deleted");
});

// DELETE /admin/chapters/:id
const deleteChapter = asyncHandler(async (req, res) => {
    const chapter = await Chapter.findByIdAndDelete(req.params.id);
    if (!chapter) throw ApiError.notFound("Chapter not found");
    await deleteCachePattern(REDIS_KEYS.QUESTION_CACHE + `chapters:${chapter.subjectId}*`);
    ApiResponse.ok(res, "Chapter deleted");
});

// DELETE /admin/topics/:id
const deleteTopic = asyncHandler(async (req, res) => {
    const topic = await Topic.findByIdAndDelete(req.params.id);
    if (!topic) throw ApiError.notFound("Topic not found");
    ApiResponse.ok(res, "Topic deleted");
});

// POST /admin/questions — create single question
const createQuestion = asyncHandler(async (req, res) => {
    const question = await Question.create({ ...req.body, createdBy: req.userId });

    // Update counts (non-blocking)
    Promise.all([
        Subject.updateOne({ _id: question.subjectId }, { $inc: { questionCount: 1 } }),
        Chapter.updateOne({ _id: question.chapterId }, { $inc: { questionCount: 1 } }),
        Topic.updateOne({ _id: question.topicId }, { $inc: { questionCount: 1 } })
    ]).catch(() => { });

    logger.info(`Question created: ${question._id} by admin ${req.userId}`);

    // Respond immediately — don't wait for translation
    ApiResponse.created(res, 'Question created', { question });

    // Auto-translate to hi + gj in the background (non-blocking)
    const TARGET_LANGS = ['hi', 'gj'];
    autoTranslate(question.toObject(), TARGET_LANGS)
        .then((updates) => {
            if (Object.keys(updates).length > 0) {
                return Question.findByIdAndUpdate(question._id, { $set: updates });
            }
        })
        .then(() => logger.info(`[translate] Auto-translated question ${question._id}`))
        .catch((err) => logger.error(`[translate] Failed for question ${question._id}: ${err.message}`));
});

// POST /admin/questions/bulk — bulk upload JSON
const bulkUploadQuestions = asyncHandler(async (req, res) => {
    const { questions } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length === 0)
        throw ApiError.badRequest('Provide an array of questions');
    if (questions.length > 500) throw ApiError.badRequest('Max 500 per upload');
    const withAdmin = questions.map(q => ({ ...q, createdBy: req.userId }));
    const result = await Question.insertMany(withAdmin, { ordered: false });

    // Respond immediately
    ApiResponse.created(res, `${result.length} questions uploaded`, { insertedCount: result.length });

    // Background translation for all inserted questions
    const TARGET_LANGS = ['hi', 'gj'];
    Promise.all(
        result.map(async (q) => {
            const updates = await autoTranslate(q.toObject(), TARGET_LANGS);
            if (Object.keys(updates).length > 0) {
                await Question.findByIdAndUpdate(q._id, { $set: updates });
            }
        })
    )
        .then(() => logger.info(`[translate] Bulk translated ${result.length} questions`))
        .catch((err) => logger.error(`[translate] Bulk translation error: ${err.message}`));
});

// PUT /admin/questions/:questionId
const updateQuestion = asyncHandler(async (req, res) => {
    const question = await Question.findByIdAndUpdate(
        req.params.questionId,
        { $set: req.body },
        { new: true, runValidators: true }
    );
    if (!question) throw ApiError.notFound('Question not found');
    await deleteCachePattern(REDIS_KEYS.QUESTION_CACHE + '*');
    ApiResponse.ok(res, 'Question updated', { question });

    // If English content was changed, re-translate in background
    const contentChanged = req.body['content.en.text'] || req.body?.content?.en?.text;
    if (contentChanged) {
        const TARGET_LANGS = ['hi', 'gj'];
        autoTranslate(question.toObject(), TARGET_LANGS, true /* force */)
            .then((updates) => {
                if (Object.keys(updates).length > 0) {
                    return Question.findByIdAndUpdate(question._id, { $set: updates });
                }
            })
            .then(() => logger.info(`[translate] Re-translated question ${question._id} after update`))
            .catch((err) => logger.error(`[translate] Re-translate failed: ${err.message}`));
    }
});

// DELETE /admin/questions/:questionId (soft delete)
const deleteQuestion = asyncHandler(async (req, res) => {
    const question = await Question.findByIdAndUpdate(req.params.questionId, { $set: { isActive: false } }, { new: true });
    if (!question) throw ApiError.notFound('Question not found');
    ApiResponse.ok(res, 'Question deleted');
});

/**
 * POST /admin/questions/:questionId/translate
 * Force re-translate an existing question to all/specified languages.
 * Body: { langs: ['hi','gj'], force: true }
 */
const translateQuestionHandler = asyncHandler(async (req, res) => {
    const { questionId } = req.params;
    const langs = req.body?.langs || ['hi', 'gj'];
    const force = req.body?.force ?? true;

    const question = await Question.findById(questionId).lean();
    if (!question) throw ApiError.notFound('Question not found');

    ApiResponse.ok(res, 'Translation started. This runs in the background.', { questionId, langs });

    // Run translation in background
    autoTranslate(question, langs, force)
        .then(async (updates) => {
            if (Object.keys(updates).length > 0 || updates.isTranslated) {
                await Question.findByIdAndUpdate(questionId, { $set: updates });
                logger.info(`[translate] Manually translated question ${questionId} → langs: ${langs.join(',')}`);
            } else {
                logger.info(`[translate] Nothing to translate for ${questionId} (already complete)`);
            }
        })
        .catch((err) => logger.error(`[translate] Manual translation error for ${questionId}: ${err.message}`));
});

// POST /admin/tests — create mock test
const createMockTest = asyncHandler(async (req, res) => {
    const data = { ...req.body, createdBy: req.userId };
    if (data.sections) {
        data.totalQuestions = data.sections.reduce((s, sec) => s + (sec.maxQuestions || sec.totalQuestions), 0);
        data.totalMarks = data.sections.reduce((s, sec) => s + ((sec.maxQuestions || sec.totalQuestions) * sec.markingScheme.correct), 0);
    }
    const mockTest = await MockTest.create(data);
    ApiResponse.created(res, "Mock test created", { mockTest });
});

// PUT /admin/tests/:testId
const updateMockTest = asyncHandler(async (req, res) => {
    const test = await MockTest.findByIdAndUpdate(req.params.testId, { $set: req.body }, { new: true, runValidators: true });
    if (!test) throw ApiError.notFound("Mock test not found");
    ApiResponse.ok(res, "Mock test updated", { test });
});

// PATCH /admin/tests/:testId/publish
const publishMockTest = asyncHandler(async (req, res) => {
    const test = await MockTest.findByIdAndUpdate(req.params.testId, { $set: { isPublished: true } }, { new: true });
    if (!test) throw ApiError.notFound("Mock test not found");
    ApiResponse.ok(res, "Mock test published", { test });
});

// GET /admin/analytics/overview
const getPlatformAnalytics = asyncHandler(async (req, res) => {
    const [totalUsers, totalStudents, totalQuestions, totalTests, totalAttempts, totalPractice, translatedQuestions, unauditedTranslations] = await Promise.all([
        User.countDocuments(), User.countDocuments({ role: "student", accountStatus: "active" }),
        Question.countDocuments({ isActive: true }), MockTest.countDocuments({ isActive: true }),
        TestAttempt.countDocuments({ status: { $in: ["SUBMITTED", "AUTO_SUBMITTED", "EVALUATED"] } }),
        PracticeAttempt.countDocuments(),
        Question.countDocuments({ isActive: true, isTranslated: true }),
        Question.countDocuments({ isActive: true, isTranslated: true, translationAudited: false })
    ]);
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const dayAgo = new Date(Date.now() - 86400000);
    const [recentSignups, dailyActive] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: weekAgo } }), User.countDocuments({ lastLoginAt: { $gte: dayAgo } })
    ]);
    ApiResponse.ok(res, "Platform analytics", {
        users: { total: totalUsers, students: totalStudents, recentSignups, dailyActive },
        content: { questions: totalQuestions, mockTests: totalTests, translatedQuestions, unauditedTranslations },
        activity: { testAttempts: totalAttempts, practiceAttempts: totalPractice }
    });
});

// GET /admin/users
const getUsers = asyncHandler(async (req, res) => {
    const { role, status, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.accountStatus = status;
    if (search) filter.$or = [{ username: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
    const result = await paginatedQuery(User, filter, req.query, { select: "username email role accountStatus subscription.plan createdAt lastLoginAt streak" });
    ApiResponse.paginated(res, "Users retrieved", result.data, result.pagination);
});

// GET /admin/questions
const getQuestions = asyncHandler(async (req, res) => {
    const { search, difficulty, type, subject, isTranslated, translationAudited } = req.query;
    const filter = { isActive: true };
    if (difficulty) filter.difficulty = difficulty;
    if (type) filter.type = type;
    if (subject) filter.subjectId = subject;
    if (isTranslated !== undefined) filter.isTranslated = isTranslated === 'true';
    if (translationAudited !== undefined) filter.translationAudited = translationAudited === 'true';
    if (search) filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'content.en': { $regex: search, $options: 'i' } }
    ];
    const result = await paginatedQuery(Question, filter, req.query, {
        select: 'title type difficulty subjectId chapterId topicId isActive isTranslated translationAudited createdAt content options correctAnswer marks solution',
        populate: [
            { path: 'subjectId', select: 'name title' },
            { path: 'chapterId', select: 'name title' },
            { path: 'topicId', select: 'name title' }
        ]
    });

    const aliased = result.data.map(q => ({
        ...q,
        subject: q.subjectId,
        chapter: q.chapterId,
        topic: q.topicId,
    }));

    ApiResponse.paginated(res, 'Questions retrieved', aliased, result.pagination);
});

// GET /admin/tests
const getTests = asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.isPublished !== undefined) filter.isPublished = req.query.isPublished === 'true';
    const result = await paginatedQuery(MockTest, filter, req.query, {
        select: 'title examType testType duration totalQuestions totalMarks isPublished isPremium accessLevel stats createdAt'
    });
    ApiResponse.paginated(res, 'Tests retrieved', result.data, result.pagination);
});

// DELETE /admin/tests/:testId
const deleteMockTest = asyncHandler(async (req, res) => {
    const test = await MockTest.findByIdAndUpdate(req.params.testId, { $set: { isActive: false } }, { new: true });
    if (!test) throw ApiError.notFound('Mock test not found');
    ApiResponse.ok(res, 'Mock test deleted');
});

// PATCH /admin/users/:userId
const updateUser = asyncHandler(async (req, res) => {
    const allowed = ['role', 'accountStatus', 'isBanned', 'subscription'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    // Map 'isBanned: true' → accountStatus: 'banned'
    if (req.body.isBanned === true) updates.accountStatus = 'banned';
    if (req.body.isBanned === false) updates.accountStatus = 'active';

    // Safe subscription plan update
    if (req.body.subscriptionPlan) {
        updates['subscription.plan'] = req.body.subscriptionPlan;
        updates['subscription.isActive'] = req.body.subscriptionPlan !== 'free';
        // Give 1 year expiry if upgrading manually by admin
        if (req.body.subscriptionPlan !== 'free') {
            updates['subscription.expiresAt'] = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        } else {
            updates['subscription.expiresAt'] = null;
        }
    }

    const user = await User.findByIdAndUpdate(req.params.userId, { $set: updates }, { new: true })
        .select('-password -refreshTokens');
    if (!user) throw ApiError.notFound('User not found');
    logger.info(`Admin ${req.userId} updated user ${req.params.userId}`);
    ApiResponse.ok(res, 'User updated', { user });
});

// DELETE /admin/users/:userId
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.userId, { $set: { accountStatus: 'deleted' } }, { new: true });
    if (!user) throw ApiError.notFound('User not found');
    logger.info(`Admin ${req.userId} soft-deleted user ${req.params.userId}`);
    ApiResponse.ok(res, 'User deleted');
});

// GET /admin/subscriptions
const getSubscriptions = asyncHandler(async (req, res) => {
    // Pull subscription data from User documents
    const filter = { 'subscription.plan': { $ne: 'free' } };
    if (req.query.plan) filter['subscription.plan'] = req.query.plan;
    const result = await paginatedQuery(User, filter, req.query, {
        select: 'username email subscription createdAt'
    });
    ApiResponse.paginated(res, 'Subscriptions retrieved', result.data, result.pagination);
});

// GET /admin/subscriptions/plans
const getPlans = asyncHandler(async (req, res) => {
    const { PLAN_CONFIG } = require('../services/payment');
    // We send Object.assign to realize the Proxy keys into a plain JSON object
    ApiResponse.ok(res, "Subscription plans config", Object.assign({}, PLAN_CONFIG));
});

// PUT /admin/subscriptions/plans
const updatePlans = asyncHandler(async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../config/plans.json');
    const newPlans = req.body;
    if (!newPlans || typeof newPlans !== 'object') throw ApiError.badRequest("Invalid plans payload");

    fs.writeFileSync(configPath, JSON.stringify(newPlans, null, 2));
    logger.info(`Admin ${req.userId} updated subscription plans configuration`);

    ApiResponse.ok(res, "Subscription plans updated successfully", newPlans);
});

// POST /admin/upload-image
const uploadImage = asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest("No image provided");
    const { uploadFile } = require("../services/fileUpload");
    const result = await uploadFile(req.file, "questions");
    ApiResponse.ok(res, "Image uploaded", { url: result.url });
});

module.exports = {
    createSubject, createChapter, createTopic,
    deleteSubject, deleteChapter, deleteTopic,
    createQuestion, bulkUploadQuestions, updateQuestion, deleteQuestion, getQuestions,
    translateQuestionHandler,
    createMockTest, updateMockTest, publishMockTest, deleteMockTest, getTests,
    getPlatformAnalytics,
    getUsers, updateUser, deleteUser,
    getSubscriptions, getPlans, updatePlans,
    uploadImage
};
