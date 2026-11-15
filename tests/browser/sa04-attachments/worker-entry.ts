/**
 * CI-only Worker entrypoint. The production fetch handler is delegated unchanged.
 * This file is selected only by the disposable K5 workflow's temporary Wrangler
 * config, never by repository/production wrangler.jsonc.
 *
 * A loopback/secret-protected probe is necessary to execute the real cleanup
 * class against the SAME local R2 binding as the active Worker HTTP upload.
 */
import app from "../../../workers/app";
import { ForumAttachmentCleanup } from "../../../db/forum-attachment-cleanup";
import { privateAttachmentBucket } from "../../../workers/attachment-storage";
import { resolveRuntimeDatabaseConnectionStrings } from "../../../workers/database-bindings";
import { isFencedAttachmentKey } from "../../../app/forum/attachment-storage-protocol";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

type K5Env = Env & { K5_CLEANUP_TOKEN?: string; ATTACHMENT_R2?: R2Bucket };

export default {
  async fetch(request: Request, env: K5Env, context?: ExecutionContext): Promise<Response> {
    if (new URL(request.url).pathname !== "/__sa04_k5_storage_probe") {
      return app.fetch(request, env, context);
    }
    // This branch exists in CI-only local build. Never accept requests outside
    // loopback; explicitly require the local fixture token as an additional gate.
    if (new URL(request.url).hostname !== "127.0.0.1" || request.method !== "POST"
      || !env.K5_CLEANUP_TOKEN || request.headers.get("X-K5-Token") !== env.K5_CLEANUP_TOKEN
      || !env.ATTACHMENT_R2) return new Response(null, { status: 404 });
    const input: unknown = await request.json();
    if (!input || typeof input !== "object" || !("operation" in input)) {
      return new Response(null, { status: 400 });
    }
    const operation = (input as { operation: unknown }).operation;
    if (operation === "head") {
      const key = (input as { key?: unknown }).key;
      if (typeof key !== "string" || !isFencedAttachmentKey(key)) {
        return new Response(null, { status: 400 });
      }
      const metadata = await env.ATTACHMENT_R2.head(key);
      return Response.json({ exists: metadata !== null, size: metadata?.size ?? null });
    }
    if (operation !== "cleanup") return new Response(null, { status: 400 });
    const connection = resolveRuntimeDatabaseConnectionStrings(env).webConnectionString;
    const client = new Client({ connectionString: connection });
    await client.connect();
    try {
      const result = await new ForumAttachmentCleanup(
        drizzle(client), privateAttachmentBucket(env.ATTACHMENT_R2),
      ).runOnce(20);
      return Response.json(result);
    } finally {
      await client.end();
    }
  },
} satisfies ExportedHandler<K5Env>;
