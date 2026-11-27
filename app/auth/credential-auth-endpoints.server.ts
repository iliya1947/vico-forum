import { APIError, changePassword, createAuthEndpoint, dispatchAuthEndpoint, getSessionFromCtx, signInEmail, type AuthEndpoint } from "better-auth/api";
import type { Client } from "pg";
import { AccountInactiveError, AccountMissingError, assertActiveAccountForMutation } from "../../db/account-state";
import type { AuthLifecycleState } from "./lifecycle-state.server";
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


type NativeChange = typeof changePassword;
type NativeChangeResult = NativeChange extends AuthEndpoint<"/change-password", NativeChange["options"], infer Result> ? Result : never;

export function credentialChangePassword(
  client: Pick<Client, "query">, transaction: AuthLifecycleTransaction, state: AuthLifecycleState, onActorStateError?: (error: unknown) => void,
): NativeChange {
  return createAuthEndpoint<"/change-password", NativeChange["options"], NativeChangeResult>(
    changePassword.path, changePassword.options, async ctx => {
      const password = ctx.context.password;
      try {
        const result = await transaction.run(async () => {
          const actor = await getSessionFromCtx({ ...ctx, context: { ...ctx.context, session: null } },
            { disableCookieCache: true, disableRefresh: true });
          if (!actor) throw new APIError("UNAUTHORIZED", { message: "Unauthorized" });
          const response = await dispatchAuthEndpoint(changePassword, {
            ...ctx,
            context: {
              ...ctx.context,
              password: {
                ...password,
                verify: async input => {
                  if (!await password.verify(input)) return false;
                  try { await assertActiveAccountForMutation(client, actor.user.id); }
                  catch (error) {
                    if (!(error instanceof AccountInactiveError) && !(error instanceof AccountMissingError)) onActorStateError?.(error);
                    throw error;
                  }
                  // If recovery won the lock, the old proof and the initiating
                  // session are no longer authority for a password change.
                  const current = await client.query(`
                    select 1 from account a join session s on s.user_id=a.user_id
                    where a.user_id=$1 and a.provider_id='credential' and a.password=$2
                      and s.id=$3 and s.expires_at > timezone('UTC', clock_timestamp())
                  `, [actor.user.id, input.hash, actor.session.id]);
                  return current.rowCount === 1;
                },
              },
            },
            asResponse: false,
            returnHeaders: true,
          });
          await state.withSubject(actor.user.id, subject => subject.invalidate(["password-reset", "password-create"]));
          return response;
        }) as { response: NativeChangeResult; headers?: Headers };
        result.headers?.forEach((value, name) => ctx.responseHeaders.append(name, value));
        return ctx.json(result.response);
      } catch (error) {
        if (error instanceof AccountInactiveError || error instanceof AccountMissingError) {
          throw new APIError("UNAUTHORIZED", { message: "Unauthorized" }, { "Cache-Control": "private, no-store" });
        }
        throw error;
      }
    });
}
