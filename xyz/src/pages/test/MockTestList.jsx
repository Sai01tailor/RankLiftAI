/**
 * MockTestList.jsx – Mock Test set page
 * Shows available mock tests with search, exam-type filter, premium lock.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Lock, Search, BookOpen, ChevronRight, Users, Download } from 'lucide-react';
import { studentAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';

const EXAM_TYPES = ['All', 'JEE Main', 'JEE Advanced', 'Part Test'];

export default function MockTestList() {
  const { user } = useAuth();
  const [tests,   setTests]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [type,    setType]    = useState('All');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const isPremium = user?.subscription?.plan !== undefined && user?.subscription?.plan !== 'free';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    studentAPI.getTests({ examType: type !== 'All' ? type : undefined, search: search || undefined, limit: 50 })
      .then(({ data }) => setTests(data.data?.tests || data.data || []))
      .catch(() => setTests([]))
      .finally(() => setLoading(false));
  }, [type, search]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
          Mock Tests
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Full-length, NTA CBT-style mock tests for JEE Main & Advanced
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input className="input pl-9 w-full" placeholder="Search tests…"
                 value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 p-1 rounded-xl"
             style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
          {EXAM_TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                    style={{
                      background: type === t ? 'var(--bg-card)' : 'transparent',
                      color: type === t ? 'var(--text-heading)' : 'var(--text-muted)',
                      boxShadow: type === t ? 'var(--shadow-sm)' : 'none',
                    }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Test cards */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 rounded-full animate-spin"
               style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
        </div>
      ) : tests.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>No mock tests available yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((test) => {
            const locked = test.isPremium && !isPremium;
            return (
              <div key={test._id}
                   className="card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 card-hover"
                   style={{ opacity: locked ? 0.85 : 1 }}>
                {/* Left */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="badge badge-indigo">{test.examType}</span>
                    {test.isPremium && <span className="badge badge-yellow">Premium</span>}
                    {test.isAttempted && <span className="badge badge-green">Attempted</span>}
                  </div>
                  <h2 className="font-bold text-base truncate" style={{ color: 'var(--text-heading)' }}>
                    {test.title}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-xs flex-wrap"
                       style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {test.duration} min
                    </span>
                    <span>
                      {test.totalQuestions || (test.sections?.reduce((a, s) => a + (s.questions?.length || 0), 0))} questions
                    </span>
                    {test.attemptCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Users size={11} /> {test.attemptCount?.toLocaleString()} attempts
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: CTA */}
                {locked ? (
                  <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
                    <Lock size={14} style={{ color: 'var(--text-muted)' }} />
                    <Link to="/subscription" className="btn btn-secondary btn-sm flex-1 sm:flex-none justify-center">
                      Unlock
                    </Link>
                  </div>
                ) : test.isAttempted && test.lastAttemptId ? (
                  <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
                    <Link to={`/test/${test._id}/analysis/${test.lastAttemptId}`}
                          className="btn btn-ghost btn-sm flex-1 sm:flex-none justify-center">
                      Analysis
                    </Link>
                    {isMobile ? (
                      <Link to={`/test/${test._id}/pdf`}
                            className="btn btn-primary btn-sm gap-1 flex-1 sm:flex-none justify-center" target="_blank">
                        <Download size={14} /> PDF
                      </Link>
                    ) : (
                      <Link to={`/test/${test._id}/attempt`}
                            className="btn btn-primary btn-sm gap-1 flex-1 sm:flex-none justify-center">
                        Retry <ChevronRight size={12} />
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="w-full sm:w-auto mt-3 sm:mt-0">
                    {isMobile ? (
                      <Link to={`/test/${test._id}/pdf`}
                            className="btn btn-primary btn-sm gap-1 w-full sm:w-auto justify-center" target="_blank">
                        <Download size={14} /> Download PDF
                      </Link>
                    ) : (
                      <Link to={`/test/${test._id}/attempt`}
                            className="btn btn-primary btn-sm gap-1 w-full sm:w-auto justify-center">
                        Start Test <ChevronRight size={12} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
