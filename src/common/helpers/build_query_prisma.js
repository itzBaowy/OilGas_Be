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

  // xử lý filters
  for (const [key, value] of Object.entries(filters)) {
    // string
    if (typeof value === "string") {
      filters[key] = {
        contains: value,
      };
    }

    // date
  }

  const index = (page - 1) * pageSize;

  const where = {
    ...filters,
  };

  return {
    page,
    pageSize,
    where,
    index,
  };
}
