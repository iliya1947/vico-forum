/** CI-only entrypoint selected by a temporary local Wrangler config.
 * Only the transport is substituted; the actual application, localization,
 * Better Auth, lifecycle transactions and mail rendering remain unchanged.
 * Synthetic messages are never exposed through an HTTP endpoint or logs.
 */
import { Client } from "pg";
import { createApplication } from "../../../workers/app";
import { createRequestAuthMailRuntime } from "../../../workers/auth-mail";
import { resolveRuntimeDatabaseConnectionStrings } from "../../../workers/database-bindings";
import type { AuthMailTransport } from "../../../app/auth/auth-mail-contract.server";

const localOrigin = "http://127.0.0.1:4242";
export const createConnectedMailRuntime: NonNullable<Parameters<typeof createApplication>[0]> = (env, context) => {
  const connectionString = resolveRuntimeDatabaseConnectionStrings(env).webConnectionString;
  const fakeTransport: AuthMailTransport = {
    async send(message) {
      if (env.BETTER_AUTH_URL !== localOrigin || env.AUTH_MAIL_MODE !== "fake" ||
          !["email-verification", "password-reset", "password-create", "email-change-confirmation", "email-change-verification"].includes(message.purpose) || !message.recipient.endsWith("@auth02b.test.invalid"))
        return { status: "rejected" };
      const client = new Client({ connectionString });
      await client.connect();
      try {
        const db = await client.query("select current_database() db,current_schema() schema");
        if (db.rows[0]?.db !== "vico_auth02b_browser_test" || db.rows[0]?.schema !== "public")
          return { status: "rejected" };
        // A separate connection must see the committed user, credential and
        // current proof before the fake transport accepts a rendered message.
        const result = await client.query(`
          insert into auth02b_test_mail(recipient,operation_id,subject,html,body_text)
          select $1,$2,$3,$4,$5
          where exists (
            select 1 from "user" u
              join verification v on v.id='vico-auth-lifecycle:v1:' || (case when $6 like 'email-change-%' then 'email-change' else $6 end) || ':' || encode(sha256(convert_to(u.id,'UTF8')),'hex')
            where (case when $6='email-change-verification' then v.value::jsonb->>'newEmail' else u.email end)=$1 and v.value::jsonb->>'generation'=$2
              and (
                ($6 in ('email-change-confirmation','email-change-verification') and u.email_verified
                  and exists(select 1 from session s where s.user_id=u.id and s.id=v.value::jsonb->>'sessionId')
                  and v.value::jsonb->>'phase'=case when $6='email-change-confirmation' then 'old-address' else 'new-address' end)
                or ($6 in ('email-verification','password-reset') and
                  exists(select 1 from account a where a.user_id=u.id and a.provider_id='credential'
                    and a.password is not null and a.password<>'')
                  and (($6='email-verification' and not u.email_verified
                    and not exists(select 1 from session s where s.user_id=u.id))
                    or ($6='password-reset' and u.email_verified)))
                or ($6='password-create' and u.email_verified
                  and exists(select 1 from account a where a.user_id=u.id and a.provider_id='google')
                  and not exists(select 1 from account a where a.user_id=u.id and a.provider_id='credential'
                    and a.password is not null and a.password<>'')
                  and exists(select 1 from session s where s.user_id=u.id and s.id=v.value::jsonb->>'sessionId'))
              )
          ) returning operation_id
        `, [message.recipient,message.operationId,message.subject,message.html,message.text,message.purpose]);
        return { status: result.rowCount === 1 ? "accepted" : "rejected" };
      } finally { await client.end(); }
    },
  };
  return createRequestAuthMailRuntime(env, context, "test", { fakeTransport });
};
export default createApplication(createConnectedMailRuntime);
