import { isTransportUnavailableCode } from "../app/localization/persistent-registry";

const postgresUnavailableCodes = new Set(["57P01", "57P02", "57P03", "53300"]);
const codeLessTransportMessages = new Set(["Connection terminated unexpectedly"]);

export function isPostgresConnectAvailabilityFailure(error: unknown): boolean {
  const code =
    error && (typeof error === "object" || typeof error === "function")
      ? (error as { code?: unknown }).code
      : undefined;

  if (typeof code === "string") {
    return code.startsWith("08") || postgresUnavailableCodes.has(code) || isTransportUnavailableCode(code);
  }

  return error instanceof Error && codeLessTransportMessages.has(error.message);
}
