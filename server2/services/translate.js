/**
 * translate.js — Auto-translation service for JEE question content
 * ────────────────────────────────────────────────────────────────────
 * Uses Gemini to translate question text, options, and solutions
 * while preserving LaTeX math expressions, HTML tags, and special symbols.
 *
 * JEE Main supported languages: hi, gj, mr, ta, te, kn, bn, ur
 * JEE Advanced supported languages: hi only (en is source)
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const logger = require('../utils/logger');

// All JEE-officially-supported languages (excluding English source)
const LANG_NAMES = {
    hi: 'Hindi (Devanagari script)',
    gj: 'Gujarati (Gujarati script)',
    mr: 'Marathi (Devanagari script)',
    ta: 'Tamil (Tamil script)',
    te: 'Telugu (Telugu script)',
    kn: 'Kannada (Kannada script)',
    bn: 'Bengali (Bengali script)',
    ur: 'Urdu (Nastaliq/Urdu script)',
};

// Languages allowed for JEE Advanced (en is source, only translate to hi)
const JEE_ADVANCED_LANGS_CJS = ['hi'];
// Languages for JEE Main (translate to all regional)
const JEE_MAIN_LANGS_CJS = ['hi', 'gj', 'mr', 'ta', 'te', 'kn', 'bn', 'ur'];

let genAI = null;
const getClient = () => {
    if (!genAI && config.gemini?.apiKey) {
        genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    }
    return genAI;
};

/**
 * Translate a single piece of text to the target language.
 * Retries up to 3 times with backoff on rate-limit errors.
 */
async function translateText(text, targetLang, retries = 5) {
    if (!text || !text.trim()) return '';

    const client = getClient();
    if (!client) {
        logger.warn('[translate] Gemini API key not configured — skipping translation');
        return '';
    }

    const langName = LANG_NAMES[targetLang] || targetLang;

    const prompt = `You are a professional academic translator specializing in mathematics and science content for Indian competitive exams (JEE).

Translate the following English text to ${langName}.

CRITICAL RULES (you MUST follow ALL of these):
1. Preserve ALL LaTeX math expressions EXACTLY as-is — do NOT translate or modify anything inside $...$, $$...$$, \\(...\\), \\[...\\], or any \\command{}.
2. Preserve ALL HTML tags (<b>, <i>, <sup>, <sub>, <br>, etc.) EXACTLY.
3. Preserve ALL numbers, units (m/s, kg, N, J, eV, etc.), and chemical formulas EXACTLY.
4. Preserve ALL variable names (like x, y, z, v, u, a, F, E, B, etc.) when used in mathematical context.
5. Translate ONLY the natural language words; leave everything else unchanged.
6. Output ONLY the translated text — no explanations, no notes, no quotes around the output.

English text to translate:
${text}

${langName} translation:`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const model = client.getGenerativeModel({ model: config.gemini?.model || 'gemini-1.5-flash' });
            const result = await model.generateContent(prompt);
            const translated = result.response.text().trim();
            return translated;
        } catch (err) {
            const isRateLimit = err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED');
            if (isRateLimit && attempt < retries) {
                // Parse the actual "retryDelay" from Gemini error message if available
                const retryMatch = err.message?.match(/(\d+\.?\d*)s/);
                const suggestedWait = retryMatch ? parseFloat(retryMatch[1]) * 1000 : null;
                const waitMs = suggestedWait
                    ? Math.min(suggestedWait + 2000, 120000) // use suggested + 2s buffer, max 2 min
                    : Math.pow(2, attempt) * 15000;          // fallback: 30s, 60s, 120s
                logger.warn(`[translate] Rate limited. Waiting ${Math.round(waitMs / 1000)}s before retry ${attempt}/${retries}...`);
                await new Promise(r => setTimeout(r, waitMs));
            } else {
                logger.error(`[translate] Gemini error (attempt ${attempt}) for lang=${targetLang}: ${err.message}`);
                if (attempt === retries) return ''; // Graceful fallback
            }
        }
    }
    return '';
}

/**
 * Translates a JSON object of strings in one go to reduce Gemini API calls.
 */
async function translateJson(jsonObj, targetLang, retries = 5) {
    if (!jsonObj || Object.keys(jsonObj).length === 0) return {};

    const client = getClient();
    if (!client) {
        logger.warn('[translate] Gemini API key not configured — skipping translation');
        return {};
    }

    const langName = LANG_NAMES[targetLang] || targetLang;

    const prompt = `You are a professional academic translator specializing in mathematics and science content for Indian competitive exams (JEE).

Translate the string values in the following JSON object to ${langName}.

CRITICAL RULES (you MUST follow ALL of these):
1. Preserve ALL LaTeX math expressions EXACTLY as-is — do NOT translate or modify anything inside $...$, $$...$$, \\(...\\), \\[...\\], or any \\command{}.
2. Preserve ALL HTML tags (<b>, <i>, <sup>, <sub>, <br>, etc.) EXACTLY.
3. Preserve ALL numbers, units (m/s, kg, N, J, eV, etc.), and chemical formulas EXACTLY.
4. Preserve ALL variable names (like x, y, z, v, u, a, F, E, B, etc.) when used in mathematical context.
5. Translate ONLY the natural language words; leave everything else unchanged.
6. Return ONLY valid JSON matching the exact key structure of the input. No markdown blocks, no \`\`\`json, no explanations.

Input JSON:
${JSON.stringify(jsonObj, null, 2)}
`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const model = client.getGenerativeModel({ model: config.gemini?.model || 'gemini-1.5-flash' });
            const result = await model.generateContent(prompt);
            let text = result.response.text().trim();
            if (text.startsWith('```')) {
                text = text.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
            }
            return JSON.parse(text);
        } catch (err) {
            const isRateLimit = err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED');
            const isParseError = err instanceof SyntaxError;
            if ((isRateLimit || isParseError) && attempt < retries) {
                let waitMs;
                if (isRateLimit) {
                    const retryMatch = err.message?.match(/(\d+\.?\d*)s/);
                    const suggestedWait = retryMatch ? parseFloat(retryMatch[1]) * 1000 : null;
                    waitMs = suggestedWait
                        ? Math.min(suggestedWait + 2000, 120000)
                        : Math.pow(2, attempt) * 15000;
                } else {
                    waitMs = 2000; // parse error — retry quickly
                }
                logger.warn(`[translate] Error: ${err.message?.substring(0, 80)}. Waiting ${Math.round(waitMs / 1000)}s...`);
                await new Promise(r => setTimeout(r, waitMs));
            } else {
                logger.error(`[translate] Gemini error (attempt ${attempt}) for lang=${targetLang}: ${err.message}`);
                if (attempt === retries) return {};
            }
        }
    }
    return {};
}

