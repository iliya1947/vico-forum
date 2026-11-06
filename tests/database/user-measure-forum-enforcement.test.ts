import { randomUUID } from "node:crypto";
import { RouterContextProvider } from "react-router";
import { readdir, readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  DrizzleForumRepository, ForumPublicationReplayConflictError,
} from "../../db/forum-repository";
import { UserMeasureRestrictedError } from "../../db/user-measure-policy";
import { DrizzleForumAttachments, ForumAttachmentDraftConflictError } from "../../db/forum-attachments";
import { HELP_SOLUTIONS_SERVICE_SECTION_ID } from "../../db/forum-identifiers";
import { ForumEntityNotFoundError, ForumStateConflictError } from "../../db/forum-repository";
import { InvalidProfileError } from "../../app/forum/profile";
import { createHyperdriveForumWriter } from "../../db/hyperdrive-forum";
import { withForumAdministrativeRestrictions } from "../../db/user-measure-admin-forum";
import { complaintReviewContext } from "../../app/complaints/review-context";
import { complaintAppealContext } from "../../app/complaints/appeal-context";
import { loader as caseContextLoader } from "../../app/routes/complaint-review-context";
import { loader as caseEvidenceLoader } from "../../app/routes/complaint-review-evidence";
import { loader as appealContextLoader } from "../../app/routes/complaint-appeal-context";
import { loader as appealEvidenceLoader } from "../../app/routes/complaint-appeal-evidence";
import { vi } from "vitest";
import { requireAdminForumAccess } from "../../app/admin/forum.server";
import type { AuthorizationManagementCapability } from "../../db/authorization-service";
import type { PermissionKey } from "../../app/authorization/catalog";
import { createHyperdriveContentGenerationAdmission } from "../../db/hyperdrive-content-generation-admission";
import { contentGenerationAdmissionContext, contentGenerationActionContext, localeContext } from "../../app/localization/request-context";
import { topicAction } from "../../app/forum/actions.server";
import { ContentGenerationPlanningUnavailableError } from "../../app/localization/content-generation-action.server";
import { ComplaintsService } from "../../db/complaints-service";
import { DrizzleComplaintsRepository } from "../../db/complaints-repository";
import { ComplaintConflictError, ComplaintForbiddenError } from "../../db/complaints-domain";
import { createHyperdriveComplaintSubmission } from "../../db/hyperdrive-complaints";
import { createAuthorizationCapability } from "../../db/authorization-service";
import { PostgresAuthorizationRepository } from "../../db/authorization-repository";
import { action as complaintSubmitAction } from "../../app/routes/complaint-submit";
import { complaintSubmissionContext } from "../../app/complaints/request-context";
import { Pool } from "pg";
import { ForumAttachmentCleanup } from "../../db/forum-attachment-cleanup";
import { action as uploadAction } from "../../app/routes/attachment-upload";
import { authSessionContext } from "../../app/auth/request-context";
import { authorizationContext } from "../../app/authorization/request-context";
import { forumReaderContext } from "../../app/forum/request-context";
import { forumAttachmentStoreContext, privateAttachmentBucketContext } from "../../app/forum/attachment-request-context";
import type { PrivateAttachmentBucket } from "../../app/forum/attachment-r2";
import type { UserMeasureRestrictionId } from "../../app/admin/user-measure-restrictions";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["127.0.0.1", "localhost"].includes(new URL(databaseUrl).hostname)
  || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("Disposable loopback *_test PostgreSQL is required");
}
const schema = "ap10_forum_restriction_test";
const client = new Client({ connectionString: databaseUrl, options: "-c search_path=" + schema });
const attachments = new DrizzleForumAttachments(drizzle(client));
const forum = new DrizzleForumRepository(drizzle(client), {
  cooldownMs: 0, now: () => new Date(),
});
const sectionId = "ap10-section";
const topicId = "ap10-fixture";

function newTopic(id: string = randomUUID(), authorId = "target") {
  return {
    id, authorId, sectionId,
    titleRevision: { id: randomUUID(), originalContent: "Subject", sourceLocale: "en" },
    initialPost: {
      id: randomUUID(), topicId: id, authorId,
      bodyRevision: { id: randomUUID(), originalContent: "Initial text", sourceLocale: "en" },
    },
  };
}
function newReply(id = randomUUID(), draftId?: string, body = "Existing reply") {
  return {
    id, topicId, authorId: "target",
    ...(draftId ? { publishedDraft: { contextKey: "topic:ap10-fixture:reply", draftId, attachmentIds: [] } } : {}),
    bodyRevision: { id: randomUUID(), originalContent: body, sourceLocale: "en" },
  };
}
async function createMeasure(
  restriction: UserMeasureRestrictionId,
  target = "target",
  expiresAt: string | null = null,
) {
  const id = randomUUID();
  await client.query(`insert into user_measures
    (id, target_user_id, issuer_user_id, issuer_authority_floor, create_fingerprint, initial_reason, expires_at)
    values ($1, $2, 'issuer', 1, $3, 'Test violation', $4)`,
    [id, target, "e".repeat(64), expiresAt]);
  await client.query(
    "insert into user_measure_restrictions(measure_id, restriction_key) values ($1, $2)",
    [id, restriction],
  );
  return id;
}
async function lift(id: string) {
  await client.query(`update user_measures
    set lifted_at=clock_timestamp(), lifted_by_user_id='issuer', lift_reason='Test completed'
    where id=$1`, [id]);
}
async function postCount() {
  return Number((await client.query<{ total: string }>(
    "select count(*)::text as total from forum_posts",
  )).rows[0]?.total);
}

beforeAll(async () => {
  await client.connect();
  await client.query("drop schema if exists " + schema + " cascade; create schema " + schema);
  for (const file of (await readdir("drizzle")).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    await client.query((await readFile("drizzle/" + file, "utf8")).replaceAll('"public".', '"' + schema + '".'));
  }
  await client.query(`insert into "user"(id, name, email) values
    ('target', 'Target', 'ap10-forum-target@test.invalid'),
    ('issuer', 'Issuer', 'ap10-forum-issuer@test.invalid'),
    ('other', 'Other', 'ap10-forum-other@test.invalid')`);
  await forum.createCategory({ id: "ap10-category", name: "Category" });
  await forum.createSection({ id: sectionId, categoryId: "ap10-category", name: "Section" });
  await forum.createTopicWithInitialPost(newTopic(topicId, "issuer"));
});
afterEach(async () => {
  await client.query(`update user_measures
    set lifted_at=clock_timestamp(), lifted_by_user_id='issuer', lift_reason='Test cleanup'
    where lifted_at is null`);
});
afterAll(async () => {
  await client.query("drop schema if exists " + schema + " cascade");
  await client.end();
});

