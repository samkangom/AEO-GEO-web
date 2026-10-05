/** Rows per request: at or below Supabase's default max-rows (1,000), which silently truncates larger results. */
export const PAGE_SIZE = 1000;

/**
 * Reads every row of a query, one page at a time. `page(from, to)` runs the
 * query with `.range(from, to)` and a stable `.order(...)`.
 */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}
