CREATE TABLE "authz_mutation_lock" (
	"id" integer PRIMARY KEY NOT NULL,
	"managers_ever_existed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "authz_mutation_lock_singleton_check" CHECK ("authz_mutation_lock"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "authz_permissions" (
	"key" text PRIMARY KEY NOT NULL,
	CONSTRAINT "authz_permissions_catalog_check" CHECK ("authz_permissions"."key" in (
  'forum.topic.create', 'forum.reply.create', 'forum.solution.manageOwn',
  'forum.solution.manageAny', 'access.authorization.manage'
))
);
--> statement-breakpoint
CREATE TABLE "authz_role_permissions" (
	"role_id" text NOT NULL,
	"permission_key" text NOT NULL,
	CONSTRAINT "authz_role_permissions_pk" PRIMARY KEY("role_id","permission_key")
);
--> statement-breakpoint
CREATE TABLE "authz_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authz_roles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "authz_roles_slug_check" CHECK ("authz_roles"."slug" = btrim("authz_roles"."slug") and "authz_roles"."slug" ~ '^[a-z][a-z0-9-]{0,62}$'),
	CONSTRAINT "authz_roles_display_name_check" CHECK (btrim("authz_roles"."display_name") <> '')
);
--> statement-breakpoint
CREATE TABLE "authz_user_permission_overrides" (
	"user_id" text NOT NULL,
	"permission_key" text NOT NULL,
	"effect" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authz_user_permission_overrides_pk" PRIMARY KEY("user_id","permission_key"),
	CONSTRAINT "authz_user_permission_overrides_effect_check" CHECK ("authz_user_permission_overrides"."effect" in ('allow', 'deny'))
);
--> statement-breakpoint
CREATE TABLE "authz_user_roles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "authz_role_permissions" ADD CONSTRAINT "authz_role_permissions_role_id_authz_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."authz_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authz_role_permissions" ADD CONSTRAINT "authz_role_permissions_permission_key_authz_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."authz_permissions"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authz_user_permission_overrides" ADD CONSTRAINT "authz_user_permission_overrides_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authz_user_permission_overrides" ADD CONSTRAINT "authz_user_permission_overrides_permission_key_authz_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."authz_permissions"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authz_user_roles" ADD CONSTRAINT "authz_user_roles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authz_user_roles" ADD CONSTRAINT "authz_user_roles_role_id_authz_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."authz_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "authz_user_roles_role_id_idx" ON "authz_user_roles" USING btree ("role_id");--> statement-breakpoint
INSERT INTO "authz_permissions" ("key") VALUES
 ('forum.topic.create'), ('forum.reply.create'), ('forum.solution.manageOwn'),
 ('forum.solution.manageAny'), ('access.authorization.manage');
--> statement-breakpoint
INSERT INTO "authz_roles" ("id", "slug", "display_name", "is_system") VALUES
 ('builtin-user', 'user', 'User', true),
 ('builtin-moderator', 'moderator', 'Moderator', true),
 ('builtin-admin', 'admin', 'Administrator', true);
--> statement-breakpoint
INSERT INTO "authz_role_permissions" ("role_id", "permission_key") VALUES
 ('builtin-user', 'forum.topic.create'),
 ('builtin-user', 'forum.reply.create'),
 ('builtin-user', 'forum.solution.manageOwn'),
 ('builtin-moderator', 'forum.topic.create'),
 ('builtin-moderator', 'forum.reply.create'),
 ('builtin-moderator', 'forum.solution.manageOwn'),
 ('builtin-moderator', 'forum.solution.manageAny'),
 ('builtin-admin', 'forum.topic.create'),
 ('builtin-admin', 'forum.reply.create'),
 ('builtin-admin', 'forum.solution.manageOwn'),
 ('builtin-admin', 'forum.solution.manageAny'),
 ('builtin-admin', 'access.authorization.manage');
--> statement-breakpoint
INSERT INTO "authz_mutation_lock" ("id") VALUES (1);
--> statement-breakpoint
CREATE FUNCTION authz_protect_role_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN RAISE EXCEPTION 'built-in authorization roles cannot be deleted' USING ERRCODE = '23514'; END IF;
    RETURN OLD;
  END IF;
  IF NEW.slug <> OLD.slug OR NEW.is_system <> OLD.is_system THEN
    RAISE EXCEPTION 'authorization role identity cannot be changed' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER authz_protect_role_identity_trigger BEFORE UPDATE OR DELETE ON authz_roles
FOR EACH ROW EXECUTE FUNCTION authz_protect_role_identity();