describe("AP-10 admin.complaints effective access and reviewer transactions", () => {
  const reviewPermissions = [
    "forum.complaint.review", "forum.complaint.appeal.review",
    "forum.complaint.priority.manage", "forum.complaint.reporterIdentity.read",
  ] as const satisfies readonly PermissionKey[];
  const allRights = [
    ...reviewPermissions, "forum.topic.pin", "forum.complaint.create",
  ] as const satisfies readonly PermissionKey[];
  const snapshot = {
    role: { id: "role", slug: "moderator", displayName: "Moderator", isSystem: true },
    explicitAssignment: false, grants: [...allRights], overrides: {},
    effectivePermissions: [...allRights],
  };
  const raw = {
    forUser: (_: string) => ({
      has: async (key: PermissionKey) => allRights.includes(key as typeof allRights[number]),
      resolve: async () => snapshot,
    }),
    resolveUser: async () => snapshot,
  } as unknown as AuthorizationManagementCapability;
  function effective() {
    return withForumAdministrativeRestrictions(raw, databaseUrl!, () =>
      new Pool({ connectionString: databaseUrl, options: "-c search_path=" + schema, max: 1 }));
  }
  const repo = new DrizzleComplaintsRepository(drizzle(client));
  async function createCase() {
    const question = newTopic(randomUUID(), "issuer");
    await forum.createTopicWithInitialPost(question);
    const saved = await repo.submit("target", {
      operationId: randomUUID(), reason: "spam", explanation: null,
      target: { kind: "post", topicId: question.id, postId: question.initialPost.id,
        revisionId: question.initialPost.bodyRevision.id },
    });
    return saved;
  }

  it("filters all four complaint rights from has and effective snapshot while preserving raw grants and forum rights", async () => {
    const original = effective().forUser("issuer");
    expect(await original.has("forum.complaint.review")).toBe(true);
    await createMeasure("admin.complaints", "issuer");
    const after = effective().forUser("issuer");
    for (const key of reviewPermissions) expect(await after.has(key)).toBe(false);
    expect(await after.has("forum.topic.pin")).toBe(true);
    expect(await after.has("forum.complaint.create")).toBe(true);
    const view = await after.resolve();
    expect(view.effectivePermissions).toEqual(["forum.topic.pin", "forum.complaint.create"]);
    expect(view.grants).toEqual([...allRights]);
    expect((await raw.forUser("issuer").resolve()).effectivePermissions).toEqual([...allRights]);
    expect((await effective().resolveUser("issuer")).effectivePermissions).toEqual([...allRights]);
    expect(await effective().forUser("target").has("forum.complaint.review")).toBe(true);
    const blocked = await createMeasure("admin.complaints", "issuer");
    await lift(blocked);
    expect(await effective().forUser("issuer").has("forum.complaint.review")).toBe(false);
  });

  it("refuses all direct private Case and Appeal context/evidence endpoints before any backend or R2 reads", async () => {
    await createMeasure("admin.complaints", "issuer");
    const context = new RouterContextProvider();
    context.set(authSessionContext, { user: { id: "issuer" } } as never);
    context.set(authorizationContext, effective());
    const readCase = vi.fn(async () => { throw new Error("private Case access"); });
    const readAppeal = vi.fn(async () => { throw new Error("private Appeal access"); });
    context.set(complaintReviewContext, { context: readCase, evidence: readCase } as never);
    context.set(complaintAppealContext, { context: readAppeal, evidence: readAppeal } as never);
    const cases = [
      [caseContextLoader, { caseId: "secret-case", postId: "secret-post" }],
      [caseEvidenceLoader, { caseId: "secret-case", attachmentId: "secret-file" }],
      [appealContextLoader, { caseId: "secret-case", appealId: "secret-appeal", postId: "secret-post" }],
      [appealEvidenceLoader, { caseId: "secret-case", appealId: "secret-appeal", attachmentId: "secret-file" }],
    ] as const;
    for (const [loader, params] of cases) {
      try {
        await loader({ params, context } as never);
        throw new Error("private route was not denied");
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        const response = error as Response;
        expect(response.status).toBe(403);
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      }
    }
    expect(readCase).not.toHaveBeenCalled();
    expect(readAppeal).not.toHaveBeenCalled();
  });

  it("blocks new Case reviewer commands inside locked transactions without changing cases, notes, events or settings", async () => {
    const saved = await createCase();
    const service = new ComplaintsService(repo, effective());
    const original = await repo.readPrioritySettings();
    await createMeasure("admin.complaints", "issuer");
    await expect(service.readQueue("issuer", 0)).rejects.toBeInstanceOf(ComplaintForbiddenError);
    await expect(service.readResolvedHistory("issuer", 0)).rejects.toBeInstanceOf(ComplaintForbiddenError);
    await expect(service.readReview("issuer", saved.caseId, { reports: 0, notes: 0, evidence: 0, context: 0 }))
      .rejects.toBeInstanceOf(ComplaintForbiddenError);
    await expect(service.readPrioritySettings("issuer")).rejects.toBeInstanceOf(ComplaintForbiddenError);
    await expect(service.readAppealQueue("issuer", 0)).rejects.toBeInstanceOf(ComplaintForbiddenError);
    await expect(repo.addNote("issuer", { caseId: saved.caseId, operationId: randomUUID(), body: "Private note" }))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await expect(repo.decide("issuer", { caseId: saved.caseId, operationId: randomUUID(),
      expectedVersion: 1, outcome: "not-confirmed", reasoning: "Review" }))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await expect(repo.changePriority("issuer", { caseId: saved.caseId, operationId: randomUUID(),
      expectedVersion: 1, priority: 3 })).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await expect(repo.activity("issuer", saved.caseId, true)).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await expect(repo.savePrioritySettings("issuer", {
      expectedVersion: original.version, weights: original.weights,
    })).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    const rows = await client.query<{ version: number; state: string }>(
      "select version,state from forum_complaint_cases where id=$1", [saved.caseId],
    );
    expect(rows.rows[0]).toEqual({version:1,state:"open"});
    expect((await client.query("select id from forum_complaint_notes where case_id=$1", [saved.caseId])).rowCount).toBe(0);
    expect((await client.query("select id from forum_complaint_events where case_id=$1 and kind<>'submitted'", [saved.caseId])).rowCount).toBe(0);
    expect((await repo.readPrioritySettings()).version).toBe(original.version);
  });

  it("preserves participant Complaint appeals, status and committed reviewer idempotency", async () => {
    const saved = await createCase();
    const decision = {
      caseId: saved.caseId, operationId: randomUUID(), expectedVersion: 1,
      outcome: "not-confirmed" as const, reasoning: "Review completed",
    };
    const decidedId = await repo.decide("issuer", decision);
    const appeal = {
      caseId: saved.caseId, decisionId: decidedId,
      operationId: randomUUID(), argument: "Please reconsider",
    };
    await createMeasure("admin.complaints", "issuer");
    expect(await repo.decide("issuer", decision)).toBe(decidedId);
    const participant = new ComplaintsService(repo, effective());
    const appealId = await participant.appeal("target", appeal);
    expect(appealId).toBeTruthy();
    expect(await participant.appeal("target", appeal)).toBe(appealId);
    expect(await participant.readOwnResult("target", saved.caseId)).toBeTruthy();
    const resolution = {
      caseId: saved.caseId, appealId, operationId: randomUUID(),
      outcome: "upheld" as const, reasoning: "Case reviewed",
    };
    await expect(repo.resolveAppeal("issuer", resolution))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    const status = await client.query<{ status: string }>(
      "select status from forum_complaint_appeals where id=$1", [appealId],
    );
    expect(status.rows[0]?.status).toBe("pending");
    await client.query("update user_measures set lifted_at=clock_timestamp(),lifted_by_user_id='issuer',lift_reason='Test lift' where target_user_id='issuer' and lifted_at is null");
    expect(await repo.resolveAppeal("issuer", resolution)).toBe(appealId);
    await createMeasure("admin.complaints", "issuer");
    expect(await repo.resolveAppeal("issuer", resolution)).toBe(appealId);
    await expect(participant.readAppealCaseForReviewer("issuer",saved.caseId,appealId,
      { reports:0,notes:0,evidence:0,context:0 })).rejects.toBeInstanceOf(ComplaintForbiddenError);
  });

  it("treats expired, disabled and unrelated measures independently; refreshes on next request and fails closed on absent tables", async () => {
    await createMeasure("admin.complaints", "issuer", "2000-01-01T00:00:00Z");
    await createMeasure("admin.complaints", "target");
    const disabled = await createMeasure("admin.complaints", "issuer");
    await client.query("update user_measure_restrictions set enabled=false where measure_id=$1", [disabled]);
    await effective().forUser("issuer").has("forum.complaint.review").then(v => expect(v).toBe(true));
    const one = await createMeasure("admin.complaints", "issuer");
    const two = await createMeasure("admin.complaints", "issuer");
    await lift(one);
    expect(await effective().forUser("issuer").has("forum.complaint.review")).toBe(false);
    await lift(two);
    expect(await effective().forUser("issuer").has("forum.complaint.review")).toBe(true);
    const missing = withForumAdministrativeRestrictions(raw, databaseUrl!, () =>
      new Pool({ connectionString: databaseUrl, options: "-c search_path=ap10_nonexistent_complaint", max: 1 }));
    await expect(missing.forUser("issuer").has("forum.complaint.review")).rejects.toThrow();
  });
});

