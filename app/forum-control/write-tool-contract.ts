/**
 * Stage A: closed model-facing write-tool contract. This module declares
 * capabilities; it does not implement or authorize domain commands.
 * A prepared step owns the actual target, arguments and expected state.
 */
export const forumControlScopes = {
  read: "forum.control.read",
  write: "forum.control.write",
} as const;

const uuidPattern = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";
const uuid = { type: "string", pattern: uuidPattern } as const;
const index = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER } as const;

export const writeStepInputSchema = {
  type: "object",
  additionalProperties: false,
  properties: { taskId: uuid, targetIndex: index, stepIndex: index },
  required: ["taskId", "targetIndex", "stepIndex"],
} as const;

export type WriteStepInput = {
  taskId: string;
  targetIndex: number;
  stepIndex: number;
};

export function parseWriteStepInput(value: unknown): WriteStepInput | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const fields = Object.keys(value);
  if (fields.length !== 3 || !writeStepInputSchema.required.every(key => Object.hasOwn(value, key))) return null;
  const { taskId, targetIndex, stepIndex } = value as Record<string, unknown>;
  if (typeof taskId !== "string" || !new RegExp(uuidPattern).test(taskId) ||
      typeof targetIndex !== "number" || !Number.isSafeInteger(targetIndex) || targetIndex < 0 ||
      typeof stepIndex !== "number" || !Number.isSafeInteger(stepIndex) || stepIndex < 0) return null;
  return { taskId, targetIndex, stepIndex };
}

const writeOperations = {
  pin_topic: ["Pin the prepared topic.", "topic"],
  unpin_topic: ["Unpin the prepared topic.", "topic"],
  close_topic: ["Close the prepared topic to new replies.", "topic"],
  reopen_topic: ["Reopen the prepared topic.", "topic"],
  set_topic_solved: ["Set the prepared administrative solved state.", "topic"],
  set_best_answer: ["Set or clear the prepared best answer.", "topic"],
  correct_topic_title_locale: ["Correct the prepared topic title source locale.", "topic"],
  correct_post_locale: ["Correct the prepared post source locale.", "post"],
  hide_topic: ["Hide the prepared topic from public access; requires a reason.", "topic"],
  restore_topic: ["Restore public access to the prepared topic; requires a reason.", "topic"],
  hide_post: ["Hide the prepared post from public access; requires a reason.", "post"],
  restore_post: ["Restore public access to the prepared post; requires a reason.", "post"],
  set_help_solution_moderation: ["Apply the prepared Help solution moderation state.", "topic"],
  confirm_help_duplicate: ["Confirm the prepared Help duplicate relationship.", "topic"],
  remove_help_duplicate: ["Remove the prepared Help duplicate relationship, including any prepared terminal outcome.", "topic"],
  resolve_help_signal: ["Resolve the prepared Help signal.", "help-signal"],
  resolve_help_duplicate_appeal: ["Resolve the prepared Help duplicate appeal.", "help-duplicate-appeal"],
  create_category: ["Create the prepared ordinary category; deletion is not supported.", "category"],
  rename_category: ["Rename the prepared ordinary category.", "category"],
  reorder_category: ["Reorder the prepared ordinary category.", "category"],
  create_section: ["Create the prepared ordinary section; deletion is not supported.", "section"],
  rename_section: ["Rename the prepared ordinary section.", "section"],
  reorder_section: ["Reorder the prepared ordinary section.", "section"],
  reparent_section: ["Move the prepared ordinary section and all its topics to its prepared category.", "section"],
  move_topic: ["Move the prepared ordinary topic to its prepared ordinary section.", "topic"],
  create_custom_role: ["Create the prepared custom role.", "role"],
  rename_custom_role: ["Rename the prepared custom role.", "role"],
  delete_custom_role: ["Delete the prepared custom role.", "role"],
  replace_role_grants: ["Replace the prepared role's permission grants.", "role"],
  assign_user_role: ["Assign the prepared role to the prepared user.", "user"],
  set_user_permission_override: ["Apply the prepared allow, deny or inherit override.", "user"],
  create_measure: ["Create the prepared administrative measure.", "measure"],
  change_measure: ["Change the prepared administrative measure restrictions or expiry.", "measure"],
  lift_measure: ["Lift the prepared administrative measure.", "measure"],
  resolve_measure_appeal: ["Resolve the prepared exact-measure appeal.", "measure-appeal"],
  deactivate_account: ["Deactivate the prepared foreign active account.", "user"],
  set_google_registration: ["Set the prepared Google new-registration flag.", "registration-settings"],
  set_email_registration: ["Set the prepared email/password new-registration flag.", "registration-settings"],
  set_complaint_priority_override: ["Set or reset the prepared open Case priority override.", "complaint-case"],
  append_complaint_note: ["Append the prepared immutable private moderator note.", "complaint-case"],
  decide_complaint: ["Record the prepared initial Complaint decision.", "complaint-case"],
  resolve_complaint_appeal: ["Record the prepared Complaint appeal outcome.", "complaint-appeal"],
  set_complaint_priority_weights: ["Set the prepared global Complaint reason-priority weights.", "complaint-priority-settings"],
} as const;

export type WriteToolName = keyof typeof writeOperations;

export function isWriteToolName(name: unknown): name is WriteToolName {
  return typeof name === "string" && Object.hasOwn(writeOperations, name);
}

const statuses = [
  "pending", "committed", "not-committed", "denied", "conflict", "stale",
  "unavailable", "outcome-unknown", "skipped",
] as const;

function writeResultSchema(name: WriteToolName) {
  const targetKind = writeOperations[name][1];
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      requestId: uuid,
      taskId: uuid,
      commandId: uuid,
      op: { const: name },
      target: {
        type: "object",
        additionalProperties: false,
        properties: { kind: { const: targetKind }, id: { type: "string", minLength: 1 } },
        required: ["kind", "id"],
      },
      status: { enum: statuses },
      code: { type: "string", minLength: 1 },
      changed: { type: "boolean" },
    },
    required: ["requestId", "taskId", "op", "status", "code"],
    allOf: [{
      if: { properties: { status: { const: "committed" } } },
      then: { required: ["commandId", "target", "changed"] },
      else: { not: { required: ["changed"] } },
    }],
  } as const;
}

export function writeToolDescriptor(name: WriteToolName) {
  return {
    name,
    description: writeOperations[name][0] +
      " Call only after the owner separately confirms the explained task in the current conversation. " +
      "Uses the immutable prepared step and submits a private GitHub delivery; never retries an unknown outcome.",
    inputSchema: writeStepInputSchema,
    outputSchema: writeResultSchema(name),
    annotations: {
      readOnlyHint: false,
      destructiveHint: name !== "create_custom_role",
      openWorldHint: false,
    },
    _meta: { securitySchemes: [{ type: "oauth2", scopes: [forumControlScopes.write] }] },
  } as const;
}

export const writeToolNames = Object.freeze(Object.keys(writeOperations) as WriteToolName[]);
