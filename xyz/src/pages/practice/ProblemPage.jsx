/**
 * ProblemPage.jsx – Problem-Specific Page (Module D)
 * ─────────────────────────────────────────────────────────────────────────────
 * Features (per spec):
 *  • Social proof widget: "Solved by X | Avg time: Y mins"
 *  • Mark for Revision (bookmark) button
 *  • "Add Notes" panel (personal notes saved to backend)
 *  • Single/Multi/Integer answer input
 *  • AI Explanation button (calls Gemini via /ai/explain)
 *  • Submit with feedback (correct / incorrect / skip)
 *
 * Static page – no Framer Motion.
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Bookmark, BookmarkCheck, Brain, Send, ChevronDown,
  ChevronUp, Clock, Users, CheckCircle2, XCircle,
  StickyNote, AlignLeft, Lightbulb, ArrowLeft, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Globe2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { studentAPI, aiAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

export default function ProblemPage() {
  const { id } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user } = useAuth();
  const { activeLang, setActiveLang, getAvailableLangs } = useLang();

  // Local lang override per problem session (defaults to context lang)
  const [lang, setLang] = useState(activeLang);
  const problemIds = location.state?.problemIds || [];
  const currentIdx = problemIds.indexOf(id);
  const prevId = currentIdx > 0 ? problemIds[currentIdx - 1] : null;
  const nextId = currentIdx >= 0 && currentIdx < problemIds.length - 1 ? problemIds[currentIdx + 1] : null;

  const [question,    setQuestion]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState([]); // array of selected option indices
  const [intAnswer,   setIntAnswer]   = useState(''); // for integer-type answers
  const [submitted,   setSubmitted]   = useState(false);
  const [result,      setResult]      = useState(null); // { correct, explanation }
  const [submitting,  setSubmitting]  = useState(false);
  const [bookmarked,  setBookmarked]  = useState(false);
  const [notesOpen,   setNotesOpen]   = useState(false);
  const [noteText,    setNoteText]    = useState('');
  const [savingNote,  setSavingNote]  = useState(false);
  const [aiExplain,   setAiExplain]   = useState(null);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [timeSpent,   setTimeSpent]   = useState(0);

  useEffect(() => {
    let timer;
    if (!submitted && !loading) {
      timer = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [submitted, loading]);

  useEffect(() => {
    setLoading(true);
    studentAPI.getQuestion(id)
      .then(({ data }) => {
        // Backend returns { question: {...} } or the object directly
        const q = data.data?.question || data.data;
        setQuestion(q);
        setBookmarked(q.isBookmarked || false);
        setNoteText(q.userNote || '');
      })
      .catch(() => toast.error('Failed to load question.'))
      .finally(() => setLoading(false));
  }, [id]);

  /** Extract displayable text — language-aware with fallback */
  const getText = (field) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (typeof field.text === 'string') return field.text;
    // Try lang → en → hi fallback
    for (const code of [lang, 'en', 'hi']) {
      const v = field[code];
      if (!v) continue;
      const t = typeof v === 'string' ? v : v.text;
      if (t?.trim()) return t;
    }
    return '';
  };

  /** Get question body — tries selected lang first */
  const getQuestionText = (q) => {
    if (!q || !q.content) return getText(q?.question) || '';
    const langVariant = q.content[lang] || q.content.en || q.content.hi || q.content;
    const text = getText(langVariant);
    return text || getText(q.content.en) || getText(q.content.hi) || '';
  };

  /** Get option text — tries selected lang first */
  const getOptionText = (opt) => {
    if (!opt) return '';
    if (!opt.text) return getText(opt) || '';
    if (typeof opt.text === 'string') return opt.text;
    return opt.text[lang] || opt.text.en || opt.text.hi || '';
  };

  // Sync context lang if user switches here
  const handleLangChange = (code) => {
    setLang(code);
    setActiveLang(code);
  };

  // Available language tabs — only show langs this question actually has content for
  const availableLangs = question ? getAvailableLangs(question.examCategory, question) : [];


  const toggleOption = (idx) => {
    if (submitted) return;
    const isSCQ = question?.type === 'SCQ';
    if (isSCQ) {
      setSelected([idx]);
    } else {
      setSelected((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
      );
    }
  };

  const handleSubmit = async () => {
    if (submitted) return;
    // Schema uses uppercase: INTEGER, NUMERICAL
    const isInteger = ['INTEGER', 'NUMERICAL', 'Integer', 'Numerical'].includes(question?.type);
    if (!isInteger && selected.length === 0) {
      toast.error('Please select an option first.');
      return;
    }
    if (isInteger && !intAnswer) {
      toast.error('Please enter your answer.');
      return;
    }

    setSubmitting(true);
    try {
      // Convert selected indices (0,1,2,3) → option keys (A,B,C,D)
      const selectedOptionKeys = selected.map(i => String.fromCharCode(65 + i));

      const payload = {
        questionId: id,
        selectedOptions: isInteger ? [] : selectedOptionKeys,
        numericAnswer:   isInteger ? parseFloat(intAnswer) : undefined,
        isAttempted:     true,
        timeSpent:       timeSpent,
      };
      const { data } = await studentAPI.submitPractice(payload);
      // Backend returns { attempt: { isCorrect, marksAwarded, correctAnswer, solution } }
      const attemptResult = data.data?.attempt || data.data;
      // Map correctAnswer.optionKeys ['A','B','C','D'] back to indices [0,1,2,3]
      // so the option highlight logic (which uses indices) works correctly
      const correctIndices = (attemptResult?.correctAnswer?.optionKeys || [])
        .map(k => k.charCodeAt(0) - 65); // 'A'→0, 'B'→1 etc.
      setResult({ ...attemptResult, correctOptions: correctIndices });
      if (attemptResult?.updatedStats) {
        setQuestion(prev => ({
          ...prev,
          ...attemptResult.updatedStats
        }));
      }
      setSubmitted(true);
    } catch (err) {
      toast.error('Submission failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };


  const handleBookmark = async () => {
    try {
      // POST /student/questions/:questionId/bookmark — toggle on backend
      await studentAPI.bookmarkQuestion(id);
      const next = !bookmarked;
      setBookmarked(next);
      toast.success(next ? 'Marked for revision ✓' : 'Removed from bookmarks');
    } catch (_) {
      toast.error('Could not update bookmark.');
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await studentAPI.addNote(id, noteText);
      toast.success('Note saved!');
      setNotesOpen(false);
    } catch (_) {
      toast.error('Failed to save note.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleAIExplain = async () => {
    if (aiExplain) { setAiExplain(null); return; }
    setAiLoading(true);
    try {
      const { data } = await aiAPI.explain({ questionId: id, interactionType: 'EXPLAIN_SOLUTION' });
      setAiExplain(data.data?.explanation || 'No explanation available.');
    } catch (_) {
      toast.error('AI explanation unavailable. Check your plan.');
    } finally {
      setAiLoading(false);
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

  if (!question) {
    return (
      <div className="text-center p-12">
        <p style={{ color: 'var(--text-muted)' }}>Question not found.</p>
      </div>
    );
  }

  // Schema stores types as uppercase: INTEGER, NUMERICAL
  const isInteger = ['INTEGER', 'NUMERICAL', 'Integer', 'Numerical'].includes(question.type);
  const isMCQ     = question.type === 'MCQ';
  const diff      = question.difficulty;
  const diffColor = diff === 'Easy' ? '#22c55e' : diff === 'Hard' ? '#ef4444' : '#f59e0b';

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Back + Prev/Next nav ── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost btn-sm gap-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={14} /> Back to Problem Set
        </button>
        <div className="flex items-center gap-2">
          {prevId && (
            <Link
              to={`/problems/${prevId}`}
              state={{ problemIds }}
              className="btn btn-secondary btn-sm gap-1"
            >
              <ChevronLeftIcon size={14} /> Prev
            </Link>
          )}
          {currentIdx >= 0 && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {currentIdx + 1} / {problemIds.length}
            </span>
          )}
          {nextId && (
            <Link
              to={`/problems/${nextId}`}
              state={{ problemIds }}
              className="btn btn-secondary btn-sm gap-1"
            >
              Next <ChevronRightIcon size={14} />
            </Link>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Main question area ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Question header */}
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge" style={{ background: diffColor + '18', color: diffColor }}>
                  {question.difficulty}
                </span>
                <span className="badge badge-gray">{question.type}</span>
                <span className="badge badge-indigo">{question.subject?.name}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Language Switcher – tabs style */}
                <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
                  {availableLangs.map(({ code, name, label }) => (
                    <button
                      key={code}
                      title={label}
                      onClick={() => handleLangChange(code)}
                      className="px-2 py-0.5 rounded-md text-xs font-bold transition-all"
                      style={{
                        background: lang === code ? 'var(--accent-primary)' : 'transparent',
                        color: lang === code ? '#fff' : 'var(--text-muted)',
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                {/* Bookmark */}
                <button
                  onClick={handleBookmark}
                  className="btn btn-ghost btn-sm gap-1.5"
                  style={{ color: bookmarked ? '#f97316' : 'var(--text-muted)' }}
                  title={bookmarked ? 'Remove from revision list' : 'Mark for revision'}
                >
                  {bookmarked
                    ? <BookmarkCheck size={14} style={{ fill: '#f97316', color: '#f97316' }} />
                    : <Bookmark size={14} />
                  }
                  {bookmarked ? 'Saved' : 'Revise Later'}
                </button>

                {/* Notes */}
                <button
                  onClick={() => setNotesOpen(!notesOpen)}
                  className="btn btn-ghost btn-sm gap-1.5"
                  style={{ color: noteText ? '#6366f1' : 'var(--text-muted)' }}
                >
                  <StickyNote size={14} /> Notes
                </button>
              </div>
            </div>

            {/* Question content — content.en.text is the actual text */}
            <div
              className="text-base leading-relaxed mb-1"
              style={{ color: 'var(--text-primary)' }}
              dangerouslySetInnerHTML={{ __html: getQuestionText(question) }}
            />

            {/* Chapter / Topic breadcrumb */}
            <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
              {question.chapter?.name} → {question.topic?.name}
            </p>
          </div>

          {/* Notes panel */}
          {notesOpen && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <StickyNote size={14} style={{ color: '#6366f1' }} />
                <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>
                  My Notes
                </p>
              </div>
              <textarea
                className="input resize-none w-full"
                rows={4}
                placeholder="Add your notes, mnemonics, or reminders about this problem…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={handleSaveNote} disabled={savingNote}
                        className="btn btn-primary btn-sm gap-1.5">
                  <Send size={12} /> {savingNote ? 'Saving…' : 'Save Note'}
                </button>
                <button onClick={() => setNotesOpen(false)} className="btn btn-ghost btn-sm">
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Options */}
          {!isInteger ? (
            <div className="card p-5 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider mb-3"
                 style={{ color: 'var(--text-muted)' }}>
                {isMCQ ? 'Select all that apply' : 'Choose one answer'}
              </p>
              {question.options?.map((opt, i) => {
                const isSelected = selected.includes(i);
                const isCorrect  = submitted && result?.correctOptions?.includes(i);
                const isWrong    = submitted && isSelected && !isCorrect;

                return (
                  <button
                    key={i}
                    onClick={() => toggleOption(i)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                    style={{
                      border: `2px solid ${
                        isCorrect ? '#22c55e' : isWrong ? '#ef4444' : isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'
                      }`,
                      background: isCorrect ? '#dcfce7' : isWrong ? '#fee2e2' : isSelected ? 'var(--accent-primary-light)' : 'var(--bg-subtle)',
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs"
                      style={{
                        background: isCorrect ? '#22c55e' : isWrong ? '#ef4444' : isSelected ? 'var(--accent-primary)' : 'var(--border-default)',
                        color: isSelected || isCorrect || isWrong ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}
                          dangerouslySetInnerHTML={{ __html: getOptionText(opt) || `Option ${String.fromCharCode(65 + i)}` }} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wider mb-3"
                 style={{ color: 'var(--text-muted)' }}>Enter your answer</p>
              <input
                type="number"
                className="input text-xl font-bold w-full max-w-xs"
                placeholder="Enter integer value"
                value={intAnswer}
                onChange={(e) => setIntAnswer(e.target.value)}
                disabled={submitted}
              />
              {submitted && (() => {
                // Backend: { isCorrect, correctAnswer: { numericValue, optionKeys } }
                const correctVal = result?.correctAnswer?.numericValue ?? result?.correctAnswer;
                return (
                  <p className="mt-2 text-sm font-semibold"
                     style={{ color: result?.isCorrect ? '#22c55e' : '#ef4444' }}>
                    {result?.isCorrect
                      ? `✓ Correct! Answer: ${correctVal}`
                      : `✗ Incorrect. Correct answer: ${correctVal}`}
                  </p>
                );
              })()}
            </div>
          )}

          {/* Submit / Result */}
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-primary btn-lg w-full gap-2"
            >
              <Send size={15} /> {submitting ? 'Submitting…' : 'Submit Answer'}
            </button>
          ) : (
            <div
              className="p-4 rounded-xl flex items-center gap-3"
              style={{
                background: result?.isCorrect ? '#dcfce7' : '#fee2e2',
                border: `1px solid ${result?.isCorrect ? '#86efac' : '#fca5a5'}`,
              }}
            >
              {result?.isCorrect
                ? <CheckCircle2 size={20} style={{ color: '#22c55e' }} />
                : <XCircle size={20} style={{ color: '#ef4444' }} />}
              <div>
                <p className="font-bold text-sm"
                   style={{ color: result?.isCorrect ? '#15803d' : '#dc2626' }}>
                  {result?.isCorrect
                    ? `Correct! +${result.marksAwarded ?? 4} marks`
                    : `Incorrect. ${result.marksAwarded ?? -1} marks`}
                </p>
                {!result?.isCorrect && (
                  <p className="text-xs mt-0.5" style={{ color: '#7f1d1d' }}>
                    Correct answer:{' '}
                    {result?.correctAnswer?.optionKeys?.join(', ')
                      || result?.correctAnswer?.numericValue
                      || '—'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* AI Explanation */}
          {(submitted || true) && (
            <div className="card overflow-hidden">
              <button
                onClick={handleAIExplain}
                className="flex items-center justify-between w-full p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <Brain size={16} style={{ color: '#6366f1' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>
                    AI Explanation (Gemini)
                  </span>
                </div>
                {aiLoading ? (
                  <div className="w-4 h-4 border-2 rounded-full animate-spin"
                       style={{ borderColor: 'var(--border-subtle)', borderTopColor: '#6366f1' }} />
                ) : (
                  aiExplain ? <ChevronUp size={15} /> : <ChevronDown size={15} />
                )}
              </button>
              {aiExplain && (
                <div className="px-4 pb-4">
                  <div
                    className="p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ background: 'var(--accent-secondary-light)', color: 'var(--text-primary)' }}
                  >
                    {aiExplain}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">

          {/* Social proof widget (Module D requirement) */}
          <div className="card p-4">
            <p className="text-xs font-bold uppercase tracking-wider mb-3"
               style={{ color: 'var(--text-muted)' }}>Problem Stats</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users size={14} style={{ color: 'var(--accent-success)' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                    {question.solvedByCount?.toLocaleString() || 0} students
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>solved this problem</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} style={{ color: '#f59e0b' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                    {question.avgTimeTaken ? (question.avgTimeTaken < 60 ? `${Math.round(question.avgTimeTaken)} sec` : `${Math.round(question.avgTimeTaken / 60)} min`) : '—'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>average time</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} style={{ color: '#3b82f6' }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                    {question.accuracy ? `${Math.round(question.accuracy)}%` : '—'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>accuracy rate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick info */}
          <div className="card p-4 space-y-2 text-sm">
            <p className="text-xs font-bold uppercase tracking-wider mb-2"
               style={{ color: 'var(--text-muted)' }}>Details</p>
            {[
              { k: 'Subject',    v: question.subject?.name },
              { k: 'Chapter',    v: question.chapter?.name },
              { k: 'Topic',      v: question.topic?.name },
              { k: 'Marks',      v: question.marksDisplay || `+${question.marks?.correct ?? 4} / ${question.marks?.incorrect ?? -1}` },
              { k: 'Source',     v: question.source || 'JEE Practice' },
            ].map(({ k, v }) => v && (
              <div key={k} className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Hint / Solution note */}
          {question.hint && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={14} style={{ color: '#f59e0b' }} />
                <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>Hint</p>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{question.hint}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
