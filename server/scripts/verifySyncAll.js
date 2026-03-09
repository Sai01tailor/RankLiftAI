/**
 * Full sync verification — checks every import chain in the entire backend.
 */

const modules = [
    // Config
    ["config/index.js", "./config"],
    ["config/db.js", "./config/db"],
    ["config/redis.js", "./config/redis"],

    // Models (all 10)
    ["models/index.js", "./models"],
    ["models/Users.js", "./models/Users"],
    ["models/SubNTopic.js", "./models/SubNTopic"],
    ["models/Question.js", "./models/Question"],
    ["models/MockTest.js", "./models/MockTest"],
    ["models/TestAttempt.js", "./models/TestAttempt"],
    ["models/PracticeAttempt.js", "./models/PracticeAttempt"],
    ["models/PerformanceAnalytics.js", "./models/PerformanceAnalytics"],
    ["models/Leaderboard.js", "./models/Leaderboard"],
    ["models/AIInteractionLog.js", "./models/AIInteractionLog"],

    // Utils (6)
    ["utils/ApiError.js", "./utils/ApiError"],
    ["utils/ApiResponse.js", "./utils/ApiResponse"],
    ["utils/asyncHandler.js", "./utils/asyncHandler"],
    ["utils/constants.js", "./utils/constants"],
    ["utils/logger.js", "./utils/logger"],
    ["utils/pagination.js", "./utils/pagination"],

    // Services (8)
    ["services/auth.js", "./services/auth"],
    ["services/otp.js", "./services/otp"],
    ["services/email.js", "./services/email"],
    ["services/cache.js", "./services/cache"],
    ["services/gemini.js", "./services/gemini"],
    ["services/ml.js", "./services/ml"],
    ["services/payment.js", "./services/payment"],
    ["services/fileUpload.js", "./services/fileUpload"],
    ["services/cronJobs.js", "./services/cronJobs"],

    // Middleware (6)
    ["middleware/auth.js", "./middleware/auth"],
    ["middleware/roleGuard.js", "./middleware/roleGuard"],
    ["middleware/rateLimiter.js", "./middleware/rateLimiter"],
    ["middleware/errorHandler.js", "./middleware/errorHandler"],
    ["middleware/validate.js", "./middleware/validate"],
    ["middleware/sanitize.js", "./middleware/sanitize"],

    // Controllers (5)
    ["controller/authController.js", "./controller/authController"],
    ["controller/studentController.js", "./controller/studentController"],
    ["controller/adminController.js", "./controller/adminController"],
    ["controller/aiController.js", "./controller/aiController"],
    ["controller/paymentController.js", "./controller/paymentController"],

    // Routes (6)
    ["Routes/authRoutes.js", "./Routes/authRoutes"],
    ["Routes/studentRoutes.js", "./Routes/studentRoutes"],
    ["Routes/adminRoutes.js", "./Routes/adminRoutes"],
    ["Routes/aiRoutes.js", "./Routes/aiRoutes"],
    ["Routes/paymentRoutes.js", "./Routes/paymentRoutes"],
    ["Routes/index.js", "./Routes"],
];

console.log("=".repeat(60));
console.log("  JEEWALLAH FULL SYNC VERIFICATION");
console.log("=".repeat(60));
console.log("");

let pass = 0;
let fail = 0;
const failures = [];

for (const [label, path] of modules) {
    try {
        const mod = require(path);
        const exports = typeof mod === "object" ? Object.keys(mod) : [typeof mod];
        console.log(`  ✅ ${label.padEnd(42)} → exports: [${exports.join(", ")}]`);
        pass++;
    } catch (e) {
        console.log(`  ❌ ${label.padEnd(42)} → ${e.message}`);
        failures.push({ label, error: e.message, stack: e.stack });
        fail++;
    }
}

console.log("");
console.log("=".repeat(60));
console.log(`  RESULT: ${pass}/${modules.length} passed | ${fail} failed`);
console.log("=".repeat(60));

if (failures.length > 0) {
    console.log("\n--- FAILURE DETAILS ---\n");
    failures.forEach(f => {
        console.log(`❌ ${f.label}`);
        console.log(`   Error: ${f.error}`);
        // Show the first useful stack line
        const stackLines = f.stack.split("\n").filter(l => l.includes("JeeWallah")).slice(0, 3);
        stackLines.forEach(l => console.log(`   ${l.trim()}`));
        console.log("");
    });
}

// Cross-reference check: Verify model barrel exports match
console.log("\n--- MODEL BARREL EXPORT CHECK ---");
const modelIndex = require("./models");
const expectedModels = [
    "User", "Subject", "Chapter", "Topic", "Question", "Comprehension",
    "MockTest", "TestAttempt", "PracticeAttempt", "PerformanceAnalytics",
    "TestLeaderboard", "GlobalLeaderboard", "AIInteractionLog"
];
expectedModels.forEach(name => {
    const exists = modelIndex[name] !== undefined;
    console.log(`  ${exists ? "✅" : "❌"} models/index.js exports "${name}": ${exists}`);
});

