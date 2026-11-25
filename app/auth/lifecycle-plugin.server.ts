import type { BetterAuthPlugin } from "better-auth";
import type { Client } from "pg";
import type { AuthLifecycleTransaction } from "./lifecycle-transaction.server";
import { AuthLifecycleState } from "./lifecycle-state.server";

/** The single canonical server extension; no endpoint is registered in AUTH-02a.
 * Future endpoint replacements share this request-local state/transaction owner.
 */
export function authLifecyclePlugin(client: Pick<Client, "query">,
  transaction: AuthLifecycleTransaction) {
  const state = new AuthLifecycleState(client, transaction);
  return {
    id: "vico-auth-lifecycle",
    init: () => ({ context: { vicoAuthLifecycle: state } }),
  } satisfies BetterAuthPlugin;
}
