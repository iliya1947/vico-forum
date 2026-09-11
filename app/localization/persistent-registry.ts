import { parseLocaleCandidate, type LocaleDefinition } from "./locale";
import {
  BOOTSTRAP_ENGLISH,
  InMemoryLocaleRegistry,
  LocaleRegistryValidationError,
  RESERVED_TOP_LEVEL_SEGMENTS,
  type LocaleRegistry,
} from "./registry";

export interface PersistentLocaleRow {
  tag: unknown;
  translationStatus: unknown;
  publicationStatus: unknown;
  direction: unknown;
  fallbackChain: unknown;
  aliases: unknown;
  matchTags: unknown;
  nativeName: unknown;
  presentationMetadata: unknown;
}

export interface PersistentLocaleRepository {
  readAll(): Promise<readonly PersistentLocaleRow[]>;
}

export type RegistryDegradedReason = "unavailable" | "schema-mismatch" | "integrity";

export type RegistryLoadHealth =
  | { readonly status: "healthy" }
  | { readonly status: "degraded"; readonly reason: RegistryDegradedReason };

export interface LoadedLocaleRegistry {
  readonly registry: LocaleRegistry;
  readonly semanticIdentity: string;
  readonly health: RegistryLoadHealth;
}

export class RegistryIntegrityError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RegistryIntegrityError";
  }
}

export class RegistryConnectionUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("persistent registry connection unavailable", options);
    this.name = "RegistryConnectionUnavailableError";
  }
}

const translationStatuses = new Set(["draft", "generating", "partial", "ready"]);
const publicationStatuses = new Set(["inactive", "active", "disabled"]);
const transportUnavailableCodes = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNRESET",
  "EPIPE",
]);
const postgresUnavailableCodes = new Set(["57P01", "57P02", "57P03", "53300"]);

export function isTransportUnavailableCode(code: unknown): boolean {
  return typeof code === "string" && transportUnavailableCodes.has(code);
}

export function parsePersistentLocaleRow(row: PersistentLocaleRow): LocaleDefinition {
  const tag = requiredString(row.tag, "tag");
  const parsedTag = parseLocaleCandidate(tag);
  if (!parsedTag || parsedTag.canonicalInput !== parsedTag.translationTag) {
    throw new RegistryIntegrityError(`tag must be a canonical translation locale: ${tag}`);
  }
  if (parsedTag.translationTag === "en") throw new RegistryIntegrityError("persistent dataset contains bootstrap en");

  const translationStatus = member(row.translationStatus, translationStatuses, "translationStatus");
  const publicationStatus = member(row.publicationStatus, publicationStatuses, "publicationStatus");
  const direction = member(row.direction, new Set(["ltr", "rtl"]), "direction");
  const nativeName = requiredString(row.nativeName, "nativeName");
  if (!nativeName.trim()) throw new RegistryIntegrityError("nativeName must not be blank");

  return {
    tag: parsedTag.translationTag,
    translationStatus: translationStatus as LocaleDefinition["translationStatus"],
    publicationStatus: publicationStatus as LocaleDefinition["publicationStatus"],
    direction: direction as LocaleDefinition["direction"],
    fallbackChain: stringArray(row.fallbackChain, "fallbackChain"),
    aliases: stringArray(row.aliases, "aliases"),
    matchTags: stringArray(row.matchTags, "matchTags"),
    nativeName,
    presentationMetadata: stringRecord(row.presentationMetadata),
  };
}

export async function assemblePersistentRegistry(rows: readonly PersistentLocaleRow[]) {
  const definitions = rows.map(parsePersistentLocaleRow);
  let registry: LocaleRegistry;
  try {
    registry = new InMemoryLocaleRegistry(definitions);
  } catch (error) {
    if (error instanceof LocaleRegistryValidationError) {
      throw new RegistryIntegrityError("persistent locale graph is invalid", { cause: error });
    }
    throw error;
  }
  return { registry, semanticIdentity: await registryIdentity(definitions) };
}

