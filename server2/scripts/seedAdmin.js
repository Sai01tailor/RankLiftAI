/**
 * Seed Admin User — Run once to create an admin account
 * Usage: node scripts/seedAdmin.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const config = require("../config");

const ADMIN = {
    username: "Admin JeeWallah",
    email: "jeeacers@gmail.com",
    password: "Admin@JeeWallah2026",
    phone: "9999999999",
    role: "admin",
    accountStatus: "active",
    profile: {
        targetExam: "Both",
        targetYear: 2027,
        class: "12",
        preferredLanguage: "en"
    }
};

async function seedAdmin() {
    try {
        console.log("🔌 Connecting to MongoDB...");
        await mongoose.connect(config.mongo.uri, config.mongo.options);
        console.log("✅ Connected\n");

        const User = require("../models/Users");

        // Check if admin already exists
        const existing = await User.findOne({ email: ADMIN.email });
        if (existing) {
            existing.role = "admin";
            existing.password = ADMIN.password; // Mongoose pre-save hook will hash it
            await existing.save();
            console.log(`✅ Updated existing user to admin with new credentials: ${existing.email}`);
        } else {
            // Hash password manually
            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash(ADMIN.password, salt);

            // Insert directly to bypass Mongoose pre-save hooks and validation
            const result = await mongoose.connection.collection("users").insertOne({
                ...ADMIN,
                password: hashedPassword,
                refreshTokens: [],
                streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
                totalPracticeTime: 0,
                lastLoginAt: null,
                subscription: { isActive: false, plan: "free", expiresAt: null },
                createdAt: new Date(),
                updatedAt: new Date()
            });

            console.log("✅ Admin user created successfully!");
            console.log(`   Email:    ${ADMIN.email}`);
            console.log(`   Password: ${ADMIN.password}`);
            console.log(`   Role:     ${ADMIN.role}`);
            console.log(`   ID:       ${result.insertedId}`);
        }

        console.log("\n📋 Admin Login Credentials:");
        console.log("   ─────────────────────────");
        console.log(`   Email:    ${ADMIN.email}`);
        console.log(`   Password: ${ADMIN.password}`);
        console.log("   ─────────────────────────");

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await mongoose.disconnect();
        console.log("\n🔌 Disconnected from MongoDB");
    }
}

seedAdmin();
