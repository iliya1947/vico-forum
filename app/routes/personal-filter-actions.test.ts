import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { forumWriterContext } from "../forum/request-context";
import { topicAction } from "../forum/actions.server";
import { action as profileAction } from "./profile";
import { ForumEntityNotFoundError } from "../../db/forum-repository";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { AccountInactiveError } from "../../db/account-state";

const session = {
  user: { id: "viewer-a", name: "Viewer", email: "a@example.test",
    emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
  session: { id: "s1", token: "token", userId: "viewer-a",
    expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
} satisfies AuthSession;
function env(authenticated = true) {
  const context = new RouterContextProvider();
  context.set(authSessionContext, authenticated ? session : null);
  const setTopicMute = vi.fn(async ({ muted }: { muted: boolean }) => muted);
  const setUserBlock = vi.fn(async ({ blocked }: { blocked: boolean }) => blocked);
  const updateProfile = vi.fn(async () => {});
  context.set(forumWriterContext, { setTopicMute, setUserBlock, updateProfile } as never);
  return { context, setTopicMute, setUserBlock, updateProfile };
}
function request(path: string, pairs: [string, string | File][], origin = "https://forum.example", method = "POST") {
  const body = new FormData();
  for (const [key, value] of pairs) body.append(key, value);
  return new Request("https://forum.example"+path, { method, headers: { Origin: origin }, body });
}
const topicValid = (): [string,string][] => [
  ["intent","setTopicMute"],["editorActorId","viewer-a"],["muted","true"],
];
const userValid = (): [string,string][] => [
  ["intent","setUserBlock"],["editorActorId","viewer-a"],["blocked","true"],
];
const topic = (ctx: RouterContextProvider, pairs: [string,string|File][] = topicValid(), origin?: string) =>
  topicAction({ request: request("/en/topics/t-1",pairs,origin), params:{locale:"en",topicId:"t-1"}, context:ctx });
const user = (ctx: RouterContextProvider, pairs: [string,string|File][] = userValid(), targetId = "u-b", origin?: string) =>
  profileAction({ request: request("/en/users/"+targetId,pairs,origin), params:{locale:"en",userId:targetId}, context:ctx });

describe("canonical Mute/Block personal actions", () => {
  it("uses authoritative session actor and path target without RBAC or profile-edit authority", async () => {
    const e = env();
    expect(await topic(e.context)).toMatchObject({data: {
      operation:"topicMute",ok:true,actorId:"viewer-a",topicId:"t-1",muted:true
    },init:{headers:{"Cache-Control":"private, no-store"}}});
    expect(await user(e.context)).toMatchObject({data: {
      operation:"userBlock",ok:true,actorId:"viewer-a",targetId:"u-b",blocked:true
    }});
    expect(e.setTopicMute).toHaveBeenCalledWith({actorId:"viewer-a",topicId:"t-1",muted:true});
    expect(e.setUserBlock).toHaveBeenCalledWith({actorId:"viewer-a",blockedUserId:"u-b",blocked:true});
    expect(e.updateProfile).not.toHaveBeenCalled();
    expect(await topic(e.context, [["intent","setTopicMute"],["editorActorId","viewer-a"],["muted","false"]]))
      .toMatchObject({ data:{operation:"topicMute",ok:true,muted:false} });
    expect(await user(e.context, [["intent","setUserBlock"],["editorActorId","viewer-a"],["blocked","false"]]))
      .toMatchObject({ data:{operation:"userBlock",ok:true,blocked:false} });
  });

  it("separates guest and cross-origin failures from writes", async () => {
    const unauth = env(false), authenticated = env();
    expect(await topic(unauth.context)).toMatchObject({ init:{status:401} });
    expect(await user(unauth.context)).toMatchObject({ init:{status:401} });
    expect(await topic(authenticated.context,topicValid(),"https://bad.example"))
      .toMatchObject({ init:{status:403} });
    expect(await user(authenticated.context,userValid(),"u-b","https://bad.example"))
      .toMatchObject({ init:{status:403} });
    expect(unauth.setTopicMute).not.toHaveBeenCalled();
    expect(unauth.setUserBlock).not.toHaveBeenCalled();
    expect(authenticated.setTopicMute).not.toHaveBeenCalled();
    expect(authenticated.setUserBlock).not.toHaveBeenCalled();
  });

  it.each([
    [...topicValid(),["intent","reply"]],
    [["intent","reply"],...topicValid()],
    [...topicValid(),["watching","true"]],
    [...topicValid(),["blocked","true"]],
    [...topicValid(),["muted","false"]],
    [...topicValid(),["ownerId","viewer-b"]],
    topicValid().filter(([key])=>key!=="editorActorId"),
    [["intent","setTopicMute"],["editorActorId","viewer-a"],["muted","TRUE"]],
  ] as [string,string][][])("rejects ambiguous or forged topic Mute forms", async (...pairs) => {
    const e=env();expect(await topic(e.context,pairs)).toMatchObject({
      data:{operation:"topicMute",error:"invalid"},init:{status:400},
    });expect(e.setTopicMute).not.toHaveBeenCalled();
  });

  it.each([
    [...userValid(),["intent","save-profile"]],
    [["intent","save-profile"],...userValid()],
    [...userValid(),["bio","public-profile"]],
    [...userValid(),["blocked","false"]],
    [...userValid(),["targetId","forged"]],
    [...userValid(),["returnTo","/admin"]],
    userValid().filter(([key])=>key!=="editorActorId"),
    [["intent","setUserBlock"],["editorActorId","viewer-a"],["blocked","TRUE"]],
  ] as [string,string][][])("rejects ambiguous or forged public profile Block forms", async (...pairs) => {
    const e=env();expect(await user(e.context,pairs)).toMatchObject({
      data:{operation:"userBlock",error:"invalid"},init:{status:400},
    });expect(e.setUserBlock).not.toHaveBeenCalled();expect(e.updateProfile).not.toHaveBeenCalled();
  });

  it("rejects self-block and stale actor while preserving old-profile save guards", async () => {
    const e=env();
    expect(await user(e.context,userValid(),"viewer-a")).toMatchObject({
      data:{operation:"userBlock",error:"invalid"},init:{status:400},
    });
    expect(await user(e.context,[["intent","setUserBlock"],["editorActorId","viewer-b"],["blocked","true"]]))
      .toMatchObject({ data:{operation:"userBlock",error:"conflict"},init:{status:409} });
    expect(await topic(e.context,[["intent","setTopicMute"],["editorActorId","viewer-b"],["muted","true"]]))
      .toMatchObject({ data:{operation:"topicMute",error:"conflict"},init:{status:409} });
    expect(e.updateProfile).not.toHaveBeenCalled();
    expect(e.setUserBlock).not.toHaveBeenCalled();
  });

  it("rejects Files as scalar input and propagates unexpected writer failures", async () => {
    const e=env();
    expect(await topic(e.context,[["intent","setTopicMute"],["editorActorId",new File(["x"],"x")],["muted","true"]]))
      .toMatchObject({data:{operation:"topicMute",error:"invalid"},init:{status:400}});
    expect(await user(e.context,[["intent","setUserBlock"],["editorActorId","viewer-a"],["blocked",new File(["x"],"x")]]))
      .toMatchObject({data:{operation:"userBlock",error:"invalid"},init:{status:400}});
    const bug=new TypeError("SQL assertion");
    e.setUserBlock.mockRejectedValueOnce(bug);
    await expect(user(e.context)).rejects.toBe(bug);
  });

  it("classifies missing targets, late inactive actor and storage outage", async () => {
    const e=env();
    e.setTopicMute.mockRejectedValueOnce(new ForumEntityNotFoundError());
    expect(await topic(e.context)).toMatchObject({data:{operation:"topicMute",error:"notFound"},init:{status:404}});
    e.setUserBlock.mockRejectedValueOnce(new AccountInactiveError());
    expect(await user(e.context)).toMatchObject({data:{operation:"userBlock",error:"unauthenticated"},init:{status:401}});
    e.setUserBlock.mockRejectedValueOnce(new ForumStorageUnavailableError());
    expect(await user(e.context)).toMatchObject({data:{operation:"userBlock",error:"unavailable"},init:{status:503}});
  });
});
