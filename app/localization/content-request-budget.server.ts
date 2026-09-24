export type ContentTranslationRequesterIdentity =
  | {
      readonly kind: "authenticated";
      readonly identity: string;
    }
  | {
      readonly kind: "anonymous";
      readonly identity: string;
    };

export interface ContentTranslationRequesterPseudonym {
  readonly actorKind: ContentTranslationRequesterIdentity["kind"];
  readonly keyVersion: string;
  readonly subjectKey: string;
}

export interface ContentTranslationRequesterPseudonymizer {
  pseudonymize(
    identity: ContentTranslationRequesterIdentity,
  ): Promise<ContentTranslationRequesterPseudonym>;
}

export interface ContentTranslationRequestBudgetScopePolicy {
  readonly name: string;
  readonly version: string;
  readonly limit: number;
}

export interface ContentTranslationRequestBudgetAdmission {
  readonly subjectKey: string;
  readonly cost: number;
  readonly windowSeconds: number;
  readonly global: ContentTranslationRequestBudgetScopePolicy;
  readonly requester: ContentTranslationRequestBudgetScopePolicy;
}

export type ContentTranslationRequestBudgetDecision =
  | {
      readonly allowed: true;
      readonly reason: "within-budget";
      readonly limitingScope: null;
      readonly remainingUnits: {
        readonly global: number;
        readonly requester: number;
      };
      readonly resetAt: Date;
      readonly retryAfterSeconds: 0;
    }
  | {
      readonly allowed: false;
      readonly reason: "limit-exceeded";
      readonly limitingScope: "global" | "requester";
      readonly remainingUnits: number;
      readonly resetAt: Date;
      readonly retryAfterSeconds: number;
    };

export interface ContentTranslationRequestBudgetStore {
  consume(
    admission: ContentTranslationRequestBudgetAdmission,
  ): Promise<ContentTranslationRequestBudgetDecision>;
  cleanupExpired(limit: number): Promise<number>;
}

export class ContentTranslationRequestBudgetStorageUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("content translation request-budget storage unavailable", options);
    this.name = "ContentTranslationRequestBudgetStorageUnavailableError";
  }
}

export class ContentTranslationRequestBudgetIntegrityError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ContentTranslationRequestBudgetIntegrityError";
  }
}

export const CONTENT_TRANSLATION_REQUESTER_PSEUDONYM_FORMAT =
  "vico-content-translation-requester-v1";
export const CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH = 43;
export const MAX_CONTENT_TRANSLATION_REQUEST_BUDGET_CLEANUP_BATCH_SIZE = 1_000;

const MINIMUM_HMAC_SECRET_BYTES = 32;
const MAXIMUM_HMAC_SECRET_BYTES = 4_096;
const MAXIMUM_IDENTITY_CODE_UNITS = 512;
const MAXIMUM_SCOPE_PART_CODE_UNITS = 64;
const HMAC_SHA_256_BYTES = 32;
const BASE64URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const KEY_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;
const SCOPE_PART_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const SUBJECT_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;

type WebCryptoSubtle = typeof crypto.subtle;
type ImportedHmacKey = Awaited<ReturnType<WebCryptoSubtle["importKey"]>>;

export class WebCryptoContentTranslationRequesterPseudonymizer
implements ContentTranslationRequesterPseudonymizer {
  private readonly keyPromise: Promise<ImportedHmacKey>;

  constructor(
    secret: Uint8Array,
    private readonly keyVersion: string,
    private readonly subtle: WebCryptoSubtle = crypto.subtle,
  ) {
    if (
      !isUint8Array(secret)
      || secret.byteLength < MINIMUM_HMAC_SECRET_BYTES
      || secret.byteLength > MAXIMUM_HMAC_SECRET_BYTES
    ) {
      throw new TypeError(
        `requester pseudonym HMAC secret must contain ${MINIMUM_HMAC_SECRET_BYTES}-${MAXIMUM_HMAC_SECRET_BYTES} bytes`,
      );
    }
    requireKeyVersion(keyVersion);
    const secretCopy = new Uint8Array(secret);
    this.keyPromise = this.subtle
      .importKey(
        "raw",
        secretCopy.buffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      )
      .finally(() => secretCopy.fill(0));
  }

  async pseudonymize(
    input: ContentTranslationRequesterIdentity,
  ): Promise<ContentTranslationRequesterPseudonym> {
    if (!input || typeof input !== "object") {
      throw new TypeError("requester identity must be an object");
    }

    const identity = requireRequesterIdentity(input.identity);
    let domain: "user" | "ip";
    switch (input.kind) {
      case "authenticated":
        domain = "user";
        break;
      case "anonymous":
        domain = "ip";
        break;
      default:
        throw new TypeError("requester actor kind is unsupported");
    }

    const preimage = new TextEncoder().encode(
      `${CONTENT_TRANSLATION_REQUESTER_PSEUDONYM_FORMAT}\0${this.keyVersion}\0${domain}\0${identity}`,
    );
    const signature = await cryptoSign(this.subtle, this.keyPromise, preimage);
    if (signature.byteLength !== HMAC_SHA_256_BYTES) {
      throw new ContentTranslationRequestBudgetIntegrityError(
        "HMAC-SHA-256 returned an unexpected digest length",
      );
    }

    const subjectKey = encodeBase64Url(signature);
    if (
      subjectKey.length !== CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH
      || !SUBJECT_KEY_PATTERN.test(subjectKey)
    ) {
      throw new ContentTranslationRequestBudgetIntegrityError(
        "requester pseudonym has an invalid shape",
      );
    }

    return {
      actorKind: input.kind,
      keyVersion: this.keyVersion,
      subjectKey,
    };
  }
}

