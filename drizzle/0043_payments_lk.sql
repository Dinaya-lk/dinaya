ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "payments_lk_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "payments_lk_secret_key" text;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "payments_lk_webhook_secret" text;
