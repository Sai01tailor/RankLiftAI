const nodemailer = require("nodemailer");
const config = require("../config");
const logger = require("../utils/logger");

// ══════════════════════════════════════════════
//  Email Service — Sends OTPs & Notifications
//  Uses Nodemailer with SMTP (Gmail/SendGrid/etc)
// ══════════════════════════════════════════════

let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.port === 465,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.pass
            }
        });
    }
    return transporter;
};

/**
 * Send OTP email to a user.
 * @param {string} to - Recipient email
 * @param {string} otp - The OTP code
 * @param {string} purpose - "LOGIN" | "REGISTER" | "RESET_PASSWORD"
 */
const sendOTPEmail = async (to, otp, purpose = "LOGIN") => {
    const subjects = {
        LOGIN: "Your JeeWallah Login OTP",
        REGISTER: "Welcome to JeeWallah — Verify Your Email",
        RESET_PASSWORD: "JeeWallah Password Reset OTP"
    };

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 40px; border: 1px solid #334155;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #60a5fa; font-size: 28px; margin: 0;">JeeWallah</h1>
                <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Your JEE Preparation Partner</p>
            </div>
            
            <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                ${purpose === "REGISTER" ? "Welcome! Please verify your email to get started." :
            purpose === "RESET_PASSWORD" ? "We received a password reset request. Use this OTP:" :
                "Use the OTP below to log in to your account."}
            </p>
            
            <div style="background: linear-gradient(135deg, #1d4ed8, #7c3aed); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <p style="color: #c7d2fe; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">Your OTP Code</p>
                <h2 style="color: #ffffff; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${otp}</h2>
            </div>
            
            <p style="color: #94a3b8; font-size: 13px; text-align: center;">
                This OTP is valid for <strong style="color: #fbbf24;">${config.otp.expiryMinutes} minutes</strong>. Do not share it with anyone.
            </p>
            
            <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;" />
            
            <p style="color: #64748b; font-size: 11px; text-align: center;">
                If you didn't request this, please ignore this email.<br/>
                © ${new Date().getFullYear()} JeeWallah. All rights reserved.
            </p>
        </div>
    </body>
    </html>`;

    try {
        const mail = getTransporter();
        const info = await mail.sendMail({
            from: `"JeeWallah" <${config.smtp.user}>`,
            to,
            subject: subjects[purpose] || subjects.LOGIN,
            html: htmlContent
        });

        logger.info(`OTP email sent to ${to} (messageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        logger.error(`Email send error to ${to}: ${err.message}`);
        return { success: false, error: err.message };
    }
};

/**
 * Verify SMTP connection is working.
 */
const verifyConnection = async () => {
    try {
        const mail = getTransporter();
        await mail.verify();
        logger.info("SMTP connection verified");
        return true;
    } catch (err) {
        logger.warn(`SMTP verification failed: ${err.message}`);
        return false;
    }
};

module.exports = { sendOTPEmail, verifyConnection };
