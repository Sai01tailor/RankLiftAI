const User = require("../models/Users");
const { generateTokenPair, verifyRefreshToken, getRefreshTokenExpiry } = require("../services/auth");
const { generateOTP, storeOTP, verifyOTP, checkCooldown } = require("../services/otp");
const { sendOTPEmail } = require("../services/email");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");

// ══════════════════════════════════════════════════════════════════
//  AUTH CONTROLLER — Register, Login, OTP Login, Refresh, Logout
// ══════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────
//  POST /auth/register
//  Register a new student account
// ────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
    const { username, email, password, phone, targetExam, targetYear, class: studentClass } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
        throw ApiError.conflict("An account with this email already exists");
    }

    // Create user
    const user = await User.create({
        username,
        email: email.toLowerCase().trim(),
        password,
        phone,
        role: "student",
        profile: {
            targetExam: targetExam || "Both",
            targetYear: targetYear || new Date().getFullYear() + 1,
            class: studentClass || "12"
        }
    });

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Store refresh token in user document
    user.refreshTokens.push({
        token: tokens.refreshToken,
        device: req.headers["user-agent"] || "unknown",
        expiresAt: getRefreshTokenExpiry()
    });
    user.lastLoginAt = new Date();
    await user.save();

    logger.info(`New user registered: ${email}`);

    ApiResponse.created(res, "Registration successful", {
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            profile: user.profile,
            streak: user.streak,
            subscription: user.subscription,
            createdAt: user.createdAt,
        },
        tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        }
    });
});

// ────────────────────────────────────────────
//  POST /auth/login
//  Login with email + password
// ────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user with password field (+select ensures password is included)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
        throw ApiError.unauthorized("Invalid email or password");
    }

    if (user.accountStatus !== "active") {
        throw ApiError.forbidden(`Your account is ${user.accountStatus}`);
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw ApiError.unauthorized("Invalid email or password");
    }

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Clean expired tokens and add new one
    user.cleanExpiredTokens();
    user.refreshTokens.push({
        token: tokens.refreshToken,
        device: req.headers["user-agent"] || "unknown",
        expiresAt: getRefreshTokenExpiry()
    });
    user.lastLoginAt = new Date();
    user.updateStreak();
    await user.save();

    logger.info(`User logged in: ${email}`);

    ApiResponse.ok(res, "Login successful", {
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            profile: user.profile,
            streak: user.streak,
            subscription: user.subscription,
            createdAt: user.createdAt,
        },
        tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        }
    });
});

// ────────────────────────────────────────────
//  POST /auth/send-otp
//  Send OTP to email for passwordless login
// ────────────────────────────────────────────
const sendOTP = asyncHandler(async (req, res) => {
    const { email, purpose = "LOGIN" } = req.body;

    // Check cooldown (prevent spam)
    const cooldown = await checkCooldown(email);
    if (!cooldown.canSend) {
        throw ApiError.tooMany(
            `Please wait ${cooldown.waitSeconds} seconds before requesting a new OTP`
        );
    }

    // For LOGIN/RESET, check if user exists
    if (purpose === "LOGIN" || purpose === "RESET_PASSWORD") {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            throw ApiError.notFound("No account found with this email");
        }
        if (user.accountStatus !== "active") {
            throw ApiError.forbidden(`Account is ${user.accountStatus}`);
        }
    }

    // For REGISTER, check if email is already taken
    if (purpose === "REGISTER") {
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            throw ApiError.conflict("An account with this email already exists");
        }
    }

    // Generate and store OTP
    const otp = generateOTP();
    const stored = await storeOTP(email, otp);
    if (!stored) {
        throw ApiError.internal("Failed to generate OTP. Please try again.");
    }

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otp, purpose);
    if (!emailResult.success) {
        logger.error(`Failed to send OTP email to ${email}: ${emailResult.error}`);
        // Still return success to not reveal email sending issues
    }

    // In development, include OTP in response for testing
    const responseData = { message: `OTP sent to ${email}` };
    if (process.env.NODE_ENV === "development") {
        responseData.otp = otp; // Remove in production!
        responseData.note = "OTP included in response for development only";
    }

    ApiResponse.ok(res, "OTP sent successfully", responseData);
});

// ────────────────────────────────────────────
//  POST /auth/verify-otp
//  Verify OTP and login (passwordless)
// ────────────────────────────────────────────
const verifyOTPAndLogin = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    // Verify OTP
    const result = await verifyOTP(email, otp);
    if (!result.success) {
        throw ApiError.unauthorized(result.message);
    }

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
        // Auto-create account on first OTP login
        user = await User.create({
            username: email.split("@")[0],
            email: email.toLowerCase().trim(),
            password: require("crypto").randomBytes(32).toString("hex") + "Aa1!", // Random secure password
            role: "student"
        });
        logger.info(`Auto-created account via OTP: ${email}`);
    }

    if (user.accountStatus !== "active") {
        throw ApiError.forbidden(`Account is ${user.accountStatus}`);
    }

    // Generate tokens
    const tokens = generateTokenPair(user);

    user.cleanExpiredTokens();
    user.refreshTokens.push({
        token: tokens.refreshToken,
        device: req.headers["user-agent"] || "unknown",
        expiresAt: getRefreshTokenExpiry()
    });
    user.lastLoginAt = new Date();
    user.updateStreak();
    await user.save();

    logger.info(`User logged in via OTP: ${email}`);

    ApiResponse.ok(res, "OTP verified. Login successful", {
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            profile: user.profile,
            streak: user.streak,
            subscription: user.subscription,
            createdAt: user.createdAt,
        },
        tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        }
    });
});

