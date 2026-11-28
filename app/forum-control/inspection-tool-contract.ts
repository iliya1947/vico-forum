import { PERMISSION_CATALOG } from "../authorization/catalog";
import { USER_MEASURE_RESTRICTION_IDS } from "../admin/user-measure-restrictions";
import { COMPLAINT_REASONS } from "../../db/complaints-domain";
import { object, matchesInputSchema, type Field, type InputSchema, readToolSecurity } from "./read-tool-contract";
import { writeToolDescriptor, writeToolNames, type WriteToolName } from "./write-tool-contract";

const text = (maxLength: number, minLength = 1) => ({ type: "string", minLength, maxLength } as const);
const id = text(2048);
const complaintId = text(200);
const uuid = { ...text(36, 36), pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" } as const;
const reason = text(2000);
const name = text(200);
const enumString = <T extends string>(values: readonly T[]) =>
  ({ type: "string", minLength: 1, maxLength: Math.max(...values.map(value => value.length)), enum: values } as const);
const nullable = (field: Field) => ({ anyOf: [field, { type: "null" }] } as const);
const array = (items: Field, minItems: number, maxItems: number) =>
  ({ type: "array", minItems, maxItems, uniqueItems: true, items } as const);
const boolean = { type: "boolean" } as const;
const direction = enumString(["up", "down"]);
const resolution = enumString(["accepted", "rejected"]);
const restrictions = array(enumString(USER_MEASURE_RESTRICTION_IDS), 1, USER_MEASURE_RESTRICTION_IDS.length);
const permissions = array(enumString(PERMISSION_CATALOG), 0, PERMISSION_CATALOG.length);
const expiresAt = nullable({ ...text(64), pattern: "^\\d{4}-\\d{2}-\\d{2}T" });
const priority = { type: "integer", minimum: 1, maximum: 3 } as const;

function fields<P extends Record<string, Field>>(properties: P) {
  return object(properties, Object.keys(properties));
}

const topic = fields({ topicId: id });
const post = { topicId: id, postId: id };
const inspect = {
  pin_topic: topic,
  unpin_topic: topic,
  close_topic: topic,
  reopen_topic: topic,
  set_topic_solved: topic,
  set_best_answer: fields(post),
  correct_topic_title_locale: fields({ topicId: id, sourceLocale: text(128) }),
  correct_post_locale: fields({ ...post, sourceLocale: text(128) }),
  hide_topic: fields({ topicId: id, reason }),
  restore_topic: fields({ topicId: id, reason }),
  hide_post: fields({ ...post, reason }),
  restore_post: fields({ ...post, reason }),
  set_help_solution_moderation: fields({ topicId: id, status: nullable(enumString(["needs-review", "outdated"])), outdatedReason: nullable(reason) }),
  confirm_help_duplicate: fields({ topicId: id, originalTopicId: id }),
  remove_help_duplicate: topic,
  resolve_help_signal: fields({ topicId: id, signalId: id, resolution }),
  resolve_help_duplicate_appeal: fields({ topicId: id, appealId: id, resolution }),
  create_category: fields({ name }),
  rename_category: fields({ categoryId: id, name }),
  reorder_category: fields({ categoryId: id, direction }),
  create_section: fields({ categoryId: id, name }),
  rename_section: fields({ sectionId: id, name }),
  reorder_section: fields({ sectionId: id, direction }),
  reparent_section: fields({ sectionId: id, targetCategoryId: id }),
  move_topic: fields({ topicId: id, targetSectionId: id }),
  create_custom_role: fields({ slug: { ...text(63), pattern: "^[a-z][a-z0-9-]{0,62}$" }, displayName: name }),
  rename_custom_role: fields({ roleId: id, displayName: name }),
  delete_custom_role: fields({ roleId: id }),
  replace_role_grants: fields({ roleId: id, permissions }),
  assign_user_role: fields({ userId: id, roleId: id }),
  set_user_permission_override: fields({ userId: id, permission: enumString(PERMISSION_CATALOG), effect: nullable(enumString(["allow", "deny"])) }),
  create_measure: fields({ userId: id, restrictions, expiresAt, reason }),
  change_measure: fields({ measureId: uuid, restrictions, expiresAt, reason }),
  lift_measure: fields({ measureId: uuid, reason }),
  resolve_measure_appeal: fields({
    measureId: uuid, appealId: uuid, outcome: resolution, explanation: reason,
    remedy: nullable(enumString(["change", "lift"])), restrictions: nullable(restrictions), expiresAt,
  }),
  deactivate_account: fields({ userId: complaintId }),
  set_google_registration: fields({ enabled: boolean }),
  set_email_registration: fields({ enabled: boolean }),
  set_complaint_priority_override: fields({ caseId: complaintId, priority: nullable(priority) }),
  append_complaint_note: fields({ caseId: complaintId, body: text(10000) }),
  decide_complaint: fields({ caseId: complaintId, outcome: enumString(["confirmed", "not-confirmed"]), reasoning: text(10000) }),
  resolve_complaint_appeal: fields({ caseId: complaintId, appealId: complaintId, outcome: enumString(["upheld", "overturned"]), reasoning: text(10000) }),
  set_complaint_priority_weights: fields({ weights: fields(Object.fromEntries(COMPLAINT_REASONS.map(key => [key, priority]))) }),
} as const satisfies Record<WriteToolName, InputSchema>;

export type InspectionToolName = `inspect_${WriteToolName}`;
export const inspectionToolNames = Object.freeze(writeToolNames.map(name => `inspect_${name}` as const));

export function inspectionInputSchema(operation: WriteToolName): InputSchema {
  return inspect[operation];
}

/** Shape admission only. Stage C owns canonical domain filters, permission
 * decisions, state capture, expected revisions and immutable persistence.
 * No inspection or task preparation can run a domain command. */
export function isValidInspectionInput(operation: WriteToolName, input: unknown): boolean {
  if (!matchesInputSchema(inspect[operation], input)) return false;
  const data = input as Record<string, unknown>;
  if (operation === "set_help_solution_moderation") {
    return data.status === "outdated" ? typeof data.outdatedReason === "string" && !!data.outdatedReason.trim() : data.outdatedReason === null;
  }
  if (operation === "resolve_measure_appeal") {
    if (data.outcome === "rejected" && data.remedy !== null) return false;
    if (data.outcome === "accepted" && data.remedy !== "change" && data.remedy !== "lift") return false;
    return data.remedy === "change" ? Array.isArray(data.restrictions)
      : data.restrictions === null && data.expiresAt === null;
  }
  return true;
}

/** A distinct inspection descriptor for every canonical write. The schema
 * is intentionally not a generic op + args object. Not registered in the
 * fixture until the canonical inspection implementation is connected. */
export function inspectionToolDescriptor(operation: WriteToolName) {
  return {
    name: `inspect_${operation}` as const,
    description: "Inspect applicability and current state before requesting approval. " +
      writeToolDescriptor(operation).description.split(" Call only")[0] +
      " This inspection never executes the domain write. The private transport records the inspection request.",
    inputSchema: inspect[operation],
    ...readToolSecurity,
  } as const;
}
