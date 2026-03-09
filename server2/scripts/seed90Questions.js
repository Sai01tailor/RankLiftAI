/**
 * seed90Questions.js
 * Seeds 90 JEE Main–pattern questions:
 *   Physics   : 20 SCQ + 10 INTEGER  (30 total)
 *   Chemistry : 20 SCQ + 10 INTEGER  (30 total)
 *   Mathematics: 20 SCQ + 10 INTEGER (30 total)
 *
 * Usage: node scripts/seed90Questions.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const config = require('../config');
const { Question } = require('../models/Question');
const { Subject, Chapter, Topic } = require('../models/SubNTopic');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── helpers ──────────────────────────────────────────────────────
const opt = (key, text, correct = false) => ({
    key, text: { en: text }, isCorrect: correct,
});
const scq = (text, a, b, c, d, correct, extra = {}) => ({
    type: 'SCQ', examCategory: 'JEE Main',
    content: { en: { text } },
    options: [
        opt('A', a, correct === 'A'),
        opt('B', b, correct === 'B'),
        opt('C', c, correct === 'C'),
        opt('D', d, correct === 'D'),
    ],
    correctAnswer: { optionKeys: [correct] },
    marks: { correct: 4, incorrect: -1, unattempted: 0 },
    difficulty: extra.difficulty || 'Medium',
    isActive: true, status: 'published',
    ...extra,
});
const intq = (text, answer, extra = {}) => ({
    type: 'INTEGER', examCategory: 'JEE Main',
    content: { en: { text } },
    options: [],
    correctAnswer: { numericValue: answer },
    marks: { correct: 4, incorrect: 0, unattempted: 0 },
    difficulty: extra.difficulty || 'Hard',
    isActive: true, status: 'published',
    ...extra,
});

// ─── PHYSICS QUESTIONS ────────────────────────────────────────────
const PHY_SCQ = [
    scq('A projectile is launched at 45° with speed 20 m/s. What is the horizontal range? (g = 10 m/s²)',
        '20 m', '40 m', '10 m', '80 m', 'B',
        { subjectSlug: 'physics', chapterSlug: 'kinematics', topicSlug: 'projectile-motion', difficulty: 'Easy' }),
    scq('A ball is thrown upward with velocity 20 m/s. Time to reach max height? (g = 10 m/s²)',
        '1 s', '2 s', '3 s', '4 s', 'B',
        { subjectSlug: 'physics', chapterSlug: 'kinematics', topicSlug: 'projectile-motion', difficulty: 'Easy' }),
    scq('A particle undergoes uniform circular motion. The net work done in one complete revolution is:',
        'Positive', 'Negative', 'Zero', 'Depends on speed', 'C',
        { subjectSlug: 'physics', chapterSlug: 'kinematics', topicSlug: 'circular-motion', difficulty: 'Easy' }),
    scq('A body moving with speed v is brought to rest over distance s. The deceleration is:',
        'v²/s', 'v²/(2s)', 'v/(2s)', '2v²/s', 'B',
        { subjectSlug: 'physics', chapterSlug: 'kinematics', topicSlug: 'projectile-motion', difficulty: 'Medium' }),
    scq('A block of mass 5 kg is on a frictionless surface. Force applied = 20 N. Acceleration is:',
        '2 m/s²', '4 m/s²', '100 m/s²', '0.25 m/s²', 'B',
        { subjectSlug: 'physics', chapterSlug: 'laws-of-motion', topicSlug: 'newtons-laws', difficulty: 'Easy' }),
    scq('Two blocks of mass 3 kg and 5 kg are connected by a string over a frictionless pulley. The acceleration of the system is: (g=10 m/s²)',
        '1.25 m/s²', '2.5 m/s²', '5 m/s²', '10 m/s²', 'B',
        { subjectSlug: 'physics', chapterSlug: 'laws-of-motion', topicSlug: 'newtons-laws', difficulty: 'Medium' }),
    scq('A 10 kg block is on a rough surface (μ = 0.3). Normal force = 100 N. Friction force = ?',
        '10 N', '20 N', '30 N', '40 N', 'C',
        { subjectSlug: 'physics', chapterSlug: 'laws-of-motion', topicSlug: 'friction', difficulty: 'Easy' }),
    scq('A car of mass 1000 kg moves with KE = 500 kJ. Its speed is:',
        '10 m/s', '20 m/s', '30 m/s', '40 m/s', 'B',
        { subjectSlug: 'physics', chapterSlug: 'work-energy-power', topicSlug: 'kinetic-energy', difficulty: 'Easy' }),
    scq('Work done by friction when a box slides 5 m with friction force 10 N is:',
        '+50 J', '-50 J', '0', '+25 J', 'B',
        { subjectSlug: 'physics', chapterSlug: 'work-energy-power', topicSlug: 'kinetic-energy', difficulty: 'Easy' }),
    scq('A spring of constant 200 N/m is compressed by 0.1 m. Potential energy stored is:',
        '0.5 J', '1 J', '2 J', '10 J', 'B',
        { subjectSlug: 'physics', chapterSlug: 'work-energy-power', topicSlug: 'potential-energy', difficulty: 'Easy' }),
    scq('A machine does 1000 J of work in 10 s. Its power is:',
        '10 W', '100 W', '1000 W', '10000 W', 'B',
        { subjectSlug: 'physics', chapterSlug: 'work-energy-power', topicSlug: 'kinetic-energy', difficulty: 'Easy' }),
    scq('The velocity of sound in air at 0°C is 330 m/s. At 4°C the speed (approximately) is:',
        '330 m/s', '331.2 m/s', '332.4 m/s', '335 m/s', 'B',
        { subjectSlug: 'physics', chapterSlug: 'waves', topicSlug: 'sound-waves', difficulty: 'Medium' }),
    scq('Two identical sound sources produce beats of 4 Hz. If one source is loaded, beats increase to 6 Hz. The loaded source has:',
        'Higher frequency', 'Lower frequency', 'Same frequency', 'Cannot determine', 'B',
        { subjectSlug: 'physics', chapterSlug: 'waves', topicSlug: 'sound-waves', difficulty: 'Medium' }),
    scq('In Young\'s double slit experiment, fringe width β = λD/d. If d is doubled, β becomes:',
        '2β', 'β/2', '4β', 'β', 'B',
        { subjectSlug: 'physics', chapterSlug: 'waves', topicSlug: 'wave-optics', difficulty: 'Medium' }),
    scq('Light of wavelength 600 nm passes through a slit of width 1 mm. Width of central maximum at D=1 m is:',
        '0.6 mm', '1.2 mm', '0.3 mm', '2.4 mm', 'B',
        { subjectSlug: 'physics', chapterSlug: 'waves', topicSlug: 'wave-optics', difficulty: 'Hard' }),
    scq('Newton\'s first law defines the concept of:',
        'Momentum', 'Inertia', 'Force', 'Acceleration', 'B',
        { subjectSlug: 'physics', chapterSlug: 'laws-of-motion', topicSlug: 'newtons-laws', difficulty: 'Easy' }),
    scq('A 2 kg object is raised 5 m. The increase in PE is: (g = 10 m/s²)',
        '10 J', '100 J', '50 J', '20 J', 'B',
        { subjectSlug: 'physics', chapterSlug: 'work-energy-power', topicSlug: 'potential-energy', difficulty: 'Easy' }),
    scq('The speed of a wave is related to frequency and wavelength by:',
        'v = f/λ', 'v = fλ', 'v = λ/f', 'v = f²λ', 'B',
        { subjectSlug: 'physics', chapterSlug: 'waves', topicSlug: 'sound-waves', difficulty: 'Easy' }),
    scq('A car turns in a circle of radius 50 m at 10 m/s. Centripetal acceleration is:',
        '1 m/s²', '2 m/s²', '5 m/s²', '10 m/s²', 'B',
        { subjectSlug: 'physics', chapterSlug: 'kinematics', topicSlug: 'circular-motion', difficulty: 'Easy' }),
    scq('Impulse is defined as:',
        'Force × distance', 'Force × time', 'Mass × acceleration', 'Work / time', 'B',
        { subjectSlug: 'physics', chapterSlug: 'laws-of-motion', topicSlug: 'newtons-laws', difficulty: 'Easy' }),
];

const PHY_INT = [
    intq('A body starts from rest and accelerates uniformly at 5 m/s². Distance covered in 4 s is ___ m.',
        40, { subjectSlug: 'physics', chapterSlug: 'kinematics', topicSlug: 'projectile-motion' }),
    intq('A spring (k = 100 N/m) is stretched by 0.2 m. Restoring force in N is ___.',
        20, { subjectSlug: 'physics', chapterSlug: 'work-energy-power', topicSlug: 'potential-energy' }),
    intq('A ball of mass 2 kg moving at 5 m/s hits a wall and rebounds at 5 m/s. Change in momentum magnitude in kg·m/s is ___.',
        20, { subjectSlug: 'physics', chapterSlug: 'laws-of-motion', topicSlug: 'newtons-laws' }),
    intq('A wave has frequency 500 Hz and wavelength 0.66 m. Speed of wave in m/s is ___.',
        330, { subjectSlug: 'physics', chapterSlug: 'waves', topicSlug: 'sound-waves' }),
    intq('A 4 kg block slides down a frictionless incline of height 5 m. Speed at bottom in m/s is ___. (g=10)',
        10, { subjectSlug: 'physics', chapterSlug: 'work-energy-power', topicSlug: 'kinetic-energy' }),
    intq('Two objects of mass 3 kg and 7 kg collide and stick together. Initial velocities: 10 m/s and 0. Final speed in m/s is ___.',
        3, { subjectSlug: 'physics', chapterSlug: 'laws-of-motion', topicSlug: 'newtons-laws' }),
    intq('A car accelerates from 0 to 20 m/s in 4 s. Acceleration in m/s² is ___.',
        5, { subjectSlug: 'physics', chapterSlug: 'kinematics', topicSlug: 'projectile-motion' }),
    intq('A pendulum of length 1 m has period T = 2π√(l/g). T in seconds (round to nearest int, g=π² m/s²) is ___.',
        2, { subjectSlug: 'physics', chapterSlug: 'waves', topicSlug: 'sound-waves' }),
    intq('Power delivered by a force of 50 N moving an object at 6 m/s in watts is ___.',
        300, { subjectSlug: 'physics', chapterSlug: 'work-energy-power', topicSlug: 'kinetic-energy' }),
    intq('An object in circular motion with radius 3 m makes 2 complete revolutions per second. Centripetal acceleration in m/s² is ___ × π². Express numerical coefficient only.',
        48, { subjectSlug: 'physics', chapterSlug: 'kinematics', topicSlug: 'circular-motion' }),
];

// ─── CHEMISTRY QUESTIONS ─────────────────────────────────────────
const CHEM_SCQ = [
    scq('The number of orbitals in the n=3 shell is:',
        '3', '6', '9', '12', 'C',
        { subjectSlug: 'chemistry', chapterSlug: 'atomic-structure', topicSlug: 'quantum-numbers', difficulty: 'Easy' }),
    scq('The shape of sp³ hybridised carbon is:',
        'Linear', 'Trigonal planar', 'Tetrahedral', 'Octahedral', 'C',
        { subjectSlug: 'chemistry', chapterSlug: 'chemical-bonding', topicSlug: 'hybridization', difficulty: 'Easy' }),
    scq('BF₃ has ___ hybridisation:',
        'sp', 'sp²', 'sp³', 'dsp²', 'B',
        { subjectSlug: 'chemistry', chapterSlug: 'chemical-bonding', topicSlug: 'hybridization', difficulty: 'Easy' }),
    scq('The number of lone pairs on the central N atom in NH₃ is:',
        '0', '1', '2', '3', 'B',
        { subjectSlug: 'chemistry', chapterSlug: 'chemical-bonding', topicSlug: 'lewis-structure', difficulty: 'Easy' }),
    scq('Which of the following has the highest electronegativity?',
        'F', 'O', 'N', 'Cl', 'A',
        { subjectSlug: 'chemistry', chapterSlug: 'atomic-structure', topicSlug: 'periodic-trends', difficulty: 'Easy' }),
    scq('According to the first law of thermodynamics: ΔU =',
        'q + w', 'q - w', 'q × w', 'q / w', 'A',
        { subjectSlug: 'chemistry', chapterSlug: 'thermodynamics', topicSlug: 'first-law-thermodynamics', difficulty: 'Easy' }),
    scq('For an adiabatic process, q equals:',
        'ΔU', '0', '-w', 'w', 'B',
        { subjectSlug: 'chemistry', chapterSlug: 'thermodynamics', topicSlug: 'first-law-thermodynamics', difficulty: 'Easy' }),
    scq('Entropy is a measure of:',
        'Temperature', 'Disorder', 'Enthalpy', 'Free energy', 'B',
        { subjectSlug: 'chemistry', chapterSlug: 'thermodynamics', topicSlug: 'entropy', difficulty: 'Easy' }),
    scq('For a spontaneous process at constant T and P, ΔG is:',
        '> 0', '= 0', '< 0', 'Cannot say', 'C',
        { subjectSlug: 'chemistry', chapterSlug: 'thermodynamics', topicSlug: 'entropy', difficulty: 'Medium' }),
    scq('The Faraday constant is approximately:',
        '6.022 × 10²³ C', '96500 C/mol', '8.314 J/mol·K', '1.6 × 10⁻¹⁹ C', 'B',
        { subjectSlug: 'chemistry', chapterSlug: 'electrochemistry', topicSlug: 'electrolysis', difficulty: 'Easy' }),
    scq('In electrolysis of water, which gas is produced at the anode?',
        'Hydrogen', 'Oxygen', 'Ozone', 'Chlorine', 'B',
        { subjectSlug: 'chemistry', chapterSlug: 'electrochemistry', topicSlug: 'electrolysis', difficulty: 'Easy' }),
    scq('The EMF of a Daniell cell (Zn|ZnSO₄||CuSO₄|Cu) is approximately:',
        '0.34 V', '0.76 V', '1.10 V', '1.86 V', 'C',
        { subjectSlug: 'chemistry', chapterSlug: 'electrochemistry', topicSlug: 'cell-emf', difficulty: 'Medium' }),
    scq('Nernst equation is used to calculate:',
        'Gibbs free energy', 'Cell EMF at non-standard conditions', 'Entropy change', 'Enthalpy change', 'B',
        { subjectSlug: 'chemistry', chapterSlug: 'electrochemistry', topicSlug: 'cell-emf', difficulty: 'Medium' }),
    scq('Atomic radius generally ___ across a period (left to right):',
        'Increases', 'Decreases', 'Stays same', 'First increases then decreases', 'B',
        { subjectSlug: 'chemistry', chapterSlug: 'atomic-structure', topicSlug: 'periodic-trends', difficulty: 'Easy' }),
    scq('Which quantum number determines the shape of an orbital?',
        'Principal (n)', 'Azimuthal (l)', 'Magnetic (m)', 'Spin (s)', 'B',
        { subjectSlug: 'chemistry', chapterSlug: 'atomic-structure', topicSlug: 'quantum-numbers', difficulty: 'Easy' }),
    scq('Hess\'s law states that total enthalpy change is:',
        'Path dependent', 'Path independent', 'Always negative', 'Always positive', 'B',
        { subjectSlug: 'chemistry', chapterSlug: 'thermodynamics', topicSlug: 'first-law-thermodynamics', difficulty: 'Medium' }),
    scq('For an ideal gas undergoing isothermal expansion, ΔU is:',
        'Positive', 'Negative', 'Zero', 'Infinite', 'C',
        { subjectSlug: 'chemistry', chapterSlug: 'thermodynamics', topicSlug: 'entropy', difficulty: 'Medium' }),
    scq('The Lewis structure of CO₂ shows ___ lone pairs on C:',
        '0', '1', '2', '4', 'A',
        { subjectSlug: 'chemistry', chapterSlug: 'chemical-bonding', topicSlug: 'lewis-structure', difficulty: 'Medium' }),
    scq('Which hybridisation is present in PCl₅?',
        'sp³', 'sp²d', 'sp³d', 'sp³d²', 'C',
        { subjectSlug: 'chemistry', chapterSlug: 'chemical-bonding', topicSlug: 'hybridization', difficulty: 'Medium' }),
    scq('Standard electrode potential of hydrogen electrode is:',
        '+1.0 V', '-1.0 V', '0.0 V', '0.5 V', 'C',
        { subjectSlug: 'chemistry', chapterSlug: 'electrochemistry', topicSlug: 'cell-emf', difficulty: 'Easy' }),
];

const CHEM_INT = [
    intq('Electrons in the M shell (n=3) of an atom are ___.',
        18, { subjectSlug: 'chemistry', chapterSlug: 'atomic-structure', topicSlug: 'quantum-numbers' }),
    intq('Charge passed to deposit 1 mole of Cu²⁺ (in Faraday units) is ___.',
        2, { subjectSlug: 'chemistry', chapterSlug: 'electrochemistry', topicSlug: 'electrolysis' }),
    intq('Number of sigma bonds in ethane (C₂H₆) is ___.',
        7, { subjectSlug: 'chemistry', chapterSlug: 'chemical-bonding', topicSlug: 'lewis-structure' }),
    intq('For the reaction N₂ + 3H₂ → 2NH₃, ΔH = -92 kJ. Enthalpy change per mole of NH₃ formed is ___ kJ. Give magnitude.',
        46, { subjectSlug: 'chemistry', chapterSlug: 'thermodynamics', topicSlug: 'first-law-thermodynamics' }),
    intq('Number of lone pairs in H₂O molecule is ___.',
        2, { subjectSlug: 'chemistry', chapterSlug: 'chemical-bonding', topicSlug: 'lewis-structure' }),
    intq('Bond order of O₂ molecule using MO theory is ___.',
        2, { subjectSlug: 'chemistry', chapterSlug: 'chemical-bonding', topicSlug: 'hybridization' }),
    intq('The value of ΔG at equilibrium is ___ (numerically).',
        0, { subjectSlug: 'chemistry', chapterSlug: 'thermodynamics', topicSlug: 'entropy' }),
    intq('Principal quantum number n for the M shell is ___.',
        3, { subjectSlug: 'chemistry', chapterSlug: 'atomic-structure', topicSlug: 'quantum-numbers' }),
    intq('Number of subshells in the n=4 energy level is ___.',
        4, { subjectSlug: 'chemistry', chapterSlug: 'atomic-structure', topicSlug: 'quantum-numbers' }),
    intq('For a cell with E°cell = 1.10 V, the ΔG° in kJ for a 2-electron process is ___ kJ. (F=96500, give magnitude, round to nearest 10)',
        212, { subjectSlug: 'chemistry', chapterSlug: 'electrochemistry', topicSlug: 'cell-emf' }),
];

// ─── MATHEMATICS QUESTIONS ───────────────────────────────────────
const MATH_SCQ = [
    scq('The value of lim(x→0) (sin x)/x is:',
        '0', '∞', '1', '-1', 'C',
        { subjectSlug: 'mathematics', chapterSlug: 'calculus', topicSlug: 'limits', difficulty: 'Easy' }),
    scq('Derivative of sin x is:',
        '-cos x', 'cos x', '-sin x', 'tan x', 'B',
        { subjectSlug: 'mathematics', chapterSlug: 'calculus', topicSlug: 'differentiation', difficulty: 'Easy' }),
    scq('∫ 2x dx =',
        'x', '2x²', 'x² + C', '2 + C', 'C',
        { subjectSlug: 'mathematics', chapterSlug: 'calculus', topicSlug: 'integration', difficulty: 'Easy' }),
    scq('∫₀¹ x² dx =',
        '1/2', '1/3', '1/4', '1', 'B',
        { subjectSlug: 'mathematics', chapterSlug: 'calculus', topicSlug: 'integration', difficulty: 'Easy' }),
    scq('The slope of the line y = 3x + 5 is:',
        '5', '3', '15', '8', 'B',
        { subjectSlug: 'mathematics', chapterSlug: 'coordinate-geometry', topicSlug: 'straight-lines', difficulty: 'Easy' }),
    scq('Distance between points (1,2) and (4,6) is:',
        '3', '4', '5', '7', 'C',
        { subjectSlug: 'mathematics', chapterSlug: 'coordinate-geometry', topicSlug: 'straight-lines', difficulty: 'Easy' }),
    scq('Equation of circle with centre (0,0) and radius 5 is:',
        'x² + y² = 25', 'x² + y² = 5', '(x+5)²+(y+5)²=0', 'x²-y²=25', 'A',
        { subjectSlug: 'mathematics', chapterSlug: 'coordinate-geometry', topicSlug: 'circles', difficulty: 'Easy' }),
    scq('cos 60° =',
        '√3/2', '1/2', '1/√2', '0', 'B',
        { subjectSlug: 'mathematics', chapterSlug: 'trigonometry', topicSlug: 'trig-identities', difficulty: 'Easy' }),
    scq('sin²θ + cos²θ =',
        '0', '2', '1', 'sin 2θ', 'C',
        { subjectSlug: 'mathematics', chapterSlug: 'trigonometry', topicSlug: 'trig-identities', difficulty: 'Easy' }),
    scq('Value of tan 45° is:',
        '0', '1/√2', '1', '√3', 'C',
        { subjectSlug: 'mathematics', chapterSlug: 'trigonometry', topicSlug: 'trig-identities', difficulty: 'Easy' }),
    scq('sin⁻¹(1) =',
        '0', 'π/6', 'π/4', 'π/2', 'D',
        { subjectSlug: 'mathematics', chapterSlug: 'trigonometry', topicSlug: 'inverse-trig', difficulty: 'Easy' }),
    scq('Sum of AP: 1+2+3+…+n =',
        'n(n+1)', 'n(n-1)/2', 'n(n+1)/2', 'n²', 'C',
        { subjectSlug: 'mathematics', chapterSlug: 'algebra', topicSlug: 'ap-gp-hp', difficulty: 'Easy' }),
    scq('If a GP has first term 2 and ratio 3, the 4th term is:',
        '18', '54', '162', '6', 'B',
        { subjectSlug: 'mathematics', chapterSlug: 'algebra', topicSlug: 'ap-gp-hp', difficulty: 'Easy' }),
    scq('Coefficient of x² in (1+x)⁵ is:',
        '5', '10', '15', '20', 'B',
        { subjectSlug: 'mathematics', chapterSlug: 'algebra', topicSlug: 'binomial-theorem', difficulty: 'Easy' }),
    scq('Number of terms in expansion of (a+b)⁸ is:',
        '7', '8', '9', '10', 'C',
        { subjectSlug: 'mathematics', chapterSlug: 'algebra', topicSlug: 'binomial-theorem', difficulty: 'Easy' }),
    scq('Probability of getting a head in a single coin toss is:',
        '1/4', '1/3', '1/2', '1', 'C',
        { subjectSlug: 'mathematics', chapterSlug: 'probability', topicSlug: 'basic-probability', difficulty: 'Easy' }),
    scq('P(A∩B) = P(A)·P(B) holds when A and B are:',
        'Mutually exclusive', 'Complementary', 'Independent', 'Exhaustive', 'C',
        { subjectSlug: 'mathematics', chapterSlug: 'probability', topicSlug: 'conditional-probability', difficulty: 'Easy' }),
    scq('lim(x→∞) 1/x =',
        '1', '∞', '0', '-1', 'C',
        { subjectSlug: 'mathematics', chapterSlug: 'calculus', topicSlug: 'limits', difficulty: 'Easy' }),
    scq('Derivative of e^x is:',
        'xe^(x-1)', 'e^x', 'ln x', '1/x', 'B',
        { subjectSlug: 'mathematics', chapterSlug: 'calculus', topicSlug: 'differentiation', difficulty: 'Easy' }),
    scq('The general term of sequence 2, 4, 8, 16, … is:',
        '2n', 'n²', '2ⁿ', '3n-1', 'C',
        { subjectSlug: 'mathematics', chapterSlug: 'algebra', topicSlug: 'sequence-and-series', difficulty: 'Easy' }),
];

const MATH_INT = [
    intq('The value of ∫₀² x³ dx is ___.',
        4, { subjectSlug: 'mathematics', chapterSlug: 'calculus', topicSlug: 'integration' }),
    intq('If f(x) = x³, then f\'(2) = ___.',
        12, { subjectSlug: 'mathematics', chapterSlug: 'calculus', topicSlug: 'differentiation' }),
    intq('Sum of first 10 natural numbers is ___.',
        55, { subjectSlug: 'mathematics', chapterSlug: 'algebra', topicSlug: 'ap-gp-hp' }),
    intq('Number of diagonals in a hexagon is ___.',
        9, { subjectSlug: 'mathematics', chapterSlug: 'algebra', topicSlug: 'binomial-theorem' }),
    intq('The distance of point (3, 4) from the origin is ___.',
        5, { subjectSlug: 'mathematics', chapterSlug: 'coordinate-geometry', topicSlug: 'straight-lines' }),
    intq('sin 30° × cos 60° × 4 = ___ (integer value).',
        1, { subjectSlug: 'mathematics', chapterSlug: 'trigonometry', topicSlug: 'trig-identities' }),
    intq('P(getting 6 on a dice) = 1/n. n = ___.',
        6, { subjectSlug: 'mathematics', chapterSlug: 'probability', topicSlug: 'basic-probability' }),
    intq('The 5th term of AP with a=3, d=4 is ___.',
        19, { subjectSlug: 'mathematics', chapterSlug: 'algebra', topicSlug: 'ap-gp-hp' }),
    intq('tan⁻¹(1) in degrees = ___.',
        45, { subjectSlug: 'mathematics', chapterSlug: 'trigonometry', topicSlug: 'inverse-trig' }),
    intq('Number of ways to arrange 3 distinct objects = ___.',
        6, { subjectSlug: 'mathematics', chapterSlug: 'probability', topicSlug: 'basic-probability' }),
];

// ─── MAIN ─────────────────────────────────────────────────────────
async function run() {
    await mongoose.connect(config.mongo.uri);
    console.log('✅ MongoDB connected');

    // createdBy is required by schema — use the admin user's _id
    const User = require('../models/Users');
    const admin = await User.findOne({ role: 'admin' }, '_id').lean();
    if (!admin) { console.error('No admin found. Run seedAdmin.js first.'); process.exit(1); }
    const adminId = admin._id;

    // Build slug → ObjectId maps
    const subjects = await Subject.find({}).lean();
    const chapters = await Chapter.find({}).lean();
    const topics = await Topic.find({}).lean();

    const subMap = Object.fromEntries([
        ...subjects.map(s => [s.slug, s._id]),
        ...subjects.map(s => [s.name.toLowerCase(), s._id]),
    ]);
    const chMap = Object.fromEntries([
        ...chapters.map(c => [c.slug, c._id]),
        ...chapters.map(c => [c.name.toLowerCase(), c._id]),
    ]);
    const tpMap = Object.fromEntries([
        ...topics.map(t => [t.slug, t._id]),
        ...topics.map(t => [t.name.toLowerCase(), t._id]),
    ]);

    const all = [
        ...PHY_SCQ, ...PHY_INT,
        ...CHEM_SCQ, ...CHEM_INT,
        ...MATH_SCQ, ...MATH_INT,
    ];

    let ok = 0, fail = 0;
    const docs = [];

    for (const q of all) {
        const subjectId = subMap[q.subjectSlug];
        const chapterId = chMap[q.chapterSlug];
        const topicId = tpMap[q.topicSlug];

        if (!subjectId || !chapterId || !topicId) {
            console.warn(`  ⚠ Skipped: sub="${q.subjectSlug}" ch="${q.chapterSlug}" tp="${q.topicSlug}"`);
            fail++;
            continue;
        }

        const { subjectSlug, chapterSlug, topicSlug, ...rest } = q;

        // Auto-generate title
        const chObj = chapters.find(c => c._id.toString() === chapterId.toString());
        const tpObj = topics.find(t => t._id.toString() === topicId.toString());
        const title = [chObj?.name, tpObj?.name].filter(Boolean).join(' — ');

        docs.push({ ...rest, subjectId, chapterId, topicId, title, createdBy: adminId });
        ok++;
    }

    console.log(`📦 Prepared: ${ok} questions (${fail} skipped)`);

    if (docs.length === 0) {
        console.error('Nothing to insert!');
        process.exit(1);
    }

    const result = await Question.insertMany(docs, { ordered: false });
    console.log(`✅ Inserted ${Array.isArray(result) ? result.length : result.insertedCount || docs.length} questions`);

    const total = await Question.countDocuments({});
    console.log(`📊 Total questions in DB: ${total}`);

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
