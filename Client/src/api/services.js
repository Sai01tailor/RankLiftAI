/**
 * api/services.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All API call functions for the JeeWallah frontend.
 * Fully synced with server2 (localhost:3001) route definitions.
 *
 * Key mappings (frontend → backend):
 *  Auth:    /auth/*                                (authRoutes.js)
 *  Student: /student/*                             (studentRoutes.js)
 *  Admin:   /admin/*                               (adminRoutes.js)
 *  AI/ML:   /ai/*                                  (aiRoutes.js)
 *  Payment: /payments/*                            (paymentRoutes.js)
 */

import axiosInstance from './axios';

/* ════════════════════════════════════════════════════════════
   AUTH
   ════════════════════════════════════════════════════════════ */
export const authAPI = {
    // POST /auth/register
    register: (payload) => axiosInstance.post('/auth/register', payload),
    // POST /auth/login
    login: (email, password) => axiosInstance.post('/auth/login', { email, password }),
    // POST /auth/send-otp
    sendOTP: (email) => axiosInstance.post('/auth/send-otp', { email }),
    // POST /auth/verify-otp
    verifyOTP: (email, otp) => axiosInstance.post('/auth/verify-otp', { email, otp }),
    // POST /auth/refresh-token
    refreshToken: (refreshToken) => axiosInstance.post('/auth/refresh-token', { refreshToken }),
    // POST /auth/logout
    logout: (refreshToken) => axiosInstance.post('/auth/logout', { refreshToken }),
    // POST /auth/logout-all
    logoutAll: () => axiosInstance.post('/auth/logout-all'),
    // GET /auth/me
    getMe: () => axiosInstance.get('/auth/me'),
    // PATCH /auth/profile
    updateProfile: (payload) => axiosInstance.patch('/auth/profile', payload),
    // POST /auth/change-password  (added in server2)
    changePassword: (payload) => axiosInstance.post('/auth/change-password', payload),
    // POST /auth/forgot-password   (added in server2)
    forgotPassword: (email) => axiosInstance.post('/auth/forgot-password', { email }),
    // POST /auth/reset-password    (added in server2)
    resetPassword: (payload) => axiosInstance.post('/auth/reset-password', payload),
};

/* ════════════════════════════════════════════════════════════
   STUDENT – Content Browsing
   ════════════════════════════════════════════════════════════ */
export const studentAPI = {
    // ── Curriculum hierarchy ──
    // GET /student/subjects
    getSubjects: () => axiosInstance.get('/student/subjects'),
    // GET /student/chapters/:subjectId
    getChapters: (subjectId) => axiosInstance.get(`/student/chapters/${subjectId}`),
    // GET /student/topics/:chapterId
    getTopics: (chapterId) => axiosInstance.get(`/student/topics/${chapterId}`),

    // ── Questions ──
    // GET /student/questions?subjectId=&chapterId=&topicId=&difficulty=&type=&page=&limit=
    getQuestions: (params) => axiosInstance.get('/student/questions', { params }),
    // GET /student/questions/daily
    getDailyProblem: () => axiosInstance.get('/student/questions/daily'),
    // GET /student/questions/:questionId
    getQuestion: (id) => axiosInstance.get(`/student/questions/${id}`),

    // ── Practice ──
    // POST /student/practice/submit
    // payload: { questionId, selectedOptions, numericAnswer, isAttempted, timeSpent }
    submitPractice: (payload) => axiosInstance.post('/student/practice/submit', payload),
    // GET /student/practice/bookmarks
    getBookmarks: (params) => axiosInstance.get('/student/practice/bookmarks', { params }),
    // PATCH /student/practice/:attemptId/bookmark  — toggles bookmark on a practice attempt
    toggleBookmark: (attemptId) => axiosInstance.patch(`/student/practice/${attemptId}/bookmark`),

    // ── Notes (server2 new routes) ──
    // POST  /student/questions/:id/notes
    addNote: (questionId, note) => axiosInstance.post(`/student/questions/${questionId}/notes`, { note }),
    // PATCH /student/questions/:id/notes
    updateNote: (questionId, note) => axiosInstance.patch(`/student/questions/${questionId}/notes`, { note }),
    // DELETE /student/questions/:id/notes
    deleteNote: (questionId) => axiosInstance.delete(`/student/questions/${questionId}/notes`),
    // POST  /student/questions/:id/bookmark  — toggle
    bookmarkQuestion: (questionId) => axiosInstance.post(`/student/questions/${questionId}/bookmark`),


    // ── Mock Tests ──
    // GET /student/tests
    getTests: (params) => axiosInstance.get('/student/tests', { params }),
    // GET /student/tests/:testId   (single test info, server2 new)
    getTest: (id) => axiosInstance.get(`/student/tests/${id}`),
    getTestById: (id) => axiosInstance.get(`/student/tests/${id}`),
    // POST /student/tests/:testId/start
    startTest: (id) => axiosInstance.post(`/student/tests/${id}/start`),

    // PATCH /student/tests/attempt/:attemptId/save
    // payload: { attemptId, responses: [...], tabSwitchCount }
    saveTestProgress: (testId, payload) => axiosInstance.patch(
        `/student/tests/attempt/${payload.attemptId}/save`,
        {
            responses: payload.responses
                ? payload.responses
                : (payload.answers ? _answersToResponses(payload.answers, payload.statuses, payload.timePerQuestion) : []),
            tabSwitchCount: payload.tabSwitchCount
        }
    ),

    // POST /student/tests/attempt/:attemptId/submit
    // payload: { attemptId, responses: [...] }
    submitTest: (testId, payload) => axiosInstance.post(
        `/student/tests/attempt/${payload.attemptId}/submit`,
        {
            responses: payload.responses
                ? payload.responses
                : (payload.answers ? _answersToResponses(payload.answers, payload.statuses, payload.timePerQuestion) : [])
        }
    ),

    // GET /student/tests/attempt/:attemptId/review
    getTestReview: (testId, attemptId) => axiosInstance.get(`/student/tests/attempt/${attemptId}/review`),

    // GET /student/test-history
    getTestHistory: (params) => axiosInstance.get('/student/test-history', { params }),

    // ── Analytics ──
    // GET /student/analytics
    getAnalytics: () => axiosInstance.get('/student/analytics'),
    // GET /student/analytics/weak-topics
    getWeakTopics: () => axiosInstance.get('/student/analytics/weak-topics'),
    // GET /student/analytics/full — comprehensive analytics
    getFullAnalytics: () => axiosInstance.get('/student/analytics/full'),
    // GET /student/dashboard
    getDashboard: () => axiosInstance.get('/student/dashboard'),
    // GET /student/streak
    getStreak: () => axiosInstance.get('/student/streak'),

    // ── Leaderboard ──
    // GET /student/leaderboard/:testId
    getLeaderboard: (testId, params) => axiosInstance.get(`/student/leaderboard/${testId}`, { params }),
    // GET /student/leaderboard/global  (server2 new)
    getGlobalLeaderboard: (params) => axiosInstance.get('/student/leaderboard/global', { params }),
};

