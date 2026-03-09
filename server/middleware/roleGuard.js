const ApiError = require("../utils/ApiError");

// ══════════════════════════════════════════════
//  Role Guard Middleware — Role-based access control
//  Usage: router.get("/admin", authenticate, authorize("admin"), handler)
// ══════════════════════════════════════════════

/**
 * Restrict access to specific roles.
 * @param  {...string} allowedRoles - e.g., "admin", "student"
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(ApiError.unauthorized("Authentication required"));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(
                ApiError.forbidden(
                    `Role '${req.user.role}' is not authorized to access this resource. Required: ${allowedRoles.join(" or ")}`
                )
            );
        }

        next();
    };
};

/**
 * Check if user owns the resource OR is admin.
 * Compares req.params.userId with req.user._id
 */
const authorizeOwnerOrAdmin = (req, res, next) => {
    if (!req.user) {
        return next(ApiError.unauthorized("Authentication required"));
    }

    const resourceUserId = req.params.userId || req.body.userId;
    const isOwner = resourceUserId && req.user._id.toString() === resourceUserId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
        return next(ApiError.forbidden("You can only access your own resources"));
    }

    next();
};

module.exports = { authorize, authorizeOwnerOrAdmin };
