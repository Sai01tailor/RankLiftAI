const { Router } = require("express");
const ac = require("../controller/adminController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roleGuard");
const multer = require("multer");

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);
router.use(authorize("admin"));

// ── Curriculum ──
router.post("/subjects", ac.createSubject);
router.delete("/subjects/:id", ac.deleteSubject);
router.post("/chapters", ac.createChapter);
router.delete("/chapters/:id", ac.deleteChapter);
router.post("/topics", ac.createTopic);
router.delete("/topics/:id", ac.deleteTopic);

// ── Questions ──
router.get("/questions", ac.getQuestions);
router.post("/questions", ac.createQuestion);
router.post("/questions/bulk", ac.bulkUploadQuestions);
router.post("/questions/:questionId/translate", ac.translateQuestionHandler); // re-translate
router.put("/questions/:questionId", ac.updateQuestion);
router.delete("/questions/:questionId", ac.deleteQuestion);

router.post("/upload-image", upload.single("image"), ac.uploadImage);

// ── Mock Tests ──
router.get("/tests", ac.getTests);              // new – list
router.post("/tests", ac.createMockTest);
router.put("/tests/:testId", ac.updateMockTest);
router.delete("/tests/:testId", ac.deleteMockTest);        // new
router.patch("/tests/:testId/publish", ac.publishMockTest);

// ── Users ──
router.get("/users", ac.getUsers);
router.patch("/users/:userId", ac.updateUser);            // new
router.delete("/users/:userId", ac.deleteUser);            // new

// ── Subscriptions ──
router.get("/subscriptions", ac.getSubscriptions);      // new
router.get("/subscriptions/plans", ac.getPlans);         // new
router.put("/subscriptions/plans", ac.updatePlans);      // new

// ── Analytics ──
router.get("/analytics/overview", ac.getPlatformAnalytics);

module.exports = router;
