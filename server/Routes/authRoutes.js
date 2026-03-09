const { Router } = require("express");
const authController = require("../controller/authController");
const { authLimiter, otpLimiter } = require("../middleware/rateLimiter");
const { authenticate } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validate");

const router = Router();

// ── Public ──
router.post("/register", authLimiter, validate(schemas.register), authController.register);
router.post("/login", authLimiter, validate(schemas.login), authController.login);
router.post("/send-otp", otpLimiter, validate(schemas.sendOTP), authController.sendOTP);
router.post("/verify-otp", authLimiter, validate(schemas.verifyOTP), authController.verifyOTPAndLogin);
router.post("/refresh-token", authLimiter, authController.refreshToken);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password", authLimiter, authController.resetPassword);

// ── Protected ──
router.post("/logout", authenticate, authController.logout);
router.post("/logout-all", authenticate, authController.logoutAll);
router.get("/me", authenticate, authController.getMe);
router.patch("/profile", authenticate, authController.updateProfile);
router.post("/change-password", authenticate, authController.changePassword);

module.exports = router;
