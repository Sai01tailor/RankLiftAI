const logger = require("../utils/logger");

// ══════════════════════════════════════════════
//  Security Middleware — NoSQL Injection + XSS Prevention
//  Compatible with Express 5 (req.query is read-only)
// ══════════════════════════════════════════════

/**
 * Recursively remove keys containing '$' or '.' from an object.
 * Prevents NoSQL injection attacks like { "$gt": "" } in user input.
 */
const sanitizeObject = (obj, depth = 0) => {
    if (depth > 10) return obj; // Prevent infinite recursion
    if (typeof obj !== "object" || obj === null) return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, depth + 1));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        // Block keys starting with $ (MongoDB operators) or containing .
        if (key.startsWith("$") || key.includes(".")) {
            // Replace with underscored version
            const safeKey = key.replace(/\$/g, "_").replace(/\./g, "_");
            sanitized[safeKey] = sanitizeObject(value, depth + 1);
        } else {
            sanitized[key] = sanitizeObject(value, depth + 1);
        }
    }
    return sanitized;
};

/**
 * NoSQL injection prevention middleware.
 * Sanitizes req.body and req.params (NOT req.query — read-only in Express 5).
 * req.query is safe because Express 5 parses it via URLSearchParams (no nested objects).
 */
const mongoSanitizeMiddleware = (req, res, next) => {
    let wasSanitized = false;

    if (req.body && typeof req.body === "object") {
        const original = JSON.stringify(req.body);
        req.body = sanitizeObject(req.body);
        if (JSON.stringify(req.body) !== original) {
            wasSanitized = true;
        }
    }

    if (req.params && typeof req.params === "object") {
        // req.params is writable in Express 5
        const original = JSON.stringify(req.params);
        const sanitized = sanitizeObject(req.params);
        // Assign back individual keys (req.params may not be fully replaceable)
        for (const [key, value] of Object.entries(sanitized)) {
            req.params[key] = value;
        }
        if (JSON.stringify(req.params) !== original) {
            wasSanitized = true;
        }
    }

    if (wasSanitized) {
        logger.warn(`[SECURITY] Sanitized NoSQL injection attempt from ${req.ip}`);
    }

    next();
};

/**
 * Basic XSS protection — sanitizes string values in request body.
 * Escapes HTML special characters.
 */
const xssProtection = (req, res, next) => {
    const sanitizeValue = (value) => {
        if (typeof value === "string") {
            return value
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#x27;");
        }
        if (typeof value === "object" && value !== null) {
            if (Array.isArray(value)) {
                return value.map(sanitizeValue);
            }
            const sanitized = {};
            for (const [key, val] of Object.entries(value)) {
                sanitized[key] = sanitizeValue(val);
            }
            return sanitized;
        }
        return value;
    };

    // Only sanitize body (not query/params which may need special chars)
    if (req.body && typeof req.body === "object") {
        // Skip sanitization for fields that legitimately need HTML/LaTeX
        const skipFields = ["content", "text", "solution", "paragraph", "prompt"];
        const body = { ...req.body };

        for (const [key, val] of Object.entries(body)) {
            if (!skipFields.includes(key)) {
                body[key] = sanitizeValue(val);
            }
        }
        req.body = body;
    }

    next();
};

module.exports = { mongoSanitizeMiddleware, xssProtection };