describe("AP-10 admin.forum permission projection and authoritative moderation", () => {
  const rawPermissions = [
    "forum.topic.pin", "forum.topic.close", "forum.solution.manageAny",
    "forum.helpNeedsDetails.manage", "forum.helpDuplicate.manage",
    "forum.sourceLocale.correctAny", "forum.post.history.read",
    "forum.solution.manageOwn", "forum.sourceLocale.correctOwn", "forum.reply.create",
  ] as const satisfies readonly PermissionKey[];
  const snapshot = {
    role: { id: "role", slug: "admin", displayName: "Admin", isSystem: true },
    explicitAssignment: false, grants: [...rawPermissions], overrides: {},
    effectivePermissions: [...rawPermissions],
  };
  const raw = {
    forUser: () => ({
      has: async (p: PermissionKey) => rawPermissions.includes(p as typeof rawPermissions[number]),
      resolve: async () => snapshot,
    }),
    resolveUser: async () => snapshot,
    listRoles: async () => [],
  } as unknown as AuthorizationManagementCapability;
  const wrapped = () => withForumAdministrativeRestrictions(
    raw, databaseUrl!,
    () => new Pool({ connectionString: databaseUrl, options: "-c search_path=" + schema, max: 1 }),
  );

  it("filters all seven private/read/admin action permissions, not own or participation; raw hierarchy stays intact", async () => {
    const before = wrapped().forUser("target");
    expect(await before.has("forum.post.history.read")).toBe(true);
    await createMeasure("admin.forum");
    const resolver = wrapped().forUser("target");
    for (const key of rawPermissions.slice(0, 7)) {
      expect(await resolver.has(key)).toBe(false);
    }
    for (const key of rawPermissions.slice(7)) {
      expect(await resolver.has(key)).toBe(true);
    }
    const projected = await resolver.resolve();
    expect(projected.effectivePermissions).toEqual([...rawPermissions.slice(7)]);
    expect(projected.grants).toEqual([...rawPermissions]);
    expect((await raw.forUser("target").resolve()).effectivePermissions).toEqual([...rawPermissions]);
    expect((await wrapped().resolveUser("target")).effectivePermissions).toEqual([...rawPermissions]);

    const ctx = new RouterContextProvider();
    ctx.set(authSessionContext, { user: { id: "target" } } as never);
    ctx.set(authorizationContext, wrapped());
    await expect(requireAdminForumAccess(ctx)).rejects.toMatchObject({status:403});
    expect(await wrapped().forUser("other").has("forum.post.history.read")).toBe(true);
    const active = await createMeasure("admin.forum");
    await lift(active);
    await expect(wrapped().forUser("target").has("forum.topic.pin")).resolves.toBe(false);
    await client.query("update user_measure_restrictions set enabled=false where measure_id=(select id from user_measures where target_user_id='target' and lifted_at is null order by created_at asc limit 1)");
    expect(await wrapped().forUser("target").has("forum.topic.pin")).toBe(true);
    await expect(requireAdminForumAccess(ctx)).rejects.toMatchObject({status:403});
  });

  it("denies direct pin, closure and Any solution actions atomically without touching regular writes", async () => {
    const id = randomUUID();
    await forum.createTopicWithInitialPost(newTopic(id, "issuer"));
    await createMeasure("admin.forum");
    await expect(forum.pinTopic(id, "target")).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await forum.readTopicPinState(id)).toBe(false);
    await expect(forum.setTopicClosed({
      topicId: id, actorId: "target", isClosed: true, expectedClosureVersion: 0,
    })).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect((await forum.readTopicPage(id))?.isClosed).toBe(false);
    await expect(forum.markTopicSolved(id, "target", "any"))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect((await forum.readTopicPage(id))?.isSolved).toBe(false);
    await forum.createPost({
      id: randomUUID(), topicId: id, authorId: "target",
      bodyRevision: { id: randomUUID(), originalContent: "Ordinary reply", sourceLocale: "en" },
    });
    const newOwn = newTopic(randomUUID(), "target");
    await forum.createTopicWithInitialPost(newOwn);
    await forum.markTopicSolved(newOwn.id, "target", "own");
    expect((await forum.readTopicPage(newOwn.id))?.isSolved).toBe(true);
  });

  it("restricts Any source correction and Help signal review but not own source correction or signal submission", async () => {
    const id = randomUUID();
    const post = newTopic(id, "target");
    await forum.createTopicWithInitialPost(post);
    const help = newTopic(randomUUID(), "issuer");
    await forum.createTopicWithInitialPost({
      ...help, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID,
    });
    const signal = await forum.createHelpSignal({
      topicId: help.id, actorId: "other", kind: "needs-details", proposedOriginalTopicId: null,
      explanation: "Please explain the error.",
    });
    await createMeasure("admin.forum");
    await expect(forum.reviseTopicTitle(id, post.titleRevision.id, {
      id: randomUUID(), originalContent: "Same title", sourceLocale: "ru",
    }, "target", "any")).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect((await forum.readTopic(id))?.title.id).toBe(post.titleRevision.id);
    await forum.reviseTopicTitle(id, post.titleRevision.id, {
      id: randomUUID(), originalContent: "Own corrected title", sourceLocale: "ru",
    }, "target", "own");
    await expect(forum.resolveHelpSignal(signal.id, "target", "accepted"))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await expect(forum.resolveHelpSignal(signal.id, "target", "rejected"))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect((await forum.readHelpSignal(signal.id))?.status).toBe("pending");
    const nextHelp = newTopic(randomUUID(), "issuer");
    await forum.createTopicWithInitialPost({
      ...nextHelp, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID,
    });
    const ownSignal = await forum.createHelpSignal({
      topicId: nextHelp.id, actorId: "target", kind: "needs-details", proposedOriginalTopicId: null,
      explanation: "Separate new signal remains available.",
    });
    expect(ownSignal.status).toBe("pending");
  });

  it("fails closed for missing measure state, and fresh independent measures resolve after expiry/lift", async () => {
    const missing = withForumAdministrativeRestrictions(raw, databaseUrl!, () =>
      new Pool({ connectionString: databaseUrl, options: "-c search_path=ap10_absent_schema", max: 1 }));
    await expect(missing.forUser("target").has("forum.topic.pin")).rejects.toThrow();
    await createMeasure("admin.forum", "target", "2000-01-01T00:00:00Z");
    await createMeasure("admin.forum", "other");
    const first = await createMeasure("admin.forum");
    const second = await createMeasure("admin.forum");
    await lift(first);
    await expect(wrapped().forUser("target").has("forum.topic.pin")).resolves.toBe(false);
    await lift(second);
    await expect(wrapped().forUser("target").has("forum.topic.pin")).resolves.toBe(true);
  });
});

