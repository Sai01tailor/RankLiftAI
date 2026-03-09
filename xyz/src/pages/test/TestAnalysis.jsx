/**
 * TestAnalysis.jsx – Post-Test Deep Analysis Page (Module C)
 * Fixed:
 *  ✓ Options text now correctly rendered (opt.text.en, not opt directly)
 *  ✓ Answer comparison uses letter keys "A","B","C","D" matching DB schema
 *  ✓ Per-question AI explanation button (Gemini)
 *  ✓ Admin/Publisher solution shown as "Publisher's Solution" hint
 *  ✓ Better question review accordion with full answer display
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Download, Share2, Brain, Clock, CheckCircle2,
  XCircle, MinusCircle, ChevronDown, ChevronUp, ArrowLeft,
  Target, TrendingUp, Lightbulb, Sparkles, BookOpen, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { studentAPI, aiAPI } from '../../api/services';

/* ── PDF download ── */
async function downloadScorecard(el) {
  try {
    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf().set({
      margin: 0.5, filename: 'JeeWallah-Scorecard.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(el).save();
  } catch (_) { toast.error('Could not generate PDF. Try again.'); }
}

/** Format seconds → "Xm Ys" or "0m" */
function fmtSec(s) {
  if (!s) return '0m';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/**
 * Extract text from the multilingual content object.
 * Option text schema: { en: "...", hi: "..." }
 * Question content schema: { en: { text: "..." }, hi: { text: "..." } }
 */
function getText(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  // Direct .text string (option text sub-fields)
  if (typeof field.text === 'string') return field.text;
  // Localized object { en: "..." }
  for (const code of ['en', 'hi', 'gj']) {
    const v = field[code];
    if (!v) continue;
    const t = typeof v === 'string' ? v : v.text;
    if (t?.trim()) return t;
  }
  return '';
}

/** Extract option display text correctly from schema: { key, text: {en, hi}, imageUrl } */
function getOptionText(opt) {
  if (!opt) return '';
  // opt.text is { en: "...", hi: "..." }
  if (opt.text) return getText(opt.text);
  // fallback if it's a plain string somehow
  if (typeof opt === 'string') return opt;
  return '';
}

export default function TestAnalysis() {
  const { testId, attemptId } = useParams();

  const [review,    setReview]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [expanded,  setExpanded]  = useState(null);
  // Per-question AI explanation state: { [questionId]: { loading, text } }
  const [qAI, setQAI] = useState({});

  const scorecardRef = useRef(null);

  useEffect(() => {
    studentAPI.getTestReview(testId, attemptId)
      .then(({ data }) => setReview(data.data))
      .catch(() => toast.error('Could not load analysis.'))
      .finally(() => setLoading(false));
  }, [testId, attemptId]);

  /* ── Overall AI Gemini Insights ── */
  const loadAIInsight = async () => {
    if (aiInsight || aiLoading) return;
    setAiLoading(true);
    try {
      const { data } = await aiAPI.getPersonalisedFeedback({ attemptId });
      setAiInsight(data.data?.feedback || 'AI feedback not available for this attempt.');
    } catch (_) {
      setAiInsight('AI insights unavailable. This feature requires a Premium subscription.');
    } finally {
      setAiLoading(false);
    }
  };

  /* ── Per-question AI explanation ── */
  const loadQAI = async (questionId) => {
    if (qAI[questionId]?.text || qAI[questionId]?.loading) return;
    setQAI(prev => ({ ...prev, [questionId]: { loading: true, text: '' } }));
    try {
      const { data } = await aiAPI.explain({ questionId, interactionType: 'EXPLAIN_SOLUTION' });
      const text = data.data?.explanation || data.data?.text || 'Explanation not available.';
      setQAI(prev => ({ ...prev, [questionId]: { loading: false, text } }));
    } catch (_) {
      setQAI(prev => ({ ...prev, [questionId]: { loading: false, text: 'AI explanation unavailable. Please try again.' } }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 rounded-full animate-spin"
             style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="text-center p-12">
        <p style={{ color: 'var(--text-muted)' }}>Analysis not available.</p>
        <Link to="/tests" className="btn btn-primary mt-4">Back to Tests</Link>
      </div>
    );
  }

  const {
    totalMarks, maxMarks, rank, percentile,
    sections = [], questions = [],
    timeReport = {},
  } = review;

  /* ── Subject-level accuracy table ── */
  const subjectStats = sections.map((sec) => {
    const qs = sec.questions || [];
    const objective = qs.filter(q => !['INTEGER','NUMERICAL'].includes(q.type?.toUpperCase()));
    const integer   = qs.filter(q =>  ['INTEGER','NUMERICAL'].includes(q.type?.toUpperCase()));
    const count = (arr, attr) => arr.filter(q => q.userResult === attr).length;
    return {
      name: sec.name,
      objective: {
        correct: count(objective, 'correct'), incorrect: count(objective, 'incorrect'),
        unattended: count(objective, 'unattended'),
        time: objective.reduce((a, q) => a + (q.timeTaken || 0), 0),
      },
      integer: {
        correct: count(integer, 'correct'), incorrect: count(integer, 'incorrect'),
        unattended: count(integer, 'unattended'),
        time: integer.reduce((a, q) => a + (q.timeTaken || 0), 0),
      },
      totalTime: qs.reduce((a, q) => a + (q.timeTaken || 0), 0),
    };
  });

  const scorePercent = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">

      {/* Back nav */}
      <Link to="/tests" className="inline-flex items-center gap-1.5 text-sm font-medium"
            style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft size={14} /> Back to Mock Tests
      </Link>

      {/* ══════════ SCORECARD ══════════ */}
      <div className="scorecard" ref={scorecardRef}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-sm"
                   style={{ background: 'var(--gradient-brand)' }}>J</div>
              <span className="font-bold text-sm text-white opacity-80">JeeWallah</span>
            </div>
            <p className="text-xs text-white opacity-50">{review.testTitle || 'Mock Test'}</p>
          </div>
          <div className="text-right">
            {rank && (
              <div className="badge" style={{ background: 'rgba(249,115,22,0.25)', color: '#fb923c', fontSize: '0.75rem' }}>
                🏆 Rank #{rank}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 mb-6 text-center sm:text-left">
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-full h-full" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f97316" strokeWidth="10"
                      strokeDasharray="251.3" strokeDashoffset={251.3 * (1 - scorePercent / 100)}
                      strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {totalMarks}
              </span>
              <span className="text-xs text-white opacity-50">/ {maxMarks}</span>
            </div>
          </div>
          <div>
            <p className="text-4xl sm:text-5xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {scorePercent}%
            </p>
            {percentile && (
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {percentile}th percentile
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {subjectStats.map((s) => {
            const correct = s.objective.correct + s.integer.correct;
            const total = (sections.find(sec => sec.name === s.name)?.questions?.length) || 1;
            const pct = Math.round((correct / total) * 100);
            return (
              <div key={s.name} className="text-center p-3 rounded-xl"
                   style={{ background: 'rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-bold text-white opacity-60 mb-1">{s.name}</p>
                <p className="text-xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {pct}%
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{correct}/{total} correct</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Download / share */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={() => downloadScorecard(scorecardRef.current)} className="btn btn-secondary btn-sm gap-1.5">
          <Download size={13} /> Download Scorecard
        </button>
        <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!'); }}
                className="btn btn-ghost btn-sm gap-1.5">
          <Share2 size={13} /> Share Link
        </button>
      </div>

      {/* ══════════ TIME ANALYTICS ══════════ */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock size={16} style={{ color: 'var(--accent-primary)' }} />
          <h2 className="font-bold text-base" style={{ color: 'var(--text-heading)' }}>Time Analytics</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          {subjectStats.map((s) => (
            <div key={s.name} className="p-4 rounded-xl"
                 style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
              <p className="font-bold text-sm mb-2" style={{ color: 'var(--text-heading)' }}>{s.name}</p>
              <p className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--accent-primary)' }}>
                {fmtSec(s.totalTime)}
              </p>
              <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <p>Objective: <strong style={{ color: 'var(--text-secondary)' }}>{fmtSec(s.objective.time)}</strong></p>
                <p>Integer: <strong style={{ color: 'var(--text-secondary)' }}>{fmtSec(s.integer.time)}</strong></p>
              </div>
            </div>
          ))}
        </div>
        {subjectStats.length >= 1 && (
          <div className="p-4 rounded-xl text-sm" style={{ background: 'var(--accent-primary-light)', color: 'var(--text-secondary)' }}>
            {subjectStats.map((s, i) => (
              <span key={s.name}>
                You spent <strong style={{ color: 'var(--accent-primary)' }}>{fmtSec(s.totalTime)}</strong> on {s.name}
                {' '}({fmtSec(s.objective.time)} objective, {fmtSec(s.integer.time)} integer){i < subjectStats.length - 2 ? '. ' : '.'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ══════════ ACCURACY BREAKDOWN TABLE ══════════ */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <Target size={16} style={{ color: 'var(--accent-secondary)' }} />
            <h2 className="font-bold text-base" style={{ color: 'var(--text-heading)' }}>Accuracy Breakdown</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="jw-table">
            <thead>
              <tr>
                <th rowSpan={2} className="align-middle">Subject</th>
                <th colSpan={3} className="text-center border-l" style={{ borderColor: 'var(--border-subtle)', color: '#22c55e' }}>Objective</th>
                <th colSpan={3} className="text-center border-l" style={{ borderColor: 'var(--border-subtle)', color: '#6366f1' }}>Integer</th>
              </tr>
              <tr>
                {['Correct','Incorrect','Unattended','Correct','Incorrect','Unattended'].map((h, i) => (
                  <th key={`${h}-${i}`} className={i === 3 ? 'border-l' : ''}
                      style={{ borderColor: 'var(--border-subtle)', color: h === 'Correct' ? '#22c55e' : h === 'Incorrect' ? '#ef4444' : 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjectStats.map((s) => (
                <tr key={s.name}>
                  <td className="font-bold">{s.name}</td>
                  <td style={{ color: '#22c55e', fontWeight: 700, textAlign: 'center' }}>{s.objective.correct}</td>
                  <td style={{ color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>{s.objective.incorrect}</td>
                  <td style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{s.objective.unattended}</td>
                  <td style={{ color: '#22c55e', fontWeight: 700, textAlign: 'center', borderLeft: '1px solid var(--border-subtle)' }}>{s.integer.correct}</td>
                  <td style={{ color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>{s.integer.incorrect}</td>
                  <td style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{s.integer.unattended}</td>
                </tr>
              ))}
              <tr style={{ background: 'var(--bg-subtle)', fontWeight: 700 }}>
                <td>Total</td>
                {['objective','integer'].flatMap((type, ti) =>
                  ['correct','incorrect','unattended'].map((attr, i) => (
                    <td key={`${type}-${attr}`}
                        style={{
                          textAlign: 'center', fontWeight: 800,
                          borderLeft: ti === 1 && i === 0 ? '1px solid var(--border-subtle)' : 'none',
                          color: attr === 'correct' ? '#22c55e' : attr === 'incorrect' ? '#ef4444' : 'var(--text-muted)',
                        }}>
                      {subjectStats.reduce((a, s) => a + s[type][attr], 0)}
                    </td>
                  ))
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════ AI GEMINI INSIGHTS (Overall) ══════════ */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 cursor-pointer"
             onClick={loadAIInsight}
             style={{ borderBottom: aiInsight ? '1px solid var(--border-subtle)' : 'none' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-secondary-light)' }}>
              <Brain size={15} style={{ color: 'var(--accent-secondary)' }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>AI Study Insights (Gemini)</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {aiInsight ? 'Personalised analysis loaded' : 'Click to load personalised analysis & recommendations'}
              </p>
            </div>
          </div>
          {aiLoading
            ? <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-secondary)' }} />
            : <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: aiInsight ? 'rotate(180deg)' : 'none' }} />
          }
        </div>
        {aiInsight && (
          <div className="p-5">
            <div className="p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                 style={{ background: 'var(--accent-secondary-light)', color: 'var(--text-primary)' }}>
              {aiInsight}
            </div>
          </div>
        )}
      </div>

      {/* ══════════ QUESTION-BY-QUESTION REVIEW ══════════ */}
      {questions.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <BookOpen size={16} style={{ color: 'var(--accent-primary)' }} />
              <h2 className="font-bold text-base" style={{ color: 'var(--text-heading)' }}>
                Question Review ({questions.length} questions)
              </h2>
            </div>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {questions.map((q, i) => {
              const isCorrect   = q.userResult === 'correct';
              const isIncorrect = q.userResult === 'incorrect';
              const isOpen      = expanded === i;
              const qId         = q._id?.toString();
              const qAIState    = qAI[qId] || {};

              // Determine if question has publisher solution
              const publisherSolution = getText(q.solution?.en) || getText(q.solution?.hi) || getText(q.solution);
              const publisherSolutionImage = q.solution?.en?.imageUrl || q.solution?.hi?.imageUrl;

              return (
                <div key={qId || i}>
                  {/* Accordion header */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                    style={{ background: isOpen ? 'var(--bg-subtle)' : 'transparent' }}
                  >
                    <div className="flex flex-1 items-start sm:items-center gap-3 min-w-0 pr-4">
                      <div className="flex-shrink-0">
                        {isCorrect ? (
                          <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
                        ) : isIncorrect ? (
                          <XCircle size={18} style={{ color: '#ef4444' }} />
                        ) : (
                          <MinusCircle size={18} style={{ color: 'var(--text-muted)' }} />
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-semibold truncate break-all sm:break-normal whitespace-pre-wrap sm:whitespace-nowrap leading-snug" style={{ color: 'var(--text-primary)' }}>
                          Q.{i + 1} — {q.subject || ''} <span className="hidden sm:inline">·</span> <br className="sm:hidden" /> <span className="badge badge-gray inline-block mt-1 sm:mt-0">{q.type}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span>⏱ {fmtSec(q.timeTaken)}</span>
                          {q.marksAwarded !== undefined && (
                            <span style={{ color: q.marksAwarded > 0 ? '#22c55e' : q.marksAwarded < 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: 700 }}>
                              {q.marksAwarded > 0 ? '+' : ''}{q.marksAwarded} marks
                            </span>
                          )}
                          {q.stats?.accuracyRate != null && (
                            <span>Overall accuracy: {q.stats.accuracyRate}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp size={14} style={{ flexShrink: 0 }} /> : <ChevronDown size={14} style={{ flexShrink: 0 }} />}
                  </button>

                  {/* Accordion body */}
                  {isOpen && (
                    <div className="px-5 pb-6 pt-3" style={{ background: 'var(--bg-subtle)' }}>

                      {/* Question content */}
                      <div className="text-sm mb-4 p-3 rounded-lg leading-relaxed"
                           style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                           dangerouslySetInnerHTML={{ __html: getText(q.content) || '' }} />

                      {/* ── SCQ / MCQ Options ── */}
                      {q.options?.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {q.options.map((opt, oi) => {
                            const key = opt.key || String.fromCharCode(65 + oi); // "A","B","C","D"
                            const isUserAns    = Array.isArray(q.userAnswer) ? q.userAnswer.includes(key) : q.userAnswer === key;
                            const isCorrectAns = Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(key) : q.correctAnswer === key;
                            const optText = getOptionText(opt);

                            let bg = 'transparent';
                            let borderColor = 'var(--border-subtle)';
                            let labelColor = 'var(--text-muted)';

                            if (isCorrectAns) {
                              bg = '#dcfce7';
                              borderColor = '#22c55e';
                              labelColor = '#15803d';
                            } else if (isUserAns && !isCorrectAns) {
                              bg = '#fee2e2';
                              borderColor = '#ef4444';
                              labelColor = '#dc2626';
                            }

                            return (
                              <div key={oi}
                                   className="flex items-start gap-3 p-3 rounded-lg text-sm"
                                   style={{ background: bg, border: `1.5px solid ${borderColor}` }}>
                                <span className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black"
                                      style={{ background: isCorrectAns ? '#22c55e' : isUserAns ? '#ef4444' : 'var(--bg-subtle)', color: isCorrectAns || isUserAns ? '#fff' : 'var(--text-secondary)' }}>
                                  {key}
                                </span>
                                <span style={{ color: 'var(--text-primary)', flex: 1 }}
                                      dangerouslySetInnerHTML={{ __html: optText || `Option ${key}` }} />
                                {isCorrectAns && (
                                  <span className="text-xs font-bold flex-shrink-0" style={{ color: '#15803d' }}>✓ Correct</span>
                                )}
                                {isUserAns && !isCorrectAns && (
                                  <span className="text-xs font-bold flex-shrink-0" style={{ color: '#dc2626' }}>✗ Your answer</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Integer / Numerical answer display ── */}
                      {['INTEGER','NUMERICAL'].includes(q.type?.toUpperCase()) && (
                        <div className="flex items-center gap-4 mb-4 p-3 rounded-lg text-sm"
                             style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Your Answer: </span>
                            <strong style={{ color: isCorrect ? '#22c55e' : '#ef4444', fontSize: '1.1em' }}>
                              {q.userAnswer != null ? q.userAnswer : '—'}
                            </strong>
                          </div>
                          {!isCorrect && (
                            <div>
                              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Correct: </span>
                              <strong style={{ color: '#22c55e', fontSize: '1.1em' }}>{q.correctAnswer}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Per-question stats row ── */}
                      {q.stats && (
                        <div className="flex flex-wrap gap-3 mb-4">
                          {[
                            { icon: Clock, label: 'Avg Speed', val: fmtSec(q.stats.avgTimeSpent || 0) },
                            { icon: Target, label: 'Accuracy', val: `${q.stats.accuracyRate || 0}%` },
                            { icon: TrendingUp, label: 'Correct / Attempts', val: `${q.stats.correctAttempts || 0} / ${q.stats.totalAttempts || 0}` },
                          ].map(({ icon: Icon, label, val }) => (
                            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                                 style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                              <Icon size={11} style={{ color: 'var(--accent-primary)' }} />
                              <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
                              <span style={{ fontWeight: 700 }}>{val}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ── Solution / Hint section ── */}
                      <div className="space-y-3">

                        {/* Publisher's Solution (admin-provided) */}
                        {(publisherSolution || publisherSolutionImage) && (
                          <div className="p-4 rounded-xl"
                               style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <Lightbulb size={14} style={{ color: '#15803d' }} />
                              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#15803d' }}>
                                Publisher's Solution
                              </span>
                            </div>
                            {publisherSolution && (
                              <div className="text-sm leading-relaxed" style={{ color: '#166534' }}
                                   dangerouslySetInnerHTML={{ __html: publisherSolution }} />
                            )}
                            {publisherSolutionImage && (
                              <img src={publisherSolutionImage} alt="Solution" className="mt-2 rounded-lg max-w-full" />
                            )}
                          </div>
                        )}

                        {/* AI Explanation button */}
                        {qId && (
                          <div>
                            {!qAIState.text && !qAIState.loading && (
                              <button
                                onClick={() => loadQAI(qId)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                                style={{
                                  background: 'var(--accent-secondary-light)',
                                  color: 'var(--accent-secondary)',
                                  border: '1.5px solid var(--accent-secondary)',
                                }}
                              >
                                <Sparkles size={14} />
                                Get AI Step-by-Step Solution
                              </button>
                            )}
                            {qAIState.loading && (
                              <div className="flex items-center gap-2 px-4 py-2 text-sm"
                                   style={{ color: 'var(--accent-secondary)' }}>
                                <Loader2 size={14} className="animate-spin" />
                                Generating AI solution...
                              </div>
                            )}
                            {qAIState.text && (
                              <div className="p-4 rounded-xl"
                                   style={{ background: 'var(--accent-secondary-light)', border: '1.5px solid var(--accent-secondary)' }}>
                                <div className="flex items-center gap-2 mb-2">
                                  <Sparkles size={14} style={{ color: 'var(--accent-secondary)' }} />
                                  <span className="text-xs font-bold uppercase tracking-wide"
                                        style={{ color: 'var(--accent-secondary)' }}>AI Solution (Gemini)</span>
                                </div>
                                <div className="text-sm leading-relaxed whitespace-pre-wrap"
                                     style={{ color: 'var(--text-primary)' }}>
                                  {qAIState.text}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
