const jwt = require("jsonwebtoken");
const config = require("../config");
const logger = require("../utils/logger");

// ══════════════════════════════════════════════
//  JWT Token Service
//  - Access tokens (short-lived, 15m)
//  - Refresh tokens (long-lived, 7d)
//  - Token verification & decoding
// ══════════════════════════════════════════════

/**
 * Generate an access token.
 * @param {Object} payload - { userId, email, role }
 * @returns {string} Signed JWT access token
 */
const generateAccessToken = (payload) => {
    return jwt.sign(
        {
            userId: payload.userId,
            email: payload.email,
            role: payload.role
        },
        config.jwt.accessSecret,
        { expiresIn: config.jwt.accessExpiry }
    );
};

/**
 * Generate a refresh token.
 * @param {Object} payload - { userId }
 * @returns {string} Signed JWT refresh token
 */
const generateRefreshToken = (payload) => {
    return jwt.sign(
        { userId: payload.userId },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiry }
    );
};

/**
 * Generate both access + refresh tokens.
 * @param {Object} user - User document (must have _id, email, role)
 * @returns {{ accessToken, refreshToken }}
 */
const generateTokenPair = (user) => {
    const payload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role
    };

    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload)
    };
};

/**
 * Verify an access token.
 * @param {string} token
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, config.jwt.accessSecret);
    } catch (err) {
        logger.debug(`Access token verification failed: ${err.message}`);
        return null;
    }
};

/**
 * Verify a refresh token.
 * @param {string} token
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, config.jwt.refreshSecret);
    } catch (err) {
        logger.debug(`Refresh token verification failed: ${err.message}`);
        return null;
    }
};

/**
 * Decode token without verification (for debugging).
 * @param {string} token
 * @returns {Object|null}
 */
const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch {
        return null;
    }
};

/**
 * Get refresh token expiry Date for storing in DB.
 * @returns {Date}
 */
const getRefreshTokenExpiry = () => {
    const match = config.jwt.refreshExpiry.match(/^(\d+)([smhd])$/);
    if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return new Date(Date.now() + value * (multipliers[unit] || 86400000));
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken,
    getRefreshTokenExpiry
};
