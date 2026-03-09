const { incrementCounter } = require("../services/cache");
const { REDIS_KEYS } = require("../utils/constants");
const config = require("../config");
const ApiError = require("../utils/ApiError");

// ══════════════════════════════════════════════
//  Rate Limiter Middleware — Redis-backed
//  In development mode limits are very generous
//  so hot-reload / testing doesn't hit 429s.
// ══════════════════════════════════════════════

const IS_DEV = config.env === "development";

/**
 * Create a rate limiter with custom options.
 * @param {Object} options
 * @param {number} options.windowMs  - Time window in milliseconds
 * @param {number} options.max       - Max requests per window (production)
 * @param {number} options.devMax    - Max requests per window (development)
 * @param {string} options.message   - Error message on 429
 * @param {string} options.keyPrefix - Redis key prefix
 * @param {Function} options.keyGenerator - Custom key generator (req => string)
 */
const createRateLimiter = (options = {}) => {
    const {
        windowMs = config.rateLimit.windowMs,
        max = config.rateLimit.max,
        devMax = 10_000,            // effectively unlimited in dev
        message = "Too many requests, please try again later.",
        keyPrefix = REDIS_KEYS.RATE_LIMIT,
        keyGenerator = null
    } = options;

    // In development, use a much higher ceiling
    const effectiveMax = IS_DEV ? devMax : max;
    const windowSec = Math.ceil(windowMs / 1000);

    return async (req, res, next) => {
        // Skip rate limiting entirely in dev to avoid noise
        if (IS_DEV) return next();

        try {
            const identifier = keyGenerator
                ? keyGenerator(req)
                : (req.userId || req.ip);

            const key = `${keyPrefix}${identifier}`;
            const count = await incrementCounter(key, windowSec);

            res.set({
                "X-RateLimit-Limit": effectiveMax.toString(),
                "X-RateLimit-Remaining": Math.max(0, effectiveMax - count).toString(),
                "X-RateLimit-Reset": new Date(Date.now() + windowMs).toISOString()
            });

            if (count > effectiveMax) {
                return next(ApiError.tooMany(message));
            }

            next();
        } catch {
            // If Redis is down, let request through
            next();
        }
    };
};

// ── Pre-configured limiters ──

// General API (100 req / 15 min in prod)
const apiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many API requests. Please try again in 15 minutes.",
    keyPrefix: REDIS_KEYS.RATE_LIMIT + "api:"
});

// Auth (20 req / 15 min in prod, stricter)
const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many authentication attempts. Please try again later.",
    keyPrefix: REDIS_KEYS.RATE_LIMIT + "auth:"
});

// OTP (5 per email / 15 min in prod)
const otpLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many OTP requests. Please wait before requesting again.",
    keyPrefix: REDIS_KEYS.RATE_LIMIT + "otp:",
    keyGenerator: (req) => req.body.email || req.ip
});

// AI (30 req / hour in prod)
const aiLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: "AI request limit reached. Please try again in an hour.",
    keyPrefix: REDIS_KEYS.RATE_LIMIT + "ai:"
});

module.exports = {
    createRateLimiter,
    apiLimiter,
    authLimiter,
    otpLimiter,
    aiLimiter
};
