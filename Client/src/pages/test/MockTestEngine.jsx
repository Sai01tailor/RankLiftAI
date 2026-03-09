/**
 * MockTestEngine.jsx – NTA CBT Mock Test Interface (Module B)
 * ─────────────────────────────────────────────────────────────────────────────
 * A PIXEL-PERFECT replica of the actual NTA JEE computer-based test portal.
 *
 * Features implemented (per spec):
 *  ✓ Full-screen layout (no sidebar / topbar – uses its own layout)
 *  ✓ Countdown timer with warning (10 min = yellow, 5 min = red)
 *  ✓ Section tabs: Physics / Chemistry / Mathematics
 *  ✓ Question palette with all 5 NTA status colors
 *  ✓ Back / Save & Next / Mark for Review & Next / Clear Response buttons
 *  ✓ Auto-save every 30 seconds to backend
 *  ✓ Tab-switch detection with warning modals
 *  ✓ Anti-cheating: right-click disabled, copy/cut/print blocked
 *  ✓ Submit confirmation modal with per-section summary
 *  ✓ Auto-submit on timer expiry
 *  ✓ Tracks time spent per question (for post-test analysis)
 *  ✓ Mobile: collapsible question palette drawer
 *
 * No Framer Motion (static exam interface per spec).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock, ChevronLeft, ChevronRight, Send, Menu, X,
  AlertTriangle, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { studentAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

/* ── Question status constants (matches NTA color codes) ── */
const STATUS = {
  NOT_VISITED:     0,  // Gray
  NOT_ANSWERED:    1,  // Red
  ANSWERED:        2,  // Green
  MARKED:          3,  // Purple
  MARKED_ANSWERED: 4,  // Purple with green border
};

const STATUS_CLASS = {
  0: 'q-not-visited',
  1: 'q-not-answered',
  2: 'q-answered',
  3: 'q-marked',
  4: 'q-marked-answered',
};

const STATUS_LABEL = {
  0: 'Not Visited',
  1: 'Not Answered',
  2: 'Answered',
  3: 'Marked for Review',
  4: 'Answered & Marked',
};

