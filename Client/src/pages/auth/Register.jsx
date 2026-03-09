/**
 * Register.jsx – Student registration page
 * Collects: name, email, phone, password, targetExam, targetYear, class
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Phone, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';

const EXAM_OPTIONS  = ['JEE Main', 'JEE Advanced', 'Both'];
const YEAR_OPTIONS  = [2025, 2026, 2027, 2028];
const CLASS_OPTIONS = [
  { label: 'Class 11', value: '11' },
  { label: 'Class 12', value: '12' },
  { label: 'Dropper',  value: 'Dropper' },
];

export default function Register() {
  const navigate  = useNavigate();                                  
  const { register } = useAuth();
  const { settings } = useSite();

  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const [form, setForm] = useState({
    username:   '',
    email:      '',
    phone:      '',
    password:   '',
    targetExam: 'Both',
    targetYear: 2026,
    className:  '12',
  });

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await register({
        username:   form.username,
        email:      form.email,
        phone:      form.phone,
        password:   form.password,
        targetExam: form.targetExam,
        targetYear: parseInt(form.targetYear),
        class:      form.className,  // already '11', '12', or 'Dropper'
      });
      toast.success(`Account created! Welcome to ${settings.siteName} 🎉`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]
               || err?.response?.data?.message
               || 'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>

      {/* ── Brand panel ── */}
      <div
        className="hidden lg:flex lg:flex-col lg:justify-between w-[40%] p-12"
        style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}
      >
        <Link to="/" className="flex items-center gap-2.5">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.siteName} className="w-9 h-9 object-contain rounded-xl" />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white"
                 style={{ background: 'var(--gradient-brand)', fontSize: '1.1rem' }}>{settings.siteName?.charAt(0).toUpperCase()}</div>
          )}
          <span className="font-bold text-xl text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {settings.siteName}
          </span>
        </Link>

        <div>
          <h2 className="text-4xl font-black text-white mb-6 leading-tight"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {settings.signupContent ? (
              <span dangerouslySetInnerHTML={{ __html: settings.signupContent.replace(/\n/g, '<br/>') }} />
            ) : (
              <>Your IIT journey<br /><span style={{ color: '#fb923c' }}>starts right now.</span></>
            )}
          </h2>
          <ul className="space-y-3">
            {[
              'Free mock tests immediately after signup',
              'NTA CBT interface — no learning curve',
              'AI-powered study plan from day one',
              'Track every problem you solve',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm"
                  style={{ color: 'rgba(255,255,255,0.6)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {settings.footerText}
        </p>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden mb-6 flex items-center gap-2">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.siteName} className="w-8 h-8 object-contain rounded-xl" />
            ) : (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white"
                   style={{ background: 'var(--gradient-brand)' }}>{settings.siteName?.charAt(0).toUpperCase()}</div>
            )}
            <span className="font-bold text-base" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
              {settings.siteName}
            </span>
          </div>

          <h1 className="text-3xl font-black mb-1"
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
            Create your account
          </h1>
          <p className="text-sm mb-7" style={{ color: 'var(--text-muted)' }}>
            Already have one?{' '}
            <Link to="/login" className="font-semibold" style={{ color: 'var(--text-link)' }}>Sign in</Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input id="reg-name" type="text" className="input pl-9"
                       placeholder="Arjun Sharma" value={form.username}
                       onChange={set('username')} required />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input id="reg-email" type="email" className="input pl-9"
                         placeholder="you@email.com" value={form.email}
                         onChange={set('email')} required />
                </div>
              </div>
              <div>
                <label className="label">Phone</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                         style={{ color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input id="reg-phone" type="tel" className="input pl-9"
                         placeholder="9876543210" value={form.phone}
                         onChange={set('phone')} required maxLength={10} />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input id="reg-password" type={showPw ? 'text' : 'password'}
                       className="input pl-9 pr-10"
                       placeholder="Min 8 characters" value={form.password}
                       onChange={set('password')} required minLength={8} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                        aria-label={showPw ? 'Hide' : 'Show'}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* JEE-specific fields */}
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Target Exam</label>
                <select id="reg-exam" className="input" value={form.targetExam} onChange={set('targetExam')}>
                  {EXAM_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Target Year</label>
                <select id="reg-year" className="input" value={form.targetYear} onChange={set('targetYear')}>
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Class</label>
                <select id="reg-class" className="input" value={form.className} onChange={set('className')}>
                  {CLASS_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg w-full gap-2 mt-2"
            >
              {loading ? 'Creating account…' : <> Create Account <ArrowRight size={15} /></>}
            </button>

            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              By signing up, you agree to our{' '}
              <Link to="/terms" className="underline" style={{ color: 'var(--text-link)' }}>Terms & Policy</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
