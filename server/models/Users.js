const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ══════════════════════════════════════════════════════════════════
//  USER SCHEMA — Core identity for Students & Admins
//  Optimized for 1M+ users with selective indexing
// ══════════════════════════════════════════════════════════════════

const userSchema = new mongoose.Schema({
    // --- 1. IDENTITY ---
    username: {
        type: String,
        required: [true, "Username is required"],
        trim: true,
        minlength: [3, "Username must be at least 3 characters"],
        maxlength: [30, "Username cannot exceed 30 characters"]
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"]
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: 8,
        // NOTE: No `match` regex here — it would validate the bcrypt hash
        // on every save() (login, logout, token refresh). Raw password
        // validation happens in the pre-save hook before hashing.
        select: false // Never leak password in queries
    },
    phone: {
        type: String,
        trim: true,
        sparse: true // Allow null/missing but unique if provided
    },
    avatarUrl: {
        type: String,
        default: null
    },

    // --- 2. ROLE & ACCESS ---
    role: {
        type: String,
        enum: ["student", "admin"],
        default: "student",
        index: true
    },
    subscription: {
        isActive: { type: Boolean, default: false },
        plan: {
            type: String,
            enum: ["free", "basic", "premium", "ultimate"],
            default: "free"
        },
        expiresAt: { type: Date, default: null },
        razorpaySubscriptionId: { type: String, default: null }
    },
    accountStatus: {
        type: String,
        enum: ["active", "suspended", "deactivated"],
        default: "active"
    },

    // --- 3. AUTH TOKENS ---
    refreshTokens: [{
        token: { type: String, required: true },
        device: { type: String, default: "unknown" },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true }
    }],

    // --- 4. STUDENT PROFILE (Only relevant for role: "student") ---
    profile: {
        targetExam: {
            type: String,
            enum: ["JEE Main", "JEE Advanced", "Both"],
            default: "Both"
        },
        targetYear: {
            type: Number,
            default: () => new Date().getFullYear() + 1
        },
        class: {
            type: String,
            enum: ["11", "12", "Dropper"],
            default: "12"
        },
        preferredLanguage: {
            type: String,
            enum: ["en", "hi"],
            default: "en"
        },
        city: { type: String, trim: true },
        coachingInstitute: { type: String, trim: true }
    },

    // --- 5. ENGAGEMENT TRACKING ---
    streak: {
        currentStreak: { type: Number, default: 0 },
        longestStreak: { type: Number, default: 0 },
        lastActiveDate: { type: Date, default: null }
    },
    totalPracticeTime: { type: Number, default: 0 }, // in seconds
    lastLoginAt: { type: Date, default: null },

    // --- 6. PASSWORD RESET ---
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false }

}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            delete ret.password;
            delete ret.refreshTokens;
            delete ret.__v;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// ══════════════════════════════════════════
//  INDEXES
//  NOTE: `email` already has `unique: true` inline (creates index automatically).
//        `role` already has `index: true` inline.
//        Only declare compound/TTL/additional indexes here.
// ══════════════════════════════════════════
userSchema.index({ accountStatus: 1 });
userSchema.index({ "subscription.isActive": 1, role: 1 });
// TTL index to auto-expire old refresh tokens
userSchema.index({ "refreshTokens.expiresAt": 1 }, { expireAfterSeconds: 0 });

// ══════════════════════════════════════════
//  PRE-SAVE HOOKS
// ══════════════════════════════════════════
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    // Validate raw password strength before hashing
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(this.password)) {
        const err = new Error("Password must contain at least one uppercase, one lowercase, one number, and one special character");
        err.name = "ValidationError";
        throw err;
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// ══════════════════════════════════════════
//  INSTANCE METHODS
// ══════════════════════════════════════════
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Update streak on daily activity
userSchema.methods.updateStreak = function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = this.streak.lastActiveDate;
    if (lastActive) {
        const lastDate = new Date(lastActive);
        lastDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            this.streak.currentStreak += 1;
        } else if (diffDays > 1) {
            this.streak.currentStreak = 1; // Reset
        }
        // diffDays === 0 means same day, no change
    } else {
        this.streak.currentStreak = 1;
    }

    this.streak.longestStreak = Math.max(this.streak.longestStreak, this.streak.currentStreak);
    this.streak.lastActiveDate = today;
};

// Clean expired refresh tokens
userSchema.methods.cleanExpiredTokens = function () {
    this.refreshTokens = this.refreshTokens.filter(
        (t) => t.expiresAt > new Date()
    );
};

// ══════════════════════════════════════════
//  STATICS (Class-level methods)
// ══════════════════════════════════════════
userSchema.statics.findByEmail = function (email) {
    return this.findOne({ email: email.toLowerCase().trim() });
};

userSchema.statics.getActiveStudents = function () {
    return this.find({ role: "student", accountStatus: "active" });
};

module.exports = mongoose.model("User", userSchema);