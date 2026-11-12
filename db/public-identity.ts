import type { AccountState } from "./account-state";

/** English fallback for the approved public account-deactivation identity. */
export const DELETED_USER_NAME = "Deleted user";
/** Generic i18n key for presentation; no locale is chosen by the projection. */
export const DELETED_USER_LABEL_KEY = "deletedUser" as const;

/** Only fields already allowed in public forum identity/profile responses. */
export interface PublicIdentitySource {
  readonly id: string;
  readonly name: string;
  readonly image: string | null;
  readonly bio: string;
  readonly githubUrl: string | null;
  readonly websiteUrl: string | null;
}

interface PublicIdentityFields extends PublicIdentitySource {
  readonly kind: "active" | "deleted";
}

export type PublicAccountIdentity =
  | (PublicIdentityFields & { readonly kind: "active"; readonly labelKey: null })
  | (PublicIdentityFields & {
      readonly kind: "deleted";
      readonly name: typeof DELETED_USER_NAME;
      readonly image: null;
      readonly bio: "";
      readonly githubUrl: null;
      readonly websiteUrl: null;
      readonly labelKey: typeof DELETED_USER_LABEL_KEY;
    });

export class PublicIdentityInvariantError extends Error {
  constructor() {
    super("Invalid public account identity source or lifecycle state");
    this.name = "PublicIdentityInvariantError";
  }
}

function validDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

/** Match PostgreSQL (timestamp AT TIME ZONE 'UTC') + interval '1 year'. */
function minimumRetentionUtc(deactivatedAt: Date): Date {
  const boundary = new Date(deactivatedAt.getTime());
  const originalDay = boundary.getUTCDate();
  boundary.setUTCDate(1);
  boundary.setUTCFullYear(boundary.getUTCFullYear() + 1);
  // PostgreSQL clamps February 29 to February 28 in a non-leap target year.
  boundary.setUTCMonth(boundary.getUTCMonth() + 1, 0);
  boundary.setUTCDate(Math.min(originalDay, boundary.getUTCDate()));
  return boundary;
}

/**
 * Strictly allowlisted server-side projection, before public DTO serialization.
 * Source and state MUST refer to the same authoritative user/snapshot.
 * Do not spread the original row or serialize the state record: it contains
 * retained private identity and account lifecycle details.
 *
 * The immutable user ID remains available for existing profile links. Actual
 * locale-specific route and label rendering belong to future consumer code.
 */
export function projectPublicAccountIdentity(
  source: PublicIdentitySource | null | undefined,
  state: AccountState,
): PublicAccountIdentity {
  if (!source || typeof source.id !== "string" || !source.id
      || typeof source.name !== "string"
      || (source.image !== null && typeof source.image !== "string")
      || typeof source.bio !== "string"
      || (source.githubUrl !== null && typeof source.githubUrl !== "string")
      || (source.websiteUrl !== null && typeof source.websiteUrl !== "string")
      || !state || state.userId !== source.id) {
    throw new PublicIdentityInvariantError();
  }

  if (state.status === "active") {
    if ("deactivatedAt" in state || "deactivatedByUserId" in state || "retainAtLeastUntil" in state) {
      throw new PublicIdentityInvariantError();
    }
    return {
      kind: "active",
      id: source.id,
      name: source.name,
      image: source.image,
      bio: source.bio,
      githubUrl: source.githubUrl,
      websiteUrl: source.websiteUrl,
      labelKey: null,
    };
  }

  if (state.status === "deactivated") {
    if (!validDate(state.deactivatedAt) || !validDate(state.retainAtLeastUntil)
        || typeof state.deactivatedByUserId !== "string" || !state.deactivatedByUserId.trim()) {
      throw new PublicIdentityInvariantError();
    }
    const minimumRetention = minimumRetentionUtc(state.deactivatedAt);
    if (!validDate(minimumRetention) || state.retainAtLeastUntil.getTime() < minimumRetention.getTime()) {
      throw new PublicIdentityInvariantError();
    }
    return {
      kind: "deleted",
      id: source.id,
      name: DELETED_USER_NAME,
      image: null,
      bio: "",
      githubUrl: null,
      websiteUrl: null,
      labelKey: DELETED_USER_LABEL_KEY,
    };
  }

  // Missing or malformed lifecycle state is not a fabricated public identity.
  throw new PublicIdentityInvariantError();
}
