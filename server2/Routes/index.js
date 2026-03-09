const { Router } = require("express");
const authRoutes = require("./authRoutes");
const studentRoutes = require("./studentRoutes");
const adminRoutes = require("./adminRoutes");
const aiRoutes = require("./aiRoutes");
const paymentRoutes = require("./paymentRoutes");
const settingsRoutes = require("./settingsRoutes");

const router = Router();

// API version prefix
const API_PREFIX = "/api/v1";

// Health check (no auth)
router.get(`${API_PREFIX}/health`, (req, res) => {
    res.status(200).json({
        success: true,
        message: "JeeWallah API is running",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        worker: process.pid
    });
});

// Mount route groups
router.use(`${API_PREFIX}/auth`, authRoutes);
router.use(`${API_PREFIX}/student`, studentRoutes);
router.use(`${API_PREFIX}/admin`, adminRoutes);
router.use(`${API_PREFIX}/ai`, aiRoutes);
router.use(`${API_PREFIX}/payments`, paymentRoutes);
router.use(`${API_PREFIX}/settings`, settingsRoutes);

module.exports = router;
