ALTER TABLE "forum_posts" ADD COLUMN "solution_moderation_status" text;
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD COLUMN "solution_outdated_reason" text;
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD COLUMN "solution_outdated_reason_kind" text;
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_solution_moderation_status_check"
  CHECK ("solution_moderation_status" is null or "solution_moderation_status" in ('needs-review', 'outdated'));
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_solution_outdated_reason_kind_check"
  CHECK ("solution_outdated_reason_kind" is null or "solution_outdated_reason_kind" = 'best-answer-replaced');
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_solution_outdated_reason_check"
  CHECK (
    (
      "solution_moderation_status" is not distinct from 'outdated'
      and (
        (
          "solution_outdated_reason_kind" is not distinct from 'best-answer-replaced'
          and "solution_outdated_reason" is null
        )
        or (
          "solution_outdated_reason_kind" is null
          and "solution_outdated_reason" is not null
          and btrim("solution_outdated_reason") <> ''
          and char_length("solution_outdated_reason") <= 1000
        )
      )
    )
    or (
      "solution_moderation_status" is distinct from 'outdated'
      and "solution_outdated_reason" is null
      and "solution_outdated_reason_kind" is null
    )
  );