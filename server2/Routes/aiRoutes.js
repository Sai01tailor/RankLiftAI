const { Router } = require("express");
const ai = require("../controller/aiController");
const { authenticate } = require("../middleware/auth");
const { aiLimiter } = require("../middleware/rateLimiter");
const { validate, schemas } = require("../middleware/validate");

const router = Router();

router.use(authenticate);

// AI Explanation (Gemini API)
router.post("/explain", aiLimiter, validate(schemas.aiExplanation), ai.getAIExplanation);
router.post("/feedback", ai.submitAIFeedback);

// ML Predictions (Flask service)
router.post("/ml/weak-topics", ai.getMLWeakTopics);
router.post("/ml/predict-score", ai.getScorePrediction);
router.get("/ml/health", ai.getMLHealth);

module.exports = router;
