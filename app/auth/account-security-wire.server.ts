const ownPaths = new Set(["/change-email", "/confirm-email-change", "/unlink-account"]);
const privateHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

/** Inspect the wire representation before better-call collapses object keys.
 * These endpoints accept flat JSON objects. Their strict schemas still own
 * the field/type allowlist, for HTTP and direct calls alike.
 */
export async function validateAccountSecurityWire(request: Request, baseURL: string): Promise<{ response: Response } | undefined> {
  const base = new URL(baseURL).pathname.replace(/\/$/, "");
  const path = new URL(request.url).pathname.replace(/\/+$/, "").slice(base.length);
  if (request.method !== "POST" || !ownPaths.has(path)) return;
  const reject = (status: number) => ({ response: Response.json({ message: "Invalid request", code: "BAD_REQUEST" },
    { status, headers: privateHeaders }) });
  // Match the router's supported media type explicitly, including parameters.
  if (request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return reject(415);
  const reader = request.clone().body?.getReader();
  if (!reader) return reject(400);
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let text = "", size = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 16_384) return reject(413);
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return reject(400);
    // Tokenize strings as indivisible units, so escaped quotes, colons and
    // braces inside values cannot be mistaken for member names or structure.
    const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}[\]:,]/g) ?? [];
    const names = new Set<string>();
    let depth = 0;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === "{" || token === "[") depth++;
      else if (token === "}" || token === "]") depth--;
      else if (depth === 1 && token.startsWith('"') && tokens[i + 1] === ":") {
        const name = JSON.parse(token) as string;
        if (names.has(name)) return reject(400);
        names.add(name);
      }
    }
  } catch { return reject(400); }
  finally { void reader.cancel().catch(() => {}); }
}
