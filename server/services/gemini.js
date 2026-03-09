const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("../config");
const logger = require("../utils/logger");
const { setCache, getCache } = require("./cache");
const { REDIS_KEYS, CACHE_TTL } = require("../utils/constants");
const crypto = require("crypto");

// ══════════════════════════════════════════════
//  Gemini AI Service — Explanation & Doubt Solving
//  - Generates step-by-step solutions
//  - Concept explanations
//  - Hints without revealing answers
//  - Caches repeated requests
// ══════════════════════════════════════════════

let genAI = null;

const getClient = () => {
    if (!genAI && config.gemini.apiKey) {
        genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    }
    return genAI;
};

/**
 * Generate a cache key for AI requests.
 */
const generateCacheKey = (questionId, interactionType, language = "en") => {
    const raw = `${questionId}:${interactionType}:${language}`;
    return REDIS_KEYS.AI_CACHE + crypto.createHash("sha256").update(raw).digest("hex");
};

/**
 * Build the system prompt based on interaction type.
 */
const buildPrompt = (interactionType, context, language = "en") => {
    const langInstruction =
        language === "hi" ? "Respond in Hindi (Devanagari script). Use LaTeX for mathematical expressions." :
            language === "gj" ? "Respond in Gujarati (Gujarati script). Use LaTeX for mathematical expressions." :
                "Respond in English. Use LaTeX for mathematical expressions.";

    const prompts = {
        EXPLAIN_SOLUTION: `You are a JEE expert tutor. Explain the solution step-by-step.
${langInstruction}

Subject: ${context.subjectName || "N/A"}
Chapter: ${context.chapterName || "N/A"}
Topic: ${context.topicName || "N/A"}
Difficulty: ${context.difficulty || "N/A"}

Question: ${context.questionText}
Correct Answer: ${context.correctAnswer}
${context.studentAnswer ? `Student's Answer: ${context.studentAnswer} (INCORRECT)` : ""}

Provide:
1. A clear, step-by-step solution
2. Key concept(s) used
3. Common mistakes to avoid
4. Quick tip for similar questions`,

        EXPLAIN_CONCEPT: `You are a JEE expert tutor. Explain the underlying concept of this question.
${langInstruction}

Subject: ${context.subjectName}
Topic: ${context.topicName}

Question: ${context.questionText}

Provide:
1. The fundamental concept being tested
2. Key formulas/theorems involved
3. How this concept appears in JEE (Main/Advanced)
4. Related concepts to revise`,

        HINT: `You are a JEE tutor. Give a helpful hint WITHOUT revealing the answer.
${langInstruction}

Question: ${context.questionText}

Provide:
1. A nudge in the right direction
2. Which concept/formula to think about
3. A similar simpler example to consider
DO NOT reveal the answer or the solution method directly.`,

        DOUBT: `You are a JEE expert tutor. A student has a specific doubt about this question.
${langInstruction}

Question: ${context.questionText}
Correct Answer: ${context.correctAnswer}
Student's Doubt: ${context.studentDoubt}

Address the student's doubt clearly and concisely.`,

        ALTERNATIVE_METHOD: `You are a JEE expert tutor. Show an alternative method to solve this question.
${langInstruction}

Question: ${context.questionText}
Correct Answer: ${context.correctAnswer}

The student already knows one method. Show a different approach. Provide:
1. The alternative method step-by-step
2. When this method is more efficient
3. Comparison with the standard approach`
    };

    return prompts[interactionType] || prompts.EXPLAIN_SOLUTION;
};

/**
 * Get AI explanation for a question.
 * @param {Object} params
 * @param {string} params.questionId
 * @param {string} params.interactionType - EXPLAIN_SOLUTION | EXPLAIN_CONCEPT | HINT | DOUBT | ALTERNATIVE_METHOD
 * @param {Object} params.context - { questionText, correctAnswer, studentAnswer, subjectName, etc. }
 * @param {string} params.language - "en" | "hi"
 * @param {boolean} params.useCache - Whether to check cache first
 * @returns {{ text, tokensUsed, latencyMs, cached, cacheKey }}
 */
const getExplanation = async ({ questionId, interactionType, context, language = "en", useCache = true }) => {
    const startTime = Date.now();
    const cacheKey = generateCacheKey(questionId, interactionType, language);

    // 1. Check cache (skip for DOUBT since those are unique)
    if (useCache && interactionType !== "DOUBT") {
        const cached = await getCache(cacheKey);
        if (cached) {
            logger.debug(`AI cache hit: ${cacheKey}`);
            return {
                text: cached.text,
                tokensUsed: cached.tokensUsed || { input: 0, output: 0, total: 0 },
                latencyMs: Date.now() - startTime,
                cached: true,
                cacheKey
            };
        }
    }

    // 2. Call Gemini API
    const client = getClient();
    if (!client) {
        throw new Error("Gemini API key not configured");
    }

    const model = client.getGenerativeModel({ model: config.gemini.model });
    const prompt = buildPrompt(interactionType, context, language);

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        const tokensUsed = {
            input: response.usageMetadata?.promptTokenCount || 0,
            output: response.usageMetadata?.candidatesTokenCount || 0,
            total: response.usageMetadata?.totalTokenCount || 0
        };

        const output = {
            text,
            tokensUsed,
            latencyMs: Date.now() - startTime,
            cached: false,
            cacheKey
        };

        // 3. Cache the response (non-blocking)
        if (interactionType !== "DOUBT") {
            setCache(cacheKey, { text, tokensUsed }, CACHE_TTL.AI_RESPONSE).catch(() => { });
        }

        return output;
    } catch (err) {
        logger.error(`Gemini API error: ${err.message}`);
        throw new Error(`AI service error: ${err.message}`);
    }
};

module.exports = { getExplanation, generateCacheKey };
