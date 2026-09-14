import type { RouterContextProvider } from "react-router";
import {
  authRuntimeContext,
  authSessionContext,
  type AuthRuntime,
} from "./request-context";

/** Resolves Better Auth exactly once before React Router handles this request. */
export async function initializeAuthContext(
  context: RouterContextProvider,
  request: Request,
  runtime: AuthRuntime,
): Promise<void> {
  context.set(authRuntimeContext, runtime);
  context.set(authSessionContext, await runtime.getSession(request.headers));
}
