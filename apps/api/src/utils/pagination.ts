/**
 * Pagination utilities with bounds validation
 * SECURITY: Prevents DoS via unbounded pagination parameters
 */

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationConfig {
  defaultLimit?: number;
  maxLimit?: number;
  minLimit?: number;
}

const DEFAULT_CONFIG: Required<PaginationConfig> = {
  defaultLimit: 50,
  maxLimit: 500,
  minLimit: 1,
};

/**
 * Safely parse pagination parameters with bounds validation
 * @param pageStr - Page number string from query params
 * @param limitStr - Limit string from query params
 * @param config - Optional configuration for limits
 * @returns Validated pagination parameters
 */
export function parsePagination(
  pageStr: string | undefined,
  limitStr: string | undefined,
  config: PaginationConfig = {}
): PaginationParams {
  const { defaultLimit, maxLimit, minLimit } = { ...DEFAULT_CONFIG, ...config };

  // Parse and validate page (minimum 1)
  let page = parseInt(pageStr || '1', 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  // Parse and validate limit (bounded between minLimit and maxLimit)
  let limit = parseInt(limitStr || String(defaultLimit), 10);
  if (isNaN(limit) || limit < minLimit) {
    limit = minLimit;
  } else if (limit > maxLimit) {
    limit = maxLimit;
  }

  // Calculate skip with overflow protection
  const skip = Math.max(0, (page - 1) * limit);

  return { page, limit, skip };
}

/**
 * Build pagination response metadata
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}
