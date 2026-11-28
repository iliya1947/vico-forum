import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { hashPassword, symmetricEncrypt } from "better-auth/crypto";
import { config, databaseName, scopes } from "./config";

const url = new URL(process.env.DATABASE_URL ?? "invalid:");
const secret = process.env.BETTER_AUTH_SECRET;
const clientSecret = process.env.FORUM_CONTROL_FIXTURE_CLIENT_SECRET;
const password = process.env.FORUM_CONTROL_FIXTURE_PASSWORD;
if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/" + databaseName ||
    !secret || !clientSecret || !password) throw new Error("Disposable browser fixture required");
const client = new Client({ connectionString: url.href });
await client.connect();
try {
  const db = await client.query("select current_database() db,current_schema() schema");
  if (db.rows[0]?.db !== databaseName || db.rows[0]?.schema !== "public") throw new Error("Wrong fixture database");
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  const hashed = await hashPassword(password);
  for (const id of [config.ownerUserId, "fixture-nonowner"]) {
    await client.query('insert into "user"(id,name,email,email_verified,created_at,updated_at) values($1,$1,$2,true,now(),now())',
      [id, id + "@example.test"]);
    await client.query("insert into account(id,account_id,provider_id,user_id,password,created_at,updated_at) values($1,$2,'credential',$2,$3,now(),now())",
      [crypto.randomUUID(), id, hashed]);
  }
  const stored = await symmetricEncrypt({ key: secret, data: clientSecret });
  await client.query("insert into oauth_client(id,client_id,client_secret,disabled,skip_consent,subject_type,scopes,redirect_uris,token_endpoint_auth_method,application_type,grant_types,response_types,require_pkce) values($1,$2,$3,false,false,'public',$4,$5,'client_secret_post','web',$6,$7,true)",
    [crypto.randomUUID(), config.clientId, stored, scopes, [config.redirectUri], ["authorization_code", "refresh_token"], ["code"]]);
  await client.query("insert into oauth_resource(id,identifier,name,access_token_ttl,allowed_scopes,disabled) values($1,$2,'Local fixture',300,$3,false)",
    [crypto.randomUUID(), config.resource, scopes]);
  await client.query("insert into oauth_client_resource(id,client_id,resource_id) values($1,$2,$3)",
    [crypto.randomUUID(), config.clientId, config.resource]);
} finally { await client.end(); }
