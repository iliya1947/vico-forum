import { APIError, createAuthEndpoint, dispatchAuthEndpoint, signInEmail, type AuthEndpoint } from "better-auth/api";
import type { Client } from "pg";
import { AccountInactiveError, AccountMissingError, assertActiveAccountForMutation } from "../../db/account-state";
import type { AuthLifecycleTransaction } from "./lifecycle-transaction.server";

type Native = ReturnType<typeof signInEmail>;
const native: Native = signInEmail();
type NativeResult = Native extends AuthEndpoint<"/sign-in/email", Native["options"], infer Result> ? Result : never;

export function credentialSignIn(
  client: Pick<Client, "query">, transaction: AuthLifecycleTransaction, onActorStateError?: (error: unknown) => void,
): Native {
  return createAuthEndpoint<"/sign-in/email", Native["options"], NativeResult>(native.path, native.options, async ctx => {
    const password = ctx.context.password;
    try {
      const result = await transaction.run(() => dispatchAuthEndpoint(native, {
        ...ctx,
        context: {
          ...ctx.context,
          password: {
            ...password,
            verify: async input => {
              if (!await password.verify(input)) return false;
              // The native endpoint has checked the password. Hold the same subject
              // lock as reset until session creation commits, and reject an older
              // credential if reset took the lock first.
              const email = ctx.body.email.toLowerCase();
              const user = await client.query<{ id: string }>('select id from "user" where email=$1', [email]);
              if (!user.rows[0]) return false;
              const id = user.rows[0].id;
              try { await assertActiveAccountForMutation(client, id); }
              catch (error) {
                if (!(error instanceof AccountMissingError) && !(error instanceof AccountInactiveError)) onActorStateError?.(error);
                throw error;
              }
              const current = await client.query(`
                select 1 from account a join "user" u on u.id=a.user_id
                where a.user_id=$1 and a.account_id=$1 and a.provider_id='credential'
                  and a.password=$2 and u.email=$3
              `, [id, input.hash, email]);
              return current.rowCount === 1;
            },
          },
        },
        asResponse: false,
        returnHeaders: true,
      })) as { response: NativeResult; headers?: Headers };
      result.headers?.forEach((value, key) => ctx.responseHeaders.append(key, value));
      return ctx.json(result.response);
    } catch (error) {
      if (error instanceof AccountInactiveError || error instanceof AccountMissingError) {
        throw new APIError("UNAUTHORIZED", { message: "Unauthorized" }, { "Cache-Control": "private, no-store" });
      }
      throw error;
    }
  });
}
