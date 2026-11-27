import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBrevoAuthMailTransport, createFakeAuthMailTransport, createResendAuthMailTransport } from "./auth-mail-transports.server";
import type { AuthMailFetch, AuthMailMessage } from "./auth-mail-contract.server";

const message: AuthMailMessage = {
  purpose: "email-verification", recipient: "person@example.com",
  operationId: "12345678-1234-4123-8123-123456789abc", subject: "Confirm your email",
  html: "<p>Confirm email</p>", text: "Confirm email",
};
const config = { apiKey: "provider-secret-canary", senderAddress: "auth@example.com", senderName: "Vico Forum" };
beforeEach(() => { vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Real egress forbidden"); })); });
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe.each([
  ["resend", createResendAuthMailTransport, "https://api.resend.com/emails", { id: "accepted-id" }],
  ["brevo", createBrevoAuthMailTransport, "https://api.brevo.com/v3/smtp/email", { messageId: "<accepted@brevo>" }],
] as const)("AUTH-01 %s transport", (provider, create, endpoint, accepted) => {
  it("maps one provider request and exposes only accepted, not private provider output", async () => {
    const transport = vi.fn<AuthMailFetch>(async () => Response.json(accepted, { status: 201 }));
    expect(await create(config, transport).send(message)).toEqual({ status: "accepted" });
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, init] = transport.mock.calls[0];
    expect(url).toBe(endpoint);
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("manual");
    const headers = new Headers(init.headers);
    expect(headers.get(provider === "resend" ? "Authorization" : "api-key"))
      .toBe(provider === "resend" ? `Bearer ${config.apiKey}` : config.apiKey);
    expect(headers.get("Idempotency-Key")).toBe(provider === "resend"
      ? `auth-${message.purpose}-${message.operationId}` : null);
    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual(provider === "resend" ? [message.recipient] : [{ email: message.recipient }]);
    expect(body.subject).toBe(message.subject);
    expect(body[provider === "resend" ? "html" : "htmlContent"]).toBe(message.html);
    expect(body[provider === "resend" ? "text" : "textContent"]).toBe(message.text);
  });
  it.each([[400, "rejected"], [401, "rejected"], [403, "rejected"], [422, "rejected"],
    [429, "unavailable"], [500, "unavailable"], [503, "unavailable"], [302, "rejected"]] as const)("classifies HTTP %s without retry/failover or raw body disclosure", async (status, expected) => {
    const transport = vi.fn<AuthMailFetch>(async () => new Response("private error recipient@example.com token=secret", { status }));
    expect(await create(config, transport).send(message)).toEqual({ status: expected });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("treats loss of acknowledgement as uncertain, without retry", async () => {
    const transport = vi.fn<AuthMailFetch>(async () => { throw new Error("Connection lost with private token"); });
    expect(await create(config, transport).send(message)).toEqual({ status: "uncertain" });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it.each(["not JSON", JSON.stringify({ message: "not proof of acceptance" }), "x".repeat(9000)])("requires bounded successful provider proof", async body => {
    const transport = vi.fn<AuthMailFetch>(async () => new Response(body, { headers: { "Content-Type": "application/json" } }));
    expect(await create(config, transport).send(message)).toEqual({ status: "uncertain" });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("bounds a hung dispatch even when the injected transport ignores AbortSignal", async () => {
    vi.useFakeTimers();
    const transport = vi.fn<AuthMailFetch>(() => new Promise(() => undefined));
    const result = create({ ...config, timeoutMs: 25 }, transport).send(message);
    await vi.advanceTimersByTimeAsync(26);
    expect(await result).toEqual({ status: "uncertain" });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][1].signal?.aborted).toBe(true);
  });
  it("also bounds a stalled response stream and cancels its reader", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    const transport = vi.fn<AuthMailFetch>(async () => new Response(body, { headers: { "Content-Type": "application/json" } }));
    const result = create({ ...config, timeoutMs: 25 }, transport).send(message);
    await vi.advanceTimersByTimeAsync(26);
    expect(await result).toEqual({ status: "uncertain" });
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("refuses bad config/envelope before any transport call", async () => {
    const transport = vi.fn<AuthMailFetch>();
    for (const overrides of [
      { apiKey: "" }, { apiKey: "key\r\nInjected: yes" }, { senderAddress: "Name <a@example.com>" },
      { senderName: "Name\nBcc: attacker@example.com" }, { timeoutMs: 0 }, { timeoutMs: 10001 },
    ]) expect(await create({ ...config, ...overrides }, transport).send(message)).toEqual({ status: "rejected" });
    expect(await create(config, transport).send({ ...message, recipient: "a@example.com,b@example.com" })).toEqual({ status: "rejected" });
    expect(await create(config, transport).send({ ...message, subject: "Header\r\nBcc: secret" })).toEqual({ status: "rejected" });
    expect(transport).not.toHaveBeenCalled();
  });
});

it("keeps fake capture private, bounded and disabled in production", async () => {
  const production = createFakeAuthMailTransport("production");
  expect(await production.transport.send(message)).toEqual({ status: "disabled" });
  expect(production.drain()).toEqual([]);
  const fake = createFakeAuthMailTransport("test");
  for (let i = 0; i < 32; i++) expect(await fake.transport.send(message)).toEqual({ status: "accepted" });
  expect(await fake.transport.send(message)).toEqual({ status: "unavailable" });
  expect(fake.drain()).toHaveLength(32);
  expect(fake.drain()).toEqual([]);
  expect(await fake.transport.send(message)).toEqual({ status: "accepted" });
});
