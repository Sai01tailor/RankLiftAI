const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// ══════════════════════════════════════════════
//  Centralized Configuration — Single source of truth
// ══════════════════════════════════════════════

const config = {
    env: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT, 10) || 3000,
    apiVersion: process.env.API_VERSION || "v1",

    // MongoDB
    mongo: {
        uri: process.env.NODE_ENV === "production"
            ? process.env.MONGODB_URI_PROD
            : (process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jeewallah"),
        options: {
            maxPoolSize: 50,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        }
    },

    // Redis
    redis: {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB, 10) || 0
    },

    // JWT
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret",
        refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
        accessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
        refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d"
    },

    // OTP
    otp: {
        expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5,
        length: parseInt(process.env.OTP_LENGTH, 10) || 6,
        maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5
    },

    // Email
    smtp: {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },

    // Gemini AI
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS, 10) || 2048
    },

    // ML Service
    ml: {
        serviceUrl: process.env.ML_SERVICE_URL || "http://127.0.0.1:5000",
        timeout: parseInt(process.env.ML_SERVICE_TIMEOUT, 10) || 10000
    },

    // Razorpay
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
    },

    // Cloudinary
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET
    },

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
        authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20
    },

    // CORS — parse comma-separated list into an array
    cors: {
        origin: (process.env.CORS_ORIGIN || "http://localhost:5173")
            .split(",")
            .map(o => o.trim())
            .concat(["http://localhost:5175", "http://localhost:5174", "http://localhost:5173", "https://carole-unbase-mediately.ngrok-free.dev"])
            .filter((v, i, a) => a.indexOf(v) === i) // deduplicate
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || "debug",
        dir: process.env.LOG_DIR || "./logs"
    }
};

module.exports = config;
