/**
 * translateQuestions.js
 * ─────────────────────────────────────────────────────
 * Fetches the first 10 questions from DB and adds
 * Hindi (hi) and Gujarati (gj) translations using Gemini AI.
 *
 * Run:  node scripts/translateQuestions.js
 * Flags:
 *   --limit N     Number of questions to translate (default 10)
 *   --dry-run     Preview without saving
 */

require('dotenv').config();
const mongoose = require('mongoose');
const https = require('https');

// ── Colours ──
const c = { green: '\x1b[32m', red: '\x1b[31m', cyan: '\x1b[36m', yellow: '\x1b[33m', reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m' };
const log = {
    ok: (m) => console.log(`${c.green}✅${c.reset} ${m}`),
    err: (m) => console.log(`${c.red}❌${c.reset} ${m}`),
    info: (m) => console.log(`${c.cyan}ℹ${c.reset}  ${m}`),
    warn: (m) => console.log(`${c.yellow}⚠️${c.reset}  ${m}`),
};

// ── CLI args ──
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit'));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf(limitArg) + 1]) : 10;

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const MONGO_URI = process.env.MONGODB_URI;

if (!GEMINI_KEY) { log.err('GEMINI_API_KEY not set in .env'); process.exit(1); }

// ── Gemini API call (via https, no SDK needed) ──
function geminiGenerate(prompt) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
        });
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        };
        const req = https.request(options, (res) => {
            let raw = '';
            res.on('data', d => raw += d);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(raw);
                    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    resolve(text.trim());
                } catch (e) { reject(new Error(`Gemini parse error: ${e.message}`)); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ── Translation prompt builder ──
async function translateQuestion(q, targetLang, targetLangName) {
    const enContent = q.content?.en?.text || '';
    const enOptions = (q.options || []).map((o, i) => ({
        key: o.key || String.fromCharCode(65 + i),
        text: o.text?.en?.text || o.text?.en || (typeof o.text === 'string' ? o.text : '') || '',
    }));
    const enSolution = q.solution?.en?.text || '';

    const isInteger = ['INTEGER', 'NUMERICAL'].includes(q.type?.toUpperCase());

    // Build a structured JSON-returning prompt
    const optionsSection = isInteger
        ? ''
        : `OPTIONS (translate each exactly):
${enOptions.map(o => `${o.key}: ${o.text}`).join('\n')}`;

    const solutionSection = enSolution
        ? `SOLUTION: ${enSolution}`
        : '';

    const prompt = `You are a JEE exam translator. Translate the following JEE question from English to ${targetLangName}.

IMPORTANT RULES:
1. Keep mathematical expressions, formulas, numbers, units, and chemical formulas EXACTLY as-is (do NOT translate them). E.g. "10 m/s", "H₂O", "sin θ", "∫₀¹", "g = 10 m/s²" stay unchanged.
2. Only translate the surrounding text.
3. Return ONLY a valid JSON object with no markdown, no code fences, no extra text.

QUESTION: ${enContent}

${optionsSection}

${solutionSection}

Return this exact JSON structure (fill only what exists):
{
  "content": "${targetLangName} translation of question text here",
  "options": {
    "A": "${targetLangName} translation of option A",
    "B": "${targetLangName} translation of option B",
    "C": "${targetLangName} translation of option C",
    "D": "${targetLangName} translation of option D"
  },
  "solution": "${targetLangName} translation of solution here"
}

If there are no options (integer type), use "options": {}.
If there is no solution, use "solution": "".`;

    const raw = await geminiGenerate(prompt);

    // Strip any accidental code fences
    const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();

    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch (e) {
        // Try to extract JSON from text
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
            try { parsed = JSON.parse(match[0]); }
            catch (_) { throw new Error(`Could not parse Gemini JSON for ${targetLangName}: ${cleaned.substring(0, 200)}`); }
        } else {
            throw new Error(`No JSON in Gemini response for ${targetLangName}: ${cleaned.substring(0, 200)}`);
        }
    }
    return parsed;
}

// ── Mongoose Question model (minimal, just for update) ──
async function main() {
    console.log(`\n${c.bold}═══════════════════════════════════════════${c.reset}`);
    console.log(`${c.bold}  JeeWallah — Question Translator (Gemini)${c.reset}`);
    console.log(`${c.bold}  Target: Hindi + Gujarati | Limit: ${LIMIT}${c.reset}`);
    if (DRY_RUN) console.log(`${c.yellow}  DRY RUN – no DB writes${c.reset}`);
    console.log(`${c.bold}═══════════════════════════════════════════${c.reset}\n`);

    await mongoose.connect(MONGO_URI);
    log.ok('MongoDB connected');

    const db = mongoose.connection.db;
    const collection = db.collection('questions');

    // Fetch SCQ/MCQ questions that don't already have hindi translations (prioritise untranslated)
    const questions = await collection.find({
        'content.en.text': { $exists: true, $ne: '' },
    }, {
        projection: { _id: 1, title: 1, type: 1, content: 1, options: 1, solution: 1 }
    }).limit(LIMIT).toArray();

    log.info(`Fetched ${questions.length} questions\n`);

    const langs = [
        { code: 'hi', name: 'Hindi' },
        { code: 'gj', name: 'Gujarati' },
    ];

    let successCount = 0;
    let errorCount = 0;

    for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];
        const title = q.title || q.content?.en?.text?.substring(0, 60) || `Q${qi + 1}`;
        console.log(`\n${c.bold}[${qi + 1}/${questions.length}]${c.reset} ${title.substring(0, 70)}...`);

        const updatePatch = {};

        for (const lang of langs) {
            process.stdout.write(`  ↳ Translating to ${lang.name}... `);
            try {
                const t = await translateQuestion(q, lang.code, lang.name);

                if (t.content?.trim()) {
                    updatePatch[`content.${lang.code}`] = { text: t.content.trim() };
                }

                // Options (for SCQ/MCQ)
                if (t.options && typeof t.options === 'object') {
                    const optKeys = Object.keys(t.options);
                    if (optKeys.length > 0 && Array.isArray(q.options)) {
                        q.options.forEach((opt, oi) => {
                            const key = opt.key || String.fromCharCode(65 + oi);
                            const transText = t.options[key];
                            if (transText?.trim()) {
                                // We need to update the nested options array field
                                // Store as separate field to use arrayFilters
                                updatePatch[`options.${oi}.text.${lang.code}`] = transText.trim();
                            }
                        });
                    }
                }

                // Solution
                if (t.solution?.trim()) {
                    updatePatch[`solution.${lang.code}`] = { text: t.solution.trim() };
                }

                console.log(`${c.green}done${c.reset}`);
                // Rate-limit delay to avoid Gemini quota
                await new Promise(r => setTimeout(r, 1200));
            } catch (err) {
                console.log(`${c.red}FAILED${c.reset}`);
                log.err(`  ${err.message.substring(0, 120)}`);
                errorCount++;
                await new Promise(r => setTimeout(r, 2000)); // back-off on error
            }
        }

        if (!DRY_RUN && Object.keys(updatePatch).length > 0) {
            await collection.updateOne({ _id: q._id }, { $set: updatePatch });
            log.ok(`  Saved to DB (${Object.keys(updatePatch).length} fields updated)`);
            successCount++;
        } else if (DRY_RUN) {
            log.warn(`  [DRY RUN] Would patch: ${Object.keys(updatePatch).join(', ')}`);
        }
    }

    console.log(`\n${c.bold}═══════════════════════════════════════════${c.reset}`);
    log.ok(`Translated: ${successCount}/${questions.length} questions`);
    if (errorCount > 0) log.warn(`Translation errors: ${errorCount}`);
    console.log(`${c.bold}═══════════════════════════════════════════${c.reset}\n`);

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    log.err(`Fatal: ${err.message}`);
    console.error(err);
    process.exit(1);
});
