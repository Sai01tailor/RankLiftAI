/**
 * Dashboard.jsx – Advanced Student Analytics Dashboard
 * ─────────────────────────────────────────────────────
 * Tabs: Overview · Subject · Chapters · Mistakes · Mock Tests · Rank Boost
 */
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, BookOpen, CheckCircle2, Clock, TrendingUp, Brain,
  ChevronRight, Trophy, Zap, BarChart2, AlertTriangle, Target,
  Activity, Layers, Crosshair, TrendingDown, Award, Star,
  BookMarked, ArrowUp, ArrowDown, Minus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentAPI, aiAPI } from '../../api/services';
import { useLang, REGIONAL_LANGUAGES } from '../../context/LanguageContext';

const fadeUp   = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const staggerP = { visible: { transition: { staggerChildren: 0.06 } } };

/* ── Mini ring chart ── */
function Ring({ value, max, color, size = 72, stroke = 7, label, sublabel }) {
  const r   = (size - stroke) / 2;
  const c   = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                  strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black leading-none" style={{ color: 'var(--text-heading)', fontSize: '13px' }}>{label}</span>
          {sublabel && <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{sublabel}</span>}
        </div>
      </div>
    </div>
  );
}

/* ── Accuracy badge ── */
function AccBadge({ pct }) {
  const color = pct >= 70 ? '#22c55e' : pct >= 45 ? '#f59e0b' : '#ef4444';
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: color + '18', color }}>
      {pct}%
    </span>
  );
}

/* ── Bar ── */
function Bar({ value, max, color = 'var(--accent-primary)', height = 6 }) {
  const w = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)', height }}>
      <div className="h-full rounded-full" style={{ width: `${w}%`, background: color, transition: 'width 0.9s ease' }} />
    </div>
  );
}

/* ── Stat metric card ── */
function MetricCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <motion.div variants={fadeUp} className="card p-4 flex flex-col gap-2">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-black leading-none mb-0.5" style={{ color: 'var(--text-heading)', fontFamily: 'Space Grotesk, sans-serif' }}>{value}</div>
        <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</div>
        {sub && <div className="text-xs mt-0.5 font-medium" style={{ color }}>{sub}</div>}
      </div>
    </motion.div>
  );
}

/* ── Tab button ── */
function Tab({ label, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
      style={{
        background: active ? 'var(--accent-primary)' : 'transparent',
        color: active ? '#fff' : 'var(--text-muted)',
        border: active ? 'none' : '1px solid transparent',
      }}
    >
      <Icon size={12} /> {label}
    </button>
  );
}

const SUBJECT_COLORS = { Physics: '#6366f1', Chemistry: '#22c55e', Mathematics: '#f59e0b', Unknown: '#64748b' };
const subColor = (name) => SUBJECT_COLORS[name] || '#6366f1';

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning'; if (h < 17) return 'afternoon'; if (h < 21) return 'evening'; return 'night';
}

function momentumArrow(thisW, prevW) {
  if (thisW === null || prevW === null) return null;
  if (thisW > prevW + 3) return <ArrowUp size={14} style={{ color: '#22c55e' }} />;
  if (thisW < prevW - 3) return <TrendingDown size={14} style={{ color: '#ef4444' }} />;
  return <Minus size={14} style={{ color: '#64748b' }} />;
}

