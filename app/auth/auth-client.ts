import { createAuthClient } from "better-auth/react";

const client = createAuthClient();

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
