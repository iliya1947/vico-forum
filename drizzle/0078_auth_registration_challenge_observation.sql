ALTER TABLE "owner_attempt_patterns" DROP CONSTRAINT "owner_attempt_patterns_kind_check";--> statement-breakpoint
ALTER TABLE "owner_attempt_patterns" ADD CONSTRAINT "owner_attempt_patterns_kind_check" CHECK ("owner_attempt_patterns"."surface" in ('auth', 'access')
      and "owner_attempt_patterns"."operation" in (
        'sign-up', 'sign-in', 'method-link', 'password-change',
        'session-revoke', 'session-revoke-all', 'sign-out',
        'registration-admission', 'registration-challenge', 'owner-guard', 'email-verification', 'verification-send',
        'password-reset-request', 'password-reset', 'password-create', 'email-change', 'unlink-account'
      )
      and "owner_attempt_patterns"."outcome" in ('denied', 'failed', 'rate-limited', 'unavailable')
      and (("owner_attempt_patterns"."http_status" between 400 and 599 and "owner_attempt_patterns"."direct_code" is null)
        or ("owner_attempt_patterns"."http_status" is null and "owner_attempt_patterns"."direct_code" in (
          'unauthorized', 'forbidden', 'invalid', 'rate-limited', 'unavailable'
        ))));