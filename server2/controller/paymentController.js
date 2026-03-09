const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { User } = require("../models");
const logger = require("../utils/logger");
const {
    createOrder,
    verifyPaymentSignature,
    verifyWebhookSignature,
    calculateExpiry,
    PLAN_CONFIG
} = require("../services/payment");

// ══════════════════════════════════════════════
//  Payment Controller — Razorpay
//  POST /api/v1/payments/order    → Create order
//  POST /api/v1/payments/verify   → Client-side verification
//  POST /api/v1/payments/webhook  → Server-side webhook
//  GET  /api/v1/payments/plans    → List available plans
//  GET  /api/v1/payments/history  → User's payment history
// ══════════════════════════════════════════════

/**
 * GET /payments/plans — List available subscription plans
 */
const getPlans = asyncHandler(async (req, res) => {
    const plans = Object.entries(PLAN_CONFIG).map(([id, plan]) => ({
        id,
        name: plan.name,
        price: plan.amountINR / 100,      // Convert paise → ₹
        currency: "INR",
        durationDays: plan.durationDays,
        features: plan.features
    }));

    return ApiResponse.ok(res, "Available plans", { plans });
});

/**
 * POST /payments/order — Create a Razorpay order
 * Body: { planId: "basic" | "premium" }
 */
const createPaymentOrder = asyncHandler(async (req, res) => {
    const { planId } = req.body;

    if (!planId || !PLAN_CONFIG[planId]) {
        throw ApiError.badRequest("Invalid plan. Choose: basic or premium");
    }

    // Check if user already has an active subscription for this plan
    const user = await User.findById(req.user._id);
    if (
        user.subscription.isActive &&
        user.subscription.plan === planId &&
        user.subscription.expiresAt > new Date()
    ) {
        throw ApiError.conflict(`You already have an active ${planId} subscription until ${user.subscription.expiresAt.toLocaleDateString()}`);
    }

    const orderData = await createOrder(planId, user);

    return ApiResponse.created(res, "Order created", {
        order: orderData,
        prefill: {
            name: user.username,
            email: user.email,
            contact: user.phone || ""
        }
    });
});

/**
 * POST /payments/verify — Client-side payment verification
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId }
 * 
 * This is the fallback verification. The webhook is the primary handler.
 */
const verifyPayment = asyncHandler(async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        planId
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw ApiError.badRequest("Missing payment verification fields");
    }

    // Verify signature
    const isValid = verifyPaymentSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    );

    if (!isValid) {
        logger.warn(`Payment signature mismatch for user ${req.user._id}, order ${razorpay_order_id}`);
        throw ApiError.badRequest("Payment verification failed. Signature mismatch.");
    }

    // Activate subscription
    const expiresAt = calculateExpiry(planId);
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                "subscription.isActive": true,
                "subscription.plan": planId,
                "subscription.expiresAt": expiresAt,
                "subscription.razorpaySubscriptionId": razorpay_payment_id
            }
        },
        { new: true }
    );

    logger.info(`Subscription activated: user=${req.user._id} plan=${planId} expires=${expiresAt}`);

    return ApiResponse.ok(res, "Payment verified. Subscription activated!", {
        subscription: {
            plan: user.subscription.plan,
            isActive: user.subscription.isActive,
            expiresAt: user.subscription.expiresAt
        }
    });
});

/**
 * POST /payments/webhook — Razorpay webhook handler
 * No auth middleware — uses webhook secret verification.
 * 
 * Handles events:
 *  - payment.captured  → Activate subscription
 *  - payment.failed    → Log failure
 *  - refund.processed  → Deactivate subscription
 */
const handleWebhook = asyncHandler(async (req, res) => {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody; // Need raw body for HMAC — see route setup

    if (!signature || !rawBody) {
        throw ApiError.badRequest("Missing webhook signature");
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
        logger.warn("Webhook signature verification failed");
        throw ApiError.unauthorized("Invalid webhook signature");
    }

    const event = req.body;
    const eventType = event.event;
    const payload = event.payload?.payment?.entity;

    logger.info(`Razorpay webhook received: ${eventType}`);

    switch (eventType) {
        case "payment.captured": {
            const userId = payload?.notes?.userId;
            const planId = payload?.notes?.plan;

            if (!userId || !planId) {
                logger.warn("Webhook payment.captured missing userId or plan in notes");
                return res.status(200).json({ received: true });
            }

            const expiresAt = calculateExpiry(planId);

            await User.findByIdAndUpdate(userId, {
                $set: {
                    "subscription.isActive": true,
                    "subscription.plan": planId,
                    "subscription.expiresAt": expiresAt,
                    "subscription.razorpaySubscriptionId": payload.id
                }
            });

            logger.info(`Webhook: Subscription activated for user ${userId} (${planId})`);
            break;
        }

        case "payment.failed": {
            const userId = payload?.notes?.userId;
            logger.warn(`Payment failed for user ${userId}: ${payload?.error_description}`);
            break;
        }

        case "refund.processed": {
            // Find user by the payment/subscription ID and deactivate
            const refundPaymentId = event.payload?.refund?.entity?.payment_id;
            if (refundPaymentId) {
                await User.findOneAndUpdate(
                    { "subscription.razorpaySubscriptionId": refundPaymentId },
                    {
                        $set: {
                            "subscription.isActive": false,
                            "subscription.plan": "free",
                            "subscription.expiresAt": null
                        }
                    }
                );
                logger.info(`Refund processed, subscription deactivated for payment ${refundPaymentId}`);
            }
            break;
        }

        default:
            logger.debug(`Unhandled webhook event: ${eventType}`);
    }

    // Always return 200 to Razorpay
    return res.status(200).json({ received: true });
});

/**
 * GET /payments/subscription — Get current user's subscription status
 */
const getSubscriptionStatus = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("subscription");

    // Check if subscription expired
    if (
        user.subscription.isActive &&
        user.subscription.expiresAt &&
        user.subscription.expiresAt < new Date()
    ) {
        user.subscription.isActive = false;
        user.subscription.plan = "free";
        await user.save();
    }

    return ApiResponse.ok(res, "Subscription status", {
        subscription: user.subscription
    });
});

module.exports = {
    getPlans,
    createPaymentOrder,
    verifyPayment,
    handleWebhook,
    getSubscriptionStatus
};
