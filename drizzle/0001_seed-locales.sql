-- Custom SQL migration file, put your code below! --
INSERT INTO "locales" (
	"tag",
	"translation_status",
	"publication_status",
	"direction",
	"fallback_chain",
	"aliases",
	"match_tags",
	"native_name",
	"presentation_metadata"
) VALUES
	('ru', 'draft', 'active', 'ltr', ARRAY['en']::text[], ARRAY[]::text[], ARRAY[]::text[], 'Русский', '{}'::jsonb),
	('he', 'draft', 'active', 'rtl', ARRAY['en']::text[], ARRAY['iw']::text[], ARRAY[]::text[], 'עברית', '{}'::jsonb),
	('ka', 'draft', 'inactive', 'ltr', ARRAY['en']::text[], ARRAY[]::text[], ARRAY[]::text[], 'ქართული', '{}'::jsonb);