export function validateContentTranslationRequestBudgetAdmission(
  admission: ContentTranslationRequestBudgetAdmission,
): void {
  if (!admission || typeof admission !== "object") {
    throw new TypeError("request budget admission must be an object");
  }
  requireSubjectKey(admission.subjectKey);
  requirePositiveSafeInteger(admission.cost, "request budget cost");
  requirePositiveSafeInteger(admission.windowSeconds, "request budget windowSeconds");
  requireScopePolicy(admission.global, "global");
  requireScopePolicy(admission.requester, "requester");
}

export function contentTranslationRequestBudgetScopeKey(
  policy: ContentTranslationRequestBudgetScopePolicy,
): string {
  requireScopePolicy(policy, "scope");
  return `${policy.name}@${policy.version}`;
}

export function validateContentTranslationRequestBudgetCleanupLimit(limit: number): void {
  if (
    !Number.isSafeInteger(limit)
    || limit <= 0
    || limit > MAX_CONTENT_TRANSLATION_REQUEST_BUDGET_CLEANUP_BATCH_SIZE
  ) {
    throw new TypeError(
      `request budget cleanup limit must be an integer between 1 and ${MAX_CONTENT_TRANSLATION_REQUEST_BUDGET_CLEANUP_BATCH_SIZE}`,
    );
  }
}

function requireScopePolicy(
  policy: ContentTranslationRequestBudgetScopePolicy,
  field: string,
): void {
  if (!policy || typeof policy !== "object") {
    throw new TypeError(`${field} request budget scope must be an object`);
  }
  requireScopePart(policy.name, `${field} request budget scope name`);
  requireScopePart(policy.version, `${field} request budget scope version`);
  requirePositiveSafeInteger(policy.limit, `${field} request budget limit`);
}

function requireScopePart(value: string, field: string): void {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > MAXIMUM_SCOPE_PART_CODE_UNITS
    || !SCOPE_PART_PATTERN.test(value)
  ) {
    throw new TypeError(
      `${field} must be a bounded portable non-blank identifier`,
    );
  }
}

function requireSubjectKey(value: string): void {
  if (
    typeof value !== "string"
    || value.length !== CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH
    || !SUBJECT_KEY_PATTERN.test(value)
  ) {
    throw new TypeError("request budget subjectKey must be a base64url SHA-256 pseudonym");
  }
}

function requirePositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
}

function requireRequesterIdentity(value: string): string {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > MAXIMUM_IDENTITY_CODE_UNITS
    || value !== value.trim()
    || hasControlCharacter(value)
  ) {
    throw new TypeError(
      "requester identity must be a bounded non-blank value without surrounding whitespace or control characters",
    );
  }
  return value;
}

function isUint8Array(value: unknown): value is Uint8Array {
  return (
    ArrayBuffer.isView(value)
    && Object.prototype.toString.call(value) === "[object Uint8Array]"
  );
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function requireKeyVersion(value: string): string {
  if (typeof value !== "string" || !KEY_VERSION_PATTERN.test(value)) {
    throw new TypeError("requester pseudonym keyVersion has an invalid shape");
  }
  return value;
}

async function cryptoSign(
  subtle: WebCryptoSubtle,
  keyPromise: Promise<ImportedHmacKey>,
  preimage: Uint8Array,
): Promise<Uint8Array> {
  const key = await keyPromise;
  const owned = new Uint8Array(preimage.byteLength);
  owned.set(preimage);
  const signature = await subtle.sign("HMAC", key, owned.buffer);
  return new Uint8Array(signature);
}

function encodeBase64Url(bytes: Uint8Array): string {
  let output = "";
  for (let offset = 0; offset < bytes.length; offset += 3) {
    const first = bytes[offset]!;
    const second = bytes[offset + 1];
    const third = bytes[offset + 2];
    const packed = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    output += BASE64URL_ALPHABET[(packed >>> 18) & 63];
    output += BASE64URL_ALPHABET[(packed >>> 12) & 63];
    if (second !== undefined) output += BASE64URL_ALPHABET[(packed >>> 6) & 63];
    if (third !== undefined) output += BASE64URL_ALPHABET[packed & 63];
  }
  return output;
}
