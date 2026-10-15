import type { RouterContextProvider } from "react-router";
import { authRuntimeForRequest } from "../auth/request-context";

interface RouteArgs {
  request: Request;
  context: RouterContextProvider;
}

function handle({ request, context }: RouteArgs) {
  return authRuntimeForRequest(context).handle(request);
}

export const loader = handle;
export const action = handle;
