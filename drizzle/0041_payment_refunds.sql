ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "refunded_amount_lkr" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "refunded_at" timestamp,
  ADD COLUMN IF NOT EXISTS "refund_reason" varchar(500);
