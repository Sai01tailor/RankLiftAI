import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, BarChart2 } from 'lucide-react';
import { studentAPI } from '../../api/services';

export default function TestHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    studentAPI.getTestHistory({ page, limit: 10 })
      .then(({ data }) => {
        setHistory(data.data?.data || data.data || []);
        setTotalPages(data.data?.pagination?.totalPages || 1);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
          Test History & Analysis
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          View past mock test attempts, scores, and detailed analysis
        </p>
      </div>

      {/* History List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 rounded-full animate-spin"
                 style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>No test attempts found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="jw-table">
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Score</th>
                    <th>Rank / %ile</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((t) => (
                    <tr key={t._id}>
                      <td>
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {t.mockTestId?.title || 'Mock Test'}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {t.mockTestId?.examType || 'Practice'}
                        </p>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono" style={{ color: 'var(--accent-primary)' }}>
                            {t.totalScore ?? '—'}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            / {t.maxScore}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className="badge badge-indigo w-fit">#{t.rank ?? '—'}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {t.percentile ? `${t.percentile}%ile` : '—'}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }} className="text-sm">
                        {new Date(t.submittedAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td>
                        <Link
                          to={`/test/${t.mockTestId?._id}/analysis/${t._id}`}
                          className="btn btn-secondary btn-sm gap-1.5 whitespace-nowrap"
                        >
                          <BarChart2 size={13} /> Analysis
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 p-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary btn-sm"
                >
                  ← Prev
                </button>
                <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
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
          </>
        )}
      </div>
    </div>
  );
}
