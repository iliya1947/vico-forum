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
import { Client } from "pg";
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
if (!["localhost", "127.0.0.1"].includes(dbUrl.hostname) || !dbUrl.pathname.endsWith("_test")) {
  throw new Error("K5 local R2 cleanup bridge requires loopback *_test PostgreSQL");
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
      const created = await bucket.put(command.key, "", {
        onlyIf: new Headers({ "If-None-Match": "*" }),
        customMetadata: { kind: ATTACHMENT_RESERVATION_KIND },
      });
      if (!created) throw new Error("synthetic orphan reservation key already occupied");
      result = { reserved: true };
      break;
    }
    case "cleanup": {
      client = new Client({ connectionString });
      await client.connect();
      const batch = command.batch ?? 20;
      result = await new ForumAttachmentCleanup(
        drizzle(client), privateAttachmentBucket(bucket),
      ).runOnce(batch);
      break;
    }
    default:
      throw new Error("unknown K5 R2 command");
  }
  process.stdout.write("SA04_K5_R2_RESULT " + JSON.stringify(result) + "\n");
} finally {
  if (client) await client.end();
  await platform.dispose();
}
