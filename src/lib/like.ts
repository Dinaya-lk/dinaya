/**
 * Escape user input for use inside a SQL LIKE / ILIKE pattern.
 * Postgres treats `%`, `_` and the escape char itself as wildcards —
 * without this, a search for "%" matches everything and forces seq scans.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/** Wrap escaped input as a `%contains%` pattern. */
export function likePattern(value: string): string {
  return `%${escapeLike(value)}%`;
}
