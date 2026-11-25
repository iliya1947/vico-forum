/** Private server capability. Neither messages nor transport errors are public DTOs. */
export const authMailPurposes = [
  "email-verification", "password-reset", "password-create",
  "email-change-confirmation", "email-change-verification",
] as const;
export type AuthMailPurpose = typeof authMailPurposes[number];
export type AuthMailStatus = "accepted" | "rejected" | "unavailable" | "uncertain" | "disabled";
export interface AuthMailResult { readonly status: AuthMailStatus }
export interface AuthMailInput {
  readonly purpose: AuthMailPurpose;
  readonly recipient: string;
  readonly locale: string;
  readonly actionURL: string;
  /** Opaque server-generated UUID; never an email, URL or token. */
  readonly operationId: string;
}
export interface AuthMailMessage {
  readonly purpose: AuthMailPurpose;
  readonly recipient: string;
  readonly operationId: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}
export interface AuthMailTransport {
  send(message: AuthMailMessage): Promise<AuthMailResult>;
}
export type AuthMailExecution = "local" | "test" | "production";
export type AuthMailFetch = (url: string, init: RequestInit) => Promise<Response>;

export class AuthMailValidationError extends Error {
  constructor() { super("Invalid authentication mail input"); this.name = "AuthMailValidationError"; }
}
export function isMailPurpose(value: unknown): value is AuthMailPurpose {
  return typeof value === "string" && (authMailPurposes as readonly string[]).includes(value);
}
/** Headers/envelope values cannot contain invisible controls or a mailbox list. */
export function safeMailHeader(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max
    && value.trim() === value && !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(value);
}
export function safeMailAddress(value: unknown): value is string {
  if (!safeMailHeader(value, 254)) return false;
  const parts = value.split("@");
  if (parts.length !== 2 || parts[0].length > 64 || !parts[0]
    || parts[0].startsWith(".") || parts[0].endsWith(".") || parts[0].includes("..")) return false;
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(parts[0])) return false;
  const labels = parts[1].split(".");
  return labels.length >= 2 && labels.every(label =>
    label.length <= 63 && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label));
}
export function safeMailOperationId(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export function validMailMessage(message: AuthMailMessage): boolean {
  return !!message && isMailPurpose(message.purpose) && safeMailAddress(message.recipient)
    && safeMailOperationId(message.operationId) && safeMailHeader(message.subject, 200)
    && typeof message.html === "string" && message.html.length > 0 && message.html.length <= 65536
    && typeof message.text === "string" && message.text.length > 0 && message.text.length <= 16384;
}
