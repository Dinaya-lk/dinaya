import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

process.env.VERCEL_PREVIEW_COMMENTS_ENABLED = "0";

const require = createRequire(import.meta.url);
const nextCli = require.resolve("next/dist/bin/next");

function runStep(label, command, args) {
  console.log(`[build] ${label}...`);
  // NOTE: shell:false so absolute paths containing spaces or `&` (e.g. a
  // Windows checkout under "3 - Platforms & Apps") are passed verbatim.
  // shell:true would split them and fail with "'C:\Program' is not recognized".
  const result = spawnSync(command, args, {
    env: process.env,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    console.error(`[build] ${label} failed`);
    process.exit(result.status ?? 1);
  }
}

function shouldRunMigrations() {
  // Vercel builds usually expose the Supabase pooler URL, which cannot run DDL
  // reliably from the build environment. Apply migrations via the DB Migrate
  // GitHub Action (on push to master) or manually before deploy.
  if (process.env.VERCEL === "1") {
    console.log(
      "[build] Vercel — skipping db:migrate (use DB Migrate workflow or run locally before deploy)",
    );
    return false;
  }

  return Boolean(process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL);
}

if (shouldRunMigrations()) {
  const migrateResult = spawnSync("npm", ["run", "db:migrate"], {
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (migrateResult.status !== 0) {
    const isProductionBuild =
      process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview";
    if (isProductionBuild) {
      console.error(
        "[build] db:migrate failed — aborting production build. Fix migrations before deploying.",
      );
      process.exit(migrateResult.status ?? 1);
    }
    console.warn(
      "[build] db:migrate failed — continuing build. Run migrations manually or via the DB Migrate workflow.",
    );
  }
} else if (!process.env.VERCEL) {
  console.log("[build] DATABASE_URL not set — skipping db:migrate");
}

runStep("Building Next.js app", process.execPath, [nextCli, "build"]);
