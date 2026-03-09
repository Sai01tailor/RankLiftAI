const axios = require("axios");
const config = require("../config");
const logger = require("../utils/logger");

// ══════════════════════════════════════════════
//  ML Service Client — Communicates with Flask microservice
//  Endpoints:
//  - POST /predict/weak-topics → Weak topic prediction
//  - POST /predict/score → Score prediction
//  - GET  /health → Health check
// ══════════════════════════════════════════════

const mlClient = axios.create({
    baseURL: config.ml.serviceUrl,
    timeout: config.ml.timeout,
    headers: { "Content-Type": "application/json" }
});

/**
 * Get weak topic predictions for a student.
 * Sends attempt history to Flask ML service.
 *
 * @param {Object} data - Student attempt data
 * @param {string} data.userId
 * @param {Array} data.topicAccuracy - [{ topicId, accuracy, totalAttempts, avgTimeSpent, ... }]
 * @param {Array} data.recentAttempts - Last N practice attempts
 * @returns {Object} { weakTopics, predictedScore, readinessLevel, modelVersion }
 */
const predictWeakTopics = async (data) => {
    try {
        const response = await mlClient.post("/predict/weak-topics", {
            userId: data.userId,
            topicAccuracy: data.topicAccuracy,
            recentAttempts: data.recentAttempts,
            overallStats: data.overallStats || {}
        });

        logger.info(`ML weak topic prediction for user ${data.userId}: ${response.data.weakTopics?.length || 0} weak topics found`);
        return response.data;
    } catch (err) {
        if (err.code === "ECONNREFUSED") {
            logger.warn("ML service is unavailable (connection refused)");
            return { error: "ML service unavailable", weakTopics: [], fallback: true };
        }

        logger.error(`ML prediction error: ${err.message}`);
        throw new Error(`ML service error: ${err.response?.data?.message || err.message}`);
    }
};

/**
 * Get score prediction for a student.
 * @param {Object} data - { userId, mockTestHistory, topicAccuracy }
 * @returns {Object} { predictedScore, predictedPercentile, confidence, readinessLevel }
 */
const predictScore = async (data) => {
    try {
        const response = await mlClient.post("/predict/score", data);
        return response.data;
    } catch (err) {
        logger.error(`ML score prediction error: ${err.message}`);
        return {
            error: "Score prediction unavailable",
            predictedScore: null,
            fallback: true
        };
    }
};

/**
 * Check if ML service is healthy.
 * @returns {boolean}
 */
const healthCheck = async () => {
    try {
        const response = await mlClient.get("/health", { timeout: 3000 });
        return response.status === 200;
    } catch {
        return false;
    }
};

/**
 * Fallback: Rule-based weak topic detection when ML service is down.
 * Uses simple heuristics instead of ML model.
 * @param {Array} topicAccuracy - From PracticeAttempt.getTopicAccuracy()
 * @returns {Array} Weak topics
 */
const fallbackWeakTopicDetection = (topicAccuracy) => {
    return topicAccuracy
        .filter(topic => {
            // Weak if: accuracy < 40% with at least 5 attempts
            // OR: accuracy < 60% with at least 10 attempts on Medium/Hard
            return (topic.accuracy < 40 && topic.totalAttempts >= 5) ||
                (topic.accuracy < 60 && topic.totalAttempts >= 10);
        })
        .map(topic => ({
            topicId: topic._id.topicId,
            chapterId: topic._id.chapterId,
            subjectId: topic._id.subjectId,
            accuracy: topic.accuracy,
            totalAttempts: topic.totalAttempts,
            severity: topic.accuracy < 30 ? "severe" : topic.accuracy < 50 ? "moderate" : "mild",
            recommendedAction: topic.accuracy < 30
                ? "Revise fundamentals and solve easy questions first"
                : "Practice more medium-difficulty questions",
            source: "rule_based_fallback"
        }))
        .sort((a, b) => a.accuracy - b.accuracy); // Weakest first
};

module.exports = {
    predictWeakTopics,
    predictScore,
    healthCheck,
    fallbackWeakTopicDetection
};
