/**
 * AdminUsers.jsx – User management with role/subscription control
 */
import { useState, useEffect } from 'react';
import { Search, Shield, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../api/services';

export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);

  const load = () => {
    setLoading(true);
    adminAPI.getUsers({ page, limit: 20, search: search || undefined })
      .then(({ data }) => setUsers(data.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [page, search]);

  const toggleAdmin = async (user) => {
    const newRole = user.role === 'admin' ? 'student' : 'admin';
    try {
      await adminAPI.updateUser(user._id, { role: newRole });
      toast.success(`${user.username} is now ${newRole}`);
      load();
    } catch (_) { toast.error('Update failed.'); }
  };

  const banUser = async (user) => {
    const currentlyBanned = user.accountStatus === 'banned';
    if (!confirm(`${currentlyBanned ? 'Unban' : 'Ban'} ${user.username}?`)) return;
    try {
      await adminAPI.updateUser(user._id, { isBanned: !currentlyBanned });
      toast.success(currentlyBanned ? 'User unbanned.' : 'User banned.');
      load();
    } catch (_) { toast.error('Failed.'); }
  };

  const updatePlan = async (user, newPlan) => {
    if ((user.subscription?.plan || 'free') === newPlan) return;
    if (!confirm(`Change ${user.username}'s plan to ${newPlan.toUpperCase()}?`)) return;
    try {
      await adminAPI.updateUser(user._id, { subscriptionPlan: newPlan });
      toast.success(`Plan updated to ${newPlan}`);
      load();
    } catch (_) { toast.error('Failed to update plan.'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
        Users ({users.length})
      </h1>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input className="input pl-9 max-w-xs" placeholder="Search users…" value={search}
               onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="jw-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Plan</th>
                <th>Streak</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No users found.</td></tr>
              ) : users.map((u) => {
                const isBanned = u.accountStatus === 'banned';
                return (
                <tr key={u._id} style={{ opacity: isBanned ? 0.5 : 1 }}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                           style={{ background: 'var(--gradient-brand)' }}>
                        {u.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.username}</span>
                    </div>
                  </td>
                  <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-red' : 'badge-gray'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <select
                      className="text-xs font-bold rounded-md bg-transparent border uppercase tracking-wide cursor-pointer focus:outline-none"
                      value={u.subscription?.plan || 'free'}
                      onChange={(e) => updatePlan(u, e.target.value)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderColor: 'var(--border-subtle)',
                        color: (u.subscription?.plan || 'free') === 'premium' ? '#f59e0b' : (u.subscription?.plan || 'free') === 'basic' ? '#3b82f6' : 'var(--text-muted)'
                      }}
                    >
                      <option value="free">FREE</option>
                      <option value="basic">BASIC</option>
                      <option value="premium">PREMIUM</option>
                    </select>
                  </td>
                  <td className="text-sm text-center" style={{ color: 'var(--accent-primary)' }}>
                    🔥 {u.streak?.currentStreak || 0}
                  </td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(u.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleAdmin(u)}
                              className="btn btn-ghost btn-sm" title="Toggle admin">
                        {u.role === 'admin' ? <ShieldOff size={13} /> : <Shield size={13} />}
                      </button>
                      <button onClick={() => banUser(u)}
                              className="btn btn-ghost btn-sm text-xs"
                              style={{ color: isBanned ? '#22c55e' : '#ef4444' }}>
                        {isBanned ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {users.length === 20 && (
          <div className="flex gap-2 justify-center p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="btn btn-secondary btn-sm">← Prev</button>
            <span className="text-sm self-center" style={{ color: 'var(--text-muted)' }}>Page {page}</span>
            <button onClick={() => setPage((p) => p + 1)}
                    className="btn btn-secondary btn-sm">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
