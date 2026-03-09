const crypto = require("crypto");
const config = require("../config");
const { getRedis, isConnected } = require("../config/redis");
const logger = require("../utils/logger");
const { REDIS_KEYS } = require("../utils/constants");

// ══════════════════════════════════════════════
//  OTP Service — Redis-backed OTP generation & verification
//  Features:
//  - Cryptographically secure OTP
//  - Rate limiting on OTP attempts
//  - Redis TTL-based expiry
//  - Fallback in-memory store if Redis is down
// ══════════════════════════════════════════════

// Fallback in-memory store (only used if Redis is unavailable)
const memoryStore = new Map();

/**
 * Generate a secure OTP of configured length.
 * @returns {string} OTP string (e.g., "482917")
 */
const generateOTP = () => {
    const digits = config.otp.length;
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    const otp = crypto.randomInt(min, max + 1).toString();
    return otp;
};

/**
 * Store OTP for an identifier (email/phone).
 * @param {string} identifier - Email or phone
 * @param {string} otp - The OTP to store
 * @returns {boolean} Success
 */
const storeOTP = async (identifier, otp) => {
    const key = REDIS_KEYS.OTP + identifier;
    const attemptsKey = REDIS_KEYS.OTP_ATTEMPTS + identifier;
    const ttl = config.otp.expiryMinutes * 60; // Convert to seconds

    try {
        if (isConnected()) {
            const redis = getRedis();
            // Store OTP with expiry
            await redis.setex(key, ttl, JSON.stringify({
                otp,
                createdAt: Date.now(),
                verified: false
            }));
            // Reset attempts counter
            await redis.setex(attemptsKey, ttl, "0");
            return true;
        }

        // Fallback: in-memory
        memoryStore.set(key, {
            otp,
            createdAt: Date.now(),
            expiresAt: Date.now() + ttl * 1000,
            verified: false
        });
        memoryStore.set(attemptsKey, 0);

        // Schedule cleanup
        setTimeout(() => {
            memoryStore.delete(key);
            memoryStore.delete(attemptsKey);
        }, ttl * 1000);

        return true;
    } catch (err) {
        logger.error(`OTP store error: ${err.message}`);
        return false;
    }
};

/**
 * Verify an OTP for an identifier.
 * @param {string} identifier - Email or phone
 * @param {string} inputOtp - OTP entered by user
 * @returns {{ success, message }}
 */
const verifyOTP = async (identifier, inputOtp) => {
    const key = REDIS_KEYS.OTP + identifier;
    const attemptsKey = REDIS_KEYS.OTP_ATTEMPTS + identifier;

    try {
        if (isConnected()) {
            const redis = getRedis();

            // Check attempts
            const attempts = parseInt(await redis.get(attemptsKey) || "0", 10);
            if (attempts >= config.otp.maxAttempts) {
                await redis.del(key);
                await redis.del(attemptsKey);
                return { success: false, message: "Too many OTP attempts. Please request a new OTP." };
            }

            // Get stored OTP
            const stored = await redis.get(key);
            if (!stored) {
                return { success: false, message: "OTP expired or not found. Please request a new OTP." };
            }

            const data = JSON.parse(stored);
            if (data.verified) {
                return { success: false, message: "OTP already used. Please request a new OTP." };
            }

            // Increment attempts
            await redis.incr(attemptsKey);

            if (data.otp !== inputOtp) {
                return {
                    success: false,
                    message: `Invalid OTP. ${config.otp.maxAttempts - attempts - 1} attempts remaining.`
                };
            }

            // Mark as verified and delete
            await redis.del(key);
            await redis.del(attemptsKey);
            return { success: true, message: "OTP verified successfully." };
        }

        // Fallback: in-memory
        const stored = memoryStore.get(key);
        if (!stored || Date.now() > stored.expiresAt) {
            memoryStore.delete(key);
            return { success: false, message: "OTP expired or not found." };
        }

        const attempts = memoryStore.get(attemptsKey) || 0;
        if (attempts >= config.otp.maxAttempts) {
            memoryStore.delete(key);
            return { success: false, message: "Too many attempts." };
        }

        memoryStore.set(attemptsKey, attempts + 1);

        if (stored.otp !== inputOtp) {
            return { success: false, message: "Invalid OTP." };
        }

        memoryStore.delete(key);
        memoryStore.delete(attemptsKey);
        return { success: true, message: "OTP verified successfully." };

    } catch (err) {
        logger.error(`OTP verify error: ${err.message}`);
        return { success: false, message: "OTP verification failed. Please try again." };
    }
};

/**
 * Check if OTP was recently sent (cooldown).
 * Prevents spamming the send-OTP endpoint.
 * @param {string} identifier
 * @returns {{ canSend, waitSeconds }}
 */
const checkCooldown = async (identifier) => {
    const key = REDIS_KEYS.OTP + identifier;
    const cooldownSeconds = 60; // 1-minute cooldown between OTP sends

    try {
        if (isConnected()) {
            const redis = getRedis();
            const stored = await redis.get(key);
            if (stored) {
                const data = JSON.parse(stored);
                const elapsed = (Date.now() - data.createdAt) / 1000;
                if (elapsed < cooldownSeconds) {
                    return {
                        canSend: false,
                        waitSeconds: Math.ceil(cooldownSeconds - elapsed)
                    };
                }
            }
            return { canSend: true, waitSeconds: 0 };
        }

        // Fallback
        const stored = memoryStore.get(key);
        if (stored) {
            const elapsed = (Date.now() - stored.createdAt) / 1000;
            if (elapsed < cooldownSeconds) {
                return { canSend: false, waitSeconds: Math.ceil(cooldownSeconds - elapsed) };
            }
        }
        return { canSend: true, waitSeconds: 0 };

    } catch (err) {
        return { canSend: true, waitSeconds: 0 };
    }
};

module.exports = { generateOTP, storeOTP, verifyOTP, checkCooldown };
