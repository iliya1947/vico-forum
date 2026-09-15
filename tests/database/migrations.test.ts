import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool, type ClientBase, type DatabaseError } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadPersistentRegistry } from "../../app/localization/persistent-registry";
import { parseLocaleCandidate } from "../../app/localization/locale";
import { AmbiguousCommitOutcomeError, ControlledLocaleWriter, DrizzleLocaleRepository } from "../../db/locale-repository";
import { ConcurrentRevisionError, DrizzleForumRepository, ForumAuthorizationError, ForumEntityNotFoundError, ForumStateConflictError } from "../../db/forum-repository";
import { ForumService, InvalidForumContentError } from "../../db/forum-service";
import { createHyperdriveForumWriter } from "../../db/hyperdrive-forum";
import { FORUM_WRITE_COOLDOWN_MS, ForumWriteRateLimitError } from "../../db/forum-write-policy";
import { PERMISSION_CATALOG, INITIAL_ROLE_GRANTS } from "../../app/authorization/catalog";
import { AuthorizationService, InvalidAuthorizationInputError } from "../../db/authorization-service";
import {
  AuthorizationForbiddenError,
  AuthorizationLockoutError,
  AuthorizationNotFoundError,
  AuthorizationRoleAssignedError,
  PostgresAuthorizationRepository,
} from "../../db/authorization-repository";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the disposable database integration test");
}

const parsedDatabaseUrl = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(parsedDatabaseUrl.hostname) ||
  !parsedDatabaseUrl.pathname.endsWith("_test")
) {
  throw new Error("Database integration tests only run against a local database ending in _test");
}

const client = new Client({ connectionString: databaseUrl });

beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists drizzle cascade; drop schema public cascade; create schema public");
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
});

afterAll(async () => {
  await client.end();
});

