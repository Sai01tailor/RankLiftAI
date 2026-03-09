/**
 * Settings.jsx – Account settings: password change, notifications, danger zone.
 */
import { useState } from 'react';
import { Lock, Bell, Trash2, Moon, Eye, EyeOff, Globe2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/services';
import { useLang, REGIONAL_LANGUAGES } from '../../context/LanguageContext';

function Section({ title, desc, children }) {
  return (
    <div className="card p-6">
      <div className="mb-5">
        <h3 className="font-bold text-base" style={{ color: 'var(--text-heading)' }}>{title}</h3>
        {desc && <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const { user, updateProfile } = useAuth();
  const { preferredThirdLang, setPreferredThirdLang } = useLang();

  const [prefLang, setPrefLang] = useState(user?.profile?.preferredLanguage || 'en');

  const [pwForm, setPwForm]   = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw]   = useState(false);
  const [saving, setSaving]   = useState(false);

  const [notifs, setNotifs] = useState({
    testReminders:   true,
    weeklyReport:    true,
    streakAlert:     true,
    aiInsights:      false,
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    if (pwForm.newPw.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.newPw });
      toast.success('Password changed successfully!');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-black mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
        Settings
      </h1>

      {/* ── Preferences ── */}
      <Section title="Language Preference" desc="Choose your regional language for reading questions. Available in practice and mock test modes.">
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Regional / Third Language</label>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              Your 3 available langs will be: English · Hindi · Your choice below
            </p>
            <select
              value={preferredThirdLang}
              onChange={async (e) => {
                const code = e.target.value;
                setPreferredThirdLang(code);
                try {
                  await updateProfile({ preferredLanguage: code });
                  toast.success('Language preference saved!');
                } catch {
                  toast.error('Failed to save preference.');
                }
              }}
              className="input w-56"
            >
              {REGIONAL_LANGUAGES.map(({ code, name, label }) => (
                <option key={code} value={code}>{label} — {name}</option>
              ))}
            </select>
          </div>
          <p className="text-xs p-3 rounded-xl" style={{ background: 'var(--accent-primary-light)', color: 'var(--accent-primary)' }}>
            ℹ️ JEE Advanced questions are only available in English and Hindi.
          </p>
        </div>
      </Section>

      {/* ── Appearance ── */}
      <Section title="Appearance" desc="Manage your visual preferences.">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                 style={{ background: isDark ? '#1a2235' : '#f1f5f9' }}>
              <Moon size={16} style={{ color: isDark ? '#6366f1' : '#94a3b8' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Late Night / Dark Mode
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Optimised for 12 AM study sessions — reduces blue light
              </p>
            </div>
          </div>
          {/* Toggle switch */}
          <button
            onClick={toggleTheme}
            role="switch"
            aria-checked={isDark}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: isDark ? 'var(--accent-secondary)' : 'var(--border-default)' }}
          >
            <span
              className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
              style={{ transform: isDark ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </Section>

      {/* ── Notifications ── */}
      <Section title="Notifications" desc="Control what emails and alerts you receive.">
        <div className="space-y-4">
          {Object.entries(notifs).map(([key, val]) => {
            const labels = {
              testReminders:  { title: 'Test Reminders',   desc: 'Daily reminder to take mock tests' },
              weeklyReport:   { title: 'Weekly Report',    desc: 'Summary of your weekly performance' },
              streakAlert:    { title: 'Streak Alert',     desc: 'Notify before your streak breaks' },
              aiInsights:     { title: 'AI Study Insights',desc: 'Personalised tips from Gemini' },
            };
            const { title, desc } = labels[key];
            return (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
                <button
                  onClick={() => setNotifs({ ...notifs, [key]: !val })}
                  role="switch"
                  aria-checked={val}
                  className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                  style={{ background: val ? 'var(--accent-primary)' : 'var(--border-default)' }}
                >
                  <span
                    className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: val ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Change password ── */}
      <Section title="Change Password" desc="Use a strong, unique password.">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {[
            { id: 'cur', label: 'Current Password', key: 'current',  placeholder: 'Current password' },
            { id: 'new', label: 'New Password',      key: 'newPw',    placeholder: 'Min 8 characters' },
            { id: 'cfm', label: 'Confirm New',       key: 'confirm',  placeholder: 'Repeat new password' },
          ].map(({ id, label, key, placeholder }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  id={id}
                  type={showPw ? 'text' : 'password'}
                  className="input pl-9 pr-10"
                  placeholder={placeholder}
                  value={pwForm[key]}
                  onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                  required
                />
                {key === 'current' && (
                  <button type="button" onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="submit" disabled={saving} className="btn btn-primary btn-sm gap-2">
            <Lock size={13} /> {saving ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </Section>

      {/* ── Danger zone ── */}
      <div className="card p-6" style={{ borderColor: '#fca5a5' }}>
        <h3 className="font-bold text-base mb-1" style={{ color: '#dc2626' }}>Danger Zone</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Deleting your account is permanent and cannot be undone.
        </p>
        <button
          onClick={() => toast.error('Account deletion requires email confirmation. Contact support.')}
          className="btn btn-danger btn-sm gap-2"
        >
          <Trash2 size={13} /> Delete My Account
        </button>
      </div>
    </div>
  );
}