describe("AP-10 new translation generation admission", () => {
  function admission(searchPath = schema) {
    return createHyperdriveContentGenerationAdmission(databaseUrl!, () =>
      new Client({ connectionString: databaseUrl, options: "-c search_path=" + searchPath }));
  }

  it("uses the current PostgreSQL clock, independent measures and exact actor", async () => {
    const guard = admission();
    await guard.assertAllowed("target");
    await createMeasure("translations.generate", "target", "2000-01-01T00:00:00Z");
    await createMeasure("translations.generate", "other");
    const disabled = await createMeasure("translations.generate");
    await client.query("update user_measure_restrictions set enabled=false where measure_id=$1", [disabled]);
    await guard.assertAllowed("target");

    const first = await createMeasure("translations.generate");
    const second = await createMeasure("translations.generate");
    await expect(guard.assertAllowed("target")).rejects.toMatchObject({
      restriction: "translations.generate",
    });
    await lift(first);
    await expect(guard.assertAllowed("target")).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await guard.assertAllowed("issuer");
    await lift(second);
    await guard.assertAllowed("target");
  });

  it("fails closed if the authoritative restriction tables are missing", async () => {
    await expect(admission("ap10_no_generation_schema").assertAllowed("target"))
      .rejects.toThrow();
  });

  it("blocks title, automatic body and explicit body HTTP generation before any new planner work", async () => {
    const guard = admission();
    const context = new RouterContextProvider();
    context.set(authSessionContext, { user: { id: "target" } } as never);
    context.set(authorizationContext, {
      forUser: () => ({ has: async (key: string) => key === "forum.translation.generate" }),
    } as never);
    context.set(forumReaderContext, {
      readTopicPage: (id: string) => forum.readTopicPage(id),
    } as never);
    context.set(localeContext, { translationLocale: "he" } as never);
    context.set(contentGenerationAdmissionContext, guard);
    const requested: string[] = [];
    context.set(contentGenerationActionContext, {
      enabled: true,
      capability: {
        generateTopicTitle: async () => { requested.push("title"); return { outcome: "queued" as const }; },
        generateAutomaticPostBody: async () => { requested.push("automatic"); return { outcome: "queued" as const }; },
        generateExplicitPostBody: async () => { requested.push("explicit"); return { outcome: "queued" as const }; },
      },
    });
    const send = (intent: string, postId?: string) => topicAction({
      context, params: { locale: "en", topicId },
      request: new Request("https://forum.test/en/topics/" + topicId, {
        method: "POST",
        headers: { Origin: "https://forum.test" },
        body: new URLSearchParams({ intent, ...(postId ? { postId } : {}) }),
      }),
    });
    const measures = await createMeasure("translations.generate");
    const existingPostId = (await forum.readTopicPage(topicId))?.posts[0]?.id;
    if (!existingPostId) throw new Error("Help fixture initial post is missing");
    for (const [intent, postId] of [
      ["generateTopicTitleTranslation", undefined],
      ["generatePostBodyTranslation", existingPostId],
      ["generateExplicitPostBodyTranslation", existingPostId],
    ] as const) {
      const denied = await send(intent, postId);
      expect(denied).toMatchObject({
        data: { operation: "contentGeneration", outcome: "forbidden" },
        init: { status: 403, headers: { "Cache-Control": "private, no-store" } },
      });
      expect(JSON.stringify(denied)).not.toContain("translations.generate");
    }
    expect(requested).toEqual([]);
    await lift(measures);
    const allowed = await send("generateTopicTitleTranslation");
    expect(allowed).toMatchObject({
      data: { operation: "contentGeneration", outcome: "queued" },
      init: { status: 202 },
    });
    expect(requested).toEqual(["title"]);
    await createMeasure("translations.generate");
    await expect(guard.assertAllowed("target")).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(requested).toEqual(["title"]);
  });

  it("maps a genuine database timeout to unavailable but never treats it as permission", async () => {
    const timedOut = createHyperdriveContentGenerationAdmission(databaseUrl!, () => ({
      connect: async () => { throw new Error("timeout expired"); },
      end: async () => {},
    } as never));
    await expect(timedOut.assertAllowed("target"))
      .rejects.toBeInstanceOf(ContentGenerationPlanningUnavailableError);
  });
});

