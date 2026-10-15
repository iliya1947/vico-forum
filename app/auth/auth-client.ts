import { createAuthClient } from "better-auth/react";

const client = createAuthClient();

export interface EmailAuthActions {
  signInWithEmail(email: string, password: string): Promise<boolean>;
  signUpWithEmail(name: string, email: string, password: string): Promise<boolean>;
}

export const emailAuthClientActions: EmailAuthActions = {
  async signInWithEmail(email, password) {
    const { data, error } = await client.signIn.email({ email, password });
    return !error && data != null;
  },
  async signUpWithEmail(name, email, password) {
    const { data, error } = await client.signUp.email({ name, email, password });
    return !error && data != null;
  },
};

export interface AuthClientActions {
  signInWithGoogle(callbackURL: string, handlers: AuthResultHandlers): Promise<unknown>;
  signOut(handlers: AuthResultHandlers): Promise<unknown>;
}

interface AuthResultHandlers {
  onSuccess(): void;
  onError(): void;
}

export const authClientActions: AuthClientActions = {
  signInWithGoogle(callbackURL, handlers) {
    return client.signIn.social(
      { provider: "google", callbackURL },
      { onSuccess: handlers.onSuccess, onError: handlers.onError },
    );
  },
  signOut(handlers) {
    return client.signOut({ fetchOptions: { onSuccess: handlers.onSuccess, onError: handlers.onError } });
  },
};
