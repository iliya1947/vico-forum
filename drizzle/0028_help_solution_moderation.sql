ALTER TABLE "forum_topics" ADD COLUMN "solution_moderation_status" text;
--> statement-breakpoint
ALTER TABLE "forum_topics" ADD COLUMN "solution_outdated_reason" text;
--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_solution_moderation_status_check"
  CHECK ("solution_moderation_status" is null or "solution_moderation_status" in ('needs-review', 'outdated'));
--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_solution_moderation_requires_solved_check"
  CHECK ("solution_moderation_status" is null or "is_solved");
--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_solution_outdated_reason_check"
  CHECK (
    (
      "solution_moderation_status" = 'outdated'
      and "solution_outdated_reason" is not null
      and btrim("solution_outdated_reason") <> ''
      and char_length("solution_outdated_reason") <= 1000
    )
    or (
      "solution_moderation_status" is distinct from 'outdated'
      and "solution_outdated_reason" is null
    )
  );
