import Link from "next/link";
import { adminPageRange } from "@/lib/admin-pagination";

type Props = {
  basePath: string;
  /** Current query params (without page) to preserve, e.g. { q, plan }. */
  params: Record<string, string | undefined>;
  page: number;
  rowCount: number;
  total: number;
  pageSize: number;
};

function hrefFor(basePath: string, params: Props["params"], page: number): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  sp.set("page", String(page));
  return `${basePath}?${sp.toString()}`;
}

export function AdminPagination({ basePath, params, page, rowCount, total, pageSize }: Props) {
  const { from, to, totalPages } = adminPageRange(page, rowCount, total, pageSize);
  if (totalPages <= 1) {
    return (
      <p className="px-4 py-3 text-xs text-muted-foreground" role="status">
        Showing {total} {total === 1 ? "row" : "rows"}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="text-xs text-muted-foreground" role="status">
        Showing {from}–{to} of {total.toLocaleString()} · Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor(basePath, params, page - 1)}
            className="rounded-md border bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            ← Prev
          </Link>
        ) : (
          <span className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground/40 dark:border-neutral-800">
            ← Prev
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={hrefFor(basePath, params, page + 1)}
            className="rounded-md border bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Next →
          </Link>
        ) : (
          <span className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground/40 dark:border-neutral-800">
            Next →
          </span>
        )}
      </div>
    </div>
  );
}
