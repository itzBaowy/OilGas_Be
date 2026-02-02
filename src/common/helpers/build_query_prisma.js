export function buildQueryPrisma(query) {
  let { page, pageSize, filters } = query;

  const pageDefault = 1;
  const pageSizeDefault = 3;

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
    console.log("Wrong json format");
    filters = {};
  }

  // xử lý filters
  for (const [key, value] of Object.entries(filters)) {
    // string
    if (typeof value === "string") {
      console.log(`Detected key ${key}: value is a string`, value);
      filters[key] = {
        contains: value,
      };
    }

    // date
  }

  const index = (page - 1) * pageSize;

  console.log("query", { page, pageSize, index, filters });

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
