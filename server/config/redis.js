const Redis = require("ioredis");
const config = require("./index");
const logger = require("../utils/logger");

// ══════════════════════════════════════════════
//  Redis Client — Singleton with graceful degradation
//  Supports: local Redis, Upstash (TLS), ElastiCache, etc.
//  If Redis is down, app still works (no caching, no rate limit)
// ══════════════════════════════════════════════

let redisClient = null;
let isRedisConnected = false;

/**
 * Detect if we need TLS based on the host.
 * Upstash, Redis Cloud, and most managed providers require TLS.
 * Local redis (127.0.0.1, localhost) does not.
 */
const needsTLS = (host) => {
    const localHosts = ["127.0.0.1", "localhost", "redis", "0.0.0.0"];
    return !localHosts.includes(host);
};

const createRedisClient = () => {
    if (redisClient) return redisClient;

    const host = config.redis.host;
    const port = config.redis.port;
    const password = config.redis.password || undefined;
    const useTLS = needsTLS(host);

    logger.info(`Redis config: ${host}:${port} (TLS: ${useTLS})`);

    redisClient = new Redis({
        host,
        port,
        password,
        db: config.redis.db,

        // TLS — required for Upstash, Redis Cloud, etc.
        ...(useTLS && { tls: { rejectUnauthorized: false } }),

        // Connection behavior
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 10) {
                logger.error("Redis: max retry limit (10) reached. Giving up.");
                return null; // Stop retrying
            }
            const delay = Math.min(times * 500, 5000);
            logger.warn(`Redis retry attempt ${times}, next in ${delay}ms`);
            return delay;
        },
        reconnectOnError(err) {
            // Reconnect on READONLY errors (happens during failovers)
            const targetError = "READONLY";
            if (err.message.includes(targetError)) {
                return true;
            }
            return false;
        },
        lazyConnect: true,

        // Timeouts — prevent hanging connections
        connectTimeout: 10000,  // 10s to establish connection
        commandTimeout: 5000,   // 5s per command
    });

    redisClient.on("connect", () => {
        logger.info("Redis connected successfully");
    });

    redisClient.on("ready", () => {
        isRedisConnected = true;
        logger.info("Redis ready to accept commands");
    });

    redisClient.on("error", (err) => {
        isRedisConnected = false;
        // Don't spam logs on repeated connection failures
        if (err.message.includes("ECONNREFUSED")) {
            logger.warn("Redis unavailable (ECONNREFUSED). Running without cache.");
        } else {
            logger.error(`Redis error: ${err.message}`);
        }
    });

    redisClient.on("close", () => {
        isRedisConnected = false;
        logger.warn("Redis connection closed");
    });

    redisClient.on("reconnecting", (delay) => {
        logger.info(`Redis reconnecting in ${delay}ms...`);
    });

    return redisClient;
};

const connectRedis = async () => {
    try {
        const client = createRedisClient();
        await client.connect();
        // Quick ping to verify the connection is truly alive
        await client.ping();
        logger.info("Redis PING successful");
    } catch (err) {
        isRedisConnected = false;
        logger.warn(`Redis connection failed: ${err.message}. App will run without caching.`);
    }
};

const disconnectRedis = async () => {
    if (redisClient) {
        try {
            await redisClient.quit();
            logger.info("Redis disconnected gracefully");
        } catch (err) {
            redisClient.disconnect();
        }
        redisClient = null;
        isRedisConnected = false;
    }
};

const getRedis = () => redisClient;
const isConnected = () => isRedisConnected;

module.exports = { connectRedis, disconnectRedis, getRedis, isConnected };
