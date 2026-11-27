import {
  safeMailAddress, safeMailHeader, validMailMessage,
  type AuthMailExecution, type AuthMailFetch, type AuthMailMessage,
  type AuthMailResult, type AuthMailTransport,
} from "./auth-mail-contract.server";

export interface AuthMailProviderConfig {
  readonly apiKey: string;
  readonly senderAddress: string;
  readonly senderName: string;
  readonly timeoutMs?: number;
}
const MAX_RESPONSE_BYTES = 8192;

async function responseJSON(response: Response, signal: AbortSignal): Promise<unknown> {
  if (!response.headers.get("Content-Type")?.toLowerCase().startsWith("application/json") || !response.body) {
    throw new Error("Invalid mail response");
  }
  const reader = response.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > MAX_RESPONSE_BYTES) throw new Error("Invalid mail response");
      chunks.push(chunk.value);
    }
    if (signal.aborted) throw new Error("Mail response timed out");
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } finally { signal.removeEventListener("abort", cancel); cancel(); reader.releaseLock(); }
}

function providerTransport(
  provider: "resend" | "brevo", config: AuthMailProviderConfig, transport: AuthMailFetch,
): AuthMailTransport {
  const timeoutMs = config.timeoutMs ?? 5000;
  const configured = safeMailAddress(config.senderAddress) && safeMailHeader(config.senderName, 100)
    && safeMailHeader(config.apiKey, 1024) && /^[\x21-\x7e]+$/.test(config.apiKey)
    && Number.isSafeInteger(timeoutMs) && timeoutMs >= 1 && timeoutMs <= 10000
    && typeof transport === "function";
  // Capture values; later mutation of the caller's config cannot change the target.
  const { apiKey, senderAddress, senderName } = config;
  return {
    async send(message) {
      if (!configured || !validMailMessage(message)) return { status: "rejected" };
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let response: Response | undefined;
      const timedOut = new Promise<AuthMailResult>(resolve => {
        timer = setTimeout(() => { controller.abort(); resolve({ status: "uncertain" }); }, timeoutMs);
      });
      const perform = async (): Promise<AuthMailResult> => {
        try {
          const headers: Record<string, string> = provider === "resend"
            ? { Authorization: `Bearer ${apiKey}`, "Idempotency-Key": `auth-${message.purpose}-${message.operationId}` }
            : { "api-key": apiKey };
          const body = provider === "resend"
            ? { from: `"${senderName.replace(/["\\]/g, "\\$&")}" <${senderAddress}>`, to: [message.recipient],
              subject: message.subject, html: message.html, text: message.text }
            : { sender: { name: senderName, email: senderAddress }, to: [{ email: message.recipient }],
              subject: message.subject, htmlContent: message.html, textContent: message.text };
          response = await transport(provider === "resend" ? "https://api.resend.com/emails" : "https://api.brevo.com/v3/smtp/email", {
            method: "POST", redirect: "manual", signal: controller.signal,
            headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
            body: JSON.stringify(body),
          });
          if (controller.signal.aborted) return { status: "uncertain" };
          if (response.status === 0) return { status: "uncertain" };
          if (response.status === 429 || response.status >= 500) return { status: "unavailable" };
          if (!response.ok) return { status: "rejected" };
          const payload = await responseJSON(response, controller.signal);
          const id = payload && typeof payload === "object"
            ? (payload as Record<string, unknown>)[provider === "resend" ? "id" : "messageId"] : null;
          return { status: safeMailHeader(id, 512) ? "accepted" : "uncertain" };
        } catch { return { status: "uncertain" }; }
      };
      try { return await Promise.race([perform(), timedOut]); }
      finally {
        clearTimeout(timer);
        controller.abort();
        if (response?.body && !response.body.locked) void response.body.cancel().catch(() => undefined);
      }
    },
  };
}

/** Mandatory injected transport: these adapters never select global fetch. */
export function createResendAuthMailTransport(config: AuthMailProviderConfig, transport: AuthMailFetch): AuthMailTransport {
  return providerTransport("resend", config, transport);
}
export function createBrevoAuthMailTransport(config: AuthMailProviderConfig, transport: AuthMailFetch): AuthMailTransport {
  return providerTransport("brevo", config, transport);
}

/** Bounded, private in-process inbox. No HTTP debug endpoint or console logging. */
export function createFakeAuthMailTransport(execution: AuthMailExecution) {
  const messages: AuthMailMessage[] = [];
  return {
    transport: {
      async send(message: AuthMailMessage): Promise<AuthMailResult> {
        if (execution !== "local" && execution !== "test") return { status: "disabled" };
        if (!validMailMessage(message)) return { status: "rejected" };
        if (messages.length >= 32) return { status: "unavailable" };
        messages.push(Object.freeze({ ...message }));
        return { status: "accepted" };
      },
    } satisfies AuthMailTransport,
    drain(): readonly AuthMailMessage[] { return messages.splice(0); },
  };
}
