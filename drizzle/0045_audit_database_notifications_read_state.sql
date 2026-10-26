ALTER TABLE "translation_tasks" DROP CONSTRAINT "translation_tasks_allowance_shape_check";--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_allowance_shape_check" CHECK ((
        "translation_tasks"."allowance_state" is null
        and "translation_tasks"."allowance_generation" is null
        and "translation_tasks"."allowance_attempt" is null
        and "translation_tasks"."allowance_claim_token" is null
        and "translation_tasks"."allowance_lease_expires_at" is null
        and "translation_tasks"."allowance_retry_not_before" is null
        and "translation_tasks"."allowance_reason" is null
        and "translation_tasks"."allowance_provider" is null
        and "translation_tasks"."allowance_reservation_reference" is null
        and "translation_tasks"."allowance_updated_at" is null
      ) or (
        "translation_tasks"."translation_kind" in ('content-topic-title', 'content-post-body')
        and "translation_tasks"."allowance_state" is not null
        and "translation_tasks"."allowance_generation" is not null
        and "translation_tasks"."allowance_attempt" is not null
        and "translation_tasks"."allowance_generation" = "translation_tasks"."generation"
        and "translation_tasks"."allowance_attempt" = "translation_tasks"."attempt_count" + 1
        and "translation_tasks"."allowance_attempt" <= "translation_tasks"."max_attempts"
        and "translation_tasks"."allowance_updated_at" is not null
        and (
          (
            "translation_tasks"."allowance_state" = 'leasing'
            and "translation_tasks"."allowance_claim_token" is not null
            and "translation_tasks"."allowance_lease_expires_at" is not null
            and "translation_tasks"."allowance_lease_expires_at" > "translation_tasks"."allowance_updated_at"
            and "translation_tasks"."allowance_retry_not_before" is null
            and "translation_tasks"."allowance_reason" is null
            and "translation_tasks"."allowance_provider" is null
            and "translation_tasks"."allowance_reservation_reference" is null
          ) or (
            "translation_tasks"."allowance_state" = 'admitted'
            and "translation_tasks"."allowance_claim_token" is null
            and "translation_tasks"."allowance_lease_expires_at" is null
            and "translation_tasks"."allowance_retry_not_before" is null
            and "translation_tasks"."allowance_reason" is null
            and "translation_tasks"."allowance_provider" is not null
          ) or (
            "translation_tasks"."allowance_state" = 'deferred'
            and "translation_tasks"."allowance_claim_token" is null
            and "translation_tasks"."allowance_lease_expires_at" is null
            and "translation_tasks"."allowance_retry_not_before" is not null
            and "translation_tasks"."allowance_retry_not_before" > "translation_tasks"."allowance_updated_at"
            and "translation_tasks"."allowance_reason" is not null
            and "translation_tasks"."allowance_provider" is null
            and "translation_tasks"."allowance_reservation_reference" is null
          )
        )
      ));