/**
 * Internal helper: convert the frontend answers map { questionId: selectedIndex | [...] }
 * into the backend's expected responses array format.
 */
function _answersToResponses(answers, statuses = {}, times = {}) {
    const lti = ["A", "B", "C", "D"];
    return Object.entries(answers || {}).map(([questionId, value]) => {
        const isArr = Array.isArray(value);
        const st = statuses[questionId];
        const isAns = st === 3 || st === 5; // answered or marked+ans

        let opts = [];
        let num = undefined;

        if (isArr) {
            opts = value.map(v => typeof v === 'number' ? lti[v] : v);
        } else if (typeof value === 'number') {
            opts = [lti[value]];
        } else if (typeof value === 'string') {
            // Check if string is a number vs a letter
            if (value === "A" || value === "B" || value === "C" || value === "D") {
                opts = [value];
            } else {
                num = parseFloat(value);
            }
        }

        return {
            questionId,
            selectedOptions: opts,
            numericAnswer: num,
            isAttempted: isAns,
            status: st === 5 ? 'ANSWERED_AND_MARKED' : (st === 4 ? 'MARKED_FOR_REVIEW' : (st === 3 ? 'ANSWERED' : (st === 2 ? 'NOT_ANSWERED' : 'NOT_VISITED'))),
            timeSpent: times[questionId] || 0
        };
    });
}

/* ════════════════════════════════════════════════════════════
   ADMIN – Full CRUD  (synced with adminRoutes.js + server2 additions)
   ════════════════════════════════════════════════════════════ */