describe("AP-10 Help signal submission admission", () => {
  async function question(authorId = "issuer") {
    const id = randomUUID(), postId = randomUUID();
    await forum.createTopicWithInitialPost({
      id, sectionId: HELP_SOLUTIONS_SERVICE_SECTION_ID, authorId,
      titleRevision: { id: randomUUID(), originalContent: "Help question", sourceLocale: "en" },
      initialPost: {
        id: postId, topicId: id, authorId,
        bodyRevision: { id: randomUUID(), originalContent: "Help details", sourceLocale: "en" },
      },
    });
    return { id, postId };
  }
  function signal(topicId: string, kind: "needs-details"|"needs-review"|"solution-outdated"|"duplicate" = "needs-details",
      originalId: string | null = null, actorId = "target") {
    return {
      topicId, actorId, kind, proposedOriginalTopicId: originalId,
      explanation: kind === "duplicate" ? null : "Please investigate the question.",
    };
  }
  async function countSignal(topicId: string) {
    const r = await client.query<{ total: number }>(
      "select count(*)::int as total from forum_help_signals where topic_id=$1", [topicId],
    );
    return r.rows[0]!.total;
  }

  it("denies new Needs-details and Duplicate signals before cooldown and inserts, leaving other users free", async () => {
    const current = await question();
    const original = await question();
    const measure = await createMeasure("helpSignals.submit");
    await expect(forum.createHelpSignal(signal(current.id)))
      .rejects.toMatchObject({ restriction: "helpSignals.submit" });
    await expect(forum.createHelpSignal(signal(current.id, "duplicate", original.id)))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await countSignal(current.id)).toBe(0);
    const unblocked = await forum.createHelpSignal(signal(current.id, "needs-details", null, "other"));
    expect(unblocked.status).toBe("pending");
    await lift(measure);
    const submitted = await forum.createHelpSignal(signal(current.id, "duplicate", original.id));
    expect(submitted).toMatchObject({ kind: "duplicate", submittedByUserId: "target", status: "pending" });
    expect(await countSignal(current.id)).toBe(2);
  });

  it("blocks solved-question solution signals while leaving own solution selection and signal withdrawal available", async () => {
    const current = await question("issuer");
    const answerId = randomUUID();
    await forum.createPost({
      id: answerId, topicId: current.id, authorId: "other",
      bodyRevision: { id: randomUUID(), originalContent: "Working answer", sourceLocale: "en" },
    });
    await forum.selectBestAnswer(current.id, answerId, "issuer", "own");
    await forum.markTopicSolved(current.id, "issuer", "own");
    const prior = await forum.createHelpSignal(signal(current.id, "needs-review"));
    const measure = await createMeasure("helpSignals.submit");
    await expect(forum.createHelpSignal(signal(current.id, "solution-outdated")))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await countSignal(current.id)).toBe(1);
    await forum.withdrawHelpSignal(prior.id, current.id, "target");
    const persisted = await forum.readHelpSignal(prior.id);
    expect(persisted?.status).toBe("withdrawn");
    await lift(measure);
    await expect(forum.createHelpSignal(signal(current.id, "solution-outdated")))
      .resolves.toMatchObject({ kind: "solution-outdated", status: "pending" });
  });

  it("honors independent overlapping, expired and disabled measures with next-request behavior", async () => {
    const current = await question();
    await createMeasure("helpSignals.submit", "target", "2000-01-01T00:00:00Z");
    await createMeasure("helpSignals.submit", "other");
    const disabled = await createMeasure("helpSignals.submit");
    await client.query("update user_measure_restrictions set enabled=false where measure_id=$1", [disabled]);
    const first = await createMeasure("helpSignals.submit");
    const second = await createMeasure("helpSignals.submit");
    await lift(first);
    await expect(forum.createHelpSignal(signal(current.id)))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await countSignal(current.id)).toBe(0);
    await client.query("update user_measure_restrictions set enabled=false where measure_id=$1", [second]);
    await expect(forum.createHelpSignal(signal(current.id)))
      .resolves.toMatchObject({ kind: "needs-details", status: "pending" });
    await expect(forum.createHelpSignal(signal(current.id)))
      .rejects.toBeInstanceOf(ForumStateConflictError);
    expect(await countSignal(current.id)).toBe(1);
  });

  it("enforces the canonical Hyperdrive writer without blocking separate Help operations", async () => {
    const current = await question("target");
    const writer = createHyperdriveForumWriter(databaseUrl, () =>
      new Client({ connectionString: databaseUrl, options: "-c search_path=" + schema }),
      { cooldownMs: 0, now: () => new Date() });
    const measure = await createMeasure("helpSignals.submit");
    await expect(writer.createHelpSignal({
      kind: "needs-details", topicId: current.id,
      actorId: "target", explanation: "More details needed",
    })).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await countSignal(current.id)).toBe(0);
    await writer.markTopicSolved({ topicId: current.id, actorId: "target", scope: "own" });
    await lift(measure);
    const created = await writer.createHelpSignal({
      kind: "needs-details", topicId: current.id,
      actorId: "target", explanation: "More details needed",
    });
    expect((await forum.readHelpSignal(created.id))?.status).toBe("pending");
    await createMeasure("helpSignals.submit");
    await writer.withdrawHelpSignal({ signalId: created.id, topicId: current.id, actorId: "target" });
    expect((await forum.readHelpSignal(created.id))?.status).toBe("withdrawn");
  });
});

describe("AP-10 new complaint submission admission", () => {
  const complaints = new DrizzleComplaintsRepository(drizzle(client));
  const allowed = { forUser: () => ({ has: async () => true }) } as never;
  const service = new ComplaintsService(complaints, allowed);

  async function reportTarget() {
    const topic = newTopic(randomUUID(), "issuer");
    await forum.createTopicWithInitialPost(topic);
    return {
      post: { kind: "post" as const, topicId: topic.id, postId: topic.initialPost.id,
        revisionId: topic.initialPost.bodyRevision.id },
      title: { kind: "topic-title" as const, topicId: topic.id,
        revisionId: topic.titleRevision.id },
    };
  }
  function report(target: Awaited<ReturnType<typeof reportTarget>>["post"|"title"], operationId = randomUUID()) {
    return { target, operationId, reason: "spam" as const, explanation: null };
  }
  async function count(actorId: string) {
    const result = await client.query<{ total: number }>(
      "select count(*)::int as total from forum_complaints where reporter_user_id=$1", [actorId],
    );
    return result.rows[0]!.total;
  }

  it("denies both new post and topic-title complaints without cases, events or quota consumption", async () => {
    const target = await reportTarget();
    const before = await count("target");
    const measure = await createMeasure("complaints.submit");
    for (const input of [report(target.post), report(target.title)]) {
      await expect(service.submit("target", input)).rejects.toMatchObject({
        restriction: "complaints.submit",
      });
    }
    expect(await count("target")).toBe(before);
    expect((await client.query(
      "select id from forum_complaint_targets where topic_id=$1", [target.post.topicId],
    )).rowCount).toBe(0);
    expect((await client.query(
      "select id from forum_complaint_cases where target_id in (select id from forum_complaint_targets where topic_id=$1)",
      [target.post.topicId],
    )).rowCount).toBe(0);
    const other = await service.submit("other", report(target.title));
    expect(other.caseId).toBeTruthy();
    await lift(measure);
    await expect(service.submit("target", report(target.post))).resolves.toMatchObject({
      complaintId: expect.any(String), caseId: expect.any(String),
    });
  });

  it("preserves same-operation and lifetime duplicate replay after restriction, but not fresh reports", async () => {
    const target = await reportTarget();
    const input = report(target.post);
    const created = await service.submit("target", input);
    const before = await count("target");
    await createMeasure("complaints.submit");
    await expect(service.submit("target", input)).resolves.toEqual(created);
    await expect(service.submit("target", { ...input, operationId: randomUUID() })).resolves.toEqual(created);
    await expect(service.submit("target", { ...input, reason: "threats" }))
      .rejects.toBeInstanceOf(ComplaintConflictError);
    await expect(service.submit("target", report(target.title)))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await count("target")).toBe(before);
    expect((await client.query(
      "select kind from forum_complaint_events where case_id=$1 order by created_at", [created.caseId],
    )).rows).toEqual([{ kind: "submitted" }]);
  });

  it("reacts to active-session overlap, lift, disabled membership and database expiry", async () => {
    const target = await reportTarget();
    await createMeasure("complaints.submit", "target", "2000-01-01T00:00:00Z");
    await createMeasure("complaints.submit", "other");
    const disabled = await createMeasure("complaints.submit");
    await client.query("update user_measure_restrictions set enabled=false where measure_id=$1", [disabled]);
    const first = await createMeasure("complaints.submit");
    const second = await createMeasure("complaints.submit");
    await lift(first);
    await expect(complaints.submit("target", report(target.post)))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await client.query("update user_measure_restrictions set enabled=false where measure_id=$1", [second]);
    await expect(complaints.submit("target", report(target.post))).resolves.toMatchObject({
      complaintId: expect.any(String),
    });
  });

  it("does not restrict a participant's existing Complaint Appeal", async () => {
    const target = await reportTarget();
    const saved = await complaints.submit("target", report(target.post));
    const decisionId = await complaints.decide("issuer", {
      caseId: saved.caseId, operationId: randomUUID(), expectedVersion: 1,
      outcome: "not-confirmed", reasoning: "Decision evidence",
    });
    await createMeasure("complaints.submit");
    const operationId = randomUUID();
    const appeal = await service.appeal("target", {
      caseId: saved.caseId, decisionId, operationId, argument: "Please reconsider",
    });
    expect(appeal).toBeTruthy();
    await expect(service.appeal("target", {
      caseId: saved.caseId, decisionId, operationId, argument: "Please reconsider",
    })).resolves.toBe(appeal);
  });

  it("applies measure admission through the real Hyperdrive-backed HTTP submission", async () => {
    const target = await reportTarget();
    const pool = new Pool({ connectionString: databaseUrl, options: "-c search_path=" + schema });
    const capability = createAuthorizationCapability(new PostgresAuthorizationRepository(pool));
    const context = new RouterContextProvider();
    context.set(authSessionContext, { user: { id: "target" } } as never);
    context.set(authorizationContext, capability as never);
    context.set(complaintSubmissionContext, createHyperdriveComplaintSubmission(
      databaseUrl!, capability, () => new Client({ connectionString: databaseUrl, options: "-c search_path=" + schema }),
    ));
    const operationId = randomUUID();
    const send = () => complaintSubmitAction({
      context, params: { topicId: target.post.topicId },
      request: new Request("https://forum.test/en/topics/" + target.post.topicId + "/complaints", {
        method: "POST", headers: { Origin: "https://forum.test" },
        body: new URLSearchParams({ kind: "post", postId: target.post.postId,
          revisionId: target.post.revisionId, operationId, reason: "spam" }),
      }),
    });
    const measure = await createMeasure("complaints.submit");
    try {
      const denied = await send();
      expect(denied).toMatchObject({ data: { error: "forbidden" }, init: { status: 403 } });
      expect(JSON.stringify(denied)).not.toContain("complaints.submit");
      expect((denied as { init: { headers: Record<string,string> } }).init.headers)
        .toMatchObject({ "Cache-Control": "private, no-store" });
      await lift(measure);
      const granted = await send();
      expect(granted).toMatchObject({ data: { ok: true, operationId } });
      await createMeasure("complaints.submit");
      const replay = await send();
      expect(replay).toMatchObject({ data: { ok: true, operationId } });
      expect((await client.query("select id from forum_complaints where reporter_user_id='target' and target_id in (select id from forum_complaint_targets where topic_id=$1)", [target.post.topicId])).rowCount).toBe(1);
    } finally {
      await pool.end();
    }
  });
});

