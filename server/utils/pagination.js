// ══════════════════════════════════════════════
//  Pagination Helper — Cursor + Offset support
// ══════════════════════════════════════════════

/**
 * Parse pagination params from request query.
 * @param {Object} query - req.query
 * @returns {{ page, limit, skip, sortBy, sortOrder }}
 */
const parsePagination = (query) => {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100); // Max 100
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || "createdAt";
    const sortOrder = query.sortOrder === "asc" ? 1 : -1;

    return { page, limit, skip, sortBy, sortOrder };
};

/**
 * Build pagination metadata for API response.
 * @param {number} total - Total documents
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
const buildPaginationMeta = (total, page, limit) => {
    const totalPages = Math.ceil(total / limit);
    return {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
    };
};

/**
 * Execute a paginated Mongoose query.
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} query - req.query (page, limit, sortBy, sortOrder)
 * @param {Object} options - { populate, select, lean }
 */
const paginatedQuery = async (model, filter, query, options = {}) => {
    const { page, limit, skip, sortBy, sortOrder } = parsePagination(query);

    let dbQuery = model.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit);

    if (options.populate) dbQuery = dbQuery.populate(options.populate);
    if (options.select) dbQuery = dbQuery.select(options.select);
    if (options.lean !== false) dbQuery = dbQuery.lean();

    const [data, total] = await Promise.all([
        dbQuery,
        model.countDocuments(filter)
    ]);

    return {
        data,
        pagination: buildPaginationMeta(total, page, limit)
    };
};

module.exports = { parsePagination, buildPaginationMeta, paginatedQuery };
