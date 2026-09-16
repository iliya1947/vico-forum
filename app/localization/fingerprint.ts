import type { UiMessageDescriptor, UiMessageSource } from "./catalog";

export async function sha256Text(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sourceFingerprint(descriptor: UiMessageDescriptor): Promise<string> {
  const semantics = JSON.stringify({
    source: canonicalSource(descriptor.source),
    description: descriptor.description,
    placeholders: [...descriptor.placeholders].sort(),
    messageKind: descriptor.messageKind,
    protectedTerms: [...descriptor.protectedTerms].sort(),
  });
  return sha256Text(semantics);
}

function canonicalSource(source: UiMessageSource): UiMessageSource {
  if (typeof source === "string") return source;
  return Object.fromEntries(Object.entries(source).sort(([left], [right]) => deterministicCompare(left, right)));
}

function deterministicCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
