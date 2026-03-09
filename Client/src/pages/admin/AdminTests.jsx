/**
 * AdminTests.jsx – Mock test management (admin)
 */
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../api/services';

export default function AdminTests() {
  const [tests,   setTests]  = useState([]);
  const [loading, setLoading]= useState(true);

  const load = () => {
    setLoading(true);
    adminAPI.getTests()
      .then(({ data }) => setTests(data.data?.tests || data.data || []))
      .catch(() => setTests([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this test?')) return;
    try { await adminAPI.deleteTest(id); toast.success('Deleted.'); load(); }
    catch (_) { toast.error('Failed.'); }
  };

  const togglePublish = async (test) => {
    try {
      await adminAPI.updateTest(test._id, { isPublished: !test.isPublished });
      toast.success(test.isPublished ? 'Unpublished.' : 'Published!');
      load();
    } catch (_) { toast.error('Failed.'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
          Mock Tests ({tests.length})
        </h1>
        <button className="btn btn-primary btn-sm gap-1.5"
                onClick={() => toast('Test builder coming soon – use API for now.')}>
          <Plus size={13} /> Create Test
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="jw-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Questions</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10">Loading…</td></tr>
              ) : tests.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
                  No tests yet. Create your first mock test via the API.
                </td></tr>
              ) : tests.map((t) => (
                <tr key={t._id}>
                  <td>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{t.title}</p>
                    {t.isPremium && <span className="badge badge-yellow text-xs ml-1">Premium</span>}
                  </td>
                  <td><span className="badge badge-indigo">{t.examType}</span></td>
                  <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.duration} min</td>
                  <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t.totalQuestions || (t.sections?.reduce((a, s) => a + (s.questions?.length || 0), 0))}
                  </td>
                  <td>
                    <button
                      onClick={() => togglePublish(t)}
                      className="badge cursor-pointer"
                      style={{
                        background: t.isPublished ? '#dcfce7' : '#fef3c7',
                        color: t.isPublished ? '#15803d' : '#92400e',
                      }}
                    >
                      {t.isPublished ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                    {t.attemptCount ?? 0}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button className="btn btn-ghost btn-sm" title="Edit">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(t._id)}
                              className="btn btn-ghost btn-sm" title="Delete"
                              style={{ color: 'var(--accent-danger)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
