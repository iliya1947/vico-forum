INSERT INTO "forum_categories" ("id", "name")
VALUES ('help-solutions', 'Help & solutions');
--> statement-breakpoint
INSERT INTO "forum_sections" ("id", "category_id", "name")
VALUES ('help-solutions-questions', 'help-solutions', 'Questions');