describe("AP-10 public profile field admission", () => {
  const fields = { bio: "Public biography", githubUrl: "https://github.com/octocat", websiteUrl: "https://example.com" };
  it("denies new public profile writes atomically without affecting reading or other users", async () => {
    const before = await forum.readProfile("target");
    const measure = await createMeasure("profile.edit");
    await expect(forum.updateProfile("target", fields)).rejects.toMatchObject({
      restriction: "profile.edit",
    });
    expect(await forum.readProfile("target")).toEqual(before);
    expect((await client.query("select user_id from forum_profiles where user_id='target'")).rowCount).toBe(0);
    await forum.updateProfile("other", fields);
    expect(await forum.readProfile("other")).toMatchObject({
      bio: fields.bio, githubUrl: fields.githubUrl, websiteUrl: "https://example.com/",
    });
    await lift(measure);
    await forum.updateProfile("target", fields);
    expect(await forum.readProfile("target")).toMatchObject({
      bio: fields.bio, githubUrl: fields.githubUrl, websiteUrl: "https://example.com/",
    });
  });

  it("uses active-session DB state, overlap and enabled membership for public edits", async () => {
    await createMeasure("profile.edit", "target", "2000-01-01T00:00:00Z");
    await createMeasure("profile.edit", "other");
    const disabled = await createMeasure("profile.edit");
    await client.query("update user_measure_restrictions set enabled=false where measure_id=$1", [disabled]);
    await expect(forum.updateProfile("target", { ...fields, bio: "Allowed before blocking" }))
      .resolves.toBeUndefined();
    const first = await createMeasure("profile.edit");
    const second = await createMeasure("profile.edit");
    await lift(first);
    await expect(forum.updateProfile("target", { ...fields, bio: "Denied" }))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect((await forum.readProfile("target"))?.bio).toBe("Allowed before blocking");
    await client.query("update user_measure_restrictions set enabled=false where measure_id=$1", [second]);
    await expect(forum.updateProfile("target", { ...fields, bio: "Allowed after lift" }))
      .resolves.toBeUndefined();
    expect((await forum.readProfile("target"))?.bio).toBe("Allowed after lift");
  });

  it("keeps missing-user and field validation failures independent of sanctions", async () => {
    await createMeasure("profile.edit");
    await expect(forum.updateProfile("missing", fields)).rejects.toBeInstanceOf(ForumEntityNotFoundError);
    await expect(forum.updateProfile("target", { ...fields, bio: "x".repeat(501) }))
      .rejects.toBeInstanceOf(InvalidProfileError);
  });

  it("checks the real request-scoped Hyperdrive writer and leaves other server writes available", async () => {
    const measure = await createMeasure("profile.edit");
    const writer = createHyperdriveForumWriter(databaseUrl, () =>
      new Client({ connectionString: databaseUrl, options: "-c search_path=" + schema }));
    await expect(writer.updateProfile({ actorId: "target", fields: { ...fields, bio: "Denied via Worker adapter" } }))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect((await forum.readProfile("target"))?.bio).not.toBe("Denied via Worker adapter");
    await writer.recordOnlinePresence("target");
    expect((await client.query("select user_id from forum_online_presence where user_id='target'")).rowCount).toBe(1);
    await lift(measure);
    await writer.updateProfile({ actorId: "target", fields: { ...fields, bio: "Allowed via Worker adapter" } });
    expect((await forum.readProfile("target"))?.bio).toBe("Allowed via Worker adapter");
  });
});

