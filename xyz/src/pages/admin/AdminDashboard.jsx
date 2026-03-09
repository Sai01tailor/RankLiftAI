/**
 * AdminDashboard.jsx – Admin overview dashboard
 * Shows: total users, questions, tests, revenue stats + quick actions.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Trophy, DollarSign, TrendingUp, Plus } from 'lucide-react';
import { adminAPI } from '../../api/services';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminAPI.getStats()
      .then(({ data }) => setStats(data.data))
      .catch(() => {});
  }, []);

  const s = stats || {};

  const CARDS = [
    { label: 'Total Users',    value: s.users?.total || 0,        icon: Users,    color: '#3b82f6', to: '/admin/users' },
    { label: 'Questions',      value: s.content?.questions || 0,  icon: BookOpen, color: '#22c55e', to: '/admin/questions' },
    { label: 'Mock Tests',     value: s.content?.mockTests || 0,  icon: Trophy,   color: '#8b5cf6', to: '/admin/tests' },
    { label: 'Revenue (INR)',  value: `₹${(s.revenue || 0).toLocaleString()}`, icon: DollarSign, color: '#f97316', to: '/admin/subscriptions' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
          Admin Dashboard
        </h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map(({ label, value, icon: Icon, color, to }) => (
          <Link key={label} to={to} className="stat-card block card-hover">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: `${color}18` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <TrendingUp size={14} style={{ color: 'var(--accent-success)' }} />
            </div>
            <p className="stat-value">{value}</p>
            <p className="stat-label">{label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card p-6">
        <h2 className="font-bold mb-4" style={{ color: 'var(--text-heading)' }}>Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/questions" className="btn btn-primary btn-sm gap-1.5">
            <Plus size={13} /> Add Question
          </Link>
          <Link to="/admin/tests" className="btn btn-secondary btn-sm gap-1.5">
            <Plus size={13} /> Create Mock Test
          </Link>
          <Link to="/admin/users" className="btn btn-secondary btn-sm gap-1.5">
            Manage Users
          </Link>
          <Link to="/admin/subscriptions" className="btn btn-secondary btn-sm gap-1.5">
            View Subscriptions
          </Link>
        </div>
      </div>
    </div>
  );
}