// ────────────────────────────────────────────
//  POST /auth/refresh-token
//  Get new access token using refresh token
// ────────────────────────────────────────────
const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken: token } = req.body;
    if (!token) {
        throw ApiError.badRequest("Refresh token is required");
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(token);
    if (!decoded) {
        throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    // Find user and verify token exists in their stored tokens
    const user = await User.findById(decoded.userId);
    if (!user) {
        throw ApiError.unauthorized("User not found");
    }

    const storedToken = user.refreshTokens.find(t => t.token === token);
    if (!storedToken) {
        // Token reuse detected — possible token theft!
        // Invalidate ALL refresh tokens for security
        user.refreshTokens = [];
        await user.save();
        logger.warn(`Possible token theft detected for user: ${user.email}`);
        throw ApiError.unauthorized("Refresh token has been revoked. Please login again.");
    }

    // Remove old token and issue new pair (token rotation)
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== token);

    const tokens = generateTokenPair(user);
    user.refreshTokens.push({
        token: tokens.refreshToken,
        device: req.headers["user-agent"] || "unknown",
        expiresAt: getRefreshTokenExpiry()
    });
    user.cleanExpiredTokens();
    await user.save();

    ApiResponse.ok(res, "Tokens refreshed", {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
    });
});

// ────────────────────────────────────────────
//  POST /auth/logout
//  Revoke refresh token
// ────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
    const { refreshToken: token } = req.body;

    if (token && req.user) {
        // Remove specific refresh token
        req.user.refreshTokens = req.user.refreshTokens.filter(t => t.token !== token);
        await req.user.save();
    }

    logger.info(`User logged out: ${req.user?.email}`);
    ApiResponse.ok(res, "Logged out successfully");
});

// ────────────────────────────────────────────
//  POST /auth/logout-all
//  Revoke ALL refresh tokens (logout from all devices)
// ────────────────────────────────────────────
const logoutAll = asyncHandler(async (req, res) => {
    req.user.refreshTokens = [];
    await req.user.save();

    logger.info(`User logged out from all devices: ${req.user.email}`);
    ApiResponse.ok(res, "Logged out from all devices");
});

// ────────────────────────────────────────────
//  GET /auth/me
//  Get current user profile
// ────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
    ApiResponse.ok(res, "User profile", { user: req.user });
});

// ────────────────────────────────────────────
//  PATCH /auth/profile
//  Update user profile
// ────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
    const allowedFields = [
        "username", "phone", "avatarUrl",
        "profile.targetExam", "profile.targetYear",
        "profile.class", "profile.preferredLanguage",
        "profile.city", "profile.coachingInstitute"
    ];

    const updates = {};
    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
        // Handle nested profile fields sent as flat keys
        const parts = field.split(".");
        if (parts.length === 2 && req.body[parts[1]] !== undefined) {
            updates[field] = req.body[parts[1]];
        }
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true, runValidators: true }
    ).select("-password -refreshTokens");

    ApiResponse.ok(res, "Profile updated", { user });
});

// ────────────────────────────────────────────
//  POST /auth/change-password  (protected)
// ────────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
        throw ApiError.badRequest("currentPassword and newPassword are required");

    const user = await User.findById(req.userId).select("+password");
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw ApiError.unauthorized("Current password is incorrect");

    user.password = newPassword;
    // Invalidate all refresh tokens on password change
    user.refreshTokens = [];
    await user.save();

    logger.info(`Password changed: ${user.email}`);
    ApiResponse.ok(res, "Password changed successfully");
});

// ────────────────────────────────────────────
//  POST /auth/forgot-password  (public)
// ────────────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw ApiError.badRequest("Email is required");

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always respond OK to prevent email enumeration
    if (!user) {
        return ApiResponse.ok(res, "If this email is registered, a reset OTP has been sent.");
    }

    const otp = require('../services/otp').generateOTP();
    await require('../services/otp').storeOTP(email, otp, 'RESET_PASSWORD');
    await require('../services/email').sendOTPEmail(email, otp, 'RESET_PASSWORD');

    const r = { message: "OTP sent" };
    if (process.env.NODE_ENV === 'development') r.otp = otp;
    ApiResponse.ok(res, "If this email is registered, a reset OTP has been sent.", r);
});

// ────────────────────────────────────────────
//  POST /auth/reset-password  (public)
// ────────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
        throw ApiError.badRequest("email, otp and newPassword are required");

    const result = await require('../services/otp').verifyOTP(email, otp);
    if (!result.success) throw ApiError.unauthorized(result.message);

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) throw ApiError.notFound("Account not found");

    user.password = newPassword;
    user.refreshTokens = [];
    await user.save();

    logger.info(`Password reset: ${email}`);
    ApiResponse.ok(res, "Password reset successful. Please login with your new password.");
});

module.exports = {
    register,
    login,
    sendOTP,
    verifyOTPAndLogin,
    refreshToken,
    logout,
    logoutAll,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword
};
