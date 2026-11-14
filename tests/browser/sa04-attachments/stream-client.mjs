/**
 * K5-only HTTP/1.1 chunked upload client. Chromium forbids streaming request
 * bodies on HTTP/1.x; this uses the real Worker ingress and real BA cookies.
 * The first body chunk is sent and held until the Python/PG barrier releases it.
 * JSON-lines protocol never logs the cookie or request bytes.
 */
import http from "node:http";
import readline from "node:readline";
const base = process.env.K5_BASE;
if (!base) throw new Error("K5_BASE required");
const endpoint = new URL(base);
if (!["localhost", "127.0.0.1"].includes(endpoint.hostname) || endpoint.protocol !== "http:") {
  throw new Error("only disposable local Worker HTTP is allowed");
}
let request = null;
let started = false;
let released = false;
function emit(value) { process.stdout.write(JSON.stringify(value) + "\n"); }
const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of input) {
  if (!line.trim()) continue;
  try {
    const cmd = JSON.parse(line);
    if (cmd.action === "start") {
      if (started) throw new Error("already started");
      started = true;
      const headers = {
        "Cookie": cmd.cookie,
        "Origin": base,
        "Content-Type": "text/plain",
        "X-Vico-Attachment-Id": cmd.attachment,
        "X-Vico-Attachment-Name": "k5-delayed.txt",
        "X-Vico-Attachment-Size": "16384",
        "X-Vico-Editor-Context": encodeURIComponent(cmd.context),
        "X-Vico-Operation-Id": cmd.operation,
      };
      request = http.request({
        hostname: endpoint.hostname, port: endpoint.port, method: "POST",
        path: "/api/attachments",
        headers,
      }, response => {
        const pieces = [];
        response.on("data", chunk => pieces.push(chunk));
        response.on("end", () => emit({
          event: "response", status: response.statusCode,
          cache: response.headers["cache-control"],
          body: Buffer.concat(pieces).toString("utf8"),
        }));
      });
      request.on("error", error => emit({ event: "error", error: String(error) }));
      request.write(Buffer.alloc(8192, 65));
      emit({ event: "first-chunk-sent", bytes: 8192 });
    } else if (cmd.action === "release") {
      if (!request || released) throw new Error("not started or already released");
      released = true;
      request.end(Buffer.alloc(8192, 66));
      emit({ event: "remainder-released", bytes: 8192 });
    } else if (cmd.action === "abort") {
      request?.destroy();
      emit({ event: "aborted" });
      break;
    } else {
      throw new Error("invalid command");
    }
  } catch (error) {
    emit({ event: "protocol-error", message: String(error) });
  }
}
