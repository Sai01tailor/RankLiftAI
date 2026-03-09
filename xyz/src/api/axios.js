/**
 * api/axios.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised Axios instance for all API calls in the JeeWallah xyz frontend.
 *
 * Responsibilities:
 *  1. Set the base URL from the VITE_API_URL env variable
 *  2. Attach the JWT access token to every request via a request interceptor
 *  3. On 401 responses, attempt a silent refresh using the refresh token
 *  4. Queue up concurrent requests that arrive during a token refresh
 *  5. Export a helper `setAuthToken` used by AuthContext on login/logout
 */

import axios from 'axios';

/* ── Base URL: falls back to relative /api/v1 so Vite proxy and ngrok work ── */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 15000, // 15s timeout – generous for India's mobile networks
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // Allow cookies if the server sets them
});

/* ── Token store (module-level, not exposed to devtools) ── */
let _accessToken = null;

/**
 * setAuthToken – called by AuthContext after login/logout.
 * Stores the token in module scope so the interceptor can read it.
 */
export function setAuthToken(token) {
    _accessToken = token;
}

/* ── Internal flag to prevent multiple simultaneous refresh requests ── */
let _isRefreshing = false;
let _refreshQueue = []; // Callbacks to re-run after a token refresh

function processQueue(error, token = null) {
    _refreshQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve(token);
    });
    _refreshQueue = [];
}

/* ─────────────────────────── REQUEST INTERCEPTOR ────────────────────────── */
axiosInstance.interceptors.request.use(
    (config) => {
        if (_accessToken) {
            config.headers['Authorization'] = `Bearer ${_accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/* ─────────────────────────── RESPONSE INTERCEPTOR ───────────────────────── */
axiosInstance.interceptors.response.use(
    // Happy path – just return the response
    (response) => response,

    // Error path – attempt refresh on 401
    async (error) => {
        const originalRequest = error.config;

        // Auth-page URLs that should NEVER trigger a redirect or refresh attempt
        const AUTH_URLS = ['/auth/login', '/auth/register', '/auth/send-otp',
            '/auth/verify-otp', '/auth/forgot-password', '/auth/reset-password'];
        const isAuthEndpoint = AUTH_URLS.some(u => originalRequest.url?.includes(u));

        if (error.response?.status === 401 && !originalRequest._retry) {
            // On auth endpoints (login, register, forgot-pw etc.) just reject
            // so the component's catch block can show the toast error.
            if (isAuthEndpoint) {
                return Promise.reject(error);
            }

            // Mark this request so we don't loop infinitely
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem('jw-refresh-token');
            if (!refreshToken) {
                // No refresh token – clear session but don't redirect if already on auth page
                const onAuthPage = ['/login', '/register', '/forgot-password'].some(
                    p => window.location.pathname.startsWith(p)
                );
                if (!onAuthPage) clearLocalSession();
                return Promise.reject(error);
            }

            // If another refresh is in progress, queue this request
            if (_isRefreshing) {
                return new Promise((resolve, reject) => {
                    _refreshQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers['Authorization'] = `Bearer ${token}`;
                    return axiosInstance(originalRequest);
                });
            }

            _isRefreshing = true;

            try {
                const { data } = await axiosInstance.post('/auth/refresh-token', {
                    refreshToken,
                });
                const newToken = data.data.accessToken;

                // Persist new token
                _accessToken = newToken;
                localStorage.setItem('jw-access-token', newToken);
                if (data.data.refreshToken) {
                    localStorage.setItem('jw-refresh-token', data.data.refreshToken);
                }

                // Flush the queue of waiting requests
                processQueue(null, newToken);
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                clearLocalSession();
                return Promise.reject(refreshError);
            } finally {
                _isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

/** Helper to wipe local tokens when refresh fails */
function clearLocalSession() {
    _accessToken = null;
    localStorage.removeItem('jw-access-token');
    localStorage.removeItem('jw-user');
    localStorage.removeItem('jw-refresh-token');
    // Redirect to login
    window.location.href = '/login';
}

export default axiosInstance;
