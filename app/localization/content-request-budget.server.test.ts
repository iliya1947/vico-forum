import { webcrypto } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH,
  WebCryptoContentTranslationRequesterPseudonymizer,
  contentTranslationRequestBudgetScopeKey,
  validateContentTranslationRequestBudgetAdmission,
  validateContentTranslationRequestBudgetCleanupLimit,
} from "./content-request-budget.server";

const SECRET_TEXT = "0123456789abcdef0123456789abcdef";
const SECRET = new TextEncoder().encode(SECRET_TEXT);
const SUBTLE = webcrypto.subtle as unknown as SubtleCrypto;

function pseudonymizer(
  version = "key-v1",
): WebCryptoContentTranslationRequesterPseudonymizer {
  return new WebCryptoContentTranslationRequesterPseudonymizer(
    SECRET,
    version,
    SUBTLE,
  );
}

function admission() {
  return {
    subjectKey: "A".repeat(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH),
    cost: 1,
    windowSeconds: 600,
    global: {
      name: "content-translation-global",
      version: "policy-v1",
      limit: 7,
    },
    requester: {
      name: "content-translation-requester",
      version: "policy-v1",
      limit: 3,
    },
  };
}

describe("WebCryptoContentTranslationRequesterPseudonymizer", () => {
  it("produces deterministic HMAC-SHA-256 base64url pseudonyms", async () => {
    await expect(pseudonymizer().pseudonymize({
      kind: "authenticated",
      identity: "user-123",
    })).resolves.toEqual({
      actorKind: "authenticated",
      keyVersion: "key-v1",
      subjectKey: "BT_fqYcBeupkrtcer5kJ0cNbaaP_CWTSvgsaoqB__L0",
    });

    await expect(pseudonymizer().pseudonymize({
      kind: "anonymous",
      identity: "203.0.113.42",
    })).resolves.toEqual({
      actorKind: "anonymous",
      keyVersion: "key-v1",
      subjectKey: "jKfh8bKT7CwjmPbO8h4Uk-DI7H3y6QS2qGXxVDUr5mY",
    });
  });

  it("domain-separates actor kinds and key versions", async () => {
    const current = pseudonymizer();
    const next = pseudonymizer("key-v2");

    const [user, ip, rotated] = await Promise.all([
      current.pseudonymize({ kind: "authenticated", identity: "same-value" }),
      current.pseudonymize({ kind: "anonymous", identity: "same-value" }),
      next.pseudonymize({ kind: "authenticated", identity: "same-value" }),
    ]);

    expect(user.subjectKey).not.toBe(ip.subjectKey);
    expect(user.subjectKey).not.toBe(rotated.subjectKey);
    expect(user.subjectKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(user.subjectKey).toHaveLength(CONTENT_TRANSLATION_REQUESTER_SUBJECT_KEY_LENGTH);
  });

  it("rejects malformed identities, actor kinds, key versions, and secrets", async () => {
    expect(() => new WebCryptoContentTranslationRequesterPseudonymizer(
      new Uint8Array(31),
      "key-v1",
      SUBTLE,
    )).toThrow(TypeError);
    expect(() => new WebCryptoContentTranslationRequesterPseudonymizer(
      SECRET,
      "bad version",
      SUBTLE,
    )).toThrow(TypeError);

    const service = pseudonymizer();
    await expect(service.pseudonymize({
      kind: "authenticated",
      identity: " ",
    })).rejects.toBeInstanceOf(TypeError);
    await expect(service.pseudonymize({
      kind: "anonymous",
      identity: " 203.0.113.42",
    })).rejects.toBeInstanceOf(TypeError);
    await expect(service.pseudonymize({
      kind: "authenticated",
      identity: "user\n123",
    })).rejects.toBeInstanceOf(TypeError);
    await expect(service.pseudonymize({
      kind: "service" as never,
      identity: "actor",
    })).rejects.toBeInstanceOf(TypeError);
  });

  it("does not disclose raw requester identity or secret material in its result", async () => {
    const identity = "private-user-id";
    const result = await pseudonymizer().pseudonymize({
      kind: "authenticated",
      identity,
    });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(identity);
    expect(serialized).not.toContain(SECRET_TEXT);
    expect(Object.keys(result).sort()).toEqual([
      "actorKind",
      "keyVersion",
      "subjectKey",
    ]);
  });
});

describe("content translation request-budget validation", () => {
  it("constructs explicit versioned scope keys without selecting quota values", () => {
    expect(contentTranslationRequestBudgetScopeKey({
      name: "content-translation-global",
      version: "policy-v3",
      limit: 91,
    })).toBe("content-translation-global@policy-v3");
  });

  it("accepts validated policy inputs and rejects invalid cost, limits, windows, scopes, and subjects", () => {
    expect(() => validateContentTranslationRequestBudgetAdmission(admission()))
      .not.toThrow();

    const invalid = [
      { ...admission(), cost: 0 },
      { ...admission(), cost: 1.5 },
      { ...admission(), windowSeconds: 0 },
      { ...admission(), windowSeconds: Number.MAX_SAFE_INTEGER + 1 },
      { ...admission(), subjectKey: "raw-user-id" },
      { ...admission(), global: { ...admission().global, limit: 0 } },
      { ...admission(), requester: { ...admission().requester, version: "bad version" } },
      { ...admission(), requester: { ...admission().requester, version: "bad:version" } },
      { ...admission(), global: { ...admission().global, name: "bad@scope" } },
    ];

    for (const value of invalid) {
      expect(() => validateContentTranslationRequestBudgetAdmission(value))
        .toThrow(TypeError);
    }
  });

  it("bounds cleanup batches independently of any scheduler", () => {
    expect(() => validateContentTranslationRequestBudgetCleanupLimit(1)).not.toThrow();
    expect(() => validateContentTranslationRequestBudgetCleanupLimit(1_000)).not.toThrow();
    expect(() => validateContentTranslationRequestBudgetCleanupLimit(0)).toThrow(TypeError);
    expect(() => validateContentTranslationRequestBudgetCleanupLimit(1_001)).toThrow(TypeError);
  });
});
