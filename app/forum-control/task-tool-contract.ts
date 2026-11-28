import { prepareTaskInputSchema, requestStatusInputSchema, taskStatusInputSchema, readToolSecurity } from "./read-tool-contract";
import { inspectedStepSchema } from "./inspection-tool-contract";
import { writeToolDescriptor, writeToolNames } from "./write-tool-contract";

const uuid = { type: "string", minLength: 36, maxLength: 36, pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" } as const;
const digest = { type: "string", minLength: 64, maxLength: 64, pattern: "^[0-9a-f]{64}$" } as const;
const index = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER } as const;
const code = { type: "string", minLength: 1, maxLength: 128 } as const;
const cursor = { anyOf: [{ type: "string", minLength: 1, maxLength: 8192 }, { type: "null" }] } as const;
const mode = { enum: ["single", "compound", "bulk"] } as const;
const transport = { enum: ["pending", "published", "unavailable", "outcome-unknown"] } as const;

const preparedTarget = {
  type: "object", additionalProperties: false,
  properties: { targetIndex: index, steps: { type: "array", minItems: 1, maxItems: 100,
    items: { oneOf: writeToolNames.map(inspectedStepSchema) } } },
  required: ["targetIndex", "steps"],
} as const;

const preparation = {
  type: "object", additionalProperties: false,
  properties: {
    requestId: uuid,
    status: { enum: ["read-ok", "pending", "denied", "conflict", "stale", "unavailable", "outcome-unknown"] },
    code, task: {
      type: "object", additionalProperties: false,
      properties: {
        taskId: uuid, digest, mode, totalTargets: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
        targets: { type: "array", minItems: 1, maxItems: 100, items: preparedTarget },
        nextCursor: cursor,
      },
      required: ["taskId", "digest", "mode", "totalTargets", "targets", "nextCursor"],
    },
  },
  required: ["requestId", "status", "code"],
  allOf: [{
    if: { properties: { status: { const: "read-ok" } } },
    then: { required: ["task"] },
    else: { not: { required: ["task"] } },
  }],
} as const;

const stepStatus = {
  type: "object", additionalProperties: false,
  properties: {
    stepIndex: index, op: { enum: writeToolNames },
    status: { enum: ["pending", "committed", "not-committed", "denied", "conflict", "stale", "unavailable", "outcome-unknown", "skipped"] },
    code, commandId: uuid, changed: { type: "boolean" },
  },
  required: ["stepIndex", "op", "status", "code"],
  allOf: [{
    if: { properties: { status: { const: "committed" } } },
    then: { required: ["commandId", "changed"] },
    else: { not: { required: ["changed"] } },
  }],
} as const;

const taskStatus = {
  type: "object", additionalProperties: false,
  properties: {
    taskId: uuid, mode, transport,
    targets: { type: "array", maxItems: 100, items: {
      type: "object", additionalProperties: false,
      properties: { targetIndex: index, steps: { type: "array", maxItems: 100, items: stepStatus } },
      required: ["targetIndex", "steps"],
    } },
    nextCursor: cursor,
  },
  required: ["taskId", "mode", "transport", "targets", "nextCursor"],
} as const;

const requestStatus = {
  type: "object", additionalProperties: false,
  properties: {
    requestId: uuid, transport,
    status: { enum: ["read-ok", "pending", "committed", "not-committed", "denied", "conflict", "stale", "unavailable", "outcome-unknown", "skipped"] },
    code,
    receipt: { oneOf: writeToolNames.map(name => writeToolDescriptor(name).outputSchema) },
  },
  required: ["requestId", "transport", "status", "code"],
} as const;

/** Stage A schemas only. Stage C/E attach canonical preflight/task persistence.
 * Status never dispatches or resumes a mutation. No tool is registered here. */
export const prepareTaskDescriptor = {
  name: "prepare_task",
  description: "Prepare an immutable task from individually inspected operations. Does not execute a domain command. Records the preparation privately. Explain the full fixed task and obtain separate confirmation before dispatch.",
  inputSchema: prepareTaskInputSchema, outputSchema: preparation, ...readToolSecurity,
} as const;
export const requestStatusDescriptor = {
  name: "read_request_status",
  description: "Read the existing request status and permitted receipt. Never reissue or resume a mutation.",
  inputSchema: requestStatusInputSchema, outputSchema: requestStatus,
  ...readToolSecurity,
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
} as const;
export const taskStatusDescriptor = {
  name: "read_task_status",
  description: "Read ordered per-target and per-step state for the existing task; never execute, retry or add steps.",
  inputSchema: taskStatusInputSchema, outputSchema: taskStatus,
  ...readToolSecurity,
} as const;
