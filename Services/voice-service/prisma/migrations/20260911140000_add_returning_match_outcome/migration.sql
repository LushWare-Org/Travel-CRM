-- A repeat customer whose every trip on file has already finished. Additive
-- only: existing rows keep their value, and nothing reads this value until
-- the deploy that follows this migration.
ALTER TYPE "crm_voice"."CallerMatchOutcome" ADD VALUE IF NOT EXISTS 'RETURNING';