export const adminAPI = {
    // GET /admin/analytics/overview  → renamed as "stats" on frontend
    getStats: () => axiosInstance.get('/admin/analytics/overview'),

    // ── Subjects ──
    createSubject: (payload) => axiosInstance.post('/admin/subjects', payload),
    updateSubject: (id, payload) => axiosInstance.put(`/admin/subjects/${id}`, payload),
    deleteSubject: (id) => axiosInstance.delete(`/admin/subjects/${id}`),

    // ── Chapters ──
    createChapter: (payload) => axiosInstance.post('/admin/chapters', payload),
    updateChapter: (id, payload) => axiosInstance.put(`/admin/chapters/${id}`, payload),
    deleteChapter: (id) => axiosInstance.delete(`/admin/chapters/${id}`),

    // ── Topics ──
    createTopic: (payload) => axiosInstance.post('/admin/topics', payload),
    updateTopic: (id, payload) => axiosInstance.put(`/admin/topics/${id}`, payload),
    deleteTopic: (id) => axiosInstance.delete(`/admin/topics/${id}`),

    // ── Questions ──
    // GET  /admin/questions   (server2 new)
    getQuestions: (params) => axiosInstance.get('/admin/questions', { params }),
    // POST /admin/questions
    createQuestion: (payload) => axiosInstance.post('/admin/questions', payload),
    // PUT  /admin/questions/:questionId
    updateQuestion: (id, payload) => axiosInstance.put(`/admin/questions/${id}`, payload),
    // DELETE /admin/questions/:questionId
    deleteQuestion: (id) => axiosInstance.delete(`/admin/questions/${id}`),
    // POST /admin/questions/bulk
    bulkImport: (payload) => axiosInstance.post('/admin/questions/bulk', payload),
    // POST /admin/upload-image
    uploadImage: (formData) => axiosInstance.post('/admin/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),

    // ── Mock Tests ──
    // GET  /admin/tests  (server2 new)
    getTests: (params) => axiosInstance.get('/admin/tests', { params }),
    // POST /admin/tests
    createTest: (payload) => axiosInstance.post('/admin/tests', payload),
    // PUT  /admin/tests/:testId
    updateTest: (id, payload) => axiosInstance.put(`/admin/tests/${id}`, payload),
    // DELETE /admin/tests/:testId  (server2 new)
    deleteTest: (id) => axiosInstance.delete(`/admin/tests/${id}`),
    // PATCH /admin/tests/:testId/publish
    publishTest: (id) => axiosInstance.patch(`/admin/tests/${id}/publish`),

    // ── Users ──
    // GET   /admin/users
    getUsers: (params) => axiosInstance.get('/admin/users', { params }),
    // PATCH /admin/users/:id  (server2 new)
    updateUser: (id, payload) => axiosInstance.patch(`/admin/users/${id}`, payload),
    // DELETE /admin/users/:id  (server2 new)
    deleteUser: (id) => axiosInstance.delete(`/admin/users/${id}`),

    // ── Subscriptions ──
    // GET /admin/subscriptions  (server2 new)
    getSubscriptions: (params) => axiosInstance.get('/admin/subscriptions', { params }),
    // GET /admin/subscriptions/plans (server2 new)
    getSubscriptionPlans: () => axiosInstance.get('/admin/subscriptions/plans'),
    // PUT /admin/subscriptions/plans (server2 new)
    updateSubscriptionPlans: (payload) => axiosInstance.put('/admin/subscriptions/plans', payload),

    // ── Plans ──
    getPlans: () => axiosInstance.get('/payments/plans'),
    createPlan: (payload) => axiosInstance.post('/admin/plans', payload),
};

/* ════════════════════════════════════════════════════════════
   AI / ML – Gemini + Flask ML service  (synced with aiRoutes.js)
   ════════════════════════════════════════════════════════════ */
export const aiAPI = {
    // POST /ai/explain   — Gemini step-by-step explanation
    // payload: { questionId, interactionType: 'EXPLAIN_SOLUTION' | 'EXPLAIN_CONCEPT' | 'HINT' }
    explain: (payload) => axiosInstance.post('/ai/explain', payload),

    // POST /ai/feedback  — Gemini post-test personalised insights
    // payload: { attemptId }
    getPersonalisedFeedback: (p) => axiosInstance.post('/ai/feedback', p),

    // POST /ai/ml/weak-topics  — ML Flask weak topic prediction
    predictWeakTopics: () => axiosInstance.post('/ai/ml/weak-topics'),

    // POST /ai/ml/predict-score  — ML Flask score prediction
    predictScore: () => axiosInstance.post('/ai/ml/predict-score'),

    // GET /ai/ml/health  — health check for ML service
    healthCheck: () => axiosInstance.get('/ai/ml/health'),
};

/* ════════════════════════════════════════════════════════════
   PAYMENT – Razorpay integration  (synced with paymentRoutes.js)
   ════════════════════════════════════════════════════════════ */
export const paymentAPI = {
    // GET  /payments/plans
    getPlans: () => axiosInstance.get('/payments/plans'),
    // POST /payments/order
    createOrder: (planId) => axiosInstance.post('/payments/order', { planId }),
    // POST /payments/verify
    verifyPayment: (payload) => axiosInstance.post('/payments/verify', payload),
    // GET  /payments/subscription
    getSubscription: () => axiosInstance.get('/payments/subscription'),
};

/* ════════════════════════════════════════════════════════════
   SETTINGS – Global Site Settings
   ════════════════════════════════════════════════════════════ */
export const settingsAPI = {
    // GET /settings
    getSettings: () => axiosInstance.get('/settings'),
    // PUT /settings (Admin only)
    updateSettings: (payload) => axiosInstance.put('/settings', payload),
};

