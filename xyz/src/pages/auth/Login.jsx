/**
 * Login.jsx – Authentication page with two modes:
 *   1. Password-based login (default)
 *   2. OTP-based login (show email → send OTP → enter OTP)
 *
 * Layout: split-screen on desktop (brand panel + form), full form on mobile.
 * No Framer Motion here per spec (static pages = no animations on auth).
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import { authAPI } from '../../api/services';

export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login, sendOTP, loginWithOTP } = useAuth();

  /* ── where to go after login ── */
  const from = location.state?.from?.pathname || '/dashboard';

  const { settings } = useSite();

  /* ── Form state ── */
  const [mode, setMode]     = useState('password'); // 'password' | 'otp' | 'forgot' | 'reset'
  const [step, setStep]     = useState(1);          // OTP step 1 = send, 2 = verify
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [otp,      setOtp]      = useState('');
  const [newPassword, setNewPassword] = useState('');

  /* ─────────────────────── HANDLERS ─────────────────────── */
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back! 🎉');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]
               || err?.response?.data?.message
               || 'Login failed. Check your credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Enter your email first.'); return; }
    setLoading(true);
    try {
      await sendOTP(email);
      toast.success('OTP sent to your email!');
      setStep(2);
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]
               || err?.response?.data?.message
               || 'Failed to send OTP.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length < 4) { toast.error('Enter the complete OTP.'); return; }
    setLoading(true);
    try {
      await loginWithOTP(email, otp);
      toast.success('Logged in successfully! 🎉');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]
               || err?.response?.data?.message
               || 'Invalid OTP. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Enter your email first.'); return; }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      toast.success('OTP sent to your email!');
      setMode('reset');
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]
               || err?.response?.data?.message
               || 'Failed to send reset email.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) { toast.error('Please fill all fields.'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, otp, newPassword });
      toast.success('Password reset successfully! Please log in.');
      setMode('password');
      setOtp('');
      setNewPassword('');
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]
               || err?.response?.data?.message
               || 'Invalid OTP or failed to reset.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────── RENDER ─────────────────────── */
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>

      {/* ── Left brand panel (desktop only) ── */}
      <div
        className="hidden lg:flex lg:flex-col lg:justify-between w-[42%] p-12"
        style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}
      >
        {/* Logo */}
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

        {/* Headline */}
        <div>
          <h2 className="text-4xl font-black text-white mb-5 leading-tight"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {settings.loginContent ? (
              <span dangerouslySetInnerHTML={{ __html: settings.loginContent.replace(/\n/g, '<br/>') }} />
            ) : (
              <>Every minute you spend<br /><span style={{ color: '#fb923c' }}>here</span> is a minute<br />closer to IIT.</>
            )}
          </h2>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: '50K+', l: 'Active students' },
              { v: '1200+', l: 'Mock tests' },
              { v: '98.2%', l: 'Satisfaction rate' },
              { v: 'AIR 47', l: 'Top rank achieved' },
            ].map(({ v, l }) => (
              <div key={l} className="p-3 rounded-xl"
                   style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{v}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {settings.footerText}
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-2">
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
            Welcome back
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            New here?{' '}
            <Link to="/register" className="font-semibold" style={{ color: 'var(--text-link)' }}>
              Create a free account
            </Link>
          </p>

          {/* Mode toggle */}
          {(mode === 'password' || mode === 'otp') && (
            <div className="flex rounded-xl p-1 mb-7"
                 style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
              {['password', 'otp'].map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setStep(1); setOtp(''); }}
                  className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all"
                  style={{
                    background: mode === m ? 'var(--bg-card)' : 'transparent',
                    color: mode === m ? 'var(--text-heading)' : 'var(--text-muted)',
                    boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {m === 'password' ? 'Password' : 'OTP Login'}
                </button>
              ))}
            </div>
          )}

          {/* ── Password form ── */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    id="login-email"
                    type="email"
                    className="input pl-9"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label" style={{ margin: 0 }}>Password</label>
                  <button type="button" onClick={() => setMode('forgot')} className="text-xs font-semibold"
                          style={{ color: 'var(--text-link)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    className="input pl-9 pr-10"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg w-full gap-2"
              >
                {loading ? 'Signing in…' : <> Sign In <ArrowRight size={15} /> </>}
              </button>
            </form>
          )}

          {/* ── OTP form ── */}
          {mode === 'otp' && (
            <div>
              {step === 1 ? (
                <form onSubmit={handleSendOTP} className="space-y-5">
                  <div>
                    <label className="label">Email Address</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                            style={{ color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        id="otp-email"
                        type="email"
                        className="input pl-9"
                        placeholder="you@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full gap-2">
                    {loading ? 'Sending OTP…' : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  <div className="p-4 rounded-xl" style={{ background: 'var(--accent-primary-light)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
                      OTP sent to {email}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      Check your inbox. Valid for 10 minutes.
                    </p>
                  </div>
                  <div>
                    <label className="label">Enter OTP</label>
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      className="input text-2xl tracking-[0.5em] font-bold text-center"
                      placeholder="• • • • • •"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full gap-2">
                    {loading ? 'Verifying…' : <> Verify & Login <ArrowRight size={15} /></>}
                  </button>
                  <button type="button" onClick={() => setStep(1)}
                          className="text-sm w-full text-center"
                          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    ← Change email
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── Forgot Password form ── */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <h3 className="font-bold text-lg mb-2">Reset Password</h3>
              <p className="text-sm text-gray-400 mb-4">Enter your email to receive a reset OTP.</p>
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    id="forgot-email"
                    type="email"
                    className="input pl-9"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full gap-2">
                {loading ? 'Sending OTP…' : 'Send Reset OTP'}
              </button>
              <button type="button" onClick={() => setMode('password')}
                      className="text-sm w-full text-center"
                      style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Back to Login
              </button>
            </form>
          )}

          {/* ── Reset Password form ── */}
          {mode === 'reset' && (
             <form onSubmit={handleResetPassword} className="space-y-5">
               <h3 className="font-bold text-lg mb-2">Create New Password</h3>
               <div className="p-4 rounded-xl" style={{ background: 'var(--accent-primary-light)' }}>
                 <p className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
                   OTP sent to {email}
                 </p>
               </div>
               <div>
                 <label className="label">Enter OTP</label>
                 <input
                   id="reset-otp"
                   type="text"
                   inputMode="numeric"
                   pattern="[0-9]*"
                   maxLength={6}
                   className="input tracking-[0.3em] font-bold text-center"
                   placeholder="• • • • • •"
                   value={otp}
                   onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                   required
                 />
               </div>
               <div>
                 <label className="label">New Password</label>
                 <div className="relative">
                   <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                         style={{ color: 'var(--text-muted)', pointerEvents: 'none' }} />
                   <input
                     id="new-password"
                     type={showPw ? 'text' : 'password'}
                     className="input pl-9 pr-10"
                     placeholder="New password"
                     value={newPassword}
                     onChange={(e) => setNewPassword(e.target.value)}
                     required
                   />
                   <button
                     type="button"
                     onClick={() => setShowPw(!showPw)}
                     className="absolute right-3 top-1/2 -translate-y-1/2"
                     style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                     aria-label={showPw ? 'Hide password' : 'Show password'}
                   >
                     {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                   </button>
                 </div>
               </div>
               <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full gap-2">
                 {loading ? 'Saving…' : <> Save New Password <RefreshCw size={15} /></>}
               </button>
             </form>
          )}

          <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              By signing in, you agree to our{' '}
              <Link to="/terms" className="underline" style={{ color: 'var(--text-link)' }}>Terms & Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