describe("AP-10 private attachment upload admission under active measures", () => {
  it("keeps post-R2 denied bytes in the durable cleanup journal and reclaims them safely", async () => {
    const objects = new Map<string, Uint8Array>();
    const deleted: string[] = [];
    const bucket: PrivateAttachmentBucket = {
      async reserve(key) { if (objects.has(key)) return null; return { etag: "guard" }; },
      async put(key, body) {
        const bytes = new Uint8Array(await new Response(body).arrayBuffer());
        objects.set(key, bytes);
        return { size: bytes.length };
      },
      async get() { return null; },
      async delete(key) { deleted.push(key); objects.delete(key); },
      async listReservations() { return { keys: [] }; },
    };
    const ctx = new RouterContextProvider();
    ctx.set(authSessionContext, { user: { id: "target" } } as never);
    ctx.set(authorizationContext, { forUser: () => ({ has: async () => true }) } as never);
    ctx.set(forumReaderContext, { readSection: async () => ({ id: sectionId }) } as never);
    ctx.set(privateAttachmentBucketContext, bucket);
    ctx.set(forumAttachmentStoreContext, {
      admitUpload: (owner: string, key: string, draft: string, id: string) =>
        attachments.admitUpload(owner, key, draft, id),
      recordUploadObject: (key: string) => attachments.recordUploadObject(key),
      activateUploadObject: (key: string, etag: string) => attachments.activateUploadObject(key, etag),
      createDraftAttachment: async (input: Parameters<typeof attachments.createDraftAttachment>[0]) => {
        await createMeasure("attachments.upload");
        return attachments.createDraftAttachment(input);
      },
    } as never);
    const attachmentId = randomUUID();
    const response = await uploadAction({ context: ctx, request: new Request("https://forum.test/api/attachments", {
      method: "POST",
      headers: {
        Origin: "https://forum.test", "Content-Type": "text/plain",
        "X-Vico-Attachment-Id": attachmentId,
        "X-Vico-Attachment-Name": "blocked.txt",
        "X-Vico-Attachment-Size": "5",
        "X-Vico-Editor-Context": encodeURIComponent("section:ap10-section:new"),
        "X-Vico-Operation-Id": randomUUID(),
      },
      body: "hello",
    }) });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "forbidden" });
    expect((await client.query("select id from forum_attachments where id=$1", [attachmentId])).rowCount).toBe(0);
    expect(objects.size).toBe(1);
    expect(deleted).toEqual([]);
    const key = [...objects.keys()][0]!;
    expect((await client.query(
      "select object_key from forum_attachment_upload_objects where object_key=$1", [key],
    )).rowCount).toBe(1);
    await client.query(
      "update forum_attachment_upload_objects set created_at=clock_timestamp()-interval '2 hours' where object_key=$1",
      [key],
    );
    await new ForumAttachmentCleanup(drizzle(client), bucket).runOnce();
    expect(objects.has(key)).toBe(false);
    expect(deleted).toContain(key);
    expect((await client.query(
      "select object_key from forum_attachment_upload_objects where object_key=$1", [key],
    )).rowCount).toBe(0);
  });

  const contextKey = "topic:ap10-fixture:reply";

  function upload(draftId = randomUUID(), id = randomUUID(), ownerId = "target") {
    return {
      id, ownerId, contextKey, draftId,
      objectKey: "private/" + randomUUID(),
      fileName: "new.txt", declaredMime: "text/plain", detectedType: "text",
      responseMime: "text/plain; charset=utf-8", byteSize: 5,
      verificationStatus: "type-checked" as const,
    };
  }

  it("blocks a new upload before storage in any editor context and at direct metadata write", async () => {
    const measure = await createMeasure("attachments.upload");
    const draftId = randomUUID();
    for (const key of [contextKey, "post:ap10-fixture:edit", "section:ap10-section:new"]) {
      await expect(attachments.admitUpload("target", key, draftId, randomUUID()))
        .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    }
    const input = upload(draftId);
    await expect(attachments.createDraftAttachment(input))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect((await client.query("select id from forum_attachments where id=$1", [input.id])).rowCount).toBe(0);
    expect((await client.query(
      "select attachment_id from forum_attachment_draft_refs where attachment_id=$1", [input.id],
    )).rowCount).toBe(0);
    await lift(measure);
    await expect(attachments.admitUpload("target", contextKey, draftId, input.id)).resolves.toBeNull();
    await expect(attachments.createDraftAttachment(input)).resolves.toMatchObject({ id: input.id });
  });

  it("rechecks a restriction committed after preflight, without orphaning metadata or a private ref", async () => {
    const input = upload();
    await expect(attachments.admitUpload(input.ownerId, input.contextKey, input.draftId, input.id))
      .resolves.toBeNull();
    const measure = await createMeasure("attachments.upload");
    await expect(attachments.createDraftAttachment(input))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect((await client.query("select id from forum_attachments where id=$1", [input.id])).rowCount).toBe(0);
    await lift(measure);
    await expect(attachments.createDraftAttachment(input)).resolves.toMatchObject({ id: input.id });
  });

  it("replays an already committed exact asset during restriction without creating a second ref", async () => {
    const input = upload();
    const first = await attachments.createDraftAttachment(input);
    await createMeasure("attachments.upload");
    await expect(attachments.admitUpload(input.ownerId, contextKey, input.draftId, input.id))
      .resolves.toEqual(first);
    await expect(attachments.createDraftAttachment({
      ...input, objectKey: "private/" + randomUUID(), fileName: "ignored-retry.txt",
    })).resolves.toEqual(first);
    expect((await client.query("select id from forum_attachments where id=$1", [input.id])).rowCount).toBe(1);
    expect((await client.query(
      "select attachment_id from forum_attachment_draft_refs where attachment_id=$1", [input.id],
    )).rowCount).toBe(1);
    await expect(attachments.admitUpload("other", contextKey, input.draftId, input.id)).resolves.toBeNull();
    await expect(attachments.admitUpload("target", contextKey, input.draftId, randomUUID()))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await attachments.listDraftAttachments("target", contextKey, input.draftId))
      .toEqual([first]);
    await attachments.cancelOperation("target", contextKey, input.draftId);
    await expect(attachments.listDraftAttachments("target", contextKey, input.draftId))
      .rejects.toBeInstanceOf(ForumAttachmentDraftConflictError);
  });

  it("preserves overlapping restrictions and ignores expired, disabled and other-subject measures", async () => {
    const expired = await createMeasure("attachments.upload", "target", "2000-01-01T00:00:00Z");
    const other = await createMeasure("attachments.upload", "other");
    const disabled = await createMeasure("attachments.upload");
    await client.query("update user_measure_restrictions set enabled=false where measure_id=$1", [disabled]);
    await expect(attachments.admitUpload("target", contextKey, randomUUID(), randomUUID()))
      .resolves.toBeNull();
    const first = await createMeasure("attachments.upload");
    const second = await createMeasure("attachments.upload");
    await lift(first);
    await expect(attachments.admitUpload("target", contextKey, randomUUID(), randomUUID()))
      .rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await lift(second);
    await expect(attachments.admitUpload("target", contextKey, randomUUID(), randomUUID()))
      .resolves.toBeNull();
    void expired;
    void other;
  });
});

