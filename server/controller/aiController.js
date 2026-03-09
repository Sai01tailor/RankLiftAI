const { Question } = require("../models/Question");
const { AIInteractionLog } = require("../models/AIInteractionLog");
const { Subject, Chapter, Topic } = require("../models/SubNTopic");
const { getExplanation, generateCacheKey } = require("../services/gemini");
const { predictWeakTopics, predictScore, healthCheck, fallbackWeakTopicDetection } = require("../services/ml");
const { PracticeAttempt } = require("../models/PracticeAttempt");
const { PerformanceAnalytics } = require("../models/PerformanceAnalytics");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");

// ═════ AI CONTROLLER — Gemini API Integration ═════

// POST /ai/explain
const getAIExplanation = asyncHandler(async (req, res) => {
    const { questionId, interactionType, studentDoubt, language } = req.body;
    const lang = language || req.user?.profile?.preferredLanguage || "en";

    const question = await Question.findById(questionId)
        .populate("subjectId", "name").populate("chapterId", "name").populate("topicId", "name").lean();
    if (!question) throw ApiError.notFound("Question not found");

    const user = await require('../models/Users').findById(req.userId).select('subscription');
    const userPlan = user?.subscription?.plan || "free";
    if (userPlan !== "premium") {
        throw ApiError.forbidden("AI explanations are an exclusive Premium feature. Upgrade to Premium to unlock AI insights.");
    }

    const context = {
        questionText: question.content?.[lang]?.text || question.content?.en?.text,
        correctAnswer: JSON.stringify(question.correctAnswer),
        subjectName: question.subjectId?.name,
        chapterName: question.chapterId?.name,
        topicName: question.topicId?.name,
        difficulty: question.difficulty,
        studentDoubt: studentDoubt || null,
        studentAnswer: req.body.studentAnswer || null
    };

    const startTime = Date.now();
    const result = await getExplanation({ questionId, interactionType, context, language: lang });

    // Log interaction
    const cacheKey = generateCacheKey(questionId, interactionType, lang);
    AIInteractionLog.create({
        userId: req.userId, questionId, interactionType,
        request: { prompt: `[${interactionType}]`, questionText: context.questionText, studentDoubt, language: lang, context },
        response: { text: result.text, tokensUsed: result.tokensUsed, modelUsed: "gemini-2.0-flash", latencyMs: result.latencyMs, cached: result.cached },
        status: result.cached ? "CACHED" : "SUCCESS", cacheKey
    }).catch(err => logger.error(`AI log save error: ${err.message}`));

    ApiResponse.ok(res, "AI explanation generated", {
        explanation: result.text, cached: result.cached,
        latencyMs: result.latencyMs, interactionType
    });
});

// POST /ai/feedback — Rate an AI explanation
const submitAIFeedback = asyncHandler(async (req, res) => {
    const { logId, rating, isHelpful, comment } = req.body;
    const log = await AIInteractionLog.findOneAndUpdate(
        { _id: logId, userId: req.userId },
        { $set: { "feedback.rating": rating, "feedback.isHelpful": isHelpful, "feedback.comment": comment } },
        { new: true }
    );
    if (!log) throw ApiError.notFound("AI interaction log not found");
    ApiResponse.ok(res, "Feedback submitted", { feedback: log.feedback });
});

// ═════ ML CONTROLLER — Flask Service Integration ═════

// POST /ml/weak-topics
const getMLWeakTopics = asyncHandler(async (req, res) => {
    const topicAccuracy = await PracticeAttempt.getTopicAccuracy(req.userId);
    if (topicAccuracy.length === 0) {
        return ApiResponse.ok(res, "Not enough data for prediction", { weakTopics: [], message: "Practice more questions to get predictions" });
    }

    const mlHealthy = await healthCheck();
    let weakTopics, source;

    if (mlHealthy) {
        const prediction = await predictWeakTopics({
            userId: req.userId, topicAccuracy,
            recentAttempts: await PracticeAttempt.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100).lean()
        });
        weakTopics = prediction.weakTopics || [];
        source = prediction.fallback ? "rule_based" : "ml_model";
    } else {
        weakTopics = fallbackWeakTopicDetection(topicAccuracy);
        source = "rule_based_fallback";
    }

    // Populate names
    for (const t of weakTopics) {
        const [topicDoc, chapterDoc, subjectDoc] = await Promise.all([
            Topic.findById(t.topicId).select("name").lean(),
            Chapter.findById(t.chapterId).select("name").lean(),
            Subject.findById(t.subjectId).select("name").lean()
        ]);
        t.topicName = topicDoc?.name; t.chapterName = chapterDoc?.name; t.subjectName = subjectDoc?.name;
    }

    // Save to analytics
    PerformanceAnalytics.findOneAndUpdate({ userId: req.userId }, { $set: { weakTopics, "mlPredictions.lastPredictionAt": new Date() } }, { upsert: true }).catch(() => { });

    ApiResponse.ok(res, "Weak topics predicted", { weakTopics, source, totalTopicsAnalyzed: topicAccuracy.length });
});

// POST /ml/predict-score
const getScorePrediction = asyncHandler(async (req, res) => {
    const analytics = await PerformanceAnalytics.findOne({ userId: req.userId }).lean();
    if (!analytics || (analytics.overall?.totalMockTests || 0) < 3)
        return ApiResponse.ok(res, "Need at least 3 mock tests for prediction", { prediction: null });

    const prediction = await predictScore({ userId: req.userId, mockTestHistory: analytics.mockTestHistory, topicAccuracy: analytics.subjects });
    if (!prediction.fallback) {
        PerformanceAnalytics.findOneAndUpdate({ userId: req.userId }, { $set: { mlPredictions: { ...prediction, lastPredictionAt: new Date() } } }).catch(() => { });
    }
    ApiResponse.ok(res, "Score prediction", { prediction });
});

// GET /ml/health
const getMLHealth = asyncHandler(async (req, res) => {
    const healthy = await healthCheck();
    ApiResponse.ok(res, healthy ? "ML service is healthy" : "ML service is unavailable", { status: healthy ? "up" : "down" });
});

module.exports = { getAIExplanation, submitAIFeedback, getMLWeakTopics, getScorePrediction, getMLHealth };
