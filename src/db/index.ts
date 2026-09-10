import dns from "node:dns";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

dns.setDefaultResultOrder?.("ipv4first");

type Db = PostgresJsDatabase<typeof schema>;

// Cached on `globalThis` (not a plain module-level variable) so the client and
// its connection pool survive Next.js dev-mode module re-evaluation (Fast
// Refresh / Turbopack HMR). A module-level singleton gets reset on every
// reload, which silently opens a fresh pool each time and leaks connections
// until the database's max-connections limit is hit.
const globalForDb = globalThis as unknown as { _db?: Db };

function getDb(): Db {
  if (!globalForDb._db) {
    const client = postgres(process.env.DATABASE_URL!, {
      prepare: false,
      max: 20,
      idle_timeout: 30,
      connect_timeout: 20,
    });
    globalForDb._db = drizzle(client, { schema });
  }
  return globalForDb._db;
}

export const db: Db = new Proxy({} as Db, {
  get(_, prop: string | symbol) {
    return getDb()[prop as keyof Db];
  },
});

// Alias kept for call-sites that import readDb — routes to primary (Supabase).
export const readDb: Db = db;
