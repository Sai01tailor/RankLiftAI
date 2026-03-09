/**
 * patchTranslations.js
 * ─────────────────────────────────────────
 * Patches hardcoded Hindi + Gujarati translations into 10 existing questions.
 * Translations written manually for accuracy.
 *
 * Run: node scripts/patchTranslations.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// ── Colour helpers ──
const g = (m) => console.log(`\x1b[32m✅\x1b[0m ${m}`);
const r = (m) => console.log(`\x1b[31m❌\x1b[0m ${m}`);
const i = (m) => console.log(`\x1b[36mℹ\x1b[0m  ${m}`);

// ══════════════════════════════════════════════════════════════
//  TRANSLATIONS  (manually written / verified)
//  Format: { _id, content: { hi, gj }, options: { A/B/C/D: { hi, gj } }, solution: { hi, gj } }
// ══════════════════════════════════════════════════════════════
const patches = [

    // ─── Q1: Atomic Structure – How many electrons n=4, l=1 (NUMERICAL) ───
    {
        _id: '699887734ac10c3031925a73',
        content: {
            hi: 'एक परमाणु में कितने इलेक्ट्रॉन क्वांटम संख्याएँ n=4, l=1 रख सकते हैं?',
            gj: 'એક પરમાણુમાં કેટલા ઇલેક્ટ્રોન ક્વોન્ટમ સંખ્યા n=4, l=1 ધરાવી શકે છે?',
        },
        options: {},
        solution: {
            hi: '4p उपकोश में 3 कक्षक होते हैं। अतः 3 × 2 = 6 इलेक्ट्रॉन।',
            gj: '4p સબ-શેલમાં 3 ઓર્બિટલ છે. 3 × 2 = 6 ઇલેક્ટ્રોન.',
        },
    },

    // ─── Q2: Atomic Structure – Orbital angular momentum of p-electron (SCQ) ───
    {
        _id: '699887734ac10c3031925a70',
        content: {
            hi: 'p-इलेक्ट्रॉन का कक्षीय कोणीय संवेग किसके बराबर है?',
            gj: 'p-ઇલેક્ટ્રોનનો ભ્રમણ કોણીય વેગ નીચેનામાંથી ક્યો છે?',
        },
        options: {
            A: { hi: 'h / 2π', gj: 'h / 2π' },
            B: { hi: '√3 h / 2π', gj: '√3 h / 2π' },
            C: { hi: '2 h / 2π', gj: '2 h / 2π' },
            D: { hi: '√6 h / 2π', gj: '√6 h / 2π' },
        },
        solution: {
            hi: 'L = √(l(l+1)) × (h/2π)। p-इलेक्ट्रॉन के लिए l = 1, अतः L = √2 × h/2π।',
            gj: 'L = √(l(l+1)) × (h/2π). p-ઇલેક્ટ્રોન માટે l = 1, તેથી L = √2 × h/2π.',
        },
    },

    // ─── Q3: Kinematics – Projectile range = 2 × max height (SCQ) ───
    {
        _id: '699887734ac10c3031925a6f',
        content: {
            hi: 'एक कण को वेग v से प्रक्षेपित किया जाता है जिससे उसकी क्षैतिज परास, प्राप्त महत्तम ऊँचाई की दोगुनी हो। क्षैतिज परास होगी:',
            gj: 'એક કણને v વેગ સાથે ફેંકવામાં આવે છે, જ્યારે ક્ષૈતિજ અંતર, પ્રાપ્ત મહત્તમ ઊંચાઈ કરતા બમણું હોય. ક્ષૈતિજ અંતર હશે:',
        },
        options: {
            A: { hi: 'v² / g', gj: 'v² / g' },
            B: { hi: '2v² / 3g', gj: '2v² / 3g' },
            C: { hi: '4v² / 5g', gj: '4v² / 5g' },
            D: { hi: 'v² / 2g', gj: 'v² / 2g' },
        },
        solution: {
            hi: 'R = 2H से: tan θ = 4H/R = 2। sin θ = 2/√5, cos θ = 1/√5। R = v² sin2θ / g = 4v²/5g।',
            gj: 'R = 2H થી: tan θ = 2. sin θ = 2/√5. R = v² sin2θ / g = 4v²/5g.',
        },
    },

    // ─── Q4: Calculus – Definite integral sin/(sin+cos) (SCQ) ───
    {
        _id: '699887734ac10c3031925a71',
        content: {
            hi: 'माना I = ∫₀^(π/2) [ sinx / (sinx + cosx) ] dx। I का मान है:',
            gj: 'ધારો I = ∫₀^(π/2) [ sinx / (sinx + cosx) ] dx. I નું મૂલ્ય છે:',
        },
        options: {
            A: { hi: 'π/2', gj: 'π/2' },
            B: { hi: 'π/4', gj: 'π/4' },
            C: { hi: 'π/3', gj: 'π/3' },
            D: { hi: 'π/6', gj: 'π/6' },
        },
        solution: {
            hi: 'f(x) + f(π/2 - x) = 1 गुण का उपयोग करने पर: 2I = ∫₀^(π/2) 1 dx = π/2 → I = π/4।',
            gj: 'f(x) + f(π/2 - x) = 1 ગુણ વાપરીએ: 2I = ∫₀^(π/2) 1 dx = π/2 → I = π/4.',
        },
    },

    // ─── Q5: Kinematics – Projectile velocity perpendicular (INTEGER) ───
    {
        _id: '699887734ac10c3031925a72',
        content: {
            hi: 'एक प्रक्षेप्य को क्षैतिज से 60° के कोण पर 20 m/s के वेग से फेंका गया है। कितने सेकंड बाद इसका वेग सदिश, प्रारंभिक वेग सदिश के लंबवत हो जाएगा? (g = 10 m/s², निकटतम पूर्णांक में पूर्णांकित करें)',
            gj: 'એક ઓબ્જેક્ટ ક્ષૈતિજ સાથે 60° કોણ પર 20 m/s ના વેગ સાથે ફેંકવામાં આવ્યો. કેટલા સેકન્ડ પછી તેનો વેગ, પ્રારંભિક વેગ સાથે લંબ થશે? (g = 10 m/s², પૂર્ણ સંખ્યામાં ગોળ કરો)',
        },
        options: {},
        solution: {
            hi: 'v₀·v(t) = 0 की शर्त से t ≈ 2.3 s। निकटतम पूर्णांक = 3।',
            gj: 'v₀·v(t) = 0 ની શરત પ્રમાણે t ≈ 2.3 s. પૂર્ણ સંખ્યા = 3.',
        },
    },

    // ─── Q6: Kinematics – Projectile 45° (SCQ) ───
    {
        _id: '69a439aa845c82c9e32ee312',
        content: {
            hi: 'एक प्रक्षेप्य को 45° के कोण पर 20 m/s की चाल से प्रक्षेपित किया गया है। क्षैतिज परास क्या है? (g = 10 m/s²)',
            gj: 'એક ઓબ્જેક્ટ 45° ના ખૂણે 20 m/s ની ઝડપ સાથે ફેંકવામાં આવ્યો. ક્ષૈતિજ અંતર કેટલું છે? (g = 10 m/s²)',
        },
        options: {
            A: { hi: '20 m', gj: '20 m' },
            B: { hi: '40 m', gj: '40 m' },
            C: { hi: '10 m', gj: '10 m' },
            D: { hi: '80 m', gj: '80 m' },
        },
        solution: {
            hi: 'R = v² sin2θ / g = (20)² × sin90° / 10 = 400/10 = 40 m।',
            gj: 'R = v² sin2θ / g = (20)² × sin90° / 10 = 400/10 = 40 m.',
        },
    },

    // ─── Q7: Kinematics – Ball thrown upward (SCQ) ───
    {
        _id: '69a439aa845c82c9e32ee313',
        content: {
            hi: 'एक गेंद को 20 m/s के वेग से ऊपर की ओर फेंका गया है। अधिकतम ऊँचाई तक पहुँचने में कितना समय लगेगा? (g = 10 m/s²)',
            gj: 'એક દડો 20 m/s ના વેગ સાથે ઉપરની તરફ ફેંકવામાં આવ્યો. મહત્તમ ઊંચાઈ સુધી પહોંચવામાં કેટલો સમય લાગશે? (g = 10 m/s²)',
        },
        options: {
            A: { hi: '1 s', gj: '1 s' },
            B: { hi: '2 s', gj: '2 s' },
            C: { hi: '3 s', gj: '3 s' },
            D: { hi: '4 s', gj: '4 s' },
        },
        solution: {
            hi: 'अधिकतम ऊँचाई पर v = 0। v = u - gt → t = u/g = 20/10 = 2 s।',
            gj: 'મહત્તમ ઊંચાઈ પર v = 0. v = u - gt → t = u/g = 20/10 = 2 s.',
        },
    },

    // ─── Q8: Kinematics – Circular motion net work done (SCQ) ───
    {
        _id: '69a439aa845c82c9e32ee314',
        content: {
            hi: 'एक कण एकसमान वृत्तीय गति करता है। एक पूर्ण चक्कर में किया गया कुल कार्य होता है:',
            gj: 'એક કણ એકસમાન વર્તુળ ગતિ કરે છે. એક સંપૂર્ણ ચક્કરમાં થતું કુલ કાર્ય છે:',
        },
        options: {
            A: { hi: 'धनात्मक', gj: 'ધન' },
            B: { hi: 'ऋणात्मक', gj: 'ઋण' },
            C: { hi: 'शून्य', gj: 'શૂન્ય' },
            D: { hi: 'चाल पर निर्भर', gj: 'ઝડપ પર આધારિત' },
        },
        solution: {
            hi: 'एकसमान वृत्तीय गति में अभिकेंद्री बल सदैव वेग के लंबवत होता है, अतः किया गया कार्य शून्य होता है।',
            gj: 'એકસમાન વર્તુળ ગતિમાં અભિ-કેન્દ્ર બળ હંમેશા વેગ સાથે કાટખૂણે હોય છે, તેથી કાર્ય = 0.',
        },
    },

];

// ══════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════
async function main() {
    console.log('\n\x1b[1m═══════════════════════════════════════════\x1b[0m');
    console.log('\x1b[1m  JeeWallah — Patch Hindi + Gujarati Translations\x1b[0m');
    console.log(`\x1b[1m  Patching ${patches.length} questions\x1b[0m`);
    console.log('\x1b[1m═══════════════════════════════════════════\x1b[0m\n');

    await mongoose.connect(process.env.MONGODB_URI);
    i('MongoDB connected');

    const col = mongoose.connection.db.collection('questions');
    let updated = 0;

    for (const patch of patches) {
        const id = new mongoose.Types.ObjectId(patch._id);
        const $set = {};

        // Content translations
        if (patch.content?.hi) $set['content.hi'] = { text: patch.content.hi };
        if (patch.content?.gj) $set['content.gj'] = { text: patch.content.gj };

        // Solution translations
        if (patch.solution?.hi) $set['solution.hi'] = { text: patch.solution.hi };
        if (patch.solution?.gj) $set['solution.gj'] = { text: patch.solution.gj };

        // Fetch the question to get the options array indices
        if (Object.keys(patch.options || {}).length > 0) {
            const q = await col.findOne({ _id: id }, { projection: { options: 1 } });
            if (q?.options?.length) {
                q.options.forEach((opt, oi) => {
                    const key = opt.key || String.fromCharCode(65 + oi);
                    const trans = patch.options[key];
                    if (trans?.hi) $set[`options.${oi}.text.hi`] = trans.hi;
                    if (trans?.gj) $set[`options.${oi}.text.gj`] = trans.gj;
                });
            }
        }

        const res = await col.updateOne({ _id: id }, { $set });
        if (res.matchedCount === 0) {
            r(`Not found: ${patch._id}`);
        } else {
            g(`Updated: ${patch._id} (${Object.keys($set).length} fields)`);
            updated++;
        }
    }

    console.log('\n\x1b[1m═══════════════════════════════════════════\x1b[0m');
    i(`Successfully patched ${updated}/${patches.length} questions with HI + GJ translations`);
    console.log('\x1b[1m═══════════════════════════════════════════\x1b[0m\n');

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    r(`Fatal: ${err.message}`);
    process.exit(1);
});
