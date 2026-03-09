const ApiError = require("../utils/ApiError");

// ══════════════════════════════════════════════
//  Input Validation Middleware
//  Validates req.body, req.query, req.params
//  Uses a simple schema-based approach (no Joi/Zod dependency!)
// ══════════════════════════════════════════════

/**
 * Validate request body against a schema.
 * Schema format: { fieldName: { required, type, min, max, enum, match, custom } }
 *
 * Usage:
 * router.post("/register", validate(registerSchema), controller)
 */
const validate = (schema, source = "body") => {
    return (req, res, next) => {
        const data = req[source];
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];

            // Required check
            if (rules.required && (value === undefined || value === null || value === "")) {
                errors.push(`${field} is required`);
                continue;
            }

            // Skip further checks if value is not present and not required
            if (value === undefined || value === null) continue;

            // Type check
            if (rules.type) {
                if (rules.type === "string" && typeof value !== "string") {
                    errors.push(`${field} must be a string`);
                } else if (rules.type === "number" && (typeof value !== "number" || isNaN(value))) {
                    errors.push(`${field} must be a number`);
                } else if (rules.type === "boolean" && typeof value !== "boolean") {
                    errors.push(`${field} must be a boolean`);
                } else if (rules.type === "array" && !Array.isArray(value)) {
                    errors.push(`${field} must be an array`);
                } else if (rules.type === "objectId" && !/^[a-fA-F0-9]{24}$/.test(value)) {
                    errors.push(`${field} must be a valid ObjectId`);
                }
            }

            // Min/Max for strings
            if (rules.minLength && typeof value === "string" && value.length < rules.minLength) {
                errors.push(`${field} must be at least ${rules.minLength} characters`);
            }
            if (rules.maxLength && typeof value === "string" && value.length > rules.maxLength) {
                errors.push(`${field} must be at most ${rules.maxLength} characters`);
            }

            // Min/Max for numbers
            if (rules.min !== undefined && typeof value === "number" && value < rules.min) {
                errors.push(`${field} must be at least ${rules.min}`);
            }
            if (rules.max !== undefined && typeof value === "number" && value > rules.max) {
                errors.push(`${field} must be at most ${rules.max}`);
            }

            // Enum check
            if (rules.enum && !rules.enum.includes(value)) {
                errors.push(`${field} must be one of: ${rules.enum.join(", ")}`);
            }

            // Regex match
            if (rules.match && typeof value === "string" && !rules.match.test(value)) {
                errors.push(rules.matchMessage || `${field} format is invalid`);
            }

            // Custom validator
            if (rules.custom && typeof rules.custom === "function") {
                const customError = rules.custom(value, data);
                if (customError) errors.push(customError);
            }
        }

        if (errors.length > 0) {
            return next(ApiError.badRequest("Validation failed", errors));
        }

        next();
    };
};

// ══════════════════════════════════════════════
//  Pre-built Validation Schemas
// ══════════════════════════════════════════════

const schemas = {
    register: {
        username: { required: true, type: "string", minLength: 3, maxLength: 30 },
        email: {
            required: true,
            type: "string",
            match: /^\S+@\S+\.\S+$/,
            matchMessage: "Please enter a valid email address"
        },
        password: {
            required: true,
            type: "string",
            minLength: 6
        },
        phone: { required: false, type: "string" },
        targetExam: { required: false, type: "string" },
        targetYear: { required: false, type: "number" },
        class: { required: false, type: "string" },
    },

    login: {
        email: {
            required: true,
            type: "string",
            match: /^\S+@\S+\.\S+$/,
            matchMessage: "Please enter a valid email"
        },
        password: { required: true, type: "string", minLength: 1 }
    },

    sendOTP: {
        email: {
            required: true,
            type: "string",
            match: /^\S+@\S+\.\S+$/,
            matchMessage: "Please enter a valid email"
        },
        purpose: {
            required: false,
            type: "string",
            enum: ["LOGIN", "REGISTER", "RESET_PASSWORD"]
        }
    },

    verifyOTP: {
        email: { required: true, type: "string" },
        otp: { required: true, type: "string", minLength: 6, maxLength: 6 }
    },

    createQuestion: {
        subjectId: { required: true, type: "objectId" },
        chapterId: { required: true, type: "objectId" },
        topicId: { required: true, type: "objectId" },
        type: { required: true, type: "string", enum: ["SCQ", "MCQ", "INTEGER", "NUMERICAL", "COMPREHENSION"] },
        difficulty: { required: true, type: "string", enum: ["Easy", "Medium", "Hard"] },
        examCategory: { required: true, type: "string", enum: ["JEE Main", "JEE Advanced", "Both"] }
    },

    submitPractice: {
        questionId: { required: true, type: "objectId" },
        isAttempted: { required: true, type: "boolean" }
    },

    submitMockTest: {
        testAttemptId: { required: true, type: "objectId" }
    },

    aiExplanation: {
        questionId: { required: true, type: "objectId" },
        interactionType: {
            required: true,
            type: "string",
            enum: ["EXPLAIN_SOLUTION", "EXPLAIN_CONCEPT", "HINT", "DOUBT", "ALTERNATIVE_METHOD"]
        }
    }
};

module.exports = { validate, schemas };
