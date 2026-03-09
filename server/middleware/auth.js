const { verifyAccessToken } = require("../services/auth");
const ApiError = require("../utils/ApiError");
const User = require("../models/Users");
const logger = require("../utils/logger");

// ══════════════════════════════════════════════
//  Auth Middleware — JWT Token Verification
//  Extracts token from Authorization header
//  Attaches user to req.user
// ══════════════════════════════════════════════

const authenticate = async (req, res, next) => {
    try {
        // 1. Extract token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw ApiError.unauthorized("Access token is required. Format: Bearer <token>");
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            throw ApiError.unauthorized("Access token is missing");
        }

        // 2. Verify token
        const decoded = verifyAccessToken(token);
        if (!decoded) {
            throw ApiError.unauthorized("Invalid or expired access token");
        }

        // 3. Check if user still exists and is active
        const user = await User.findById(decoded.userId).select("-password -refreshTokens");
        if (!user) {
            throw ApiError.unauthorized("User no longer exists");
        }

        if (user.accountStatus !== "active") {
            throw ApiError.forbidden(`Account is ${user.accountStatus}`);
        }

        // 4. Attach user to request
        req.user = user;
        req.userId = user._id.toString();

        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Optional auth — doesn't fail if no token, but attaches user if present.
 * Useful for routes that work for both guests and logged-in users.
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const decoded = verifyAccessToken(token);
            if (decoded) {
                const user = await User.findById(decoded.userId).select("-password -refreshTokens");
                if (user && user.accountStatus === "active") {
                    req.user = user;
                    req.userId = user._id.toString();
                }
            }
        }
        next();
    } catch {
        // Silently continue without auth
        next();
    }
};

module.exports = { authenticate, optionalAuth };
