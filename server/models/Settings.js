const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    siteName: { type: String, default: 'JeeWallah' },
    logoUrl: { type: String, default: '' },
    aboutUs: { type: String, default: 'Welcome to JeeWallah, your premier destination for JEE preparation.' },
    termsAndConditions: { type: String, default: 'These are the terms and conditions...' },
    footerText: { type: String, default: '© 2026 JeeWallah. All rights reserved.' },
    loginContent: { type: String, default: 'Welcome back! Please login to your account.' },
    signupContent: { type: String, default: 'Join us today and start your journey.' }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
