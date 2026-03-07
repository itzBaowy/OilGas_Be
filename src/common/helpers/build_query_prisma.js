export function buildQueryPrisma(query) {
  let { page, pageSize, filters } = query;

  const pageDefault = 1;
  const pageSizeDefault = 10;

  // Đảm bảo là số
  page = Number(page);
  pageSize = Number(pageSize);

  // Nếu gửi chữ lên
  page = Number(page) || pageDefault;
  pageSize = Number(pageSize) || pageSizeDefault;

  // Nếu gửi số âm
  page = Math.max(page, pageDefault);
  pageSize = Math.max(pageSize, pageSizeDefault);

  try {
    filters = JSON.parse(filters);
  } catch (error) {
    // Invalid JSON format, use empty filters
    filters = {};
  }

  // Sanitize filters — only allow primitive values (string, number, boolean)
  // Reject objects/arrays to prevent Prisma operator injection
  const sanitized = {};
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "string") {
      sanitized[key] = {
        contains: value,
        mode: "insensitive",
      };
    } else if (typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
    }
    // Objects, arrays, etc. are silently ignored for security
  }

  const index = (page - 1) * pageSize;

  const where = {
    ...sanitized,
  };

  return {
    page,
    pageSize,
    where,
    index,
  };
}
