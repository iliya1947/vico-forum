/**
 * React Router may generate an error response without preserving resource
 * headers. Protect private attachment reads (GET/HEAD) and all failed writes
 * without changing the public forum read-cache policy or normal error body.
 */
function isPrivateAttachmentPath(pathname: string): boolean {
  // React Router accepts case-insensitive static paths, percent-encoded static
  // segments and any number of trailing slashes. Match those resource paths, not
  // only the original encoded request pathname.
  const segments = pathname.split("/");
  while (segments.at(-1) === "") segments.pop();
  if (segments.length !== 3 && segments.length !== 5) return false;
  try {
    if (decodeURIComponent(segments[1]).toLowerCase() !== "api"
      || decodeURIComponent(segments[2]).toLowerCase() !== "attachments") return false;
    if (segments.length === 3) return true;
    return decodeURIComponent(segments[3]).toLowerCase() === "file" && segments[4].length > 0;
  } catch {
    // Malformed encoding must never cause the failure-response wrapper to fail.
    return false;
  }
}

/** Match the registered canonical resource and its accepted static/data aliases. */
export function isOwnerAccountLifecyclePath(pathname: string): boolean {
  const segments = pathname.split("/");
  while (segments.at(-1) === "") segments.pop();
  if (segments.length !== 6 || !segments[1] || !segments[3]) return false;
  try {
    const last = decodeURIComponent(segments[5]).toLowerCase();
    return decodeURIComponent(segments[2]).toLowerCase() === "users"
      && decodeURIComponent(segments[4]).toLowerCase() === "owner"
      && (last === "deactivate" || last === "deactivate.data");
  } catch { return false; }
}

export function protectFrameworkFailure(request: Request, response: Response): Response {
  const privateBoundary = isOwnerAccountLifecyclePath(new URL(request.url).pathname)
    || isOwnerMonitoringPath(new URL(request.url).pathname)
    || isPrivateForumReadPath(new URL(request.url).pathname);
  if (!privateBoundary && (response.status < 500 || response.status > 599)) return response;
  const privateAttachmentRead = (request.method === "GET" || request.method === "HEAD")
    && isPrivateAttachmentPath(new URL(request.url).pathname);
  if (!privateBoundary && (request.method === "GET" || request.method === "HEAD") && !privateAttachmentRead) {
    return response;
  }
  const protectedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });
  protectedResponse.headers.set("Cache-Control", "private, no-store");
  return protectedResponse;
}

/** All registered Owner pages share this private prefix, including static/data aliases. */
export function isOwnerMonitoringPath(pathname:string):boolean {
  const segments=pathname.split("/");
  if(!segments[1]||!segments[2])return false;
  try{return ["super-admin","super-admin.data"].includes(decodeURIComponent(segments[2]).toLowerCase());}
  catch{return false;}
}

/** Private Forum administration reads, including Router static/data aliases. */
export function isPrivateForumReadPath(pathname:string):boolean {
  const parts=pathname.split("/");while(parts.at(-1)==="")parts.pop();
  try {
    const p=parts.map(part=>decodeURIComponent(part).toLowerCase());
    if(!p[1]||p[2]!=="admin")return false;
    if(p.length===4)return p[3]==="forum"||p[3]==="forum.data";
    if(p[3]!=="forum")return false;
    if(p.length===5)return ["content","content.data","destinations","destinations.data"].includes(p[4]);
    if(p.length===6)return ["categories","sections","topics"].includes(p[4])&&!!p[5];
    return p.length===7&&p[4]==="topics"&&!!p[5]&&["move","move.data","inspect","inspect.data"].includes(p[6]);
  }catch{return false;}
}
