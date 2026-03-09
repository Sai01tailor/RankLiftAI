const Razorpay = require("razorpay");
const crypto = require("crypto");
const config = require("../config");
const logger = require("../utils/logger");

// ══════════════════════════════════════════════
//  Payment Service — Razorpay Integration
//  - Creates orders
//  - Verifies webhook signatures
//  - Maps plan names → durations & amounts
// ══════════════════════════════════════════════

let razorpayInstance = null;

const getRazorpay = () => {
    if (!razorpayInstance && config.razorpay.keyId) {
        razorpayInstance = new Razorpay({
            key_id: config.razorpay.keyId,
            key_secret: config.razorpay.keySecret
        });
    }
    return razorpayInstance;
};

// ── Plan definitions ──
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../config/plans.json');

const getPlanConfig = () => {
    try {
        const data = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        logger.error("Failed to read plans.json, using defaults.");
        return {};
    }
};

const PLAN_CONFIG = new Proxy({}, {
    get: (target, prop) => {
        return getPlanConfig()[prop];
    },
    ownKeys: () => {
        return Object.keys(getPlanConfig());
    },
    getOwnPropertyDescriptor: (target, prop) => {
        return { enumerable: true, configurable: true, value: getPlanConfig()[prop] };
    }
});

/**
 * Create a Razorpay order.
 * @param {string} planId - "basic" | "premium" | "ultimate"
 * @param {Object} user - User document
 * @returns {{ orderId, amount, currency, plan, key }}
 */
const createOrder = async (planId, user) => {
    const plan = PLAN_CONFIG[planId];
    if (!plan) throw new Error(`Invalid plan: ${planId}`);

    const rzp = getRazorpay();
    if (!rzp) throw new Error("Razorpay not configured");

    const order = await rzp.orders.create({
        amount: plan.amountINR,
        currency: "INR",
        receipt: `rcpt_${user._id}_${Date.now()}`,
        notes: {
            userId: user._id.toString(),
            plan: planId,
            email: user.email
        }
    });

    logger.info(`Razorpay order created: ${order.id} for user ${user._id} (${planId})`);

    return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        plan: { id: planId, ...plan },
        key: config.razorpay.keyId
    };
};

/**
 * Verify Razorpay payment signature.
 * Uses HMAC-SHA256 with the webhook secret.
 */
const verifyPaymentSignature = (orderId, paymentId, signature) => {
    const body = `${orderId}|${paymentId}`;
    const expected = crypto
        .createHmac("sha256", config.razorpay.keySecret)
        .update(body)
        .digest("hex");

    return expected === signature;
};

/**
 * Verify Razorpay webhook signature.
 */
const verifyWebhookSignature = (rawBody, signature) => {
    const expected = crypto
        .createHmac("sha256", config.razorpay.webhookSecret)
        .update(rawBody)
        .digest("hex");

    return expected === signature;
};

/**
 * Calculate subscription expiry from now.
 */
const calculateExpiry = (planId) => {
    const plan = PLAN_CONFIG[planId];
    if (!plan) return null;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + plan.durationDays);
    return expiry;
};

module.exports = {
    createOrder,
    verifyPaymentSignature,
    verifyWebhookSignature,
    calculateExpiry,
    PLAN_CONFIG,
    getRazorpay
};
