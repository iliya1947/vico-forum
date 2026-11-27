import { forumControlScopes } from "./write-tool-contract";

/**
 * Model-facing read/preparation inputs. Native domain filters, cursor binding,
 * protected projections and effects are connected in later bounded stages.
 * A cursor is an opaque server-issued value, never an arbitrary query.
 */
type Field =
  | { readonly type: "string"; readonly minLength?: number; readonly maxLength: number; readonly pattern?: string; readonly enum?: readonly string[] }
  | { readonly type: "integer"; readonly minimum: number; readonly maximum: number }
  | { readonly type: "array"; readonly minItems: number; readonly maxItems: number; readonly items: InputSchema | Field }
  | InputSchema;

type InputSchema = {
  readonly type: "object";
  readonly additionalProperties: false;
  readonly properties: Readonly<Record<string, Field>>;
  readonly required: readonly string[];
};

function object<P extends Record<string, Field>>(properties: P, required: readonly (keyof P & string)[] = []) {
  return { type: "object", additionalProperties: false, properties, required } as const;
}
const id = { type: "string", minLength: 1, maxLength: 2048 } as const;
const uuid = { type: "string", minLength: 36, maxLength: 36, pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" } as const;
const search = { type: "string", maxLength: 200 } as const;
const cursor = { type: "string", minLength: 1, maxLength: 8192 } as const;
const page = { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER } as const;
const empty = object({});
const browse = object({ search, cursor });
const paginated = object({ page });
const caseId = object({ caseId: id }, ["caseId"]);
const reviewPages = { reports: page, notes: page, evidence: page, context: page };
const history = object({
  area: id, monitor: id, origin: id, kind: id,
  from: { type: "string", minLength: 1, maxLength: 64 },
  until: { type: "string", minLength: 1, maxLength: 64 },
  cursor,
});

const reads = {
  read_admin_overview: empty,
  list_categories: browse,
  read_category: object({ categoryId: id, search, cursor }, ["categoryId"]),
  read_section: object({ sectionId: id }, ["sectionId"]),
  list_section_topics: object({ sectionId: id, search, cursor }, ["sectionId"]),
  read_topic: object({ topicId: id, cursor }, ["topicId"]),
  read_post_revisions: object({ topicId: id, postId: id, cursor }, ["topicId", "postId"]),
  list_hidden_topics: object({ cursor }),
  list_hidden_posts: object({ cursor }),
  inspect_hidden_topic: object({ topicId: id }, ["topicId"]),
  inspect_hidden_post: object({ topicId: id, postId: id }, ["topicId", "postId"]),
  read_hidden_post_revisions: object({ topicId: id, postId: id, cursor }, ["topicId", "postId"]),
  read_hidden_attachment: object({ topicId: id, postId: id, attachmentId: id }, ["topicId", "postId", "attachmentId"]),
  read_attention_signals: object({ cursor }),
  read_attention_security: object({ cursor }),
  list_users: browse,
  read_user_profile: object({ userId: id }, ["userId"]),
  read_user_authorization: object({ userId: id }, ["userId"]),
  read_user_measures: object({ userId: id, cursor }, ["userId"]),
  read_owner_user_private_profile: object({ userId: id, cursor }, ["userId"]),
  list_complaint_cases: paginated,
  read_complaint_triage: caseId,
  read_complaint_review: object({ caseId: id, ...reviewPages }, ["caseId"]),
  read_complaint_context: object({ caseId: id, postId: id }, ["caseId", "postId"]),
  read_complaint_evidence: object({ caseId: id, attachmentId: id }, ["caseId", "attachmentId"]),
  list_resolved_complaints: paginated,
  read_complaint_history: object({ caseId: id, page }, ["caseId"]),
  list_pending_complaint_appeals: paginated,
  read_complaint_appeal: object({ caseId: id, appealId: id, ...reviewPages }, ["caseId", "appealId"]),
  read_complaint_appeal_context: object({ caseId: id, appealId: id, postId: id }, ["caseId", "appealId", "postId"]),
  read_complaint_appeal_evidence: object({ caseId: id, appealId: id, attachmentId: id }, ["caseId", "appealId", "attachmentId"]),
  read_complaint_priority_settings: empty,
  read_admin_history: object({ cursor }),
  read_super_admin_overview: empty,
  read_monitor_system: empty,
  read_monitor_accounts: empty,
  read_monitor_security: empty,
  read_monitor_forum: empty,
  read_monitor_localization: empty,
  read_monitor_notifications: empty,
  read_monitor_files: empty,
  read_monitor_administration: empty,
  read_monitor_moderation: empty,
  read_monitor_background: empty,
  read_monitor_data: empty,
  read_monitor_integrations: empty,
  read_monitor_infrastructure: empty,
  read_owner_history: history,
  read_owner_event_log: history,
  read_registration_settings: empty,
  read_authorization_settings: empty,
} as const satisfies Record<string, InputSchema>;

export type ReadToolName = keyof typeof reads;
export const readToolNames = Object.freeze(Object.keys(reads) as ReadToolName[]);
export function isReadToolName(name: unknown): name is ReadToolName {
  return typeof name === "string" && Object.hasOwn(reads, name);
}

export function readToolInputSchema(name: ReadToolName): InputSchema {
  return reads[name];
}

export function matchesInputSchema(schema: Field, value: unknown): boolean {
  switch (schema.type) {
    case "string":
      return typeof value === "string" && !value.includes("\0") &&
        Array.from(value).length >= (schema.minLength ?? 0) &&
        Array.from(value).length <= schema.maxLength &&
        (!schema.pattern || new RegExp(schema.pattern).test(value)) &&
        (!schema.enum || schema.enum.includes(value));
    case "integer":
      return typeof value === "number" && Number.isSafeInteger(value) &&
        value >= schema.minimum && value <= schema.maximum;
    case "array":
      return Array.isArray(value) && value.length >= schema.minItems &&
        value.length <= schema.maxItems && Array.from(value).every(item => matchesInputSchema(schema.items, item));
    case "object": {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
      const data = value as Record<string, unknown>;
      return schema.required.every(key => Object.hasOwn(data, key)) &&
        Object.keys(data).every(key => Object.hasOwn(schema.properties, key) &&
          matchesInputSchema(schema.properties[key], data[key]));
    }
  }
}

export function isValidReadToolInput(name: ReadToolName, input: unknown): boolean {
  return matchesInputSchema(reads[name], input);
}

// Preparation refers only to previously inspected, individual operations.
// There is no field for free-form arguments or a model-selected actor here.
export const prepareTaskInputSchema = object({
  mode: { type: "string", maxLength: 16, enum: ["single", "compound", "bulk"] },
  targets: {
    type: "array", minItems: 1, maxItems: 100,
    items: object({
      steps: { type: "array", minItems: 1, maxItems: 100, items: uuid },
    }, ["steps"]),
  },
}, ["mode", "targets"]);

export const requestStatusInputSchema = object({ requestId: uuid }, ["requestId"]);
export const taskStatusInputSchema = object({ taskId: uuid, cursor }, ["taskId"]);

export function isValidPrepareTaskInput(value: unknown): boolean {
  if (!matchesInputSchema(prepareTaskInputSchema, value)) return false;
  const task = value as { mode: string; targets: Array<{ steps: string[] }> };
  if (task.mode !== "bulk" && task.targets.length !== 1) return false;
  if (task.mode === "single" && task.targets[0].steps.length !== 1) return false;
  if (task.mode === "compound" && task.targets[0].steps.length < 2) return false;
  const inspections = task.targets.flatMap(target => target.steps);
  return new Set(inspections).size === inspections.length;
}

// These operations create/use private transport records; the MCP annotation
// must not misrepresent that effect as a purely read-only tool.
export const readToolSecurity = {
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  _meta: { securitySchemes: [{ type: "oauth2", scopes: [forumControlScopes.read] }] },
} as const;