/** Format seconds as HH:MM:SS */
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function MockTestEngine() {
  const { testId }  = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const { activeLang, setActiveLang, getAvailableLangs } = useLang();
  const [lang, setLang] = useState(activeLang);

  /* ── Test data ── */
  const [test,      setTest]      = useState(null);
  const [sections,  setSections]  = useState([]); // [{ name, questions }]
  const [loading,   setLoading]   = useState(true);
  const [attemptId, setAttemptId] = useState(null);

  /* ── Navigation state ── */
  const [sectionIdx, setSectionIdx] = useState(0);
  const [qIdx,       setQIdx]       = useState(0);

  /* ── Per-question state maps (keyed by questionId) ── */
  const [answers,    setAnswers]   = useState({});  // { qId: selectedIndex | integerValue | [indices] }
  const [statuses,   setStatuses]  = useState({});  // { qId: STATUS number }
  const [timePerQ,   setTimePerQ]  = useState({});  // { qId: seconds spent }

  /* ── Timer ── */
  const [timeLeft,  setTimeLeft]  = useState(0);    // seconds
  const timerRef    = useRef(null);
  const qTimerRef   = useRef(null);   // time per question tracker
  const qTimeStart  = useRef(null);   // when current question was opened

  /* ── UI state ── */
  const [showInstructions, setShowInstructions] = useState(true);
  const [instructionsAgreed, setInstructionsAgreed] = useState(false);
  const [paletteOpen,  setPaletteOpen]  = useState(false);  // mobile drawer
  const [submitModal,  setSubmitModal]  = useState(false);
  const [tabCount,     setTabCount]     = useState(0);
  const [tabWarning,   setTabWarning]   = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ref to always have current attemptId available in closures (timer, tab-switch)
  const attemptIdRef = useRef(null);

  const getText = useCallback((field) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (typeof field.text === 'string') return field.text;
    // Try active lang → en → hi in order
    for (const code of [lang, 'en', 'hi']) {
      const v = field[code];
      if (!v) continue;
      const t = typeof v === 'string' ? v : v.text;
      if (t?.trim()) return t;
    }
    return '';
  }, [lang]);

  const getQuestionText = useCallback((q) => {
    if (!q) return '';
    if (q.content) {
      const v = q.content[lang] || q.content.en || q.content.hi || q.content;
      return getText(v) || getText(q.content.en) || getText(q.content.hi) || 'Question content not available.';
    }
    return getText(q.question) || 'Question content not available.';
  }, [getText, lang]);

  // Available lang tabs depend on TEST category AND current question's available translations
  const testExamCategory = test?.examType?.includes('Advanced') ? 'JEE Advanced' : 'JEE Main';
  // Re-compute every time currentQuestion changes (defined below, so we use a lazy compute)
  const handleLangChange = (code) => {
    setLang(code);
    setActiveLang(code);
  };

  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center" style={{ background: 'var(--bg-base)' }}>
        <AlertTriangle size={64} className="mb-6 text-yellow-500" />
        <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Desktop Required</h1>
        <p className="mb-8 max-w-sm" style={{ color: 'var(--text-muted)' }}>
          Mock tests are designed exclusively for desktop/laptop screens to simulate the real JEE environment. Please switch to a larger device.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={() => window.open(`/test/${testId}/pdf`, '_blank')} className="btn btn-primary gap-2 w-full justify-center">
             Download PDF Instead
          </button>
          <button onClick={() => navigate('/tests')} className="btn btn-secondary w-full justify-center">
             Back to Tests
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────────────── LOAD TEST ─────────────────────── */
  useEffect(() => {
    // Only fetch basic test info while on instructions screen
    const fetchInfo = async () => {
        try {
            const { data } = await studentAPI.getTestById(testId);
            setTest(data.data.test || data.data);
            setLoading(false);
        } catch(e) { /* fallback to mocktest defaults */ setLoading(false); }
    };
    if (showInstructions) {
        fetchInfo();
    }
  }, [testId, showInstructions]);

  const handleStartTest = async () => {
    if (!instructionsAgreed) {
        toast.error('Please accept the declaration to proceed.');
        return;
    }
    setLoading(true);
    try {
      const { data } = await studentAPI.startTest(testId);
      const payload = data.data;

      // Backend returns: { attempt: {...}, mockTest: { sections: [...with questions] } }
      const attempt  = payload.attempt  || payload;
      const mockTest = payload.mockTest || payload.testDetails || {};

      setAttemptId(attempt.id || attempt._id || attempt.attemptId);
      attemptIdRef.current = attempt.id || attempt._id || attempt.attemptId;
      setTest(mockTest);

      // Sections come from mockTest.sections with questions embedded
      const loadedSections = mockTest.sections || [];
      setSections(loadedSections);

      // Set timer: prefer remainingTime from server, fallback to full duration
      const remaining = attempt.remainingTime ?? (mockTest.duration || 180) * 60;
      setTimeLeft(remaining);

      // Initialise status for every question
      const initStatuses = {};
      loadedSections.forEach((sec) => {
        sec.questions?.forEach((q) => {
          const qId = (q._id || q.questionId)?.toString();
          if (qId) initStatuses[qId] = STATUS.NOT_VISITED;
        });
      });

      // If resuming, restore saved answers from responses
      if (attempt.responses?.length) {
        const savedAnswers = {};
        attempt.responses.forEach((r) => {
          const qId = (r.questionId?._id || r.questionId)?.toString();
          if (!qId) return;
          if (r.selectedOptions?.length) savedAnswers[qId] = r.selectedOptions;
          if (r.numericAnswer != null) savedAnswers[qId] = r.numericAnswer;
          if (savedAnswers[qId] !== undefined) initStatuses[qId] = STATUS.ANSWERED;
        });
        setAnswers(savedAnswers);
      }

      setStatuses(initStatuses);
      setShowInstructions(false);
    } catch (err) {
      console.error('startTest error:', err);
      toast.error('Failed to start test. Please try again.');
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────── COUNTDOWN TIMER ─────────────────────── */
  useEffect(() => {
    if (timeLeft <= 0 || loading) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        if (prev === 300) toast('⚠️ 5 minutes remaining!', { icon: '⏰' });
        if (prev === 600) toast('10 minutes remaining', { icon: '⏱️' });
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading]);

  /* ─────────────────────── PER-QUESTION TIMER ─────────────────────── */
  const recordQTime = useCallback(() => {
    if (!qTimeStart.current) return;
    const elapsed = Math.round((Date.now() - qTimeStart.current) / 1000);
    const curQ = sections[sectionIdx]?.questions?.[qIdx];
    if (curQ) {
      setTimePerQ((prev) => ({
        ...prev,
        [curQ._id]: (prev[curQ._id] || 0) + elapsed,
      }));
    }
    qTimeStart.current = Date.now();
  }, [sections, sectionIdx, qIdx]);

  // Reset Q timer when question changes
  useEffect(() => {
    qTimeStart.current = Date.now();
    // Mark question as visited (NOT_VISITED → NOT_ANSWERED)
    const curQ = sections[sectionIdx]?.questions?.[qIdx];
    if (curQ && statuses[curQ._id] === STATUS.NOT_VISITED) {
      setStatuses((prev) => ({ ...prev, [curQ._id]: STATUS.NOT_ANSWERED }));
    }
  }, [sectionIdx, qIdx]);

  /* ─────────────────────── HELPER: BUILD RESPONSES ─────────────────────── */
  // Convert numeric option index (0,1,2,3) → letter key ("A","B","C","D")
  const idxToKey = (idx) => String.fromCharCode(65 + Number(idx));

  const buildResponsesPayload = useCallback(() => {
    const payloads = [];
    sections.forEach((sec, sIdx) => {
      sec.questions?.forEach((q) => {
        const ans = answers[q._id];
        const qType = (q.type || '').toUpperCase();
        const isNumericType = qType === 'INTEGER' || qType === 'NUMERICAL';

        // For MCQ/SCQ: ans is a number (index) or array of numbers
        // Convert to letter keys the backend expects: "A", "B", "C", "D"
        let selectedOptions = [];
        let numericAnswer = null;

        if (ans !== undefined && ans !== '') {
          if (isNumericType) {
            // Integer/Numerical: send as numericAnswer
            numericAnswer = Number(ans);
          } else if (Array.isArray(ans)) {
            // MCQ: array of indices → array of letter keys
            selectedOptions = ans.map(idxToKey);
          } else if (typeof ans === 'number' || (typeof ans === 'string' && !isNaN(Number(ans)))) {
            // SCQ: single index → single letter key
            selectedOptions = [idxToKey(ans)];
          } else if (typeof ans === 'string' && ['A','B','C','D'].includes(ans)) {
            // Already a letter (resume case)
            selectedOptions = [ans];
          }
        }

        // map status enum
        let mappedStatus = "NOT_VISITED";
        if (statuses[q._id] === STATUS.NOT_ANSWERED) mappedStatus = "NOT_ANSWERED";
        if (statuses[q._id] === STATUS.ANSWERED) mappedStatus = "ANSWERED";
        if (statuses[q._id] === STATUS.MARKED) mappedStatus = "MARKED_FOR_REVIEW";
        if (statuses[q._id] === STATUS.MARKED_ANSWERED) mappedStatus = "ANSWERED_AND_MARKED";

        const isAttempted = [STATUS.ANSWERED, STATUS.MARKED_ANSWERED].includes(statuses[q._id]);

        payloads.push({
          questionId: q._id,
          sectionIndex: sIdx,
          selectedOptions,
          numericAnswer,
          isAttempted,
          status: mappedStatus,
          timeSpent: timePerQ[q._id] || 0
        });
      });
    });
    return payloads;
  }, [sections, answers, statuses, timePerQ]);

  /* ─────────────────────── AUTO-SAVE every 30s ─────────────────────── */
  useEffect(() => {
    if (!attemptId) return;
    const interval = setInterval(async () => {
      try {
        await studentAPI.saveTestProgress(testId, {
          attemptId,
          responses: buildResponsesPayload(),
          tabSwitchCount: tabCount,
        });
      } catch (_) { /* silent fail — don't distract student */ }
    }, 30000);
    return () => clearInterval(interval);
  }, [attemptId, buildResponsesPayload, testId, tabCount]);

  /* ─────────────────────── ANTI-CHEATING ─────────────────────── */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setTabCount((c) => {
          const next = c + 1;
          if (next >= 5) handleAutoSubmit();
          else if (next >= 3) setTabWarning(true);
          return next;
        });
      }
    };
    const prevent = (e) => e.preventDefault();

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    document.addEventListener('cut', prevent);
    const keyHandler = (e) => {
      const banned = ['PrintScreen', 'F12'];
      if (banned.includes(e.key) || (e.ctrlKey && ['s','u','p'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', keyHandler);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('copy', prevent);
      document.removeEventListener('cut', prevent);
      document.removeEventListener('keydown', keyHandler);
    };
  }, []);

  /* ─────────────────────── NAVIGATION HELPERS ─────────────────────── */
  const currentSection   = sections[sectionIdx] || { name: '', questions: [] };
  const currentQuestion  = currentSection.questions?.[qIdx] || null;
  const totalQ           = currentSection.questions?.length || 0;

  // Language tabs: only show langs that have actual content for this question
  const availableLangs = getAvailableLangs(testExamCategory, currentQuestion);

  // Auto-fallback: if current lang has no content for this question, switch to EN
  useEffect(() => {
    if (!currentQuestion) return;
    const isAvailable = availableLangs.some(l => l.code === lang);
    if (!isAvailable) handleLangChange('en');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?._id]);

  const goToQ = (secIdx, qIndex) => {
    recordQTime();
    setSectionIdx(secIdx);
    setQIdx(qIndex);
  };

  const saveAndNext = () => {
    if (!currentQuestion) return;
    const ans = answers[currentQuestion._id];
    const hasAns = ans !== undefined && ans !== '' && (Array.isArray(ans) ? ans.length > 0 : true);

    if (hasAns) {
      setStatuses((prev) => ({
        ...prev,
        [currentQuestion._id]: STATUS.ANSWERED,
      }));
    }

    // Navigate to next question
    recordQTime();
    if (qIdx < totalQ - 1) {
      setQIdx(qIdx + 1);
    } else if (sectionIdx < sections.length - 1) {
      setSectionIdx(sectionIdx + 1);
      setQIdx(0);
    }
  };

  const markForReview = () => {
    if (!currentQuestion) return;
    const ans = answers[currentQuestion._id];
    const hasAns = ans !== undefined && ans !== '' && (Array.isArray(ans) ? ans.length > 0 : true);

    setStatuses((prev) => ({
      ...prev,
      [currentQuestion._id]: hasAns ? STATUS.MARKED_ANSWERED : STATUS.MARKED,
    }));
    recordQTime();
    if (qIdx < totalQ - 1) setQIdx(qIdx + 1);
    else if (sectionIdx < sections.length - 1) { setSectionIdx(sectionIdx + 1); setQIdx(0); }
  };

  const clearResponse = () => {
    if (!currentQuestion) return;
    setAnswers((prev) => { const n = { ...prev }; delete n[currentQuestion._id]; return n; });
    setStatuses((prev) => ({ ...prev, [currentQuestion._id]: STATUS.NOT_ANSWERED }));
  };

  const selectOption = (idx) => {
    if (!currentQuestion) return;
    const isMCQ = currentQuestion.type === 'MCQ';
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion._id]: isMCQ
        ? prev[currentQuestion._id]?.includes(idx)
          ? prev[currentQuestion._id].filter((i) => i !== idx)
          : [...(prev[currentQuestion._id] || []), idx]
        : idx,
    }));
  };

  /* ─────────────────────── SUBMIT LOGIC ─────────────────────── */
  const handleAutoSubmit = () => {
    recordQTime();
    doSubmit();
  };

  const doSubmit = async () => {
    // Use ref so this always works even when called from stale closures (timer, tab-switch)
    const currentAttemptId = attemptIdRef.current || attemptId;
    if (!currentAttemptId) {
      console.warn('doSubmit called before attemptId was set — aborting');
      return;
    }
    try {
      const { data } = await studentAPI.submitTest(testId, {
        attemptId: currentAttemptId,
        responses: buildResponsesPayload(),
        submittedAt: new Date().toISOString(),
      });
      const resultAttemptId = data.data?.attemptId || currentAttemptId;
      navigate(`/test/${testId}/analysis/${resultAttemptId}`, { replace: true });
    } catch (_) {
      toast.error('Submission failed. Please try again.');
    }
  };

  /* ─────────────────────── SUMMARY COUNTS for submit modal ─────────────────────── */
  const summarySections = sections.map((sec) => {
    const qs = sec.questions || [];
    return {
      name: sec.name,
      answered:         qs.filter((q) => statuses[q._id] === STATUS.ANSWERED || statuses[q._id] === STATUS.MARKED_ANSWERED).length,
      notAnswered:      qs.filter((q) => statuses[q._id] === STATUS.NOT_ANSWERED).length,
      marked:           qs.filter((q) => statuses[q._id] === STATUS.MARKED).length,
      markedAndAnswered:qs.filter((q) => statuses[q._id] === STATUS.MARKED_ANSWERED).length,
      notVisited:       qs.filter((q) => statuses[q._id] === STATUS.NOT_VISITED).length,
    };
  });

  /* ─────────────────────── TIMER COLOR ─────────────────────── */
  const timerColor = timeLeft < 300 ? '#ef4444' : timeLeft < 600 ? '#f59e0b' : '#22c55e';

  /* ─────────── LOADING ─────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen"
           style={{ background: '#f0f9ff' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-4"
               style={{ borderColor: '#e2e8f0', borderTopColor: '#1e3a5f' }} />
          <p className="font-semibold" style={{ color: '#1e3a5f' }}>Loading test…</p>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     RENDER – INSTRUCTIONS PAGE
     ══════════════════════════════════════════════════════════ */
  if (showInstructions && !loading) {
    return (
      <div className="bg-white min-h-screen font-sans text-sm" style={{ color: '#2b2b2b' }}>
        <header className="flex items-center justify-between px-6 py-2 border-b-4 bg-white" style={{ borderColor: 'var(--accent-primary)' }}>
          <div className="flex items-center gap-4 text-left">
            <img src="/favicon.svg" alt="Logo" className="w-12 h-12" onError={(e) => e.target.style.display='none'} />
            <div>
              <p className="font-bold text-lg leading-tight" style={{ color: 'var(--accent-primary)' }}>JeeWallah</p>
              <p className="text-xs tracking-wider" style={{ color: 'var(--accent-secondary)' }}>Mock Test Engine</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold mb-1 opacity-70">Choose Your Default Language</p>
            <select className="border border-gray-300 px-3 py-1.5 rounded bg-gray-50 text-xs w-48 outline-none focus:border-blue-500" value={lang} onChange={(e) => handleLangChange(e.target.value)}>
              {availableLangs.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </header>

        <div className="text-center font-bold py-2 tracking-widest text-lg uppercase shadow-sm mb-6" style={{ background: '#f5f7f9', color: 'var(--accent-primary)' }}>
          General Instructions
        </div>

        <div className="max-w-[1000px] mx-auto px-6 pb-20">
          <h2 className="text-xl font-bold mb-6 text-center tracking-wide">Please read the instructions carefully</h2>

          <div className="space-y-4 mb-8 text-sm leading-relaxed" style={{ fontSize: '13.5px' }}>
             <p className="font-bold underline mb-2">General Instructions:</p>
             <ol className="list-decimal pl-5 space-y-3">
               <li>Total duration of the examination is <strong>{test?.duration || 180} minutes</strong>.</li>
               <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.</li>
               <li>The Question Palette displayed on the right side of the screen will show the status of each question using one of the following symbols:
                 <ul className="mt-4 space-y-3 list-none">
                    <li className="flex items-center gap-3"><div className="w-7 h-7 flex items-center justify-center font-bold text-gray-500 shadow-sm rounded-md" style={{ background: '#f5f5f5', border: '1px solid #d4d4d4' }}>1</div> You have <span className="font-bold underline">not visited</span> the question yet.</li>
                    <li className="flex items-center gap-3"><div className="w-7 h-7 flex items-center justify-center font-bold text-white shadow-sm rounded-md" style={{ background: '#ef4444', borderBottom: '2px solid #b91c1c' }}>2</div> You have <span className="font-bold underline text-red-600">not answered</span> the question.</li>
                    <li className="flex items-center gap-3"><div className="w-7 h-7 flex items-center justify-center font-bold text-white shadow-sm rounded-md" style={{ background: '#22c55e', borderBottom: '2px solid #15803d' }}>3</div> You have <span className="font-bold underline text-green-600">answered</span> the question.</li>
                    <li className="flex items-center gap-3"><div className="w-7 h-7 flex items-center justify-center font-bold text-white shadow-sm rounded-full" style={{ background: '#8b5cf6', borderBottom: '2px solid #6d28d9' }}>4</div> You have NOT answered the question, but have <span className="font-bold underline text-purple-600">marked the question for review</span>.</li>
                    <li className="flex items-center gap-3 relative"><div className="w-7 h-7 flex items-center justify-center font-bold text-white shadow-sm rounded-full" style={{ background: '#8b5cf6', borderBottom: '2px solid #6d28d9' }}>5</div> <div className="absolute left-5 top-4 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div> The question(s) "Answered and Marked for Review" will be considered for evaluation.</li>
                 </ul>
               </li>
               <li>You can click on the "&gt;" arrow which appears to the left of question palette to collapse the question palette thereby maximizing the question window. To view the question palette again, you can click on "&lt;" which appears on the right side of question window.</li>
             </ol>

             <p className="font-bold underline mt-6 mb-2">Navigating to a Question:</p>
             <ol className="list-decimal pl-5 space-y-3" start="5">
               <li>To answer a question, do the following:
                  <ul className="list-[lower-alpha] pl-6 mt-2 space-y-2">
                    <li>Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.</li>
                    <li>Click on <strong>Save & Next</strong> to save your answer for the current question and then go to the next question.</li>
                    <li>Click on <strong>Mark for Review & Next</strong> to save your answer for the current question, mark it for review, and then go to the next question.</li>
                  </ul>
               </li>
             </ol>

             <p className="font-bold underline mt-6 mb-2">Answering a Question:</p>
             <ol className="list-decimal pl-5 space-y-3" start="6">
               <li>Procedure for answering a multiple choice type question:
                  <ul className="list-[lower-alpha] pl-6 mt-2 space-y-2">
                    <li>To select your answer, click on the button of one of the options.</li>
                    <li>To deselect your chosen answer, click on the button of the chosen option again or click on the <strong>Clear Response</strong> button.</li>
                    <li>To change your chosen answer, click on the button of another option.</li>
                    <li>To save your answer, you MUST click on the <strong>Save & Next</strong> button.</li>
                    <li>To mark the question for review, click on the <strong>Mark for Review & Next</strong> button.</li>
                  </ul>
               </li>
             </ol>

             <p className="border-t pt-5 mt-6 text-xs italic font-semibold text-red-500 text-center tracking-wide">
               Please note all questions will appear in your default language. This language can be changed for a particular question later on.
             </p>
          </div>

          <div className="mt-8 p-5 rounded flex items-start gap-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
             <input type="checkbox" id="readInstructions" className="mt-1 flex-shrink-0 w-4 h-4 cursor-pointer accent-blue-600" 
                    checked={instructionsAgreed} onChange={(e) => setInstructionsAgreed(e.target.checked)} />
             <label htmlFor="readInstructions" className="text-gray-700 leading-relaxed text-xs cursor-pointer select-none">
               I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of / not wearing / not carrying any prohibited gadget like mobile phone, bluetooth devices etc. /any prohibited material with me into the Examination Hall. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test and/or to disciplinary action, which may include ban from future Tests / Examinations.
             </label>
          </div>

          <div className="mt-8 text-center border-t pt-6" style={{ borderColor: '#e2e8f0' }}>
             <button
                onClick={handleStartTest}
                className="font-bold py-3 px-12 rounded uppercase tracking-wider transition-all duration-200 shadow-md"
                style={{ background: instructionsAgreed ? '#22c55e' : '#94a3b8', color: '#fff', cursor: instructionsAgreed ? 'pointer' : 'not-allowed' }}
                disabled={!instructionsAgreed}
                >
               Proceed
             </button>
          </div>
        </div>

        {/* Footer to match NTA strictly */}
        <footer className="fixed bottom-0 left-0 right-0 p-2 text-center text-xs text-white" style={{ background: 'var(--accent-primary)' }}>
          © All Rights Reserved - JeeWallah Mock Test Engine
        </footer>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     RENDER – NTA CBT Interface
     ══════════════════════════════════════════════════════════ */
  return (
    <div
      className="cbt-layout"
      style={{ minHeight: '100vh' }}
    >
      {/* ── CBT Header ── */}
      <header className="cbt-header">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/favicon.svg" alt="" className="w-7 h-7 rounded" onError={(e) => e.target.style.display='none'} />
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{test?.title || 'JEE Mock Test'}</p>
            <p className="text-xs opacity-70">{test?.examType || 'Mock Test'}</p>
          </div>
        </div>

        {/* Timer + mobile palette toggle */}
        <div className="flex items-center gap-3">
          {/* Language Toggle – tab style */}
          <div className="items-center rounded-lg p-0.5 gap-0.5 hidden sm:flex"
               style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            {availableLangs.map(({ code, name, label }) => (
              <button
                key={code}
                title={label}
                onClick={() => handleLangChange(code)}
                className="px-2 py-1 rounded-md text-xs font-bold transition-all"
                style={{
                  background: lang === code ? 'rgba(255,255,255,0.25)' : 'transparent',
                  color: '#fff',
                }}
              >{name}</button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
               style={{ background: 'rgba(255,255,255,0.1)' }}>
            <Clock size={14} style={{ color: timerColor }} />
            <span
              className="font-mono font-black text-base"
              style={{ color: timerColor, minWidth: '5ch' }}
            >
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Mobile palette toggle */}
          <button
            onClick={() => setPaletteOpen(!paletteOpen)}
            className="lg:hidden flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            <Menu size={14} /> Palette
          </button>

          {/* Submit button */}
          <button
            onClick={() => { recordQTime(); setSubmitModal(true); }}
            className="btn btn-sm gap-1.5"
            style={{ background: '#22c55e', color: '#fff' }}
          >
            <Send size={13} /> Submit
          </button>
        </div>
      </header>

      {/* ── Section tabs (full-width row below header, above main+sidebar) ── */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-subtle)',
          gridColumn: '1 / -1',
          gridRow: '2',
          display: 'flex',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {sections.map((sec, i) => {
          const qs = sec.questions || [];
          const answeredCount = qs.filter((q) => statuses[q._id] === STATUS.ANSWERED || statuses[q._id] === STATUS.MARKED_ANSWERED).length;
          const isActive = sectionIdx === i;
          return (
            <button
              key={i}
              onClick={() => { setSectionIdx(i); setQIdx(0); }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '6px 10px',
                borderBottom: `2px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                minWidth: 0,
                flexShrink: 0,
                fontWeight: isActive ? 700 : 500,
                fontSize: '11px',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.15s',
              }}
            >
              {sec.name}
              <span style={{ fontSize: '10px', color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)', marginTop: '1px', fontWeight: 400 }}>
                {answeredCount}/{qs.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Question area (grid row 3) ── */}
      <main className="cbt-main" style={{ background: 'var(--bg-base)', gridRow: '3' }}>
        {currentQuestion ? (
          <div className="max-w-3xl mx-auto">
            {/* Question header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                  Q.{qIdx + 1} of {totalQ}
                </span>
                <span className="badge badge-gray text-xs">{currentQuestion.type}</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                Marks: +{currentQuestion.positiveMarks || 4} / {currentQuestion.negativeMarks || '-1'}
              </span>
            </div>

            {/* Question content */}
            <div
              className="text-base leading-relaxed mb-6 p-4 rounded-xl"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              dangerouslySetInnerHTML={{
                __html: getQuestionText(currentQuestion)
              }}
            />

            {/* Options (SCQ / MCQ) */}
            {!['Integer', 'Numerical'].includes(currentQuestion.type) && (
              <div className="space-y-2 mb-6">
                {currentQuestion.options?.map((opt, i) => {
                  const currAns = answers[currentQuestion._id];
                  const isSelected = Array.isArray(currAns) ? currAns.includes(i) : currAns === i;
                  return (
                    <button
                      key={i}
                      onClick={() => selectOption(i)}
                      className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                      style={{
                        border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        background: isSelected ? 'var(--accent-primary-light)' : 'var(--bg-card)',
                      }}
                    >
                      {/* Option circle */}
                      <span
                        className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm"
                        style={{
                          background: isSelected ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                          color: isSelected ? '#fff' : 'var(--text-secondary)',
                          border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span
                        className="text-sm"
                        style={{ color: 'var(--text-primary)' }}
                        dangerouslySetInnerHTML={{ __html: getText(opt.text) || getText(opt) || '' }}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Integer input */}
            {['Integer', 'Numerical', 'INTEGER', 'NUMERICAL'].includes(currentQuestion.type) && (
              <div className="mb-6">
                <label className="label">Enter your answer (numeric):</label>
                <input
                  type="number"
                  className="input text-2xl font-black w-48"
                  style={{ textAlign: 'center', letterSpacing: '0.1em' }}
                  placeholder="_ _ _ _"
                  value={answers[currentQuestion._id] ?? ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [currentQuestion._id]: e.target.value }))
                  }
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Back */}
              <button
                onClick={() => {
                  recordQTime();
                  if (qIdx > 0) setQIdx(qIdx - 1);
                  else if (sectionIdx > 0) { setSectionIdx(sectionIdx - 1); setQIdx((sections[sectionIdx - 1]?.questions?.length || 1) - 1); }
                }}
                className="btn btn-secondary btn-sm gap-1.5"
                disabled={sectionIdx === 0 && qIdx === 0}
              >
                <ChevronLeft size={14} /> Back
              </button>

              {/* Clear Response */}
              <button onClick={clearResponse} className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--accent-danger)' }}>
                Clear Response
              </button>

              {/* Mark for Review */}
              <button
                onClick={markForReview}
                className="btn btn-sm gap-1.5"
                style={{ background: 'var(--nta-marked)', color: '#fff' }}
              >
                Mark for Review & Next
              </button>

              {/* Save & Next */}
              <button onClick={saveAndNext} className="btn btn-primary btn-sm gap-1.5">
                Save & Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
            No questions in this section.
          </p>
        )}
      </main>

      {/* ── Desktop Question Palette sidebar ── */}
      <aside className="cbt-sidebar">
        {/* Legend */}
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-2"
             style={{ color: 'var(--text-muted)' }}>Legend</p>
          <div className="space-y-1.5">
            {[
              [STATUS.ANSWERED,        '#22c55e', 'Answered'],
              [STATUS.NOT_ANSWERED,    '#ef4444', 'Not Answered'],
              [STATUS.MARKED,          '#8b5cf6', 'Marked for Review'],
              [STATUS.MARKED_ANSWERED, '#8b5cf6', 'Answered & Marked'],
              [STATUS.NOT_VISITED,     '#94a3b8', 'Not Visited'],
            ].map(([st, color, label]) => (
              <div key={st} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded text-xs flex items-center justify-center text-white"
                     style={{ background: color, fontSize: '9px' }}>1</div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-section palettes */}
        {sections.map((sec, secI) => (
          <div key={secI} className="mb-5" style={{ display: secI === sectionIdx ? 'block' : 'none' }}>
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>
              {sec.name}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sec.questions?.map((q, qI) => (
                <button
                  key={q._id}
                  onClick={() => goToQ(secI, qI)}
                  className={`q-btn ${STATUS_CLASS[statuses[q._id] ?? STATUS.NOT_VISITED]}`}
                  style={{
                    outline: secI === sectionIdx && qI === qIdx ? '2px solid #f97316' : 'none',
                    outlineOffset: '1px',
                  }}
                  title={`${sec.name} Q.${qI + 1} — ${STATUS_LABEL[statuses[q._id] ?? 0]}`}
                >
                  {qI + 1}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      {/* ── Mobile Palette Drawer ── */}
      <div className={`palette-drawer lg:hidden ${paletteOpen ? 'open' : ''}`}>
        {/* Drag handle */}
        <div className="flex items-center justify-between px-4 h-12"
             style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <p className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>Question Palette</p>
          <button onClick={() => setPaletteOpen(false)}
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-4 max-h-72 overflow-y-auto">
          {sections.map((sec, secI) => (
            <div key={secI} className="mb-4" style={{ display: secI === sectionIdx ? 'block' : 'none' }}>
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>{sec.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {sec.questions?.map((q, qI) => (
                  <button
                    key={q._id}
                    onClick={() => { goToQ(secI, qI); setPaletteOpen(false); }}
                    className={`q-btn ${STATUS_CLASS[statuses[q._id] ?? STATUS.NOT_VISITED]}`}
                    style={{
                      outline: secI === sectionIdx && qI === qIdx ? '2px solid #f97316' : 'none',
                      outlineOffset: '1px',
                    }}
                  >
                    {qI + 1}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Submit Confirmation Modal ── */}
      {submitModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'var(--bg-overlay)' }}
        >
          <div className="card p-6 w-full max-w-lg">
            <h2 className="text-xl font-black mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
              Submit Test?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              Review your answers before submitting. This action cannot be undone.
            </p>

            {/* Summary table */}
            <div className="overflow-x-auto mb-5">
              <table className="jw-table text-xs">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th style={{ color: '#22c55e' }}>Answered</th>
                    <th style={{ color: '#ef4444' }}>Not Answered</th>
                    <th style={{ color: '#8b5cf6' }}>Marked</th>
                    <th style={{ color: '#94a3b8' }}>Not Visited</th>
                  </tr>
                </thead>
                <tbody>
                  {summarySections.map((s) => (
                    <tr key={s.name}>
                      <td className="font-semibold">{s.name}</td>
                      <td style={{ color: '#22c55e', fontWeight: 700 }}>{s.answered}</td>
                      <td style={{ color: '#ef4444', fontWeight: 700 }}>{s.notAnswered}</td>
                      <td style={{ color: '#8b5cf6', fontWeight: 700 }}>{s.marked}</td>
                      <td style={{ color: '#94a3b8', fontWeight: 700 }}>{s.notVisited}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSubmitModal(false)}
                className="btn btn-secondary flex-1"
              >
                Go Back & Review
              </button>
              <button
                onClick={doSubmit}
                className="btn btn-primary flex-1 gap-2"
                style={{ background: '#22c55e' }}
              >
                <CheckCircle2 size={15} /> Submit Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab switch warning ── */}
      {tabWarning && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
        >
          <div className="card p-6 max-w-md text-center">
            <AlertTriangle size={36} className="mx-auto mb-3" style={{ color: '#f59e0b' }} />
            <h2 className="text-xl font-black mb-2"
                style={{ color: 'var(--text-heading)', fontFamily: 'Space Grotesk, sans-serif' }}>
              Warning: Tab Switch Detected
            </h2>
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              Switching tabs during the test is not permitted. You've switched tabs <strong>{tabCount} times</strong>.
            </p>
            <p className="text-xs mb-5" style={{ color: '#ef4444' }}>
              At 5 switches, your test will be auto-submitted.
            </p>
            <button
              onClick={() => setTabWarning(false)}
              className="btn btn-primary"
            >
              I understand – Resume Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
