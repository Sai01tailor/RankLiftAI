const winston = require("winston");
const path = require("path");

// ══════════════════════════════════════════════
//  Winston Logger — Structured logging
//  - Console (colorized) in dev
//  - File-based in production
//  - JSON format for log aggregation tools
// ══════════════════════════════════════════════

const logDir = process.env.LOG_DIR || path.join(__dirname, "..", "logs");

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        if (stack) log += `\n${stack}`;
        if (Object.keys(meta).length > 0) log += ` ${JSON.stringify(meta)}`;
        return log;
    })
);

// We always want console transport
const transports = [
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            logFormat
        )
    })
];

const exceptionHandlers = [];
const rejectionHandlers = [];

// Only write to files locally to avoid EACCES errors on cloud deployments
if (process.env.NODE_ENV !== "production") {
    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, "error.log"),
            level: "error",
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: path.join(logDir, "combined.log"),
            maxsize: 5242880,
            maxFiles: 5
        })
    );
    exceptionHandlers.push(
        new winston.transports.File({
            filename: path.join(logDir, "exceptions.log")
        })
    );
    rejectionHandlers.push(
        new winston.transports.File({
            filename: path.join(logDir, "rejections.log")
        })
    );
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "debug",
    format: logFormat,
    transports,
    exceptionHandlers: exceptionHandlers.length > 0 ? exceptionHandlers : undefined,
    rejectionHandlers: rejectionHandlers.length > 0 ? rejectionHandlers : undefined
});

module.exports = logger;
