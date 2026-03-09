const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");

// ══════════════════════════════════════════════
//  Centralized Error Handler Middleware
//  Must be the LAST middleware registered
//  Handles all errors thrown via next(err) or thrown in async handlers
// ══════════════════════════════════════════════

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.stack = err.stack;

    // --- Mongoose: Bad ObjectId ---
    if (err.name === "CastError") {
        error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
    }

    // --- Mongoose: Duplicate key ---
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0];
        const value = err.keyValue?.[field];
        error = ApiError.conflict(
            `Duplicate value for '${field}': '${value}'. This ${field} is already in use.`
        );
    }

    // --- Mongoose: Validation Error ---
    if (err.name === "ValidationError") {
        const messages = err.errors ? Object.values(err.errors).map((e) => e.message) : [err.message];
        error = ApiError.badRequest("Validation failed", messages);
    }

    // --- JWT Errors ---
    if (err.name === "JsonWebTokenError") {
        error = ApiError.unauthorized("Invalid token");
    }
    if (err.name === "TokenExpiredError") {
        error = ApiError.unauthorized("Token has expired");
    }

    // --- Multer (file upload) errors ---
    if (err.name === "MulterError") {
        error = ApiError.badRequest(`File upload error: ${err.message}`);
    }

    // Determine status code
    const statusCode = error.statusCode || 500;
    const isServerError = statusCode >= 500;

    // Log server errors with full stack
    if (isServerError) {
        logger.error(`[${req.method}] ${req.originalUrl} — ${err.message}`, {
            stack: err.stack,
            body: req.body,
            params: req.params,
            userId: req.userId || "anonymous"
        });
    } else {
        logger.warn(`[${req.method}] ${req.originalUrl} — ${statusCode} ${error.message}`);
    }

    // Send response
    res.status(statusCode).json({
        success: false,
        message: isServerError && process.env.NODE_ENV === "production"
            ? "Internal Server Error"
            : error.message || "Something went wrong",
        errors: error.errors || [],
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
};

// 404 handler — for routes that don't match
const notFoundHandler = (req, res, next) => {
    next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = { errorHandler, notFoundHandler };
