const { getRedis, isConnected } = require("../config/redis");
const logger = require("../utils/logger");

// ══════════════════════════════════════════════
//  Redis Cache Service — Abstraction layer
//  All cache operations go through this service
//  Gracefully handles Redis unavailability
// ══════════════════════════════════════════════

/**
 * Set a value in cache with TTL.
 * @param {string} key - Cache key
 * @param {*} value - Value (will be JSON.stringified)
 * @param {number} ttl - Time to live in seconds
 */
const setCache = async (key, value, ttl = 3600) => {
    try {
        if (!isConnected()) return false;
        const redis = getRedis();
        await redis.setex(key, ttl, JSON.stringify(value));
        return true;
    } catch (err) {
        logger.debug(`Cache SET error [${key}]: ${err.message}`);
        return false;
    }
};

/**
 * Get a value from cache.
 * @param {string} key - Cache key
 * @returns {*} Parsed value or null
 */
const getCache = async (key) => {
    try {
        if (!isConnected()) return null;
        const redis = getRedis();
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        logger.debug(`Cache GET error [${key}]: ${err.message}`);
        return null;
    }
};

/**
 * Delete a cache key.
 */
const deleteCache = async (key) => {
    try {
        if (!isConnected()) return false;
        const redis = getRedis();
        await redis.del(key);
        return true;
    } catch (err) {
        logger.debug(`Cache DEL error [${key}]: ${err.message}`);
        return false;
    }
};

/**
 * Delete all keys matching a pattern.
 * @param {string} pattern - e.g., "lb:*" to clear all leaderboard cache
 */
const deleteCachePattern = async (pattern) => {
    try {
        if (!isConnected()) return false;
        const redis = getRedis();
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
        return true;
    } catch (err) {
        logger.debug(`Cache pattern DEL error [${pattern}]: ${err.message}`);
        return false;
    }
};

/**
 * Cache-aside pattern helper.
 * Tries cache first, if miss, calls the fetcher function and caches result.
 * @param {string} key - Cache key
 * @param {Function} fetcher - Async function to get data (called on cache miss)
 * @param {number} ttl - Cache TTL in seconds
 * @returns {*} Cached or fresh data
 */
const cacheAside = async (key, fetcher, ttl = 3600) => {
    // Try cache first
    const cached = await getCache(key);
    if (cached !== null) {
        return { data: cached, fromCache: true };
    }

    // Cache miss — fetch fresh data
    const fresh = await fetcher();

    // Store in cache (non-blocking)
    setCache(key, fresh, ttl).catch(() => { });

    return { data: fresh, fromCache: false };
};

/**
 * Increment a counter in Redis (for rate limiting, analytics).
 * @param {string} key
 * @param {number} ttl - Expiry in seconds (set only on first increment)
 * @returns {number} Current count
 */
const incrementCounter = async (key, ttl = 900) => {
    try {
        if (!isConnected()) return 0;
        const redis = getRedis();
        const count = await redis.incr(key);

        // If it's the first increment, set expiry
        if (count === 1) {
            await redis.expire(key, ttl);
        } else {
            // Safety check: if key exists but has no TTL (infinite), set it now
            // This prevents "zombie keys" that block users forever if the first expire() failed
            const currentTtl = await redis.ttl(key);
            if (currentTtl === -1) {
                await redis.expire(key, ttl);
            }
        }
        return count;
    } catch (err) {
        return 0;
    }
};

module.exports = {
    setCache,
    getCache,
    deleteCache,
    deleteCachePattern,
    cacheAside,
    incrementCounter
};
