/**
 * Profile.jsx – Student profile page with Framer Motion animations allowed.
 * Shows avatar, stats rings, exam info, and recent activity.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../api/services';
import { useEffect } from 'react';

const EXAM_OPTIONS  = ['JEE Main', 'JEE Advanced', 'Both'];
const YEAR_OPTIONS  = [2025, 2026, 2027, 2028];
const CLASS_OPTIONS = ['Class 11', 'Class 12', 'Dropper'];

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [testsCount, setTestsCount] = useState(0);
  const [form, setForm] = useState({
    username:   user?.username   || '',
    phone:      user?.phone      || '',
    targetExam: user?.targetExam || 'Both',
    targetYear: user?.targetYear || 2026,
    class:      user?.class      || 'Class 12',
    bio:        user?.bio        || '',
  });

  useEffect(() => {
    // Attempt to quickly aggregate tests taken
    studentAPI.getDashboard().then(({ data }) => {
      setTestsCount(data.data.mockTestsTaken || 0);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success('Profile updated!');
      setEditing(false);
    } catch (_) {
      toast.error('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const avatarLetter = (user?.username?.[0] || 'U').toUpperCase();

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* ── Profile card ── */}
      <motion.div variants={fadeUp} className="card overflow-hidden">
        {/* Cover / gradient banner */}
        <div
          className="h-28 w-full"
          style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}
        />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-10 mb-4 flex items-end justify-between">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-full border-4 flex items-center justify-center font-black text-2xl text-white"
                style={{ borderColor: 'var(--bg-card)', background: 'var(--gradient-brand)' }}
              >
                {avatarLetter}
              </div>
              <button
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent-primary)', color: '#fff' }}
                aria-label="Change avatar"
              >
                <Camera size={13} />
              </button>
            </div>

            {/* Edit / Save button */}
            {!editing ? (
              <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm gap-1.5">
                <Edit2 size={13} /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm gap-1.5">
                  <X size={13} /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm gap-1.5">
                  <Save size={13} /> {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {/* Name + email */}
          {!editing ? (
            <>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>
                {user?.username}
              </h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
              {form.bio && (
                <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {form.bio}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Display Name</label>
                  <input className="input" value={form.username}
                         onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={form.phone}
                         onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="label">Target Exam</label>
                  <select className="input" value={form.targetExam}
                          onChange={(e) => setForm({ ...form, targetExam: e.target.value })}>
                    {EXAM_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Target Year</label>
                  <select className="input" value={form.targetYear}
                          onChange={(e) => setForm({ ...form, targetYear: e.target.value })}>
                    {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Class</label>
                  <select className="input" value={form.class}
                          onChange={(e) => setForm({ ...form, class: e.target.value })}>
                    {CLASS_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Bio (optional)</label>
                <textarea className="input resize-none" rows={3} value={form.bio}
                          placeholder="Tell us about yourself…"
                          onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── JEE details ── */}
      <motion.div variants={fadeUp} className="card p-6">
        <h3 className="font-bold mb-4" style={{ color: 'var(--text-heading)' }}>Exam Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Target Exam', value: user?.profile?.targetExam || user?.targetExam || 'Both' },
            { label: 'Target Year', value: user?.profile?.targetYear || user?.targetYear || '—' },
            { label: 'Class',       value: user?.profile?.class || user?.class || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-3 rounded-xl"
                 style={{ background: 'var(--bg-subtle)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="font-bold" style={{ color: 'var(--text-heading)' }}>{value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Account info ── */}
      <motion.div variants={fadeUp} className="card p-6">
        <h3 className="font-bold mb-4" style={{ color: 'var(--text-heading)' }}>Account Info</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Email</span>
            <span style={{ color: 'var(--text-primary)' }}>{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Role</span>
            <span className="badge badge-orange capitalize">{user?.role || 'student'}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Subscription Plan</span>
            <span className={`badge uppercase ${user?.subscription?.plan === 'premium' ? 'badge-yellow' : user?.subscription?.plan === 'basic' ? 'badge-blue' : 'badge-gray'}`}>
              {user?.subscription?.plan || 'free'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ color: 'var(--text-muted)' }}>Mock Tests Used</span>
            <span style={{ color: 'var(--text-primary)' }} className="flex items-center gap-2">
              <span className="font-bold">{testsCount}</span>
              {(user?.subscription?.plan || 'free') === 'free' && <span className="text-xs text-red-400">/ 3 limit</span>}
              {(user?.subscription?.plan || 'free') === 'basic' && <span className="text-xs text-blue-400">/ 5 this month</span>}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Member since</span>
            <span style={{ color: 'var(--text-primary)' }}>
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                : '—'}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
