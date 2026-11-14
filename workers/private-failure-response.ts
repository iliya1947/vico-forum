/**
 * React Router may generate an error response without preserving resource
 * headers. Protect private attachment reads (GET/HEAD) and all failed writes
 * without changing the public forum read-cache policy or normal error body.
 */
export function protectFrameworkFailure(request: Request, response: Response): Response {
  if (response.status < 500 || response.status > 599) return response;
  const pathname = new URL(request.url).pathname;
  const privateAttachmentRead = (request.method === "GET" || request.method === "HEAD")
    && (pathname === "/api/attachments" || pathname.startsWith("/api/attachments/file/"));
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
