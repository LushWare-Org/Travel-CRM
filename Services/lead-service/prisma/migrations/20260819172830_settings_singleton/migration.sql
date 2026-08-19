-- Settings was documented as a singleton ("Only one row allowed — enforced
-- by getSingleton() in service layer") but nothing ever actually enforced
-- that: seed.mjs's createMany(..., { skipDuplicates: true }) never set an
-- explicit id, so skipDuplicates had nothing unique to dedupe against, and
-- every reseed silently inserted another row. A now-fixed unscoped
-- updateMany() in autoAssignSalesRep() compounded this by mutating every
-- row that existed at the time. The result: 9 divergent rows in production,
-- with reads (findFirst(), no ORDER BY) non-deterministically returning
-- whichever one Postgres/pgbouncer happened to hand back — making saved
-- settings appear to "not persist".
--
-- Consolidate down to the most recently updated row, then make it
-- impossible to create a second one again.

DELETE FROM "crm_leads"."Settings"
WHERE "id" NOT IN (
  SELECT "id" FROM "crm_leads"."Settings" ORDER BY "updatedAt" DESC LIMIT 1
);

ALTER TABLE "crm_leads"."Settings" ADD COLUMN "singletonKey" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "crm_leads"."Settings" ADD CONSTRAINT "Settings_singletonKey_key" UNIQUE ("singletonKey");