describe("PostgreSQL 17 locale migrations", () => {
  it("runs on PostgreSQL 17 with UTF-8 storage and remains idempotent", async () => {
    const environment = await client.query<{ server_version: string; server_encoding: string }>(
      "select current_setting('server_version') as server_version, current_setting('server_encoding') as server_encoding",
    );

    expect(environment.rows[0]?.server_version).toMatch(/^17\./);
    expect(environment.rows[0]?.server_encoding).toBe("UTF8");

    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    const applied = await client.query<{ count: string }>(
      'select count(*)::text as count from drizzle."__drizzle_migrations"',
    );
    expect(applied.rows[0]?.count).toBe("8");
  });

  it("seeds the code catalog and independent built-in role grants exactly", async () => {
    const permissions = await client.query<{ key: string }>("select key from authz_permissions order by key");
    expect(permissions.rows.map(({ key }) => key)).toEqual([...PERMISSION_CATALOG].sort());
    const roles = await client.query<{ slug: string; grants: string[] }>(`
      select r.slug, coalesce(array_agg(rp.permission_key order by rp.permission_key)
        filter (where rp.permission_key is not null), '{}') grants
      from authz_roles r left join authz_role_permissions rp on rp.role_id = r.id
      where r.is_system group by r.id order by r.slug`);
    expect(Object.fromEntries(roles.rows.map((row) => [row.slug, row.grants]))).toEqual(
      Object.fromEntries(Object.entries(INITIAL_ROLE_GRANTS).map(([slug, grants]) => [slug, [...grants].sort()])),
    );
    await expectDatabaseCode(client.query("insert into authz_permissions (key) values ('made.up.permission')"), "23514");
    await expectDatabaseCode(client.query("delete from authz_roles where slug = 'user'"), "23514");
  });

  it("manages dynamic roles, assignments, overrides, precedence, validation, and rollback", async () => {
    await insertForumAuthor("authz-admin", "authz-admin@example.test", null);
    await insertForumAuthor("authz-user", "authz-user@example.test", null);
    await client.query("insert into authz_user_roles (user_id, role_id) values ('authz-admin', 'builtin-admin')");
    const pool = new Pool({ connectionString: databaseUrl });
    const repository = new PostgresAuthorizationRepository(pool);
    const service = new AuthorizationService(repository);
    try {
      const defaultState = await service.resolveUser("authz-user");
      expect(defaultState).toMatchObject({ role: { slug: "user" }, explicitAssignment: false });
      expect(defaultState.effectivePermissions).toContain("forum.topic.create");
      await expect(service.resolveUser("missing-authz-user")).rejects.toBeInstanceOf(AuthorizationNotFoundError);
      expect(await repository.hasPermission("missing-authz-user", "forum.topic.create")).toBe(false);

      await service.createCustomRole("authz-admin", { slug: "helpers", displayName: "Helpers" });
      const custom = (await service.listRoles()).find((role) => role.slug === "helpers")!;
      await service.renameCustomRole("authz-admin", custom.id, { displayName: "Support" });
      expect(await service.readRole(custom.id)).toMatchObject({ slug: "helpers", displayName: "Support" });
      await expectDatabaseCode(
        client.query("update authz_roles set slug = 'support' where id = $1", [custom.id]),
        "23514",
      );
      await service.replaceRoleGrants("authz-admin", custom.id, ["forum.solution.manageAny"]);
      await service.assignUserRole("authz-admin", "authz-user", custom.id);
      expect(await service.resolveUser("authz-user")).toMatchObject({
        role: { slug: "helpers" }, explicitAssignment: true,
        grants: ["forum.solution.manageAny"], effectivePermissions: ["forum.solution.manageAny"],
      });
      await expect(service.deleteCustomRole("authz-admin", custom.id)).rejects.toBeInstanceOf(AuthorizationRoleAssignedError);

      await service.setUserOverride("authz-admin", "authz-user", "forum.topic.create", "allow");
      expect((await service.resolveUser("authz-user")).effectivePermissions).toContain("forum.topic.create");
      await service.setUserOverride("authz-admin", "authz-user", "forum.solution.manageAny", "deny");
      expect((await service.resolveUser("authz-user")).effectivePermissions).not.toContain("forum.solution.manageAny");
      await service.setUserOverride("authz-admin", "authz-user", "forum.solution.manageAny", null);
      expect((await service.resolveUser("authz-user")).effectivePermissions).toContain("forum.solution.manageAny");
      expect(() => service.replaceRoleGrants("authz-admin", custom.id, ["unknown"]))
        .toThrow(InvalidAuthorizationInputError);

      const defaultUserGrants = await repository.readRoleGrants("builtin-user");
      try {
        await service.replaceRoleGrants("authz-admin", "builtin-user", [
          ...INITIAL_ROLE_GRANTS.user,
          "access.authorization.manage",
        ]);
        await expect(service.createCustomRole("missing-authz-actor", { slug: "intruder", displayName: "Intruder" }))
          .rejects.toBeInstanceOf(AuthorizationForbiddenError);
        expect((await service.listRoles()).some((role) => role.slug === "intruder")).toBe(false);
      } finally {
        await service.replaceRoleGrants("authz-admin", "builtin-user", defaultUserGrants);
      }

      await service.assignUserRole("authz-admin", "authz-user", "builtin-user");
      await service.deleteCustomRole("authz-admin", custom.id);
      expect(await service.readRole(custom.id)).toBeUndefined();
      await expect(service.renameCustomRole("authz-admin", "builtin-user", { displayName: "Member" }))
        .rejects.toBeDefined();

      const grantsBefore = await repository.readRoleGrants("builtin-admin");
      await expect(service.replaceRoleGrants("authz-admin", "builtin-admin", grantsBefore.filter((key) => key !== "access.authorization.manage")))
        .rejects.toBeInstanceOf(AuthorizationLockoutError);
      expect(await repository.readRoleGrants("builtin-admin")).toEqual(grantsBefore);
    } finally {
      await pool.end();
      await client.query("delete from authz_user_permission_overrides where user_id in ('authz-admin', 'authz-user')");
      await client.query("delete from authz_user_roles where user_id in ('authz-admin', 'authz-user')");
      await client.query("delete from authz_roles where slug = 'intruder' and not is_system");
      await client.query('delete from "user" where id in (\'authz-admin\', \'authz-user\')');
    }
  });

  it("serializes concurrent mutations so the last two managers cannot both be removed", async () => {
    await insertForumAuthor("manager-one", "manager-one@example.test", null);
    await insertForumAuthor("manager-two", "manager-two@example.test", null);
    await client.query("insert into authz_user_roles (user_id, role_id) values ('manager-one', 'builtin-admin'), ('manager-two', 'builtin-admin')");
    const firstPool = new Pool({ connectionString: databaseUrl });
    const secondPool = new Pool({ connectionString: databaseUrl });
    const first = new AuthorizationService(new PostgresAuthorizationRepository(firstPool));
    const second = new AuthorizationService(new PostgresAuthorizationRepository(secondPool));
    try {
      const outcomes = await Promise.allSettled([
        first.setUserOverride("manager-one", "manager-one", "access.authorization.manage", "deny"),
        second.setUserOverride("manager-two", "manager-two", "access.authorization.manage", "deny"),
      ]);
      expect(outcomes.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      const rejected = outcomes.find((result) => result.status === "rejected");
      expect(rejected).toMatchObject({ status: "rejected", reason: expect.any(AuthorizationLockoutError) });
      const states = await Promise.all([
        first.resolveUser("manager-one"),
        second.resolveUser("manager-two"),
      ]);
      expect(states.filter((state) => state.effectivePermissions.includes("access.authorization.manage"))).toHaveLength(1);
    } finally {
      await firstPool.end(); await secondPool.end();
      await client.query("delete from authz_user_permission_overrides where user_id in ('manager-one', 'manager-two')");
      await client.query("delete from authz_user_roles where user_id in ('manager-one', 'manager-two')");
      await client.query('delete from "user" where id in (\'manager-one\', \'manager-two\')');
    }
  });

  it("creates and reads the category, section, topic, and post hierarchy with independent revisions", async () => {
    await insertForumAuthor("forum-author", "forum-author@example.test", "ru");
    const repository = new DrizzleForumRepository(drizzle(client));
    const forum = new ForumService(repository);

    await forum.createCategory({ id: "development", name: "Development" });
    await forum.createSection({ id: "typescript", categoryId: "development", name: "TypeScript" });
    await forum.createTopic({
      id: "topic-1", sectionId: "typescript", authorId: "forum-author",
      titleRevision: { id: "topic-title-r1", originalContent: "Как типизировать API?", sourceLocale: "EN-us" },
    });
    await forum.createPost({
      id: "post-1", topicId: "topic-1", authorId: "forum-author",
      bodyRevision: { id: "post-body-r1", originalContent: "Нужен пример.", sourceLocale: "und" },
    });

    expect(await forum.readHierarchy("development")).toMatchObject({
      id: "development",
      sections: [{
        id: "typescript",
        topics: [{
          id: "topic-1",
          authorId: "forum-author",
          title: { id: "topic-title-r1", sourceLocale: "en-US" },
          posts: [{ id: "post-1", body: { id: "post-body-r1", sourceLocale: "und" } }],
        }],
      }],
    });
    expect(await repository.revisionCounts()).toEqual({ topicTitles: 1, postBodies: 1 });
    expect(await repository.listCategories()).toEqual([
      { id: "development", name: "Development", sectionCount: 1 },
    ]);
    expect(await repository.readCategory("development")).toMatchObject({
      id: "development",
      sections: [{ id: "typescript", topicCount: 1, postCount: 1 }],
    });
    expect(await repository.readSection("typescript")).toMatchObject({
      category: { id: "development" },
      topics: [{ id: "topic-1", authorName: "Forum Author", postCount: 1 }],
    });
    expect(await repository.readTopicPage("topic-1")).toMatchObject({
      section: { id: "typescript", category: { id: "development" } },
      posts: [{ id: "post-1", authorName: "Forum Author", body: { originalContent: "Нужен пример." } }],
    });
    expect(await repository.readCategory("missing")).toBeUndefined();
  });

  it("persists browser write capability topics/replies with und revisions and rolls back an incomplete topic", async () => {
    let clock = Date.now();
    const writer = createHyperdriveForumWriter(databaseUrl, undefined, {
      cooldownMs: FORUM_WRITE_COOLDOWN_MS,
      now: () => new Date(clock += FORUM_WRITE_COOLDOWN_MS),
    });
    let createdTopicId: string | undefined;
    try {
      const created = await writer.createTopic({
        sectionId: "typescript", authorId: "forum-author", title: "Runtime topic", body: "Initial runtime post",
      });
      createdTopicId = created.topicId;
      await writer.createReply({ topicId: created.topicId, authorId: "forum-author", body: "Runtime reply" });

      const persisted = await new DrizzleForumRepository(drizzle(client)).readTopicPage(created.topicId);
      expect(persisted).toMatchObject({
        authorId: "forum-author",
        title: { originalContent: "Runtime topic", sourceLocale: "und" },
        posts: [
          { authorId: "forum-author", body: { originalContent: "Initial runtime post", sourceLocale: "und" } },
          { authorId: "forum-author", body: { originalContent: "Runtime reply", sourceLocale: "und" } },
        ],
      });

      const repository = new DrizzleForumRepository(drizzle(client));
      await expect(repository.createTopicWithInitialPost({
        id: "atomic-rollback-topic", sectionId: "typescript", authorId: "forum-author",
        titleRevision: { id: "atomic-duplicate", originalContent: "Must roll back", sourceLocale: "und" },
        initialPost: {
          id: "post-1", topicId: "atomic-rollback-topic", authorId: "forum-author",
          bodyRevision: { id: "atomic-body", originalContent: "Duplicate post id", sourceLocale: "und" },
        },
      })).rejects.toBeDefined();
      expect(await repository.readTopic("atomic-rollback-topic")).toBeUndefined();
    } finally {
      if (createdTopicId) {
        await client.query("delete from forum_topics where id = $1", [createdTopicId]);
      }
    }
  });

  it("atomically enforces topic-author and topic/post solution consistency", async () => {
    let now = Date.parse("2026-09-14T14:00:00.000Z");
    const repository = new DrizzleForumRepository(drizzle(client), {
      cooldownMs: FORUM_WRITE_COOLDOWN_MS,
      now: () => new Date(now += FORUM_WRITE_COOLDOWN_MS),
    });
    const forum = new ForumService(repository);
    await insertForumAuthor("solution-author", "solution@example.test", null);
    await insertForumAuthor("solution-other", "solution-other@example.test", null);

    try {
      const constraint = await client.query<{
        confdeltype: string;
        condeferrable: boolean;
        condeferred: boolean;
      }>(`select confdeltype, condeferrable, condeferred
            from pg_constraint
           where conname = 'forum_topics_best_answer_topic_post_fk'`);
      expect(constraint.rows[0]).toEqual({ confdeltype: "a", condeferrable: true, condeferred: true });

      await forum.createTopic({ id: "solution-topic", sectionId: "typescript", authorId: "solution-author", titleRevision: { id: "solution-title", originalContent: "Solution", sourceLocale: "en" } });
      await forum.createPost({ id: "solution-post-1", topicId: "solution-topic", authorId: "solution-other", bodyRevision: { id: "solution-body-1", originalContent: "One", sourceLocale: "en" } });
      await forum.createPost({ id: "solution-post-2", topicId: "solution-topic", authorId: "solution-other", bodyRevision: { id: "solution-body-2", originalContent: "Two", sourceLocale: "en" } });

      await expect(forum.selectBestAnswer("solution-topic", "solution-post-1", "solution-author")).rejects.toBeInstanceOf(ForumStateConflictError);
      await expect(forum.markTopicSolved("solution-topic", "solution-other")).rejects.toBeInstanceOf(ForumAuthorizationError);
      await forum.markTopicSolved("solution-topic", "solution-other", "any");
      await expect(forum.selectBestAnswer("solution-topic", "missing", "solution-author")).rejects.toBeInstanceOf(ForumEntityNotFoundError);
      await expect(forum.selectBestAnswer("solution-topic", "post-1", "solution-author")).rejects.toBeInstanceOf(ForumStateConflictError);

      await client.query("begin");
      try {
        await client.query("set constraints all deferred");
        await client.query("update forum_topics set best_answer_post_id = 'post-1' where id = 'solution-topic'");
        await expectDatabaseCode(client.query("commit"), "23503");
      } finally {
        await client.query("rollback");
      }

      await forum.selectBestAnswer("solution-topic", "solution-post-1", "solution-author");
      expect(await repository.readTopicPage("solution-topic")).toMatchObject({ isSolved: true, bestAnswerPostId: "solution-post-1" });
      await forum.selectBestAnswer("solution-topic", "solution-post-2", "solution-author");
      expect(await repository.readTopicPage("solution-topic")).toMatchObject({ isSolved: true, bestAnswerPostId: "solution-post-2" });
      await forum.selectBestAnswer("solution-topic", "solution-post-1", "solution-other", "any");
      expect(await repository.readTopicPage("solution-topic")).toMatchObject({ bestAnswerPostId: "solution-post-1" });

      await client.query("delete from forum_topics where id = 'solution-topic'");
      const deletedGraph = await client.query<{ topics: number; posts: number; titles: number; bodies: number }>(`
        select
          (select count(*)::int from forum_topics where id = 'solution-topic') as topics,
          (select count(*)::int from forum_posts where topic_id = 'solution-topic') as posts,
          (select count(*)::int from forum_topic_title_revisions where topic_id = 'solution-topic') as titles,
          (select count(*)::int from forum_post_revisions where post_id in ('solution-post-1', 'solution-post-2')) as bodies`);
      expect(deletedGraph.rows[0]).toEqual({ topics: 0, posts: 0, titles: 0, bodies: 0 });
    } finally {
      await client.query("delete from forum_topics where id = 'solution-topic'");
      await client.query('delete from "user" where id = any($1::text[])', [["solution-author", "solution-other"]]);
    }
  });

  it("enforces one shared deterministic topic/reply cooldown per author without partial writes", async () => {
    await insertForumAuthor("cooldown-author", "cooldown@example.test", null);
    await insertForumAuthor("other-author", "other@example.test", null);
    const start = Date.parse("2026-09-14T12:00:00.000Z");
    let now = start;
    const repository = new DrizzleForumRepository(drizzle(client), {
      cooldownMs: FORUM_WRITE_COOLDOWN_MS,
      now: () => new Date(now),
    });

    await repository.createTopicWithInitialPost(topicWrite("cooldown-topic", "cooldown-author"));
    await expect(repository.createPost(replyWrite("cooldown-reply", "cooldown-topic", "cooldown-author")))
      .rejects.toMatchObject({ retryAfterMs: FORUM_WRITE_COOLDOWN_MS });

    const beforeRejectedTopic = await forumRowCounts();
    await expect(repository.createTopicWithInitialPost(topicWrite("rejected-topic", "cooldown-author")))
      .rejects.toBeInstanceOf(ForumWriteRateLimitError);
    expect(await forumRowCounts()).toEqual(beforeRejectedTopic);
    expect(await repository.readTopic("rejected-topic")).toBeUndefined();

    await repository.createTopicWithInitialPost(topicWrite("other-topic", "other-author"));
    now += FORUM_WRITE_COOLDOWN_MS;
    await expect(repository.createPost(replyWrite("allowed-reply", "cooldown-topic", "cooldown-author")))
      .resolves.toMatchObject({ id: "allowed-reply" });
    await client.query("delete from forum_topics where author_id = any($1::text[])", [["cooldown-author", "other-author"]]);
    await client.query('delete from "user" where id = any($1::text[])', [["cooldown-author", "other-author"]]);
  });

  it("serializes genuinely concurrent PostgreSQL writes on the existing user row", async () => {
    await insertForumAuthor("concurrent-author", "concurrent@example.test", null);
    const fixedNow = new Date("2026-09-14T13:00:00.000Z");
    const policy = { cooldownMs: FORUM_WRITE_COOLDOWN_MS, now: () => fixedNow };
    const first = createHyperdriveForumWriter(databaseUrl, undefined, policy);
    const second = createHyperdriveForumWriter(databaseUrl, undefined, policy);

    const outcomes = await Promise.allSettled([
      first.createTopic({ sectionId: "typescript", authorId: "concurrent-author", title: "First", body: "First body" }),
      second.createTopic({ sectionId: "typescript", authorId: "concurrent-author", title: "Second", body: "Second body" }),
    ]);

    expect(outcomes.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const rejected = outcomes.find(({ status }) => status === "rejected");
    expect(rejected).toMatchObject({ status: "rejected", reason: expect.any(ForumWriteRateLimitError) });
    const rows = await client.query<{ topics: number; titles: number; posts: number; revisions: number }>(`
      select
        count(distinct t.id)::int as topics,
        count(distinct tr.id)::int as titles,
        count(distinct p.id)::int as posts,
        count(distinct pr.id)::int as revisions
      from forum_topics t
      left join forum_topic_title_revisions tr on tr.topic_id = t.id
      left join forum_posts p on p.topic_id = t.id
      left join forum_post_revisions pr on pr.post_id = p.id
      where t.author_id = 'concurrent-author'`);
    expect(rows.rows[0]).toEqual({ topics: 1, titles: 1, posts: 1, revisions: 1 });
    await client.query("delete from forum_topics where author_id = 'concurrent-author'");
    await client.query('delete from "user" where id = \'concurrent-author\'');
  });

  it("appends immutable revisions and atomically advances only the matching current revision", async () => {
    const repository = new DrizzleForumRepository(drizzle(client));
    const forum = new ForumService(repository);

    await forum.reviseTopicTitle(
      "topic-1", "topic-title-r1",
      { id: "topic-title-r2", originalContent: "Как типизировать HTTP API?", sourceLocale: "ru" },
      "forum-author",
    );
    await forum.revisePostBody(
      "post-1", "post-body-r1",
      { id: "post-body-r2", originalContent: "Нужен минимальный пример.", sourceLocale: "ru" },
      "forum-author",
    );
    expect((await forum.readTopic("topic-1"))?.title.id).toBe("topic-title-r2");
    expect((await forum.readPost("post-1"))?.body.id).toBe("post-body-r2");
    expect(await repository.revisionCounts()).toEqual({ topicTitles: 2, postBodies: 2 });

    await expectDatabaseCode(
      client.query("update forum_topic_title_revisions set original_content = 'mutated' where id = 'topic-title-r1'"),
      "55000",
    );
    await expectDatabaseCode(
      client.query("update forum_post_revisions set original_content = 'mutated' where id = 'post-body-r1'"),
      "55000",
    );
    await expect(forum.revisePostBody(
      "post-1", "post-body-r1",
      { id: "post-body-lost-race", originalContent: "lost", sourceLocale: "en" },
      "forum-author",
    )).rejects.toBeInstanceOf(ConcurrentRevisionError);
    expect(await repository.revisionCounts()).toEqual({ topicTitles: 2, postBodies: 2 });
  });

  it("enforces forum foreign keys, owner-matching current pointers, and registry-independent source locale", async () => {
    await expectDatabaseCode(
      client.query(`insert into forum_posts (id, topic_id, author_id, current_revision_id)
                    values ('missing-author-post', 'topic-1', 'missing-user', 'missing-revision')`),
      "23503",
    );

    await client.query("begin");
    try {
      await client.query("set constraints all deferred");
      await client.query(`insert into forum_posts (id, topic_id, author_id, current_revision_id)
                          values ('bad-current-post', 'topic-1', 'forum-author', 'post-body-r2')`);
      await expectDatabaseCode(client.query("commit"), "23503");
    } finally {
      await client.query("rollback");
    }

    expect((await client.query(
      `select count(*)::text as count from information_schema.table_constraints
       where table_schema = 'public' and table_name in ('forum_post_revisions', 'forum_topic_title_revisions')
         and constraint_type = 'FOREIGN KEY' and constraint_name like '%source_locale%'`,
    )).rows[0]?.count).toBe("0");
    expect((await client.query("select count(*)::text as count from locales where tag = 'und'")).rows[0]?.count).toBe("0");
    expect((await new ForumService(new DrizzleForumRepository(drizzle(client))).readPost("post-1"))?.body.sourceLocale).toBe("ru");

    const forum = new ForumService(new DrizzleForumRepository(drizzle(client)));
    expect(() => forum.createTopic({
      id: "blank-section-topic", sectionId: "   ", authorId: "forum-author",
      titleRevision: { id: "blank-section-title-r1", originalContent: "title", sourceLocale: "en" },
    })).toThrow(InvalidForumContentError);
    expect(() => forum.createPost({
      id: "blank-topic-post", topicId: "", authorId: "forum-author",
      bodyRevision: { id: "blank-topic-body-r1", originalContent: "body", sourceLocale: "en" },
    })).toThrow(InvalidForumContentError);
    expect(() => forum.createPost({
      id: "extension-locale-post", topicId: "topic-1", authorId: "forum-author",
      bodyRevision: { id: "extension-locale-r1", originalContent: "body", sourceLocale: "en-u-ca-gregory" },
    })).toThrow(InvalidForumContentError);
    expect(() => forum.createPost({
      id: "invalid-locale-post", topicId: "topic-1", authorId: "forum-author",
      bodyRevision: { id: "invalid-locale-r1", originalContent: "body", sourceLocale: "en-abc" },
    })).toThrow(InvalidForumContentError);
  });

  it("cascades forum hierarchy deletes and protects current revisions", async () => {
    await expectDatabaseCode(
      client.query("delete from forum_topic_title_revisions where id = 'topic-title-r2'"),
      "23503",
    );
    await expectDatabaseCode(
      client.query("delete from forum_post_revisions where id = 'post-body-r2'"),
      "23503",
    );

    const cases = [
      {
        deleteSql: "delete from forum_posts where id = 'post-1'",
        expected: { categories: 1, sections: 1, topics: 1, titleRevisions: 2, posts: 0, postRevisions: 0 },
      },
      {
        deleteSql: "delete from forum_topics where id = 'topic-1'",
        expected: { categories: 1, sections: 1, topics: 0, titleRevisions: 0, posts: 0, postRevisions: 0 },
      },
      {
        deleteSql: "delete from forum_sections where id = 'typescript'",
        expected: { categories: 1, sections: 0, topics: 0, titleRevisions: 0, posts: 0, postRevisions: 0 },
      },
      {
        deleteSql: "delete from forum_categories where id = 'development'",
        expected: { categories: 0, sections: 0, topics: 0, titleRevisions: 0, posts: 0, postRevisions: 0 },
      },
    ];

    for (const testCase of cases) {
      await client.query("begin");
      try {
        await client.query(testCase.deleteSql);
        expect(await forumRowCounts()).toEqual(testCase.expected);
      } finally {
        await client.query("rollback");
      }
    }
  });

  it("creates the exact Better Auth 1.7.4 PostgreSQL foundation", async () => {
    const columns = await client.query<{
      column_name: string;
      data_type: string;
      is_nullable: "YES" | "NO";
      table_name: string;
    }>(`select table_name, column_name, data_type, is_nullable
          from information_schema.columns
         where table_schema = 'public'
           and table_name = any(array['user', 'session', 'account', 'verification', 'rate_limit'])
         order by table_name, ordinal_position`);

    expect(columns.rows).toEqual([
      ...authColumns("account", [
        ["id", "text", "NO"], ["account_id", "text", "NO"], ["provider_id", "text", "NO"],
        ["user_id", "text", "NO"], ["access_token", "text", "YES"], ["refresh_token", "text", "YES"],
        ["id_token", "text", "YES"], ["access_token_expires_at", "timestamp without time zone", "YES"],
        ["refresh_token_expires_at", "timestamp without time zone", "YES"], ["scope", "text", "YES"],
        ["password", "text", "YES"], ["created_at", "timestamp without time zone", "NO"],
        ["updated_at", "timestamp without time zone", "NO"],
      ]),
      ...authColumns("rate_limit", [["id", "text", "NO"], ["key", "text", "NO"],
        ["count", "integer", "NO"], ["last_request", "bigint", "NO"]]),
      ...authColumns("session", [["id", "text", "NO"], ["expires_at", "timestamp without time zone", "NO"],
        ["token", "text", "NO"], ["created_at", "timestamp without time zone", "NO"],
        ["updated_at", "timestamp without time zone", "NO"], ["ip_address", "text", "YES"],
        ["user_agent", "text", "YES"], ["user_id", "text", "NO"]]),
      ...authColumns("user", [["id", "text", "NO"], ["name", "text", "NO"], ["email", "text", "NO"],
        ["email_verified", "boolean", "NO"], ["image", "text", "YES"],
        ["created_at", "timestamp without time zone", "NO"], ["updated_at", "timestamp without time zone", "NO"],
        ["locale", "text", "YES"]]),
      ...authColumns("verification", [["id", "text", "NO"], ["identifier", "text", "NO"],
        ["value", "text", "NO"], ["expires_at", "timestamp without time zone", "NO"],
        ["created_at", "timestamp without time zone", "NO"], ["updated_at", "timestamp without time zone", "NO"]]),
    ]);

    const constraints = await client.query<{ constraint_name: string }>(`
      select constraint_name from information_schema.table_constraints
       where table_schema = 'public'
         and constraint_name in ('user_email_unique', 'session_token_unique', 'rate_limit_key_unique',
           'account_user_id_user_id_fk', 'session_user_id_user_id_fk')
       order by constraint_name`);
    expect(constraints.rows.map(({ constraint_name }) => constraint_name)).toEqual([
      "account_user_id_user_id_fk", "rate_limit_key_unique", "session_token_unique",
      "session_user_id_user_id_fk", "user_email_unique",
    ]);

    const indexes = await client.query<{ indexname: string }>(`
      select indexname from pg_indexes where schemaname = 'public'
       and indexname in ('account_userId_idx', 'session_userId_idx', 'verification_identifier_idx')
       order by indexname`);
    expect(indexes.rows.map(({ indexname }) => indexname)).toEqual([
      "account_userId_idx", "session_userId_idx", "verification_identifier_idx",
    ]);

    const localeForeignKeys = await client.query<{ count: string }>(`
      select count(*)::text as count from information_schema.table_constraints
       where table_schema = 'public' and table_name = 'user' and constraint_type = 'FOREIGN KEY'`);
    expect(localeForeignKeys.rows[0]?.count).toBe("0");
  });

  it("stores the exact non-bootstrap Stage 1 locale data", async () => {
    const result = await client.query<{
      aliases: string[];
      direction: string;
      fallback_chain: string[];
      match_tags: string[];
      native_name: string;
      presentation_metadata: Record<string, string>;
      publication_status: string;
      tag: string;
      translation_status: string;
    }>(`select tag, translation_status, publication_status, direction, fallback_chain,
               aliases, match_tags, native_name, presentation_metadata
          from locales
         order by tag`);

    expect(result.rows).toEqual([
      {
        tag: "he",
        translation_status: "draft",
        publication_status: "active",
        direction: "rtl",
        fallback_chain: ["en"],
        aliases: ["iw"],
        match_tags: [],
        native_name: "עברית",
        presentation_metadata: {},
      },
      {
        tag: "ka",
        translation_status: "draft",
        publication_status: "inactive",
        direction: "ltr",
        fallback_chain: ["en"],
        aliases: [],
        match_tags: [],
        native_name: "ქართული",
        presentation_metadata: {},
      },
      {
        tag: "ru",
        translation_status: "draft",
        publication_status: "active",
        direction: "ltr",
        fallback_chain: ["en"],
        aliases: [],
        match_tags: [],
        native_name: "Русский",
        presentation_metadata: {},
      },
    ]);
    expect(result.rows.some(({ tag }) => tag.toLowerCase() === "en")).toBe(false);
  });

  it("classifies a Drizzle-wrapped missing-table error as schema mismatch", async () => {
    await client.query("create schema registry_missing_table");
    await client.query("set search_path to registry_missing_table");
    try {
      const loaded = await loadPersistentRegistry(new DrizzleLocaleRepository(drizzle(client)));
      expect(loaded.health).toEqual({ status: "degraded", reason: "schema-mismatch" });
      expect(loaded.registry.activeLocales().map(({ tag }) => tag)).toEqual(["en"]);
    } finally {
      await client.query("set search_path to public");
      await client.query("drop schema registry_missing_table cascade");
    }
  });

  it("loads the persistent registry through Drizzle", async () => {
    const loaded = await loadPersistentRegistry(new DrizzleLocaleRepository(drizzle(client)));
    expect(loaded.health).toEqual({ status: "healthy" });
    expect(loaded.semanticIdentity).toMatch(/^sha256:[0-9a-f]{64}$/);
    const aliasIdentity = parseLocaleCandidate("iw")?.translationTag;
    expect(aliasIdentity).toBe("he");
    expect(aliasIdentity && loaded.registry.find(aliasIdentity)?.locale.tag).toBe("he");
    expect(loaded.registry.find("ka")?.locale.publicationStatus).toBe("inactive");
  });

  it("serializes concurrent desired-state writes and preserves a valid graph", async () => {
    const second = new Client({ connectionString: databaseUrl });
    await second.connect();
    try {
      const locale = (tag: string) => ({
        tag, translationStatus: "draft" as const, publicationStatus: "inactive" as const,
        direction: "ltr" as const, fallbackChain: ["en"], nativeName: tag,
      });
      await Promise.all([
        new ControlledLocaleWriter(client, new DrizzleLocaleRepository(drizzle(client)), 4)
          .apply({ type: "put", locale: locale("de") }),
        new ControlledLocaleWriter(second, new DrizzleLocaleRepository(drizzle(second)), 4)
          .apply({ type: "put", locale: locale("fr") }),
      ]);
      const loaded = await loadPersistentRegistry(new DrizzleLocaleRepository(drizzle(client)));
      expect(loaded.health).toEqual({ status: "healthy" });
      expect(loaded.registry.find("de")?.locale.tag).toBe("de");
      expect(loaded.registry.find("fr")?.locale.tag).toBe("fr");
    } finally {
      await second.end();
    }
  });

  it("reconciles an ambiguous commit that PostgreSQL applied without blind retry", async () => {
    let commitCalls = 0;
    const ambiguousClient = new Proxy(client, {
      get(target, property) {
        if (property !== "query") return Reflect.get(target, property, target);
        return async (text: string, values?: unknown[]) => {
          const result = await target.query(text, values);
          if (text.toLowerCase() === "commit") {
            commitCalls++;
            throw Object.assign(new Error("connection lost after commit"), { code: "08007" });
          }
          return result;
        };
      },
    }) as ClientBase;
    const writer = new ControlledLocaleWriter(
      ambiguousClient,
      new DrizzleLocaleRepository(drizzle(client)),
    );

    await writer.apply({
      type: "put",
      locale: {
        tag: "es", translationStatus: "draft", publicationStatus: "inactive",
        direction: "ltr", fallbackChain: ["en"], nativeName: "Español",
      },
    });
    expect(commitCalls).toBe(1);
    expect((await loadPersistentRegistry(new DrizzleLocaleRepository(drizzle(client))))
      .registry.find("es")?.locale.tag).toBe("es");
  });

  it("preserves the original transaction error when rollback also fails", async () => {
    const original = Object.assign(new Error("serialization failure"), { code: "40001" });
    const rollback = new Error("rollback failure");
    const fakeClient = {
      async query(text: string) {
        if (text.toLowerCase() === "commit") throw original;
        if (text.toLowerCase() === "rollback") throw rollback;
        if (text.startsWith("select")) return { rows: [] };
        return { rows: [] };
      },
    } as unknown as ClientBase;
    const writer = new ControlledLocaleWriter(fakeClient, { readAll: async () => [] }, 0);
    await expect(writer.apply({
      type: "put",
      locale: {
        tag: "it", translationStatus: "draft", publicationStatus: "inactive",
        direction: "ltr", fallbackChain: ["en"], nativeName: "Italiano",
      },
    })).rejects.toBe(original);
  });

  it("reports an unresolved ambiguous commit when actual state is neither pre nor expected", async () => {
    const original = Object.assign(new Error("statement completion unknown"), { code: "40003" });
    const fakeClient = {
      async query(text: string) {
        if (text.toLowerCase() === "commit") throw original;
        if (text.startsWith("select")) return { rows: [] };
        return { rows: [] };
      },
    } as unknown as ClientBase;
    const writer = new ControlledLocaleWriter(fakeClient, {
      readAll: async () => [{
        tag: "de", translationStatus: "draft", publicationStatus: "inactive", direction: "ltr",
        fallbackChain: ["en"], aliases: [], matchTags: [], nativeName: "Deutsch", presentationMetadata: {},
      }],
    });
    await expect(writer.apply({
      type: "put",
      locale: {
        tag: "it", translationStatus: "draft", publicationStatus: "inactive",
        direction: "ltr", fallbackChain: ["en"], nativeName: "Italiano",
      },
    })).rejects.toBeInstanceOf(AmbiguousCommitOutcomeError);
  });

  it.each([
    ["translation status", "bad-status", "active", "ltr", "Name", {}, ["en"], [], []],
    ["publication status", "draft", "bad-status", "ltr", "Name", {}, ["en"], [], []],
    ["direction", "draft", "active", "sideways", "Name", {}, ["en"], [], []],
    ["blank native name", "draft", "active", "ltr", "   ", {}, ["en"], [], []],
    ["non-object presentation metadata", "draft", "active", "ltr", "Name", [], ["en"], [], []],
  ])(
    "rejects an invalid %s",
    async (_, translationStatus, publicationStatus, direction, nativeName, metadata, fallbacks, aliases, matchTags) => {
      await expectConstraintViolation([
        `bad-${String(_).replaceAll(" ", "-")}`,
        translationStatus,
        publicationStatus,
        direction,
        fallbacks,
        aliases,
        matchTags,
        nativeName,
        JSON.stringify(metadata),
      ]);
    },
  );

  it.each(["en", "EN", "api", "API", "assets", "ASSETS"])(
    "rejects reserved or bootstrap tag %s",
    async (tag) => {
      await expectConstraintViolation([tag, "draft", "active", "ltr", ["en"], [], [], "Name", "{}"]);
    },
  );

  it.each([
    ["fallback_chain", "array[null]::text[]"],
    ["aliases", "array[null]::text[]"],
    ["match_tags", "array[null]::text[]"],
    ["fallback_chain", "'[0:0]={en}'::text[]"],
    ["aliases", "array[['one'], ['two']]::text[]"],
    ["match_tags", "array[['one'], ['two']]::text[]"],
  ])("rejects invalid %s array shape", async (column, invalidArray) => {
    const tag = `array-${column.replaceAll("_", "-")}-${invalidArray.length}`;
    const query = `insert into locales
      (tag, translation_status, publication_status, direction, fallback_chain, aliases, match_tags, native_name)
      values ($1, 'draft', 'active', 'ltr',
        ${column === "fallback_chain" ? invalidArray : "array['en']::text[]"},
        ${column === "aliases" ? invalidArray : "array[]::text[]"},
        ${column === "match_tags" ? invalidArray : "array[]::text[]"}, 'Name')`;
    await expectDatabaseCheck(client.query(query, [tag]));
  });
});

async function expectConstraintViolation(values: unknown[]) {
  await expectDatabaseCheck(
    client.query(
      `insert into locales
        (tag, translation_status, publication_status, direction, fallback_chain,
         aliases, match_tags, native_name, presentation_metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      values,
    ),
  );
}

async function expectDatabaseCheck(operation: Promise<unknown>) {
  try {
    await operation;
    throw new Error("Expected a PostgreSQL check constraint violation");
  } catch (error) {
    expect((error as DatabaseError).code).toBe("23514");
  }
}

async function expectDatabaseCode(operation: Promise<unknown>, code: string) {
  try {
    await operation;
    throw new Error(`Expected PostgreSQL error ${code}`);
  } catch (error) {
    expect((error as DatabaseError).code).toBe(code);
  }
}

async function forumRowCounts() {
  const result = await client.query<{
    categories: number;
    sections: number;
    topics: number;
    title_revisions: number;
    posts: number;
    post_revisions: number;
  }>(`select
      (select count(*)::int from forum_categories) as categories,
      (select count(*)::int from forum_sections) as sections,
      (select count(*)::int from forum_topics) as topics,
      (select count(*)::int from forum_topic_title_revisions) as title_revisions,
      (select count(*)::int from forum_posts) as posts,
      (select count(*)::int from forum_post_revisions) as post_revisions`);
  const row = result.rows[0];
  if (!row) throw new Error("forum row-count query returned no rows");
  return {
    categories: row.categories,
    sections: row.sections,
    topics: row.topics,
    titleRevisions: row.title_revisions,
    posts: row.posts,
    postRevisions: row.post_revisions,
  };
}

async function insertForumAuthor(id: string, email: string, locale: string | null) {
  await client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at, locale)
     values ($1, 'Forum Author', $2, true, now(), now(), $3)`,
    [id, email, locale],
  );
}

function topicWrite(id: string, authorId: string) {
  return {
    id,
    sectionId: "typescript",
    authorId,
    titleRevision: { id: `${id}-title`, originalContent: `${id} title`, sourceLocale: "und" },
    initialPost: {
      id: `${id}-post`, topicId: id, authorId,
      bodyRevision: { id: `${id}-body`, originalContent: `${id} body`, sourceLocale: "und" },
    },
  };
}

function replyWrite(id: string, topicId: string, authorId: string) {
  return {
    id, topicId, authorId,
    bodyRevision: { id: `${id}-body`, originalContent: `${id} body`, sourceLocale: "und" },
  };
}

function authColumns(
  tableName: string,
  columns: Array<[string, string, "YES" | "NO"]>,
) {
  return columns.map(([column_name, data_type, is_nullable]) => ({
    table_name: tableName,
    column_name,
    data_type,
    is_nullable,
  }));
}
