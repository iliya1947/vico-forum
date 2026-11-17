/**
 * CI-only bridge to the exact local Miniflare ATTACHMENT_R2 persistence used
 * by the built Worker. It does not replace any application or Worker boundary.
 *
 * Inputs are one JSON request on stdin; no persistent test endpoint, secrets,
 * remote R2 bindings or production configuration are created.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client,Pool } from "pg";
import {PostgresOwnerOperationalFactSink} from "../../../db/owner-operational-facts";
import {PostgresOwnerStorageObservations} from "../../../db/owner-storage-observations";
import {StorageObservationCollector} from "../../../app/observability/storage-observations";
import { getPlatformProxy } from "wrangler";
import { ForumAttachmentCleanup } from "../../../db/forum-attachment-cleanup";
import { privateAttachmentBucket } from "../../../workers/attachment-storage";
import { ATTACHMENT_RESERVATION_KIND, isFencedAttachmentKey } from "../../../app/forum/attachment-storage-protocol";

type Action =
  | { action: "inspect"; key: string }
  | { action: "cleanup"; batch?: number }
  | { action: "orphan-reservation"; key: string };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Disposable DATABASE_URL required");
const dbUrl = new URL(connectionString);
if (process.env.CI!=="true" || !["localhost", "127.0.0.1"].includes(dbUrl.hostname) || dbUrl.pathname!=="/vico_sa07_browser_test") {
  throw new Error("SA07 local R2 cleanup bridge requires loopback *_test PostgreSQL");
}
const configPath = resolve("wrangler.jsonc");
const config = JSON.parse(readFileSync(configPath, "utf8")) as {
  r2_buckets?: Array<{ binding: string; bucket_name: string; remote?: boolean }>;
};
if (config.r2_buckets?.length !== 1
  || config.r2_buckets[0]?.binding !== "ATTACHMENT_R2"
  || config.r2_buckets[0]?.bucket_name !== "sa04-k5-local-attachments"
  || config.r2_buckets[0]?.remote !== false) {
  throw new Error("K5 refuses absent, remote or unexpected R2 binding");
}
const command = JSON.parse(readFileSync(0, "utf8")) as Action;
if ((command.action === "inspect" || command.action === "orphan-reservation")
  && !isFencedAttachmentKey(command.key)) {
  throw new Error("invalid synthetic fenced object key");
}
const platform = await getPlatformProxy<{ ATTACHMENT_R2: R2Bucket }>({
  configPath, persist: true, remoteBindings: false,
});
const bucket = platform.env.ATTACHMENT_R2;
let client: Client | undefined;
const pool=new Pool({connectionString,max:1}),samples=new StorageObservationCollector(new PostgresOwnerStorageObservations(pool));
try {
  let result: unknown;
  switch (command.action) {
    case "inspect": {
      const object = await bucket.get(command.key);
      result = !object ? { exists: false } : {
        exists: true, size: object.size,
        kind: object.customMetadata?.kind ?? null,
        // Check the real payload, not merely PostgreSQL metadata or a mock.
        base64: Buffer.from(await object.arrayBuffer()).toString("base64"),
      };
      break;
    }
    case "orphan-reservation": {
      // This is a unique, synthetic marker fixture, not the application
      // reservation path. Miniflare's Node proxy cannot serialize Headers;
      // use an explicit fresh-key check and ordinary local-only PUT instead.
      if (await bucket.head(command.key)) {
        throw new Error("synthetic orphan reservation key already occupied");
      }
      const created = await bucket.put(command.key, "", {
        customMetadata: { kind: ATTACHMENT_RESERVATION_KIND },
      });
      if (!created) throw new Error("synthetic orphan reservation creation failed");
      result = { reserved: true };
      break;
    }
    case "cleanup": {
      client = new Client({ connectionString });
      await client.connect();
      const batch = command.batch ?? 20;
      result = await new ForumAttachmentCleanup(
        drizzle(client), privateAttachmentBucket(bucket,samples.capture),undefined,new PostgresOwnerOperationalFactSink(pool),
      ).runOnce(batch);
      break;
    }
    default:
      throw new Error("unknown K5 R2 command");
  }
  process.stdout.write("SA07_R2_RESULT " + JSON.stringify(result) + "\n");
} finally {
  await samples.flush();
  if (client) await client.end();
  await pool.end();
  await platform.dispose();
}
