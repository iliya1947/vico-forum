import { createAuthClient } from "better-auth/react";

const client = createAuthClient();

export async function linkGoogleAccount(callbackURL: string, expectedUserId: string): Promise<boolean> {
  const { error } = await client.linkSocial({ provider: "google", callbackURL,
    errorCallbackURL: `${callbackURL}?linkError=1` }, {
    headers: { "x-vico-link-user": expectedUserId },
  });
  return !error;
}

export type VerificationResult = "ok" | "invalid" | "rate-limited" | "unavailable";
export type SignupResult = boolean | "closed" | "rate-limited" | "unavailable";

async function verificationRequest(endpoint: string, body?: Record<string, string>): Promise<VerificationResult> {
  try {
    const response = await fetch("/api/auth/" + endpoint, {
      method: body ? "POST" : "GET",
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
      credentials: "same-origin", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer",
    });
    if (response.status === 429) return "rate-limited";
    if (response.status >= 500) return "unavailable";
    if (!response.ok) return "invalid";
    const result: unknown = await response.json();
    return result && typeof result === "object" && "status" in result && result.status === true ? "ok" : "unavailable";
  } catch { return "unavailable"; }
}

export const verificationClientActions = {
  inspect: (token: string) => verificationRequest("inspect-email-verification?token=" + encodeURIComponent(token)),
  confirm: (token: string) => verificationRequest("verify-email", { token }),
  resend: (email: string, callbackURL: string) => verificationRequest("send-verification-email", { email, callbackURL }),
};

export interface EmailAuthActions {
  signInWithEmail(email: string, password: string): Promise<boolean>;
  signUpWithEmail(name: string, email: string, password: string, callbackURL?: string): Promise<SignupResult>;
}

export const emailAuthClientActions: EmailAuthActions = {
  async signInWithEmail(email, password) {
    const { data, error } = await client.signIn.email({ email, password });
    return !error && data != null;
  },
  async signUpWithEmail(name, email, password, callbackURL) {
    // The canonical endpoint deliberately returns a neutral acknowledgement
    // instead of the native session/user DTO. Do not trigger the native client
    // signup/session lifecycle or retry the request automatically.
    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, ...(callbackURL ? { callbackURL } : {}) }),
        credentials: "same-origin", cache: "no-store", redirect: "error",
      });
      if (response.status === 429) return "rate-limited";
      if (response.status >= 500) return "unavailable";
      const data: unknown = await response.json().catch(() => null);
      if (response.status === 403 && data && typeof data === "object" &&
          "code" in data && data.code === "vico_email_registration_closed") return "closed";
      return response.ok && !!data && typeof data === "object" && "status" in data && data.status === true &&
        "token" in data && data.token === null;
    } catch { return "unavailable"; }
  },
};

export interface AuthClientActions {
  signInWithGoogle(callbackURL: string, handlers: AuthResultHandlers, errorCallbackURL?: string): Promise<unknown>;
  signOut(handlers: AuthResultHandlers): Promise<unknown>;
}

interface AuthResultHandlers {
  onSuccess(): void;
  onError(): void;
}

export const authClientActions: AuthClientActions = {
  signInWithGoogle(callbackURL, handlers, errorCallbackURL) {
    return client.signIn.social(
      { provider: "google", callbackURL, ...(errorCallbackURL ? { errorCallbackURL } : {}) },
      { onSuccess: handlers.onSuccess, onError: handlers.onError },
    );
  },
  signOut(handlers) {
    return client.signOut({ fetchOptions: { onSuccess: handlers.onSuccess, onError: handlers.onError } });
  },
};
