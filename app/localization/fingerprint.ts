import type { UiMessageDescriptor } from "./catalog";

export async function sourceFingerprint(descriptor: UiMessageDescriptor): Promise<string> {
  const semantics = JSON.stringify({
    source: descriptor.source,
    description: descriptor.description,
    placeholders: [...descriptor.placeholders].sort(),
    messageKind: descriptor.messageKind,
    protectedTerms: [...descriptor.protectedTerms].sort(),
  });
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(semantics));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