describe("AP-10 forum publication admission under active measures", () => {
  it("denies new own-body and attachment-removal edits atomically until lifted", async () => {
    const postId = randomUUID(), originalRevisionId = randomUUID(), attachmentId = randomUUID();
    await forum.createPost({
      ...newReply(postId),
      bodyRevision: { id: originalRevisionId, originalContent: "Original body", sourceLocale: "en" },
    });
    await client.query(`insert into forum_attachments
      (id, owner_id, object_key, file_name, declared_mime, detected_type,
       response_mime, byte_size, verification_status, created_at)
      values ($1, 'target', $2, 'published.txt', 'text/plain', 'text',
        'text/plain', 12, 'type-checked', clock_timestamp())`,
    [attachmentId, "private/" + attachmentId]);
    await client.query(
      "insert into forum_post_attachments (post_id, attachment_id, created_at) values ($1,$2,clock_timestamp())",
      [postId, attachmentId],
    );

    const edit = {
      topicId, postId, actorId: "target", expectedRevisionId: originalRevisionId,
      body: "Updated body", draftId: randomUUID(), attachmentIds: [] as string[],
      retainedAttachmentIds: [] as string[],
    };
    const restrictionId = await createMeasure("posts.edit");
    const revisionCount = async () => Number((await client.query<{ total: string }>(
      "select count(*)::text as total from forum_post_revisions where post_id=$1", [postId],
    )).rows[0]?.total);
    const before = await revisionCount();
    await expect(forum.editPublishedPost(edit)).rejects.toMatchObject({
      restriction: "posts.edit",
    });
    expect((await forum.readPost(postId))?.body).toMatchObject({
      id: originalRevisionId, originalContent: "Original body",
    });
    expect(await revisionCount()).toBe(before);
    expect((await client.query(
      "select attachment_id from forum_post_attachments where post_id=$1", [postId],
    )).rows).toEqual([{ attachment_id: attachmentId }]);
    expect((await client.query(
      "select draft_id from forum_publication_receipts where owner_id='target' and context_key=$1",
      [`post:${postId}:edit`],
    )).rowCount).toBe(0);
    await forum.createPost(newReply());
    await lift(restrictionId);

    await forum.editPublishedPost(edit);
    expect((await forum.readPost(postId))?.body.originalContent).toBe("Updated body");
    expect(await revisionCount()).toBe(before + 1);
    expect((await client.query(
      "select attachment_id from forum_post_attachments where post_id=$1", [postId],
    )).rows).toEqual([]);
  });

  it("replays exactly one previously committed edit under an active restriction", async () => {
    const postId = randomUUID(), originalRevisionId = randomUUID();
    await forum.createPost({
      ...newReply(postId),
      bodyRevision: { id: originalRevisionId, originalContent: "Before", sourceLocale: "en" },
    });
    const edit = {
      topicId, postId, actorId: "target", expectedRevisionId: originalRevisionId,
      body: "First revision", draftId: randomUUID(), attachmentIds: [] as string[],
      retainedAttachmentIds: [] as string[],
    };
    await forum.editPublishedPost(edit);
    const published = await forum.readPost(postId);
    const before = (await client.query(
      "select id from forum_post_revisions where post_id=$1", [postId],
    )).rowCount;
    await createMeasure("posts.edit");
    await expect(forum.editPublishedPost(edit)).resolves.toBeUndefined();
    expect((await forum.readPost(postId))?.body.id).toBe(published?.body.id);
    await expect(forum.editPublishedPost({ ...edit, body: "Changed retry" }))
      .rejects.toBeInstanceOf(ForumPublicationReplayConflictError);
    await expect(forum.editPublishedPost({
      ...edit, expectedRevisionId: published!.body.id, draftId: randomUUID(),
    })).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect((await client.query(
      "select id from forum_post_revisions where post_id=$1", [postId],
    )).rowCount).toBe(before);
    expect((await client.query(
      "select draft_id from forum_publication_receipts where owner_id='target' and context_key=$1",
      [`post:${postId}:edit`],
    )).rowCount).toBe(1);
  });

  it("treats overlapping, inactive and other-user edit restrictions independently", async () => {
    const postId = randomUUID(), originalRevisionId = randomUUID();
    await forum.createPost({
      ...newReply(postId),
      bodyRevision: { id: originalRevisionId, originalContent: "Before", sourceLocale: "en" },
    });
    await createMeasure("posts.edit", "other");
    await createMeasure("posts.edit", "target", "2000-01-01T00:00:00Z");
    const first = await createMeasure("posts.edit");
    const second = await createMeasure("posts.edit");
    const edit = {
      topicId, postId, actorId: "target", expectedRevisionId: originalRevisionId,
      body: "After", draftId: randomUUID(), attachmentIds: [] as string[],
    };
    await lift(first);
    await expect(forum.editPublishedPost(edit)).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await client.query("update user_measure_restrictions set enabled=false where measure_id=$1", [second]);
    await expect(forum.editPublishedPost(edit)).resolves.toBeUndefined();
    expect((await forum.readPost(postId))?.body.originalContent).toBe("After");
  });

  it("denies both direct topic and topic-with-post writes, but preserves unrelated replies", async () => {
    const id = await createMeasure("topics.create");
    const before = await postCount();
    await expect(forum.createTopic(newTopic())).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await expect(forum.createTopicWithInitialPost(newTopic())).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await postCount()).toBe(before);
    await forum.createPost(newReply());
    await lift(id);
    await expect(forum.createTopicWithInitialPost(newTopic())).resolves.toMatchObject({
      topic: { authorId: "target" },
    });
  });

  it("keeps overlapping reply restrictions until the last active measure ends", async () => {
    const first = await createMeasure("replies.create");
    const second = await createMeasure("replies.create");
    const before = await postCount();
    await expect(forum.createPost(newReply())).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await client.query(
      "update user_measure_restrictions set enabled=false where measure_id=$1", [first],
    );
    await expect(forum.createPost(newReply())).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await postCount()).toBe(before);
    await lift(second);
    await expect(forum.createPost(newReply())).resolves.toMatchObject({ topicId });
  });

  it("returns a committed publication receipt after restriction without new side effects", async () => {
    const draftId = randomUUID();
    const initial = newReply(randomUUID(), draftId);
    const committed = await forum.createPost(initial);
    const before = await postCount();
    await createMeasure("replies.create");
    const retry = await forum.createPost({
      ...initial, id: randomUUID(),
      bodyRevision: { ...initial.bodyRevision, id: randomUUID() },
    });
    expect(retry.id).toBe(committed.id);
    await expect(forum.createPost({
      ...initial, id: randomUUID(),
      bodyRevision: { id: randomUUID(), originalContent: "Different payload", sourceLocale: "en" },
    })).rejects.toBeInstanceOf(ForumPublicationReplayConflictError);
    await expect(forum.createPost(newReply())).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    expect(await postCount()).toBe(before);
  });

  it("uses DB expiry, enabled membership and exact target instead of stale session state", async () => {
    await createMeasure("topics.create", "target", "2000-01-01T00:00:00Z");
    await createMeasure("topics.create", "other");
    const disabled = await createMeasure("topics.create");
    await client.query("update user_measure_restrictions set enabled=false where measure_id=$1", [disabled]);
    await expect(forum.createTopicWithInitialPost(newTopic())).resolves.toMatchObject({
      topic: { authorId: "target" },
    });
    const active = await createMeasure("topics.create");
    await expect(forum.createTopicWithInitialPost(newTopic())).rejects.toBeInstanceOf(UserMeasureRestrictedError);
    await lift(active);
    await expect(forum.createTopicWithInitialPost(newTopic())).resolves.toBeDefined();
  });
});
