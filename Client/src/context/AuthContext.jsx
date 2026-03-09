/**
 * AuthContext.jsx
 * ───────────────────────────────────────────────────────────────────────────
 * Central authentication state manager.
 *
 * Features:
 *  • Stores user object and JWT access/refresh tokens
 *  • Handles password-based and OTP-based login flows
 *  • Persists tokens in localStorage with auto-restore on refresh
 *  • Exposes register, login, loginWithOTP, logout, updateProfile
 *  • Makes user available to all components via useAuth()
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import axiosInstance, { setAuthToken } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true); // Splash-screen guard
  const [accessToken, setAccessToken] = useState(null);

  /** ── Restore session from localStorage on mount ── */
  useEffect(() => {
    const storedToken = localStorage.getItem('jw-access-token');
    const storedUser  = localStorage.getItem('jw-user');
    if (storedToken && storedUser) {
      setAccessToken(storedToken);
      setUser(JSON.parse(storedUser));
      setAuthToken(storedToken); // Attach to axios default headers
    }
    setLoading(false);
  }, []);

  /** ── Persist tokens to localStorage whenever they change ── */
  const persistSession = useCallback((token, userData) => {
    setAccessToken(token);
    setUser(userData);
    setAuthToken(token);
    localStorage.setItem('jw-access-token', token);
    localStorage.setItem('jw-user', JSON.stringify(userData));
  }, []);

  /** ── Clear session ── */
  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('jw-access-token');
    localStorage.removeItem('jw-user');
    localStorage.removeItem('jw-refresh-token');
  }, []);

  /** ── Register a new student ── */
  const register = useCallback(async (payload) => {
    const { data } = await axiosInstance.post('/auth/register', payload);
    const d = data.data;
    // Backend wraps tokens: { user, tokens: { accessToken, refreshToken } }
    const accessToken  = d.tokens?.accessToken  ?? d.accessToken;
    const refreshToken = d.tokens?.refreshToken ?? d.refreshToken;
    persistSession(accessToken, d.user ?? d);
    if (refreshToken) localStorage.setItem('jw-refresh-token', refreshToken);
    return data;
  }, [persistSession]);

  /** ── Password-based login ── */
  const login = useCallback(async (email, password) => {
    const { data } = await axiosInstance.post('/auth/login', { email, password });
    const d = data.data;
    const accessToken  = d.tokens?.accessToken  ?? d.accessToken;
    const refreshToken = d.tokens?.refreshToken ?? d.refreshToken;
    persistSession(accessToken, d.user ?? d);
    if (refreshToken) localStorage.setItem('jw-refresh-token', refreshToken);
    return data;
  }, [persistSession]);

  /** ── Send OTP to email/phone ── */
  const sendOTP = useCallback(async (email) => {
    const { data } = await axiosInstance.post('/auth/send-otp', { email });
    return data;
  }, []);

  /** ── OTP-based login: verify OTP, receive tokens ── */
  const loginWithOTP = useCallback(async (email, otp) => {
    const { data } = await axiosInstance.post('/auth/verify-otp', { email, otp });
    const d = data.data;
    const accessToken  = d.tokens?.accessToken  ?? d.accessToken;
    const refreshToken = d.tokens?.refreshToken ?? d.refreshToken;
    persistSession(accessToken, d.user ?? d);
    if (refreshToken) localStorage.setItem('jw-refresh-token', refreshToken);
    return data;
  }, [persistSession]);

  /** ── Logout: clear tokens server-side and locally ── */
  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('jw-refresh-token');
      if (refreshToken) {
        // Fire and forget – don't await so expired tokens don't block logout
        axiosInstance.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } catch (_) { /* Always clear locally regardless */ }
    clearSession();
    toast.success('Signed out successfully');
  }, [clearSession]);

  /** ── Update profile info (name, phone, avatar, etc.) ── */
  const updateProfile = useCallback(async (payload) => {
    const { data } = await axiosInstance.patch('/auth/profile', payload);
    const updatedUser = { ...user, ...(data.data.user || data.data) };
    setUser(updatedUser);
    localStorage.setItem('jw-user', JSON.stringify(updatedUser));
    return data;
  }, [user]);

  const value = {
    user,
    accessToken,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    register,
    login,
    sendOTP,
    loginWithOTP,
    logout,
    updateProfile,
  };

  // Don't render children until we've tried to restore the session from storage
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen"
           style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <div
            className="inline-block w-10 h-10 border-4 rounded-full animate-spin mb-3"
            style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }}
          />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading JeeWallah…</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook to consume Auth context in any component */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
