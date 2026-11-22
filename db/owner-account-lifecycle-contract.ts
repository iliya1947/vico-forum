/** Browser-neutral Owner account lifecycle contract; production and preview share constructors. */
export interface DeactivateOwnerAccountInput {
  readonly actorId: string;
  readonly targetId: string;
  readonly operationId: string;
}
export interface OwnerAccountDeactivationResult {
  readonly targetUserId: string;
  readonly state: "deactivated";
  readonly changed: boolean;
  readonly deactivatedAt: string;
  readonly retainAtLeastUntil: string;
  readonly eventId: string | null;
}
export interface OwnerAccountLifecycleCommand {
  deactivate(input: DeactivateOwnerAccountInput): Promise<OwnerAccountDeactivationResult>;
}
export class OwnerAccountLifecycleForbiddenError extends Error {
  constructor() { super("Account lifecycle command forbidden"); this.name = "OwnerAccountLifecycleForbiddenError"; }
}
export class OwnerAccountLifecycleValidationError extends Error {
  constructor() { super("Invalid account lifecycle command"); this.name = "OwnerAccountLifecycleValidationError"; }
}
export class OwnerAccountLifecycleTargetMissingError extends Error {
  constructor() { super("Account lifecycle target not found"); this.name = "OwnerAccountLifecycleTargetMissingError"; }
}
export class OwnerAccountLifecycleConflictError extends Error {
  constructor() { super("Account lifecycle operation conflicts"); this.name = "OwnerAccountLifecycleConflictError"; }
}
export class OwnerAccountLifecycleInvariantError extends Error {
  constructor() { super("Account lifecycle invariant failed"); this.name = "OwnerAccountLifecycleInvariantError"; }
}
export class OwnerAccountLifecycleCommitUncertainError extends Error {
  constructor(options?: ErrorOptions) {
    super("Account lifecycle commit outcome unknown", options);
    this.name = "OwnerAccountLifecycleCommitUncertainError";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function operationId(value: unknown): value is string {
  return typeof value === "string" && value.length === 36 && UUID.test(value);
}
// Same opaque identity bounds as the canonical Owner profile reader; no System-event key regex.
function accountId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200
    && ![...value].some(char => { const code = char.codePointAt(0)!; return code < 32 || code === 127; });
}
export function validateOwnerAccountDeactivationInput(input: DeactivateOwnerAccountInput): DeactivateOwnerAccountInput {
  if (!input || typeof input !== "object" || Array.isArray(input)
    || Object.keys(input).sort().join(",") !== "actorId,operationId,targetId"
    || !accountId(input.actorId) || !accountId(input.targetId)
    || !operationId(input.operationId)) {
    throw new OwnerAccountLifecycleValidationError();
  }
  return { ...input, operationId: input.operationId.toLowerCase() };
}
export class OwnerAccountLifecycleUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("Account lifecycle storage unavailable", options);
    this.name = "OwnerAccountLifecycleUnavailableError";
  }
}