/**
 * Translate a content block { text: '...', imageUrl: '...' } to target languages.
 * @param {{ text: string, imageUrl?: string }} contentBlock
 * @param {string[]} targetLangs e.g. ['hi', 'gj']
 * @returns {Promise<Object>} e.g. { hi: { text: '...', imageUrl: null }, gj: {...} }
 */
async function translateContentBlock(contentBlock, targetLangs) {
    if (!contentBlock?.text) return {};
    const results = {};
    // Translate all languages in parallel
    await Promise.all(targetLangs.map(async (lang) => {
        const translated = await translateText(contentBlock.text, lang);
        results[lang] = { text: translated || null, imageUrl: contentBlock.imageUrl || null };
    }));
    return results;
}

/**
 * Translate a full question document and return the translated fields.
 * Only translates fields that are currently empty/null in the target language.
 * Respects exam category: JEE Advanced → hi only; JEE Main / Both → all langs
 *
 * @param {Object} question   Mongoose question document (plain object)
 * @param {string[]} langs    Override languages (optional). If omitted, inferred from examCategory.
 * @param {boolean} force     If true, re-translate even if translation already exists
 * @returns {Promise<Object>} MongoDB $set updates to apply
 */
async function translateQuestion(question, langs = null, force = false) {
    // Determine which languages to translate to based on exam category
    let targetLangs = langs;
    if (!targetLangs) {
        if (question.examCategory === 'JEE Advanced') {
            targetLangs = JEE_ADVANCED_LANGS_CJS;
        } else {
            // JEE Main or Both — translate to all languages
            targetLangs = JEE_MAIN_LANGS_CJS;
        }
    }
    const updates = {};
    let translationOccurred = false;

    for (const lang of targetLangs) {
        const payload = {};
        const mapping = {};

        // ── Question content ──
        const existingContentText = question.content?.[lang]?.text;
        const existingContentImg = question.content?.[lang]?.imageUrl;
        if (!existingContentText || force) {
            const englishText = question.content?.en?.text;
            if (englishText) {
                payload.content = englishText;
                mapping.content = `content.${lang}.text`;
            }
        }
        if (!existingContentImg || force) {
            const englishImg = question.content?.en?.imageUrl;
            if (englishImg) {
                updates[`content.${lang}.imageUrl`] = englishImg;
            }
        }

        // ── Options ──
        if (question.options && question.options.length > 0) {
            for (let i = 0; i < question.options.length; i++) {
                const opt = question.options[i];
                const existingOptText = opt.text?.[lang];
                if (!existingOptText || force) {
                    const englishOptText = opt.text?.en;
                    if (englishOptText) {
                        payload[`option_${i}`] = englishOptText;
                        mapping[`option_${i}`] = `options.${i}.text.${lang}`;
                    }
                }
            }
        }

        // ── Solution ──
        const existingSolutionText = question.solution?.[lang]?.text;
        const existingSolutionImg = question.solution?.[lang]?.imageUrl;
        const existingSolutionVid = question.solution?.[lang]?.videoUrl;

        if (!existingSolutionText || force) {
            const englishSolutionText = question.solution?.en?.text;
            if (englishSolutionText) {
                payload.solution = englishSolutionText;
                mapping.solution = `solution.${lang}.text`;
            }
        }
        if (!existingSolutionImg || force) {
            const englishImg = question.solution?.en?.imageUrl;
            if (englishImg) updates[`solution.${lang}.imageUrl`] = englishImg;
        }
        if (!existingSolutionVid || force) {
            const englishVid = question.solution?.en?.videoUrl;
            if (englishVid) updates[`solution.${lang}.videoUrl`] = englishVid;
        }

        if (Object.keys(payload).length > 0) {
            const translatedJson = await translateJson(payload, lang);
            for (const key in translatedJson) {
                if (translatedJson[key] && mapping[key]) {
                    updates[mapping[key]] = translatedJson[key];
                    translationOccurred = true;
                }
            }
        }
    }

    if (translationOccurred || Object.keys(updates).length > 0) {
        updates.isTranslated = true;
        // Allows admins to mark whether a human audited it
        if (!question.translationAudited || force) {
            updates.translationAudited = false;
        }
    }

    return updates;
}

module.exports = {
    translateText,
    translateContentBlock,
    translateQuestion,
    JEE_ADVANCED_LANGS: JEE_ADVANCED_LANGS_CJS,
    JEE_MAIN_LANGS: JEE_MAIN_LANGS_CJS,
    LANG_NAMES,
};

