const mongoose = require("mongoose");
const config = require("./index");
const logger = require("../utils/logger");

// ══════════════════════════════════════════════
//  MongoDB Connection Manager
//  - Auto-retry on failure
//  - Graceful shutdown hooks
//  - Connection event logging
// ══════════════════════════════════════════════

let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;

    try {
        const conn = await mongoose.connect(config.mongo.uri, config.mongo.options);
        isConnected = true;
        logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    } catch (err) {
        logger.error(`MongoDB connection error: ${err.message}`);
        // Retry after 5 seconds
        logger.info("Retrying MongoDB connection in 5 seconds...");
        setTimeout(connectDB, 5000);
    }
};

// Connection event listeners
mongoose.connection.on("disconnected", () => {
    isConnected = false;
    logger.warn("MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
    logger.error(`MongoDB error: ${err.message}`);
});

mongoose.connection.on("reconnected", () => {
    isConnected = true;
    logger.info("MongoDB reconnected");
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Closing MongoDB connection...`);
    await mongoose.connection.close();
    logger.info("MongoDB connection closed.");
    process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

module.exports = connectDB;
