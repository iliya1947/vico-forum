ALTER TABLE "forum_topics" ADD COLUMN "help_question_quality" text;
--> statement-breakpoint
UPDATE "forum_topics"
SET "help_question_quality" = 'normal'
WHERE "section_id" = 'help-solutions-questions';
--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_help_question_quality_check"
  CHECK (
    (
      "section_id" = 'help-solutions-questions'
      and "help_question_quality" is not null
      and "help_question_quality" in ('normal', 'needs-details')
    )
    or (
      "section_id" <> 'help-solutions-questions'
      and "help_question_quality" is null
    )
  );
