/**
 * Pagination helper for Mongoose
 */

const getPaginationParams = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(query.limit, 10) || 10, 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Sort helper
 * Example: ?sort=-createdAt,name
 */
const getSortParams = (sortQuery = "") => {
  if (!sortQuery) return { createdAt: -1 };

  return sortQuery.split(",").reduce((acc, field) => {
    if (field.startsWith("-")) {
      acc[field.substring(1)] = -1;
    } else {
      acc[field] = 1;
    }
    return acc;
  }, {});
};

/**
 * Build pagination meta
 */
const buildPaginationMeta = ({ page, limit, total }) => {
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

export default {
  getPaginationParams,
  getSortParams,
  buildPaginationMeta,
};
