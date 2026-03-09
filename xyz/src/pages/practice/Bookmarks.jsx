import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, StickyNote, ChevronRight, BookmarkMinus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentAPI } from '../../api/services';

const DIFF_COLORS = {
  Easy:   { color: '#22c55e', bg: '#dcfce7' },
  Medium: { color: '#f59e0b', bg: '#fef3c7' },
  Hard:   { color: '#ef4444', bg: '#fee2e2' },
};

export default function Bookmarks() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await studentAPI.getBookmarks({ page, limit: 15 });
      setItems(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  const handleRemoveBookmark = async (questionId) => {
    try {
      await studentAPI.bookmarkQuestion(questionId);
      setItems(prevItems => prevItems.reduce((acc, item) => {
        if (item.questionId?._id === questionId) {
          // If it also has a note, just update isBookmarked to false. Otherwise, remove it entirely.
          if (item.userNote && item.userNote.trim() !== '') {
            acc.push({ ...item, isBookmarked: false });
          }
        } else {
          acc.push(item);
        }
        return acc;
      }, []));
      toast.success('Bookmark removed');
    } catch (err) {
      toast.error('Failed to remove bookmark');
    }
  };

  const handleRemoveNote = async (questionId) => {
    try {
      await studentAPI.deleteNote(questionId);
      setItems(prevItems => prevItems.reduce((acc, item) => {
        if (item.questionId?._id === questionId) {
          // If it is also bookmarked, just remove the note. Otherwise, remove entirely.
          if (item.isBookmarked) {
            acc.push({ ...item, userNote: null });
          }
        } else {
          acc.push(item);
        }
        return acc;
      }, []));
      toast.success('Note deleted');
    } catch (err) {
      toast.error('Failed to delete note');
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
          Revise Later &amp; Notes
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Review your bookmarked problems and personal notes
        </p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto"
                 style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Bookmark size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>No bookmarked problems or notes found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="jw-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Type</th>
                  <th>Problem Content</th>
                  <th>Difficulty</th>
                  <th>Subject</th>
                  <th>Notes</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const q = item.questionId;
                  if (!q) return null; // Defensive check
                  const diff = DIFF_COLORS[q.difficulty] || DIFF_COLORS.Medium;
                  const textContent = (q.content?.en?.text || q.content?.text || '').substring(0, 80) + '...';

                  return (
                    <tr key={item._id}>
                      <td>
                        {item.isBookmarked && <Bookmark size={15} style={{ color: '#f97316', fill: '#f97316' }} />}
                        {!item.isBookmarked && item.userNote && <StickyNote size={15} style={{ color: '#6366f1' }} />}
                      </td>
                      <td>
                        <Link
                          to={`/problems/${q._id}`}
                          className="font-medium text-sm hover:underline"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {/* Strip HTML tags quickly for preview */}
                          <span dangerouslySetInnerHTML={{ __html: textContent }} />
                        </Link>
                      </td>
                      <td>
                        <span className="badge text-xs" style={{ background: diff.bg, color: diff.color }}>
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {item.subjectId?.name || '—'}
                      </td>
                      <td className="text-xs" style={{ color: 'var(--text-muted)', maxWidth: '200px' }}>
                        <div className="truncate">
                            {item.userNote ? item.userNote : <span className="text-gray-400 italic">No notes</span>}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {item.isBookmarked && (
                            <button onClick={() => handleRemoveBookmark(q._id)} 
                                    className="btn btn-sm btn-ghost p-1" title="Remove Bookmark">
                              <BookmarkMinus size={15} style={{ color: '#ef4444' }} />
                            </button>
                          )}
                          {item.userNote && (
                            <button onClick={() => handleRemoveNote(q._id)} 
                                    className="btn btn-sm btn-ghost p-1" title="Delete Note">
                              <Trash2 size={15} style={{ color: '#ef4444' }} />
                            </button>
                          )}
                          <Link to={`/problems/${q._id}`} className="btn btn-sm btn-ghost p-1">
                            <ChevronRight size={15} />
                          </Link>
                        </div>
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
