import { describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import { authSessionContext } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { forumAttachmentStoreContext } from "../forum/attachment-request-context";
import { complaintQueueContext } from "../complaints/queue-context";
import { headers, loader } from "./attention";

function fixture(grants: readonly string[]) {
  const context = new RouterContextProvider();
  const has = vi.fn(async (permission: string) => grants.includes(permission));
  const readSecurityAttachmentEvents = vi.fn(async (page: number) => ({
    page, hasMore: false, events: [{
      id: "private-event", uploadId: "upload-1", uploadedByUserId: "uploader-1",
      contextKey: "topic:draft", draftId: "draft-1", fileName: "suspicious.exe",
      declaredMime: "application/octet-stream", detectedType: "executable",
      reason: "type mismatch", declaredByteSize: 32,
      createdAt: new Date("2026-11-06T02:00:00.000Z"),
    }],
  }));
  const readQueue = vi.fn(async () => ({ cases: [], total: 0, page: 0, hasMore: false }));
  context.set(authSessionContext, { user: { id: "reviewer" } } as never);
  context.set(authorizationContext, { forUser: () => ({ has }) } as never);
  context.set(forumAttachmentStoreContext, { readSecurityAttachmentEvents } as never);
  context.set(complaintQueueContext, { readQueue } as never);
  return { context, has, readSecurityAttachmentEvents, readQueue };
}
function request(f: ReturnType<typeof fixture>, search: string) {
  const url = new URL("https://forum.test/en/attention" + search);
  return loader({ request: new Request(url), url, context: f.context, params: { locale: "en" } });
}

describe("AP-10 admin.security private Attention boundary", () => {
  it("rejects security mode with private no-store 403 before any event lookup when effective right is removed", async () => {
    const f = fixture(["forum.helpNeedsDetails.manage", "forum.complaint.review"]);
    await expect(request(f, "?mode=security&group=attachments&page=0"))
      .rejects.toMatchObject({
        status: 403,
        headers: expect.objectContaining({ get: expect.any(Function) }),
      });
    try {
      await request(f, "?mode=security&group=attachments&page=0");
      throw new Error("security request should be denied");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).headers.get("Cache-Control")).toBe("private, no-store");
    }
    expect(f.has).toHaveBeenCalledWith("forum.attachmentSecurity.read");
    expect(f.readSecurityAttachmentEvents).not.toHaveBeenCalled();
    expect(headers()).toEqual({ "Cache-Control": "private, no-store" });

    // Other Attention modes keep their own current permissions and storage.
    const complaints = await request(f, "?mode=complaints&group=group1");
    expect(complaints).toMatchObject({
      mode: "complaints", group: "group1", canReadSecurityAttachments: false,
      complaintQueue: { total: 0 },
    });
    expect(f.readQueue).toHaveBeenCalledOnce();
    expect(f.readSecurityAttachmentEvents).not.toHaveBeenCalled();
  });

  it("reads only the requested security page for an actor with effective Security right", async () => {
    const f = fixture(["forum.attachmentSecurity.read"]);
    const response = await request(f, "?mode=security&group=attachments&page=2");
    expect(f.readSecurityAttachmentEvents).toHaveBeenCalledExactlyOnceWith(2);
    expect(response).toMatchObject({
      mode: "security", group: "attachments", canReadSecurityAttachments: true,
      canViewHelpAttention: false, canReviewComplaints: false,
      complaintQueue: null, queue: null, securityQueue: {
        page: 2, hasMore: false,
        events: [{ id: "private-event", createdAt: "2026-11-06T02:00:00.000Z" }],
      },
    });
    expect(f.readQueue).not.toHaveBeenCalled();
  });
});
