/**
 * ProblemSet.jsx – Problem Set page (Module D partial)
 * ─────────────────────────────────────────────────────────────────────────────
 * Advanced filter bar: Subject → Chapter → Topic + Difficulty + Type + Status
 * Displays a LeetCode-style list of problems with key metadata.
 * No Framer Motion (static page per spec).
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, CheckCircle2, Circle, AlertCircle,
  Bookmark, ChevronRight, X,
} from 'lucide-react';
import { studentAPI } from '../../api/services';

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];
const TYPES        = ['All', 'SCQ', 'MCQ', 'Integer', 'Numerical'];
const STATUSES     = ['All', 'Solved', 'Attempted', 'Unsolved', 'Bookmarked'];

const DIFF_COLORS = {
  Easy:   { color: '#22c55e', bg: '#dcfce7' },
  Medium: { color: '#f59e0b', bg: '#fef3c7' },
  Hard:   { color: '#ef4444', bg: '#fee2e2' },
};

export default function ProblemSet() {
  const [problems,  setProblems]  = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [chapters,  setChapters]  = useState([]);
  const [topics,    setTopics]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [totalPages,setTotalPages]= useState(1);
  const [dailyProblem, setDailyProblem] = useState(null);

  const [filters, setFilters] = useState({
    search:     '',
    subject:    '',
    chapter:    '',
    topic:      '',
    difficulty: 'All',
    type:       'All',
    status:     'All',
  });

  const setF = (k) => (v) => setFilters((f) => ({ ...f, [k]: v, ...(k === 'subject' ? { chapter: '', topic: '' } : {}), ...(k === 'chapter' ? { topic: '' } : {}) }));

  /* ── Load subjects on mount ── */
  useEffect(() => {
    studentAPI.getSubjects()
      .then(({ data }) => setSubjects(data.data?.subjects || data.data || []))
      .catch(() => {});
  }, []);

  /* ── Load chapters when subject changes ── */
  useEffect(() => {
    if (!filters.subject) { setChapters([]); setTopics([]); return; }
    studentAPI.getChapters(filters.subject)
      .then(({ data }) => setChapters(data.data?.chapters || data.data || []))
      .catch(() => {});
  }, [filters.subject]);

  /* ── Load topics when chapter changes ── */
  useEffect(() => {
    if (!filters.chapter) { setTopics([]); return; }
    studentAPI.getTopics(filters.chapter)
      .then(({ data }) => setTopics(data.data?.topics || data.data || []))
      .catch(() => {});
  }, [filters.chapter]);

  /* ── Fetch problems on filter/page change ── */
  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 25,
        ...(filters.subject !== '' && { subject: filters.subject }),
        ...(filters.chapter !== '' && { chapter: filters.chapter }),
        ...(filters.topic   !== '' && { topic:   filters.topic }),
        ...(filters.difficulty !== 'All' && { difficulty: filters.difficulty.toLowerCase() }),
        ...(filters.type       !== 'All' && { type:       filters.type }),
        ...(filters.search !== '' && { search: filters.search }),
      };
      const { data } = await studentAPI.getQuestions(params);
      // paginated endpoint: data.data is the array, pagination is at data.pagination
      const list = Array.isArray(data.data) ? data.data : (data.data?.questions || []);
      setProblems(list);
      setTotalPages(data.pagination?.totalPages || data.data?.totalPages || 1);
    } catch (_) { setProblems([]); }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { fetchProblems(); }, [fetchProblems]);

  useEffect(() => {
    studentAPI.getDailyProblem()
      .then(({ data }) => setDailyProblem(data.data?.dailyProblem))
      .catch(() => {});
  }, []);

  const clearFilters = () =>
    setFilters({ search: '', subject: '', chapter: '', topic: '', difficulty: 'All', type: 'All', status: 'All' });

  const hasFilters = filters.subject || filters.difficulty !== 'All' || filters.type !== 'All' || filters.search;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
            Problem Set
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            15,000+ JEE questions across Physics, Chemistry & Mathematics
          </p>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="btn btn-ghost btn-sm gap-1.5"
                  style={{ color: 'var(--accent-danger)' }}>
            <X size={13} /> Clear filters
          </button>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div className="card p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="input pl-9 w-full"
            placeholder="Search problems by name or topic…"
            value={filters.search}
            onChange={(e) => setF('search')(e.target.value)}
          />
        </div>

        {/* Dropdowns row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {/* Subject */}
          <select className="input text-sm" value={filters.subject} onChange={(e) => setF('subject')(e.target.value)}>
            <option value="">All Subjects</option>
            {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>

          {/* Chapter */}
          <select className="input text-sm" value={filters.chapter} onChange={(e) => setF('chapter')(e.target.value)}
                  disabled={!filters.subject}>
            <option value="">All Chapters</option>
            {chapters.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>

          {/* Topic */}
          <select className="input text-sm" value={filters.topic} onChange={(e) => setF('topic')(e.target.value)}
                  disabled={!filters.chapter}>
            <option value="">All Topics</option>
            {topics.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>

          {/* Difficulty */}
          <select className="input text-sm" value={filters.difficulty}
                  onChange={(e) => setF('difficulty')(e.target.value)}>
            {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
          </select>

          {/* Type */}
          <select className="input text-sm" value={filters.type}
                  onChange={(e) => setF('type')(e.target.value)}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* ── Problem list table ── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto"
                 style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
          </div>
        ) : problems.length === 0 ? (
          <div className="p-12 text-center">
            <Filter size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>No problems match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="jw-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Status</th>
                  <th>#</th>
                  <th>Problem</th>
                  <th>Difficulty</th>
                  <th className="hidden sm:table-cell">Type</th>
                  <th className="hidden md:table-cell">Subject</th>
                  <th className="hidden lg:table-cell text-center">Solved By</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {page === 1 && !hasFilters && dailyProblem && (
                  <tr key={`daily-${dailyProblem._id}`} style={{ backgroundColor: 'var(--accent-primary-alpha)' }}>
                    <td>
                      {dailyProblem.userStatus === 'solved' ? (
                        <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
                      ) : dailyProblem.userStatus === 'attempted' ? (
                        <AlertCircle size={16} style={{ color: '#f59e0b' }} />
                      ) : (
                        <Circle size={16} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </td>
                    <td className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>
                      ★
                    </td>
                    <td>
                      <Link to={`/problems/${dailyProblem._id}`} className="font-medium text-sm hover:underline" style={{ color: 'var(--accent-primary)' }}>
                        {dailyProblem.title || `Daily Problem`}
                      </Link>
                      <span className="badge badge-sm ml-2" style={{ background: 'var(--accent-primary)', color: 'white' }}>Daily</span>
                    </td>
                    <td>
                      <span className="badge text-xs" style={{ background: (DIFF_COLORS[dailyProblem.difficulty] || DIFF_COLORS.Medium).bg, color: (DIFF_COLORS[dailyProblem.difficulty] || DIFF_COLORS.Medium).color }}>
                        {dailyProblem.difficulty}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell"><span className="badge badge-gray text-xs">{dailyProblem.type}</span></td>
                    <td className="text-sm hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {dailyProblem.subject?.name || '—'}
                    </td>
                    <td className="text-xs text-center hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>
                      {dailyProblem.solvedByCount?.toLocaleString() || '0'}
                    </td>
                    <td>
                      <Link to={`/problems/${dailyProblem._id}`} style={{ color: 'var(--text-muted)' }}>
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                )}
                {problems.map((p, i) => {
                  const diff = DIFF_COLORS[p.difficulty] || DIFF_COLORS.Medium;
                  return (
                    <tr key={p._id}>
                      {/* Status icon */}
                      <td>
                        {p.userStatus === 'solved' ? (
                          <CheckCircle2 size={16} style={{ color: '#22c55e' }} title="Solved" />
                        ) : p.userStatus === 'attempted' ? (
                          <AlertCircle size={16} style={{ color: '#f59e0b' }} title="Attempted" />
                        ) : (
                          <Circle size={16} style={{ color: 'var(--text-muted)' }} title="Not attempted" />
                        )}
                      </td>
                      {/* Serial */}
                      <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {(page - 1) * 25 + i + 1}
                      </td>
                      {/* Title */}
                      <td>
                        <Link
                          to={`/problems/${p._id}`}
                          state={{ problemIds: problems.map(q => q._id) }}
                          className="font-medium text-sm hover:underline"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {p.title || `${p.subject?.name || 'Question'} ${i + 1}`}
                        </Link>
                        {p.isBookmarked && (
                          <Bookmark size={11} className="inline ml-2"
                                   style={{ color: '#f97316', fill: '#f97316' }} />
                        )}
                      </td>
                      {/* Difficulty */}
                      <td>
                        <span className="badge text-xs"
                              style={{ background: diff.bg, color: diff.color }}>
                          {p.difficulty}
                        </span>
                      </td>
                      {/* Type */}
                      <td className="hidden sm:table-cell"><span className="badge badge-gray text-xs">{p.type}</span></td>
                      {/* Subject */}
                      <td className="text-sm hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {p.subject?.name || '—'}
                      </td>
                      {/* Solved by */}
                      <td className="text-xs text-center hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>
                        {p.solvedByCount?.toLocaleString() || '0'}
                      </td>
                      {/* Arrow */}
                      <td>
                        <Link to={`/problems/${p._id}`}
                              style={{ color: 'var(--text-muted)' }}>
                          <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4"
               style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-secondary btn-sm"
            >
              ← Prev
            </button>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-secondary btn-sm"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