/* ══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user, updateProfile } = useAuth();
  const { preferredThirdLang, setPreferredThirdLang } = useLang();

  const [tab, setTab] = useState('overview');
  const [dashData,  setDashData]  = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [aiScore,   setAiScore]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [aLoading,  setALoading]  = useState(false);

  // Load dashboard basics
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dashRes, histRes] = await Promise.allSettled([
          studentAPI.getDashboard(),
          studentAPI.getTestHistory({ limit: 5 }),
        ]);
        if (cancelled) return;
        if (dashRes.status === 'fulfilled') {
          const d = dashRes.value.data.data;
          if (d?.user?.streak && typeof d.user.streak === 'object')
            d.streak = d.user.streak.currentStreak ?? 0;
          setDashData({ ...d, testHistory: histRes.status === 'fulfilled' ? (Array.isArray(histRes.value.data.data) ? histRes.value.data.data : histRes.value.data.data?.attempts || []) : [] });
        }
        try {
          const sr = await aiAPI.predictScore();
          if (!cancelled) setAiScore(sr.data.data);
        } catch (_) {}
      } catch (_) {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load full analytics on tab switch (lazy)
  const loadAnalytics = useCallback(async () => {
    if (analytics) return;
    setALoading(true);
    try {
      const { data } = await studentAPI.getFullAnalytics();
      setAnalytics(data.data);
    } catch (_) {}
    finally { setALoading(false); }
  }, [analytics]);

  useEffect(() => {
    if (['subject', 'chapters', 'mistakes', 'strategy'].includes(tab)) loadAnalytics();
  }, [tab, loadAnalytics]);

  const s = dashData || {};
  const streakVal = typeof user?.streak === 'object' ? (user.streak.currentStreak ?? 0) : (user?.streak ?? 0);
  const overview  = analytics?.overview || {};

  const TABS = [
    { id: 'overview',  label: 'Overview',   icon: BarChart2 },
    { id: 'subject',   label: 'Subjects',   icon: Layers },
    { id: 'chapters',  label: 'Chapters',   icon: BookMarked },
    { id: 'mistakes',  label: 'Mistakes',   icon: Crosshair },
    { id: 'tests',     label: 'Mock Tests', icon: Trophy },
    { id: 'strategy',  label: 'Rank Boost', icon: Target },
  ];

  const isFreePlan = (user?.subscription?.plan || 'free') === 'free';
  const isBasicPlan = user?.subscription?.plan === 'basic';
  const isPremiumPlan = user?.subscription?.plan === 'premium';

  return (
    <motion.div variants={staggerP} initial="hidden" animate="visible" className="space-y-5">

      {/* ═══ Welcome Banner ═══ */}
      <motion.div variants={fadeUp}
        className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f2544 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="streak-badge text-xs"><Flame size={11} /> {s.streak ?? streakVal}-day streak</span>
            {overview.consistencyScore !== null && overview.consistencyScore !== undefined && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: '#6366f118', color: '#818cf8' }}>
                <Activity size={10} className="inline mr-1" />Consistency {overview.consistencyScore}
              </span>
            )}
            {analytics?.momentum?.thisWeek !== null && analytics?.momentum?.prevWeek !== null && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: '#ffffff10', color: '#94a3b8' }}>
                {momentumArrow(analytics?.momentum?.thisWeek, analytics?.momentum?.prevWeek)}
                {analytics?.momentum?.thisWeek ?? '—'}% this week
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black text-white mt-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Good {getTimeOfDay()}, {user?.username?.split(' ')[0] || 'Student'} 👋
          </h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {s.solved > 0
              ? `${s.solved} solved · ${overview.overallAccuracy ?? '—'}% accuracy · ${(s.total || 0) - (s.solved || 0)} left to cover syllabus`
              : 'Start solving problems to track your progress!'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="px-3 py-1.5 rounded-lg text-xs font-semibold outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}
            value={preferredThirdLang}
            onChange={async (e) => {
              setPreferredThirdLang(e.target.value);
              try { await updateProfile({ preferredLanguage: e.target.value }); } catch (_) {}
            }}
          >
            {REGIONAL_LANGUAGES.map(({ code, label }) => (
              <option key={code} value={code} style={{ color: '#000' }}>{label}</option>
            ))}
          </select>
          <Link to="/problems" className="btn btn-sm gap-1.5" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }}>
            <BookOpen size={12} /> Practice
          </Link>
          <Link to="/tests" className="btn btn-primary btn-sm gap-1.5">
            <Zap size={12} /> Mock Test
          </Link>
        </div>
      </motion.div>

      {/* ═══ Top Metric Cards ═══ */}
      <motion.div variants={staggerP} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard icon={CheckCircle2} label="Problems Solved"    value={loading ? '—' : (s.solved ?? 0)}       sub={`${overview.overallAccuracy ?? '—'}% accuracy`} color="#22c55e" bg="#dcfce7" />
        <MetricCard icon={AlertTriangle} label="Wrong Attempts"    value={loading ? '—' : (s.failedAttempted ?? 0)} sub="Need revision"                                   color="#f59e0b" bg="#fef3c7" />
        <MetricCard icon={Trophy}        label="Mock Tests"         value={loading ? '—' : (s.mockTestsTaken ?? 0)}  sub={s.avgScore !== undefined ? `Avg ${s.avgScore}/300` : 'None yet'} color="#6366f1" bg="#ede9fe" />
        <MetricCard icon={Flame}         label="Day Streak 🔥"     value={loading ? '—' : (s.streak ?? streakVal)}  sub="Keep going!"                                     color="#f97316" bg="#fff3e8" />
      </motion.div>

      {/* ═══ Tab Bar ═══ */}
      <motion.div variants={fadeUp} className="flex items-center gap-1 flex-wrap" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        {TABS.map(t => (
          <Tab key={t.id} label={t.label} icon={t.icon} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>

          {/* ══ OVERVIEW TAB ══ */}
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid lg:grid-cols-3 gap-5">
                {/* Problem tracker */}
                <div className="card p-5 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>Syllabus Coverage</h3>
                    <Link to="/problems" className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>Practice →</Link>
                  </div>
                  <div className="flex items-center gap-6 mb-5 flex-wrap">
                    <Ring value={s.solved || 0} max={s.total || 1} color="var(--accent-success)" label={`${s.solved ?? 0}`} sublabel="solved" />
                    <Ring value={s.failedAttempted || 0} max={s.total || 1} color="#f59e0b" label={`${s.failedAttempted ?? 0}`} sublabel="wrong" />
                    <Ring value={Math.max(0, (s.total || 0) - (s.attempted || 0))} max={s.total || 1} color="var(--border-default)" label={`${Math.max(0, (s.total||0)-(s.attempted||0))}`} sublabel="unseen" />
                    {aiScore && (
                      <div className="flex flex-col items-center gap-1 border-l pl-6 ml-2" style={{ borderColor: 'var(--border-subtle)' }}>
                        <span className="text-3xl font-black" style={{ color: 'var(--accent-secondary)', fontFamily: 'Space Grotesk, sans-serif' }}>{aiScore.predictedScore}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>AI Score</span>
                        <span className="text-xs font-bold" style={{ color: 'var(--accent-secondary)' }}>{aiScore.predictedPercentile}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      <span>Overall progress</span>
                      <span>{s.total > 0 ? Math.round((s.solved / s.total) * 100) : 0}%</span>
                    </div>
                    <Bar value={s.solved || 0} max={s.total || 1} color="var(--accent-success)" height={8} />
                  </div>
                  {analytics?.momentum && (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {[
                        { label: 'This week', val: analytics.momentum.questionsThisWeek, sub: 'questions' },
                        { label: 'This week acc.', val: analytics.momentum.thisWeek !== null ? `${analytics.momentum.thisWeek}%` : '—', sub: 'accuracy' },
                        { label: 'Prev week acc.', val: analytics.momentum.prevWeek !== null ? `${analytics.momentum.prevWeek}%` : '—', sub: 'accuracy' },
                      ].map(({ label, val, sub }) => (
                        <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-subtle)' }}>
                          <div className="text-lg font-black" style={{ color: 'var(--text-heading)' }}>{val}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</div>
                          <div className="text-xs mt-0.5 font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Score + quick stats */}
                <div className="space-y-4">
                  <div className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain size={14} style={{ color: 'var(--accent-secondary)' }} />
                      <span className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>AI Forecast</span>
                    </div>
                    {isFreePlan || isBasicPlan ? (
                      <div className="text-center py-4">
                        <Star size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-xs mb-3 flex flex-col items-center" style={{ color: 'var(--text-muted)' }}>Premium Only Feature</p>
                        <Link to="/subscription" className="btn btn-xs flex items-center gap-1 mx-auto" style={{ background: 'var(--accent-secondary-light)', color: 'var(--accent-secondary)', width: 'fit-content' }}>Upgrade <Star size={10} /></Link>
                      </div>
                    ) : aiScore ? (
                      <>
                        <div className="text-4xl font-black mb-0.5" style={{ color: 'var(--accent-secondary)', fontFamily: 'Space Grotesk, sans-serif' }}>{aiScore.predictedScore}</div>
                        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Predicted score · {aiScore.confidence}% confidence</p>
                        <div className="p-2.5 rounded-xl text-center" style={{ background: 'var(--accent-secondary-light)' }}>
                          <div className="text-xs font-bold mb-0.5" style={{ color: 'var(--accent-secondary)' }}>Predicted Percentile</div>
                          <div className="text-2xl font-black" style={{ color: 'var(--accent-secondary)' }}>{aiScore.predictedPercentile}</div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <Brain size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Take 3+ mock tests to unlock</p>
                      </div>
                    )}
                  </div>
                  {overview.consistencyScore !== null && overview.consistencyScore !== undefined && (
                    <div className="card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity size={13} style={{ color: '#818cf8' }} />
                        <span className="font-bold text-xs" style={{ color: 'var(--text-heading)' }}>Performance Metrics</span>
                      </div>
                      {[
                        { label: 'Consistency', val: overview.consistencyScore, color: '#818cf8' },
                        { label: 'Risk Index', val: overview.riskTakingIndex, color: '#f59e0b' },
                        { label: 'Accuracy', val: overview.overallAccuracy, color: '#22c55e' },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="mb-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                            <span className="font-bold" style={{ color }}>{val}%</span>
                          </div>
                          <Bar value={val} max={100} color={color} height={5} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent mock tests */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between p-5 pb-3">
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>Recent Mock Tests</h3>
                  <Link to="/tests" className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>All tests →</Link>
                </div>
                {!s.testHistory?.length ? (
                  <div className="px-5 pb-5 text-center py-6">
                    <Trophy size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No mock tests yet. <Link to="/tests" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Take your first →</Link></p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="jw-table">
                      <thead><tr><th>Test</th><th>Score</th><th>Rank</th><th>Date</th><th></th></tr></thead>
                      <tbody>
                        {s.testHistory.map(t => (
                          <tr key={t._id}>
                            <td><p className="font-medium text-sm">{t.mockTestId?.title || 'Mock Test'}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.mockTestId?.examType}</p></td>
                            <td><span className="font-bold" style={{ color: 'var(--text-heading)' }}>{t.totalScore ?? '—'}</span><span style={{ color: 'var(--text-muted)' }}>/300</span></td>
                            <td><span className="badge badge-indigo">#{t.rank ?? '—'}</span></td>
                            <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.submittedAt ? new Date(t.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</td>
                            <td><Link to={`/test/${t.mockTestId?._id}/analysis/${t._id}`} className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>Analysis →</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: BookOpen,   label: 'Practice Problems', to: '/problems',    color: '#f97316' },
                  { icon: TrendingUp, label: 'Take Mock Test',    to: '/tests',       color: '#6366f1' },
                  { icon: BarChart2,  label: 'Leaderboard',       to: '/leaderboard', color: '#22c55e' },
                  { icon: Trophy,     label: 'My Profile',        to: '/profile',     color: '#f59e0b' },
                ].map(({ icon: Icon, label, to, color }) => (
                  <Link key={label} to={to} className="card card-hover p-4 flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                      <Icon size={17} style={{ color }} />
                    </div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ══ SUBJECT TAB ══ */}
          {tab === 'subject' && (
            <div className="space-y-4">
              {isFreePlan ? <UpsellBanner type="basic" /> : aLoading || !analytics ? (
                <AnalyticsLoader />
              ) : !analytics.subjectStats?.length ? (
                <EmptyState label="Solve some problems first to see subject analysis." />
              ) : (
                <>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {analytics.subjectStats.map(sub => (
                      <div key={sub.name} className="card p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: subColor(sub.name) }} />
                            <span className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>{sub.name}</span>
                          </div>
                          <AccBadge pct={sub.accuracy} />
                        </div>
                        <div className="text-3xl font-black mb-1" style={{ color: subColor(sub.name), fontFamily: 'Space Grotesk, sans-serif' }}>{sub.correct}/{sub.total}</div>
                        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>correct · avg {sub.avgTime}s/q</p>
                        <Bar value={sub.accuracy} max={100} color={subColor(sub.name)} />
                        {/* Difficulty breakdown */}
                        <div className="mt-3 grid grid-cols-3 gap-1 text-center">
                          {['Easy', 'Medium', 'Hard'].map(diff => {
                            const bd = sub.byDifficulty?.[diff] || { c: 0, w: 0 };
                            const tot = bd.c + bd.w;
                            const acc = tot > 0 ? Math.round((bd.c / tot) * 100) : 0;
                            return (
                              <div key={diff} className="rounded-lg p-1.5" style={{ background: 'var(--bg-subtle)' }}>
                                <div className="text-xs font-bold" style={{ color: diff === 'Easy' ? '#22c55e' : diff === 'Hard' ? '#ef4444' : '#f59e0b' }}>{diff[0]}</div>
                                <div className="text-sm font-black" style={{ color: 'var(--text-heading)' }}>{acc}%</div>
                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{tot}q</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Weak topics list */}
                  <div className="card p-5">
                    <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--text-heading)' }}>Top Weak Topics</h3>
                    <div className="space-y-3">
                      {analytics.weakTopics?.slice(0, 8).map((t, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-5 flex-shrink-0 text-xs font-bold text-center" style={{ color: 'var(--text-muted)' }}>{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{t.topic}</span>
                              <span className="text-xs ml-2 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{t.subject}</span>
                            </div>
                            <Bar value={t.accuracy} max={100} color={t.accuracy < 40 ? '#ef4444' : t.accuracy < 70 ? '#f59e0b' : '#22c55e'} height={5} />
                          </div>
                          <AccBadge pct={t.accuracy} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ CHAPTERS HEATMAP TAB ══ */}
          {tab === 'chapters' && (
            <div className="space-y-4">
              {isFreePlan ? <UpsellBanner type="basic" /> : aLoading || !analytics ? <AnalyticsLoader /> : !analytics.chapterHeatmap?.length ? (
                <EmptyState label="No chapter data yet. Start practising!" />
              ) : (
                <>
                  {['Physics', 'Chemistry', 'Mathematics'].map(subj => {
                    const chapters = analytics.chapterHeatmap.filter(c => c.subject === subj);
                    if (!chapters.length) return null;
                    return (
                      <div key={subj} className="card p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-3 h-3 rounded-full" style={{ background: subColor(subj) }} />
                          <h3 className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>{subj}</h3>
                        </div>
                        <div className="space-y-2.5">
                          {chapters.map((c, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-36 text-xs truncate flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{c.chapter}</div>
                              <div className="flex-1">
                                <Bar value={c.accuracy} max={100} color={c.accuracy < 40 ? '#ef4444' : c.accuracy < 70 ? '#f59e0b' : '#22c55e'} height={8} />
                              </div>
                              <div className="w-10 text-right">
                                <AccBadge pct={c.accuracy} />
                              </div>
                              <div className="text-xs w-12 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{c.total}q</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* ══ MISTAKES TAB ══ */}
          {tab === 'mistakes' && (
            <div className="space-y-4">
              {isFreePlan || isBasicPlan ? <UpsellBanner type="premium" /> : aLoading || !analytics ? <AnalyticsLoader /> : (
                <>
                  {/* Mistake pattern cards */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { key: 'careless', label: 'Careless Mistakes', desc: 'Easy Qs answered < 30s wrong', color: '#f59e0b', icon: AlertTriangle, fix: 'Read questions twice before answering.' },
                      { key: 'conceptual', label: 'Conceptual Gaps', desc: 'Hard questions answered wrong', color: '#ef4444', icon: Brain, fix: 'Revisit NCERT + practice fundamental concepts.' },
                      { key: 'timeout', label: 'Time Pressure', desc: 'Qs spending >3 min and wrong', color: '#6366f1', icon: Clock, fix: 'Practise speed drills. Skip & return strategy.' },
                    ].map(({ key, label, desc, color, icon: Icon, fix }) => {
                      const d = analytics.mistakePatterns?.[key] || { count: 0, pct: 0 };
                      return (
                        <div key={key} className="card p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
                              <Icon size={16} style={{ color }} />
                            </div>
                            <span className="text-2xl font-black" style={{ color, fontFamily: 'Space Grotesk, sans-serif' }}>{d.count}</span>
                          </div>
                          <div className="font-bold text-sm mb-0.5" style={{ color: 'var(--text-heading)' }}>{label}</div>
                          <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                          <Bar value={d.pct} max={100} color={color} height={6} />
                          <div className="text-xs mt-2 font-semibold" style={{ color }}>
                            {d.pct}% of wrong answers
                          </div>
                          <div className="mt-3 p-2.5 rounded-lg text-xs" style={{ background: color + '10', color }}>
                            💡 {fix}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Time per question type */}
                  <div className="card p-5">
                    <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--text-heading)' }}>Avg Time per Question Type</h3>
                    <div className="space-y-3">
                      {analytics.timeAnalytics?.map(t => (
                        <div key={t.type} className="flex items-center gap-3">
                          <span className="w-20 text-xs flex-shrink-0 font-semibold" style={{ color: 'var(--text-secondary)' }}>{t.type}</span>
                          <div className="flex-1">
                            <Bar value={t.avgTime} max={240} color={t.avgTime > 120 ? '#ef4444' : t.avgTime > 60 ? '#f59e0b' : '#22c55e'} height={8} />
                          </div>
                          <span className="text-xs font-bold w-14 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{t.avgTime}s avg</span>
                          <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{t.count}q</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ MOCK TESTS TAB ══ */}
          {tab === 'tests' && (
            <div className="space-y-4">
              {/* Score trend chart (CSS bars) */}
              {analytics?.scoreTrend?.length >= 2 ? (
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>Score Trend</h3>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Last {analytics.scoreTrend.length} tests</span>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {analytics.scoreTrend.map((t, i) => {
                      const h = Math.max(4, (t.score / 300) * 100);
                      const prev = i > 0 ? analytics.scoreTrend[i - 1].score : t.score;
                      const color = t.score >= prev ? '#22c55e' : '#ef4444';
                      return (
                        <div key={i} className="flex flex-col items-center flex-1 gap-1">
                          <div className="text-xs font-bold" style={{ color }}>{t.score}</div>
                          <div className="w-full rounded-t-md transition-all" style={{ height: `${h}%`, background: color + 'cc', minHeight: '4px' }} title={t.title} />
                          <div className="text-xs truncate w-full text-center" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>T{i + 1}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Attempt strategy */}
              {analytics?.attemptStrategy && (
                <div className="card p-5">
                  <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--text-heading)' }}>Attempt Strategy (last 5 tests)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Attempted', val: analytics.attemptStrategy.attempted, color: '#6366f1' },
                      { label: 'Skipped',   val: analytics.attemptStrategy.skipped,   color: '#64748b' },
                      { label: 'Attempt Rate', val: `${analytics.attemptStrategy.attemptRate}%`, color: '#22c55e' },
                      { label: 'Hit Rate',  val: `${analytics.attemptStrategy.hitRate}%`, color: '#f59e0b' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-subtle)' }}>
                        <div className="text-2xl font-black" style={{ color, fontFamily: 'Space Grotesk, sans-serif' }}>{val}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}>
                    💡 <b>Optimal JEE strategy:</b> Attempt 60–70 questions accurately. Avoid guessing on negative marking sections.
                    {analytics.attemptStrategy.attemptRate < 60 && ' You are currently attempting too few — try pushing to 65%+.'}
                    {analytics.attemptStrategy.hitRate < 60 && ' Your hit rate is low — focus on accuracy over quantity.'}
                  </div>
                </div>
              )}

              {/* Recent tests table */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between p-5 pb-3">
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>Test History</h3>
                  <Link to="/tests" className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>All tests →</Link>
                </div>
                {!s.testHistory?.length ? (
                  <EmptyState label="No mock tests yet." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="jw-table">
                      <thead><tr><th>Test</th><th>Score</th><th>Rank</th><th>Date</th><th></th></tr></thead>
                      <tbody>
                        {s.testHistory.map(t => (
                          <tr key={t._id}>
                            <td><p className="font-medium text-sm">{t.mockTestId?.title || 'Mock Test'}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.mockTestId?.examType}</p></td>
                            <td><span className="font-bold" style={{ color: 'var(--text-heading)' }}>{t.totalScore ?? '—'}</span><span style={{ color: 'var(--text-muted)' }}>/300</span></td>
                            <td><span className="badge badge-indigo">#{t.rank ?? '—'}</span></td>
                            <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.submittedAt ? new Date(t.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</td>
                            <td><Link to={`/test/${t.mockTestId?._id}/analysis/${t._id}`} className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>Analysis →</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ RANK BOOST TAB ══ */}
          {tab === 'strategy' && (
            <div className="space-y-4">
              {isFreePlan || isBasicPlan ? <UpsellBanner type="premium" /> : aLoading || !analytics ? <AnalyticsLoader /> : (
                <>
                  <div className="card p-5 rounded-2xl" style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', border: '1px solid rgba(99,102,241,0.3)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={16} style={{ color: '#818cf8' }} />
                      <h3 className="font-bold text-sm text-white">Your Rank Boost Action Plan</h3>
                    </div>
                    <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Personalized based on your performance data.</p>
                    <div className="space-y-3">
                      {generateRankBoostPlan(analytics).map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: '#6366f1', color: '#fff' }}>{i + 1}</div>
                          <div>
                            <div className="text-sm font-bold text-white">{item.title}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.action}</div>
                            {item.estimate && <div className="text-xs mt-1 font-semibold" style={{ color: '#86efac' }}>📈 {item.estimate}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Daily targets */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Daily Questions Target', val: '20–30', icon: BookOpen, color: '#22c55e', tip: 'Mix of Easy (40%), Medium (40%), Hard (20%)' },
                      { label: 'Weekly Mock Tests', val: '2–3', icon: Trophy, color: '#6366f1', tip: 'Full syllabus JEE Main pattern tests' },
                      { label: 'Revision Sessions', val: '1/day', icon: BookMarked, color: '#f59e0b', tip: 'Focus on your top 3 weak chapters' },
                    ].map(({ label, val, icon: Icon, color, tip }) => (
                      <div key={label} className="card p-5 text-center">
                        <div className="w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: color + '18' }}>
                          <Icon size={18} style={{ color }} />
                        </div>
                        <div className="text-3xl font-black mb-0.5" style={{ color, fontFamily: 'Space Grotesk, sans-serif' }}>{val}</div>
                        <div className="font-semibold text-xs mb-2" style={{ color: 'var(--text-heading)' }}>{label}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{tip}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Helpers ── */
function AnalyticsLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Computing analytics…</span>
      </div>
    </div>
  );
}

function UpsellBanner({ type = 'basic' }) {
  const isPremiumUpsell = type === 'premium';
  return (
    <div className="card flex flex-col items-center justify-center p-12 text-center" style={{ border: '2px dashed var(--border-default)', background: 'var(--bg-subtle)' }}>
      <div className="w-16 h-16 rounded-full mb-4 flex items-center justify-center" style={{ background: 'var(--accent-primary-light)' }}>
        <Star size={28} style={{ color: 'var(--accent-primary)' }} />
      </div>
      <h3 className="text-2xl font-black mb-2" style={{ color: 'var(--text-heading)', fontFamily: 'Space Grotesk, sans-serif' }}>
        {isPremiumUpsell ? 'Unlock Premium Insights' : 'Unlock Advanced Analytics'}
      </h3>
      <p className="max-w-md text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        {isPremiumUpsell 
          ? <>Upgrade to a <strong style={{color: 'var(--text-heading)'}}>Premium</strong> plan to access mistake pattern analysis, AI score prediction, and personalized rank boost strategies.</>
          : <>Upgrade to a <strong style={{color: 'var(--text-heading)'}}>Basic</strong> or <strong style={{color: 'var(--text-heading)'}}>Premium</strong> plan to access detailed subject breakdowns and chapter heatmaps.</>
        }
      </p>
      <Link to="/subscription" className="btn btn-primary flex flex-shrink-0 items-center justify-center gap-2" style={{ fontSize: '13px' }}>
        <Star size={16} /> View Plans and Upgrade
      </Link>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="card flex flex-col items-center justify-center py-16 text-center">
      <BarChart2 size={32} className="mb-3" style={{ color: 'var(--text-muted)' }} />
      <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <Link to="/problems" className="btn btn-primary btn-sm mt-4">
        Start Practicing →
      </Link>
    </div>
  );
}

function generateRankBoostPlan(analytics) {
  const plan = [];
  const weak = analytics.weakTopics?.slice(0, 3) || [];
  if (weak.length) {
    plan.push({
      title: `Revise: ${weak.map(t => t.topic).join(', ')}`,
      action: `Your accuracy in these topics is < ${Math.max(...weak.map(t => t.accuracy))}%. Spend 45 min/day revising each.`,
      estimate: 'Expected +5–10% accuracy improvement in 2 weeks',
    });
  }
  const mp = analytics.mistakePatterns || {};
  if ((mp.careless?.count || 0) > 2) {
    plan.push({
      title: 'Eliminate Careless Mistakes',
      action: `You have ${mp.careless.count} careless errors on Easy questions. Use the 10-second rule: re-read before answering.`,
      estimate: '+4–8 marks per mock test',
    });
  }
  if ((mp.timeout?.count || 0) > 2) {
    plan.push({
      title: 'Improve Speed on Hard Questions',
      action: 'Practice timed drills — 3 min max per question. Skip & mark strategy for Hard Qs.',
      estimate: 'Save 10–15 min per mock test',
    });
  }
  const as = analytics.attemptStrategy || {};
  if (as.hitRate < 60 && (as.attempted || 0) > 5) {
    plan.push({
      title: 'Improve Mock Test Hit Rate',
      action: `Current hit rate ${as.hitRate}%. Avoid blind guessing. Only attempt questions you are 60%+ confident about.`,
      estimate: 'Prevent -20 to -30 from negative marking',
    });
  }
  if (as.attemptRate < 55 && (as.attempted || 0) > 5) {
    plan.push({
      title: 'Increase Attempt Rate Safely',
      action: `You are only attempting ${as.attemptRate}% of questions. Target 60–65% for JEE Main scoring zone.`,
      estimate: '+10–15 marks if accuracy holds',
    });
  }
  if (!plan.length) {
    plan.push({ title: 'Keep up the momentum!', action: 'Attempt 2 full-length mock tests this week and review every mistake.', estimate: 'Consistent practice = consistent improvement' });
  }
  return plan;
}
