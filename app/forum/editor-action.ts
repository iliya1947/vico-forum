import { data, type ClientActionFunctionArgs } from "react-router";
import type { ForumMutationError } from "./mutations.server";

/** Server faults are still thrown/logged on the server. Keep the mounted browser form on failure. */
export async function editorClientAction({ serverAction, request }: ClientActionFunctionArgs) {
  try { return await serverAction(); }
  catch (error) {
    if (request.signal.aborted || (error instanceof Response && error.status >= 300 && error.status < 400)) throw error;
    return data<ForumMutationError>({ error: "unexpected" }, { status: 500 });
  }
}