// Check controller export functions
console.log("\n--- CONTROLLER FUNCTION CHECK ---");
const checks = [
    ["authController", require("./controller/authController"),
        ["register", "login", "sendOTP", "verifyOTPAndLogin", "refreshToken", "logout", "logoutAll", "getMe", "updateProfile"]],
    ["studentController", require("./controller/studentController"),
        ["getSubjects", "getChapters", "getTopics", "getQuestions", "submitPracticeAttempt", "getAvailableTests", "startMockTest", "submitMockTest"]],
    ["adminController", require("./controller/adminController"),
        ["createSubject", "createChapter", "createTopic", "createQuestion", "bulkUploadQuestions", "createMockTest"]],
    ["aiController", require("./controller/aiController"),
        ["getAIExplanation", "submitAIFeedback", "getMLWeakTopics", "getScorePrediction", "getMLHealth"]],
    ["paymentController", require("./controller/paymentController"),
        ["getPlans", "createPaymentOrder", "verifyPayment", "handleWebhook", "getSubscriptionStatus"]],
];

let funcPass = 0, funcFail = 0;
checks.forEach(([name, mod, fns]) => {
    fns.forEach(fn => {
        const exists = typeof mod[fn] === "function";
        if (!exists) {
            console.log(`  ❌ ${name}.${fn} — MISSING`);
            funcFail++;
        } else {
            funcPass++;
        }
    });
});
console.log(`  ✅ ${funcPass} controller functions verified, ${funcFail} missing`);

// Middleware export check
console.log("\n--- MIDDLEWARE EXPORT CHECK ---");
const mwChecks = [
    ["middleware/auth", require("./middleware/auth"), ["authenticate", "optionalAuth"]],
    ["middleware/roleGuard", require("./middleware/roleGuard"), ["authorize", "ownerOrAdmin"]],
    ["middleware/rateLimiter", require("./middleware/rateLimiter"), ["apiLimiter", "authLimiter", "otpLimiter", "aiLimiter"]],
    ["middleware/errorHandler", require("./middleware/errorHandler"), ["errorHandler", "notFoundHandler"]],
    ["middleware/validate", require("./middleware/validate"), ["validate", "schemas"]],
    ["middleware/sanitize", require("./middleware/sanitize"), ["mongoSanitizeMiddleware", "xssProtection"]],
];

let mwPass = 0, mwFail = 0;
mwChecks.forEach(([name, mod, fns]) => {
    fns.forEach(fn => {
        const exists = mod[fn] !== undefined;
        if (!exists) {
            console.log(`  ❌ ${name}.${fn} — MISSING`);
            mwFail++;
        } else {
            mwPass++;
        }
    });
});
console.log(`  ✅ ${mwPass} middleware exports verified, ${mwFail} missing`);

// Service export check
console.log("\n--- SERVICE EXPORT CHECK ---");
const svcChecks = [
    ["services/auth", require("./services/auth"), ["generateAccessToken", "generateRefreshToken", "verifyAccessToken", "verifyRefreshToken"]],
    ["services/otp", require("./services/otp"), ["generateOTP", "verifyOTP"]],
    ["services/cache", require("./services/cache"), ["setCache", "getCache", "deleteCache"]],
    ["services/gemini", require("./services/gemini"), ["getExplanation"]],
    ["services/ml", require("./services/ml"), ["predictWeakTopics", "predictScore"]],
    ["services/payment", require("./services/payment"), ["createOrder", "verifyPaymentSignature", "verifyWebhookSignature", "PLAN_CONFIG"]],
    ["services/fileUpload", require("./services/fileUpload"), ["uploadSingle", "uploadMultiple", "uploadFile", "deleteFromCloudinary", "processAvatarUpload", "processQuestionImages"]],
    ["services/cronJobs", require("./services/cronJobs"), ["initCronJobs", "stopCronJobs", "cleanExpiredTokens", "rebuildLeaderboards", "retrainMLModels"]],
];

let svcPass = 0, svcFail = 0;
svcChecks.forEach(([name, mod, fns]) => {
    fns.forEach(fn => {
        const exists = mod[fn] !== undefined;
        if (!exists) {
            console.log(`  ❌ ${name}.${fn} — MISSING`);
            svcFail++;
        } else {
            svcPass++;
        }
    });
});
console.log(`  ✅ ${svcPass} service exports verified, ${svcFail} missing`);

// Final summary
console.log("\n" + "=".repeat(60));
const totalChecks = pass + funcPass + mwPass + svcPass + expectedModels.length;
const totalFails = fail + funcFail + mwFail + svcFail;
console.log(`  TOTAL: ${totalChecks - totalFails}/${totalChecks} checks passed`);
if (totalFails === 0) {
    console.log("  🎉 ALL FILES ARE IN SYNC!");
} else {
    console.log(`  ⚠️  ${totalFails} issues found — see above`);
}
console.log("=".repeat(60) + "\n");

process.exit(totalFails > 0 ? 1 : 0);
