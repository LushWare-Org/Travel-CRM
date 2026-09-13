-- Adds the customer-facing package price as a STORED GENERATED column.
--
-- sellPrice is what a customer pays: basePrice plus the package's margin.
-- Until now it existed only as a value computed at read time by
-- computeMargin() in Services/shared/pricing-engine/src/margin.js, which is
-- fine for displaying a price and useless for filtering or sorting by one.
-- The one place that tried, the planner wizard's propose_packages tool,
-- filtered basePrice instead and was only invisible because
-- defaultMarginInput defaults to 0, which makes the two equal.
--
-- Why a generated column rather than an application-maintained one: the
-- database then owns the value, so no write path can forget it and display
-- and filter cannot disagree. Prisma cannot express GENERATED ALWAYS, so the
-- companion schema.prisma field is declared optional and must never be
-- written — supplying it in an INSERT or UPDATE is rejected by Postgres.
--
-- CAUTION for future prisma migrate runs: Prisma does not model generated
-- columns, so `prisma migrate dev` will want to reconcile this one. Keep the
-- DDL here authoritative and hand-write that migration rather than letting
-- Prisma drop and recreate the column.
--
-- The expression must stay in step with computeMargin():
--   marginAmount = PERCENTAGE ? basePrice * marginValue / 100 : marginValue
--   sellPrice    = round(basePrice + marginAmount, 2)
-- The pricing-engine unit tests assert the same behaviour; a change to one
-- without the other is the drift this column exists to prevent.
--
-- Compare the enum column directly. `default_margin_type::text = 'PERCENTAGE'`
-- reads as the obvious way to do this and is rejected outright: the enum-to-text
-- cast is STABLE rather than IMMUTABLE, so Postgres refuses to build the column
-- with "generation expression is not immutable". Verified against postgres 16.

ALTER TABLE "crm_packages"."Package"
  ADD COLUMN IF NOT EXISTS "sell_price" DECIMAL(10, 2)
  GENERATED ALWAYS AS (
    ROUND(
      "base_price" + CASE
        WHEN "default_margin_type" = 'PERCENTAGE'
          THEN "base_price" * "default_margin_input" / 100
        ELSE "default_margin_input"
      END,
      2
    )
  ) STORED;

-- Filtering by budget and sorting by price are both list-path operations.
CREATE INDEX IF NOT EXISTS "Package_sell_price_idx"
  ON "crm_packages"."Package" ("sell_price");

-- The public catalogue always constrains is_active, so the realistic
-- filter shape is the pair.
CREATE INDEX IF NOT EXISTS "Package_is_active_sell_price_idx"
  ON "crm_packages"."Package" ("is_active", "sell_price");
