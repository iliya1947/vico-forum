-- Lock out account writers through duplicate preflight and index creation.
-- The migration runner executes the whole migration in one transaction.
LOCK TABLE "account" IN SHARE MODE;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "account" GROUP BY provider_id, account_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate authentication provider identity' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM "account" WHERE provider_id = 'credential' GROUP BY user_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate credential account for user' USING ERRCODE = '23505';
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_identity_uidx" ON "account" USING btree ("provider_id","account_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "account_credential_user_uidx" ON "account" USING btree ("user_id") WHERE "account"."provider_id" = 'credential';
