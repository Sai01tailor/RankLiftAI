const { Router } = require("express");
const sc = require("../controller/studentController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roleGuard");
const { validate, schemas } = require("../middleware/validate");

const router = Router();

// All student routes require auth
router.use(authenticate);
router.use(authorize("student", "admin"));

// ── Curriculum ──
router.get("/subjects", sc.getSubjects);
router.get("/chapters/:subjectId", sc.getChapters);
router.get("/topics/:chapterId", sc.getTopics);

// ── Dashboard & Streak (new) ──
router.get("/dashboard", sc.getDashboard);
router.get("/streak", sc.getStreak);

// ── Questions ──
router.get("/questions", sc.getQuestions);
router.get("/questions/daily", sc.getDailyProblem);
router.get("/questions/:questionId", sc.getQuestionById);

// ── Question Notes (new) ──
router.post("/questions/:questionId/notes", sc.addNote);
router.patch("/questions/:questionId/notes", sc.updateNote);
router.delete("/questions/:questionId/notes", sc.deleteNote);
// ── Question Bookmark toggle ──
router.post("/questions/:questionId/bookmark", sc.toggleQuestionBookmark);


// ── Practice ──
router.post("/practice/submit", validate(schemas.submitPractice), sc.submitPracticeAttempt);
router.get("/practice/bookmarks", sc.getBookmarks);
router.patch("/practice/:attemptId/bookmark", sc.toggleBookmark);

// ── Mock Tests ──
router.get("/tests", sc.getAvailableTests);
router.get("/tests/:testId", sc.getTestById);        // new
router.post("/tests/:testId/start", sc.startMockTest);

// Attempt routes (use attemptId, not testId for save/submit/review)
router.patch("/tests/attempt/:attemptId/save", sc.saveTestProgress);
router.post("/tests/attempt/:attemptId/submit", sc.submitMockTest);
router.get("/tests/attempt/:attemptId/review", sc.getTestReview);

// ── Test History ──
router.get("/test-history", sc.getTestHistory);

// ── Analytics ──
router.get("/analytics", sc.getAnalytics);
router.get("/analytics/weak-topics", sc.getWeakTopics);
router.get("/analytics/full", sc.getFullAnalytics);

// ── Leaderboard ──
router.get("/leaderboard/global", sc.getGlobalLeaderboard);   // new — must be before :testId
router.get("/leaderboard/:testId", sc.getTestLeaderboard);

module.exports = router;
