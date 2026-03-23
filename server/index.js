const cluster = require("cluster");
const os = require("os");
const dns = require("dns");
const { initCronJobs, stopCronJobs } = require("./services/cronJobs");

// Force IPv4 resolution globally by default to fix ENETUNREACH issues on Render
dns.setDefaultResultOrder("ipv4first");

if (cluster.isPrimary) {
    const numCPUs = Math.min(os.cpus().length, 4); // Cap at 4 workers
    console.log(`\n🚀 JeeWallah Primary Process [PID: ${process.pid}]`);
    console.log(`   Forking ${numCPUs} workers...\n`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log(`⚠️  Worker ${worker.process.pid} exited (code: ${code}). Restarting...`);
        cluster.fork();
    });

    // Cron jobs run ONLY on primary to avoid duplicate execution
    const connectDB = require("./config/db");
    const { connectRedis, disconnectRedis } = require("./config/redis");
    connectDB();
    connectRedis();
    initCronJobs();

    // Graceful shutdown
    const shutdown = async () => {
        console.log("\n🛑 Primary shutting down...");
        stopCronJobs();
        await disconnectRedis();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

} else {
    const express = require("express");
    const helmet = require("helmet");
    const cors = require("cors");
    const config = require("./config");
    const connectDB = require("./config/db");
    const { connectRedis } = require("./config/redis");
    const routes = require("./Routes");
    const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
    const { mongoSanitizeMiddleware, xssProtection } = require("./middleware/sanitize");
    const { apiLimiter } = require("./middleware/rateLimiter");
    const logger = require("./utils/logger");

    const app = express();

    // ── Connect to databases ──
    connectDB();
    connectRedis();

    // ── Security middleware ──
    app.use(helmet());
    const allowedOrigins = Array.isArray(config.cors.origin)
        ? config.cors.origin
        : [config.cors.origin];

    app.use(cors({
        origin: (requestOrigin, callback) => {
            // Allow requests with no origin (server-to-server, curl, Postman)
            if (!requestOrigin) return callback(null, true);
            if (allowedOrigins.includes(requestOrigin)) {
                // Return the exact requesting origin so the header has only ONE value
                return callback(null, requestOrigin);
            }
            callback(new Error(`CORS: origin '${requestOrigin}' not allowed`));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        optionsSuccessStatus: 200  // Some legacy browsers choke on 204
    }));

    // ── Body parsers ──
    app.use(express.json({ 
        limit: "10mb",
        verify: (req, res, buf) => {
            req.rawBody = buf.toString();
        }
    }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // ── Sanitization ──
    app.use(mongoSanitizeMiddleware);
    app.use(xssProtection);

    // ── Global rate limiter ──
    app.use(apiLimiter);

    // ── Request logging ──
    app.use((req, res, next) => {
        const start = Date.now();
        res.on("finish", () => {
            const duration = Date.now() - start;
            if (req.originalUrl !== "/api/v1/health") {
                logger.debug(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
            }
        });
        next();
    });

    // ── Routes ──
    app.use(routes);

    // ── Error handling ──
    app.use(notFoundHandler);
    app.use(errorHandler);

    // ── Start server ──
    app.listen(config.port, () => {
        logger.info(`Worker ${process.pid} listening on port ${config.port} [${config.env}]`);
    });
}
