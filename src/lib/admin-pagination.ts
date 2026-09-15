/** Shared offset pagination for platform-admin tables. */
export const ADMIN_PAGE_SIZE = 50;

export function parseAdminPage(value?: string | null): number {
  const n = Number(value ?? 1);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function adminPageOffset(page: number, pageSize = ADMIN_PAGE_SIZE): number {
  return (page - 1) * pageSize;
}

export function adminPageRange(page: number, rowCount: number, total: number, pageSize = ADMIN_PAGE_SIZE) {
  if (total === 0) return { from: 0, to: 0, totalPages: 1 };
  const from = Math.min(total, adminPageOffset(page, pageSize) + 1);
  const to = Math.min(total, adminPageOffset(page, pageSize) + rowCount);
  return { from, to, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
