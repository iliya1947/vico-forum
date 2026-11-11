/** Recorded User-Agent is untrusted presentation metadata, not a verified device identity. */
export function safeDeviceLabel(agent: unknown): string {
  if (typeof agent !== "string") return "Unknown device";
  const label = Array.from(agent, character => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 ? " " : character;
  }).join("").trim().slice(0, 160);
  return label || "Unknown device";
}
