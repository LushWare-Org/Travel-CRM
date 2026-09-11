-- The new column default applies to rows created from here on. The table is
-- schema-qualified because the model carries @@schema("crm_users").
ALTER TABLE "crm_users"."OrganizationSettings"
  ALTER COLUMN "companyName" SET DEFAULT 'Lush Travel Cloud';

-- Existing rows only get the new name if they still hold a default. A name an admin
-- deliberately set is left untouched: this is user-editable data, not schema.
UPDATE "crm_users"."OrganizationSettings"
SET "companyName" = 'Lush Travel Cloud'
WHERE "companyName" IN ('Travel CRM', 'Lush Travel Providers');
