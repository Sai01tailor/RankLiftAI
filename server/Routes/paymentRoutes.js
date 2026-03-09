const { Router } = require("express");
const express = require("express");
const pc = require("../controller/paymentController");
const { authenticate } = require("../middleware/auth");
const { authLimiter, apiLimiter } = require("../middleware/rateLimiter");

const router = Router();

// Public — list plans (no auth needed)
router.get("/plans", pc.getPlans);

// Webhook — NO auth middleware, uses Razorpay signature verification
// Need raw body for HMAC, so we parse it specially
router.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    (req, res, next) => {
        // Store raw body for HMAC verification, then parse JSON
        req.rawBody = req.body.toString("utf8");
        req.body = JSON.parse(req.rawBody);
        next();
    },
    pc.handleWebhook
);


// Protected routes — require authentication
router.use(authenticate);
router.post("/order", apiLimiter, pc.createPaymentOrder);
router.post("/verify", apiLimiter, pc.verifyPayment);
router.get("/subscription", pc.getSubscriptionStatus);

module.exports = router;
