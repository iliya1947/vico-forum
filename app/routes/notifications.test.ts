import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { authSessionContext, type AuthSession } from "../auth/request-context";
import { forumReaderContext, forumWriterContext } from "../forum/request-context";
import { ForumEntityNotFoundError } from "../../db/forum-repository";
import { action, loader } from "./notifications";

const session = {
  user: { id: "user-1", name: "Ada", email: "ada@example.test", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
  session: { id: "session-1", token: "token", userId: "user-1", expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
} satisfies AuthSession;

function context(authenticated = true) {
  const value = new RouterContextProvider();
  value.set(authSessionContext, authenticated ? session : null);
  return value;
}

function openRequest({
  origin = "https://forum.example",
  notificationId = "notification-1",
}: {
  origin?: string | null;
  notificationId?: string | null;
} = {}) {
  const body = new URLSearchParams({ intent: "open" });
  if (notificationId !== null) body.set("notificationId", notificationId);
  return new Request("https://forum.example/en/notifications", {
    method: "POST",
    headers: {
      ...(origin ? { Origin: origin } : {}),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

function responseStatus(value: unknown) {
  return (value as { init: { status: number } }).init.status;
}

describe("notifications route", () => {
  it("requires an authenticated session", async () => {
    await expect(loader({ params: { locale: "en" }, context: context(false) }))
      .rejects.toMatchObject({ status: 401 });
  });

  it("rejects duplicate, unknown and invalid inbox pages but accepts a normalized Framework URL",async()=>{
    const value=context();
    const readNotifications=vi.fn(async(_userId:string,page:number)=>({page,total:0,hasMore:false,items:[]}));
    value.set(forumReaderContext,{readNotifications} as never);
    for(const search of ["?page=1&page=2","?unused=1","?page=-1","?page=10001","?page=01","?page=abc"]){
      await expect(loader({params:{locale:"en"},context:value,url:new URL("https://forum.example/en/notifications"+search)}))
        .rejects.toMatchObject({status:400});
    }
    expect(readNotifications).not.toHaveBeenCalled();
    // Raw Framework data URL may contain _routes; the passed url is normalized application URL.
    const result=await loader({params:{locale:"en"},context:value,
      url:new URL("https://forum.example/en/notifications?page=12")});
    expect(result.page).toBe(12);
    expect(readNotifications).toHaveBeenCalledExactlyOnceWith("user-1",12);
  });

  it("loads the current user's unified notifications with serialized timestamps", async () => {
    const value = context();
    const readNotifications = vi.fn(async () => ({page:0,total:1,hasMore:false,items:[{
      id: "notification-1",
      kind:"reply" as const,
      actorName: "Grace",
      topicId: "topic-1",
      topicTitle: "Typed APIs",
      postId: "post-2",
      createdAt: new Date("2026-10-03T10:00:00Z"),
      readAt: null,
    }]}));
    value.set(forumReaderContext, { readNotifications } as never);

    const result = await loader({ params: { locale: "ru" }, context: value });

    expect(readNotifications).toHaveBeenCalledWith("user-1",0);
    expect(result).toEqual({
      locale: "ru",page:0,total:1,hasMore:false,
      notifications: [{
        id: "notification-1",kind:"reply",
        actorName: "Grace",
        topicId: "topic-1",
        topicTitle: "Typed APIs",
        postId: "post-2",
        createdAt: "2026-10-03T10:00:00.000Z",
        readAt: null,
      }],
    });
  });

  it("rejects duplicate, unknown, oversized and invalid notification POST before mutation",async()=>{
    const contextValue=context();
    const markNotificationRead=vi.fn();
    contextValue.set(forumWriterContext,{markNotificationRead} as never);
    const request=(body:BodyInit,contentType="application/x-www-form-urlencoded")=>new Request(
      "https://forum.example/en/notifications",{method:"POST",
      headers:{Origin:"https://forum.example","Content-Type":contentType},body});
    const invalid=[
      request("intent=open&notificationId=notification-1&notificationId=other"),
      request("intent=open&intent=open&notificationId=notification-1"),
      request("intent=open&notificationId=notification-1&extra=value"),
      request("intent=open&notificationId=notification-1&padding="+"x".repeat(65536)),
      request("intent=open&notificationId="+"x".repeat(129)),
      request("intent=open&notificationId=%20%20"),
      request("intent=edit&notificationId=notification-1"),
      request("intent=open"),
      request("intent=open&notificationId=notification-1","text/plain"),
      request(new Uint8Array([255])),
    ];
    for(const item of invalid){
      const result=await action({request:item,params:{locale:"en"},context:contextValue});
      expect(responseStatus(result)).toBe(400);
    }
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it("rejects a guest action before reading notification storage", async () => {
    const value = context(false);
    const markNotificationRead = vi.fn();
    value.set(forumWriterContext, { markNotificationRead } as never);

    const result = await action({
      request: openRequest(),
      params: { locale: "en" },
      context: value,
    });

    expect(responseStatus(result)).toBe(401);
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin action before reading notification storage", async () => {
    const value = context();
    const markNotificationRead = vi.fn();
    value.set(forumWriterContext, { markNotificationRead } as never);

    const result = await action({
      request: openRequest({ origin: "https://evil.example" }),
      params: { locale: "en" },
      context: value,
    });

    expect(responseStatus(result)).toBe(403);
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it("rejects a missing notification ID before reading notification storage", async () => {
    const value = context();
    const markNotificationRead = vi.fn();
    value.set(forumWriterContext, { markNotificationRead } as never);

    const result = await action({
      request: openRequest({ notificationId: null }),
      params: { locale: "en" },
      context: value,
    });

    expect(responseStatus(result)).toBe(400);
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it("returns not found for an invalid notification ID", async () => {
    const value = context();
    const markNotificationRead = vi.fn(async () => {
      throw new ForumEntityNotFoundError("notification does not exist");
    });
    value.set(forumWriterContext, { markNotificationRead } as never);

    const result = await action({
      request: openRequest({ notificationId: "missing-notification" }),
      params: { locale: "en" },
      context: value,
    });

    expect(responseStatus(result)).toBe(404);
    expect(markNotificationRead).toHaveBeenCalledExactlyOnceWith({
      userId: "user-1",
      notificationId: "missing-notification",
    });
  });

  it("marks the selected notification read and redirects to its reply", async () => {
    const value = context();
    const markNotificationRead = vi.fn(async () => ({ kind:"reply" as const,topicId: "topic-1", postId: "post-2" }));
    value.set(forumWriterContext, { markNotificationRead } as never);

    const request = new Request("https://forum.example/ru/notifications", {
      method: "POST",
      headers: {
        Origin: "https://forum.example",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        intent: "open",
        notificationId: "notification-1",
      }),
    });

    const response = await action({ request, params: { locale: "ru" }, context: value });

    expect(markNotificationRead).toHaveBeenCalledWith({
      userId: "user-1",
      notificationId: "notification-1",
    });
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get("Location")).toBe("/ru/topics/topic-1#post-post-2");
  });it("opens a complaint result through the same private notification action",async()=>{
    const value=context();
    const markNotificationRead=vi.fn(async()=>({kind:"complaint-decision" as const,caseId:"case-7"}));
    value.set(forumWriterContext,{markNotificationRead} as never);
    const response=await action({request:openRequest(),params:{locale:"en"},context:value});
    expect((response as Response).headers.get("Location")).toBe("/en/complaints/case-7/result");
    expect(markNotificationRead).toHaveBeenCalledWith({userId:"user-1",notificationId:"notification-1"});
  });
  it("opens own Appeal result at its immutable anchor",async()=>{
    const value=context();
    const markNotificationRead=vi.fn(async()=>({kind:"complaint-appeal-result" as const,caseId:"case-7",appealId:"appeal-2"}));
    value.set(forumWriterContext,{markNotificationRead} as never);
    const response=await action({request:openRequest(),params:{locale:"he"},context:value});
    expect((response as Response).headers.get("Location")).toBe("/he/complaints/case-7/result#appeal-appeal-2");
    expect((response as Response).headers.get("Cache-Control")).toBe("private, no-store");
    expect(markNotificationRead).toHaveBeenCalledExactlyOnceWith({userId:"user-1",notificationId:"notification-1"});
  });
});
