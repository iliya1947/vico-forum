/** Shared browser-safe structure validation and error identity. */
export const BIGINT_MAX = 9223372036854775807n;
export class StructureValidationError extends Error {}
export class StructureForbiddenError extends Error {}
export class StructureNotFoundError extends Error {}
export class StructureInvariantError extends Error {}
export class StructureConflictError extends Error {
  constructor(readonly reason: "stale" | "parent-changed" | "version-exhausted" | "position-exhausted" | "order-invariant" | "reserved-destination") {
    super("Forum structure changed or cannot be changed");
  }
}

/** Transport counters are canonical decimal strings, including beyond Number.MAX_SAFE_INTEGER. */
export function parseStructureCounter(value: unknown): bigint {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,18})$/.test(value)) {
    throw new StructureValidationError("Invalid structure counter");
  }
  const number = BigInt(value);
  if (number > BIGINT_MAX) throw new StructureValidationError("Invalid structure counter");
  return number;
}

export function validateStructureName(value: unknown): string {
  if (typeof value !== "string" || /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/u.test(value)) {
    throw new StructureValidationError("Invalid structure name");
  }
  const name = value.trim();
  if (!name || Array.from(name).length > 200 || new TextEncoder().encode(name).byteLength > 800) {
    throw new StructureValidationError("Invalid structure name");
  }
  return name;
}

export class StructureReadUnavailableError extends Error {}

export class StructureWriteUnavailableError extends Error {}
