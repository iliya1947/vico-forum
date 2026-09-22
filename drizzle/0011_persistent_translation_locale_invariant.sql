ALTER TABLE "ui_translations" DROP CONSTRAINT "ui_translations_locale_check";--> statement-breakpoint
ALTER TABLE "ui_translations" ADD CONSTRAINT "ui_translations_locale_check" CHECK (btrim("ui_translations"."locale") <> '' and lower(btrim("ui_translations"."locale")) <> 'en');--> statement-breakpoint
ALTER TABLE "ui_translation_bundles" DROP CONSTRAINT "ui_translation_bundles_locale_check";--> statement-breakpoint
ALTER TABLE "ui_translation_bundles" ADD CONSTRAINT "ui_translation_bundles_locale_check" CHECK (btrim("ui_translation_bundles"."locale") <> '' and lower(btrim("ui_translation_bundles"."locale")) <> 'en');
