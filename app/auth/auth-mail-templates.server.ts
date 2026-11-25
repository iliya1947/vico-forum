import type { UiKey } from "../localization/catalog";
import type { ResolvedLocaleContext } from "../localization/locale";
import type { TranslationResourceLoader } from "../localization/resource-loader";
import { createTranslationRuntime } from "../localization/runtime";
import { AuthMailValidationError, safeMailHeader, type AuthMailPurpose } from "./auth-mail-contract.server";

const templateKeys = {
  "email-verification": ["authMailVerifySubject", "authMailVerifyBody", "authMailVerifyAction"],
  "password-reset": ["authMailResetSubject", "authMailResetBody", "authMailResetAction"],
  "password-create": ["authMailCreateSubject", "authMailCreateBody", "authMailCreateAction"],
  "email-change-confirmation": ["authMailChangeConfirmSubject", "authMailChangeConfirmBody", "authMailChangeConfirmAction"],
  "email-change-verification": ["authMailChangeVerifySubject", "authMailChangeVerifyBody", "authMailChangeVerifyAction"],
} as const satisfies Record<AuthMailPurpose, readonly UiKey<"common">[]>;

function escapeHTML(value: string): string {
  return value.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

export async function renderAuthMail(
  purpose: AuthMailPurpose, actionURL: string, locale: ResolvedLocaleContext,
  resources: Pick<TranslationResourceLoader, "load">,
): Promise<{ subject: string; html: string; text: string }> {
  const snapshot = await resources.load(locale, ["common"]);
  const runtime = createTranslationRuntime(snapshot);
  const [subjectKey, bodyKey, actionKey] = templateKeys[purpose];
  const subject = runtime.t(subjectKey);
  const body = runtime.t(bodyKey);
  const action = runtime.t(actionKey);
  const ignore = runtime.t("authMailIgnore");
  const link = runtime.t("authMailLink");
  if (!safeMailHeader(subject, 200) || [body, action, ignore, link].some(value =>
    typeof value !== "string" || value.length > 2000 || /[\p{Cc}\p{Cf}]/u.test(value))) {
    throw new AuthMailValidationError();
  }
  const url = escapeHTML(actionURL);
  return {
    subject,
    html: `<!doctype html><html lang="${escapeHTML(locale.translationLocale)}" dir="${locale.direction}"><head><meta charset="utf-8"></head><body><h1>${escapeHTML(subject)}</h1><p>${escapeHTML(body)}</p><p><a href="${url}">${escapeHTML(action)}</a></p><p>${escapeHTML(link)}<br><bdi dir="ltr">${url}</bdi></p><p>${escapeHTML(ignore)}</p></body></html>`,
    text: `${subject}\n\n${body}\n\n${action}\n\u2066${actionURL}\u2069\n\n${ignore}`,
  };
}