export async function loadPersistentRegistry(repository: PersistentLocaleRepository): Promise<LoadedLocaleRegistry> {
  try {
    const loaded = await assemblePersistentRegistry(await repository.readAll());
    return { ...loaded, health: { status: "healthy" } };
  } catch (error) {
    const reason = classifyLoadFailure(error);
    if (!reason) throw error;
    const fallback = await assemblePersistentRegistry([]);
    return { ...fallback, health: { status: "degraded", reason } };
  }
}

export function createRequestRegistryLoader(repository: PersistentLocaleRepository) {
  let load: Promise<LoadedLocaleRegistry> | undefined;
  return () => (load ??= loadPersistentRegistry(repository));
}

function classifyLoadFailure(error: unknown): RegistryDegradedReason | undefined {
  const seen = new Set<unknown>();
  let current = error;
  while (current && (typeof current === "object" || typeof current === "function") && !seen.has(current)) {
    seen.add(current);
    if (current instanceof RegistryIntegrityError) return "integrity";
    if (current instanceof RegistryConnectionUnavailableError) return "unavailable";
    const candidate = current as { cause?: unknown; code?: unknown };
    const code = typeof candidate.code === "string" ? candidate.code : undefined;
    if (code === "42P01" || code === "42703" || code === "42804") return "schema-mismatch";
    if (code?.startsWith("08") || postgresUnavailableCodes.has(code ?? "") || isTransportUnavailableCode(code)) {
      return "unavailable";
    }
    current = candidate.cause;
  }
  return undefined;
}

async function registryIdentity(persistent: readonly LocaleDefinition[]): Promise<string> {
  const effective = [BOOTSTRAP_ENGLISH, ...persistent].sort((a, b) => deterministicCompare(a.tag, b.tag));
  const semantic = {
    format: "vico-locale-registry-v1",
    ordering: "utf8-bytewise-v1",
    reservedTopLevelSegments: [...RESERVED_TOP_LEVEL_SEGMENTS].sort(deterministicCompare),
    locales: effective.map((locale) => ({
      tag: locale.tag,
      translationStatus: locale.translationStatus,
      publicationStatus: locale.publicationStatus,
      direction: locale.direction,
      fallbackChain: [...locale.fallbackChain],
      aliases: matches(locale.aliases),
      matchTags: matches(locale.matchTags),
      nativeName: locale.nativeName,
      presentationMetadata: Object.fromEntries(
        Object.entries(locale.presentationMetadata ?? {}).sort(([left], [right]) => deterministicCompare(left, right)),
      ),
    })),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(semantic));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function matches(values: readonly string[] | undefined) {
  return [...(values ?? [])]
    .map((declared) => ({ declared, effective: parseLocaleCandidate(declared)?.translationTag }))
    .sort((a, b) => deterministicCompare(a.declared, b.declared) || deterministicCompare(a.effective ?? "", b.effective ?? ""));
}

function deterministicCompare(left: string, right: string): number {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  for (let index = 0; index < Math.min(leftBytes.length, rightBytes.length); index++) {
    if (leftBytes[index] !== rightBytes[index]) return leftBytes[index]! - rightBytes[index]!;
  }
  return leftBytes.length - rightBytes.length;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string") throw new RegistryIntegrityError(`${field} must be a string`);
  return value;
}

function member(value: unknown, allowed: ReadonlySet<string>, field: string): string {
  const parsed = requiredString(value, field);
  if (!allowed.has(parsed)) throw new RegistryIntegrityError(`${field} has an invalid value`);
  return parsed;
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new RegistryIntegrityError(`${field} must be a string array`);
  }
  return [...value];
}

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RegistryIntegrityError("presentationMetadata must be an object");
  }
  const entries = Object.entries(value);
  if (entries.some(([, item]) => typeof item !== "string")) {
    throw new RegistryIntegrityError("presentationMetadata values must be strings");
  }
  return Object.fromEntries(entries) as Record<string, string>;
}
