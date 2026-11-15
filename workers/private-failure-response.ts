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

export function protectFrameworkFailure(request: Request, response: Response): Response {
  if (response.status < 500 || response.status > 599) return response;
  const privateAttachmentRead = (request.method === "GET" || request.method === "HEAD")
    && isPrivateAttachmentPath(new URL(request.url).pathname);
  if ((request.method === "GET" || request.method === "HEAD") && !privateAttachmentRead) {
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
