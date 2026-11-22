import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { authSessionContext, type AuthSession } from "../auth/request-context";
import { authorizationContext } from "../authorization/request-context";
import { forumReaderContext, forumWriterContext } from "./request-context";
import { topicAction } from "./actions.server";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { AccountInactiveError, AccountMissingError, AccountStateUnavailableError } from "../../db/account-state";
import {
  ForumAuthorizationError, ForumEntityNotFoundError,
  ForumStateConflictError, ForumVisibilityReasonError,
} from "../../db/forum-repository";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { UserMeasureRestrictedError } from "../../db/user-measure-policy";

const userId="session-moderator", topicId="hidden-topic", postId="hidden-post";
const session={user:{id:userId},session:{id:"current-session"}} as unknown as AuthSession;
const topicForm={
  intent:"setTopicVisibility",editorActorId:userId,hidden:"true",
  expectedVisibilityVersion:"0",expectedRevisionId:"title-r1",reason:"Moderation reason",
};
const postForm={
  intent:"setPostVisibility",editorActorId:userId,postId,hidden:"false",
  expectedVisibilityVersion:"2",expectedRevisionId:"post-r2",reason:"Restored after review",
};

function form(fields:Record<string,string>=topicForm){
  const body=new FormData();
  for(const [key,value] of Object.entries(fields))body.set(key,value);
  return body;
}
function fixture(options:{signedIn?:boolean;allowed?:boolean;permissionError?:Error}={}){
  const context=new RouterContextProvider();
  context.set(authSessionContext,options.signedIn===false?null:session);
  const granted={value:options.allowed!==false};
  const has=vi.fn(async(key:string)=>{
    if(options.permissionError)throw options.permissionError;
    return granted.value&&key==="forum.content.visibility.manage";
  });
  context.set(authorizationContext,{forUser:()=>({has})} as never);
  const setTopicVisibility=vi.fn(async(input:{hidden:boolean;expectedVisibilityVersion:number})=>({
    hidden:input.hidden,visibilityVersion:input.expectedVisibilityVersion+1,changed:true,
  }));
  const setPostVisibility=vi.fn(async(input:{hidden:boolean;expectedVisibilityVersion:number})=>({
    hidden:input.hidden,visibilityVersion:input.expectedVisibilityVersion+1,changed:true,
  }));
  const createReply=vi.fn();
  const editOwnTopicTitle=vi.fn();
  context.set(forumWriterContext,{setTopicVisibility,setPostVisibility,createReply,
    editOwnTopicTitle} as never);
  const readTopicPage=vi.fn(async()=>{throw new Error("PUBLIC SOURCE READ MUST NOT RUN");});
  context.set(forumReaderContext,{readTopicPage} as never);
  const submit=async(body:FormData=form(),{method="POST",origin="https://forum.example",pathTopicId=topicId}:
    {method?:string;origin?:string|null;pathTopicId?:string}={})=>{
    const headers=new Headers();
    if(origin!==null)headers.set("Origin",origin);
    const request=new Request("https://forum.example/en/topics/"+encodeURIComponent(pathTopicId),{
      method,headers,body,
    });
    const result=await topicAction({request,params:{locale:"en",topicId:pathTopicId},context});
    if(!result||!("data" in result))throw new Error("Visibility POST must return action data, not redirect");
    return result;
  };
  return {context,granted,has,setTopicVisibility,setPostVisibility,createReply,
    editOwnTopicTitle,readTopicPage,submit};
}
function expectFailure(result:Awaited<ReturnType<ReturnType<typeof fixture>["submit"]>>,
  status:number,error:string){
  expect(result.init?.status).toBe(status);
  expect(result.data).toMatchObject({error});
  expect(result.init?.headers).toMatchObject({"Cache-Control":"private, no-store"});
  expect(JSON.stringify(result.data)).not.toContain("PRIVATE_CURRENT_TITLE");
  expect(JSON.stringify(result.data)).not.toContain("PRIVATE_CURRENT_BODY");
}
function noWrites(f:ReturnType<typeof fixture>){
  expect(f.setTopicVisibility).not.toHaveBeenCalled();
  expect(f.setPostVisibility).not.toHaveBeenCalled();
  expect(f.createReply).not.toHaveBeenCalled();
  expect(f.editOwnTopicTitle).not.toHaveBeenCalled();
  expect(f.readTopicPage).not.toHaveBeenCalled();
}

describe("B7-A canonical topic POST visibility action",()=>{
  it("posts exactly the scoped topic desired-state baseline and returns no hidden source",async()=>{
    const f=fixture();
    const result=await f.submit(form({...topicForm,reason:"  spam \n"}));
    expect(result.data).toEqual({
      operation:"contentVisibility",ok:true,target:"topic",topicId,actorId:userId,
      hidden:true,visibilityVersion:1,changed:true,
    });
    expect(result.init?.headers).toMatchObject({"Cache-Control":"private, no-store"});
    expect(f.has).toHaveBeenCalledWith("forum.content.visibility.manage");
    expect(f.setTopicVisibility).toHaveBeenCalledExactlyOnceWith({
      topicId,actorId:userId,hidden:true,expectedVisibilityVersion:0,
      expectedRevisionId:"title-r1",reason:"spam",
    });
    expect(f.setPostVisibility).not.toHaveBeenCalled();
    expect(f.readTopicPage).not.toHaveBeenCalled();
  });
  it("restores individually hidden posts before public loader/availability gates, with exact membership target",async()=>{
    const f=fixture();
    const restored=await f.submit(form(postForm));
    expect(restored.data).toEqual({
      operation:"contentVisibility",ok:true,target:"post",topicId,postId,
      actorId:userId,hidden:false,visibilityVersion:3,changed:true,
    });
    expect(f.setPostVisibility).toHaveBeenCalledExactlyOnceWith({
      topicId,postId,actorId:userId,hidden:false,
      expectedVisibilityVersion:2,expectedRevisionId:"post-r2",reason:"Restored after review",
    });
    expect(f.readTopicPage).not.toHaveBeenCalled();
  });
  it("allows an unchanged desired-state with an explicit empty reason; no-op remains transaction-owned",async()=>{
    const f=fixture();
    f.setTopicVisibility.mockResolvedValueOnce({hidden:false,visibilityVersion:5,changed:false});
    const result=await f.submit(form({...topicForm,hidden:"false",expectedVisibilityVersion:"5",reason:" "}));
    expect(result.data).toMatchObject({ok:true,hidden:false,visibilityVersion:5,changed:false});
    expect(f.setTopicVisibility).toHaveBeenCalledExactlyOnceWith({
      topicId,actorId:userId,hidden:false,expectedVisibilityVersion:5,
      expectedRevisionId:"title-r1",reason:"",
    });
  });
  it.each([
    {intent:"setTopicVisibility",editorActorId:userId,hidden:"true",expectedVisibilityVersion:"0",expectedRevisionId:"title-r1"} as Record<string,string>,
    {...topicForm,hidden:"True"}, {...topicForm,hidden:"1"},
    {...topicForm,expectedVisibilityVersion:"01"},
    {...topicForm,expectedVisibilityVersion:"-1"},
    {...topicForm,expectedVisibilityVersion:"1.5"},
    {...topicForm,expectedVisibilityVersion:"1e3"},
    {...topicForm,expectedVisibilityVersion:"2147483648"},
    {...topicForm,expectedVisibilityVersion:""},
    {...topicForm,expectedVisibilityVersion:" 1 "},
    {...topicForm,expectedRevisionId:""},
    {...topicForm,expectedRevisionId:" title-r1 "},
    {...topicForm,expectedRevisionId:"x\0y"},
    {...topicForm,expectedRevisionId:"x".repeat(2049)},
    {...topicForm,editorActorId:" "},
    {...topicForm,reason:"Forbidden\0value"},
    {...topicForm,reason:"🛡".repeat(2001)},
    {...topicForm,postId}, {...topicForm,inlineQuickAction:"1"},
    {...topicForm,operationScope:"any"}, {...topicForm,actorId:"forged"},
    {...postForm,postId:""}, {...postForm,postId:"bad\npost"},
    {...postForm,postId:" ".repeat(4)}, {...postForm,postId:"x".repeat(2049)},
    {...postForm,unexpected:"x"},
    {...topicForm,intent:"reply"},{...postForm,intent:"editPost"},
  ])("rejects malformed, missing, overlong or mixed payload %j without domain calls",async fields=>{
    const f=fixture();
    const result=await f.submit(form(fields));
    expectFailure(result,400,"invalid");
    noWrites(f);
  });
  it.each(["intent","editorActorId","hidden","expectedVisibilityVersion",
    "expectedRevisionId","reason"])("rejects duplicate topic scalar %s",async field=>{
    const f=fixture(),payload=form();
    payload.append(field,field==="intent"?"reply":"ambiguous");
    const result=await f.submit(payload);
    expectFailure(result,400,"invalid");
    noWrites(f);
  });
  it.each(["intent","postId","editorActorId","hidden","expectedVisibilityVersion",
    "expectedRevisionId","reason"])("rejects duplicate post scalar %s",async field=>{
    const f=fixture(),payload=form(postForm);
    payload.append(field,field==="intent"?"setTopicVisibility":"ambiguous");
    const result=await f.submit(payload);
    expectFailure(result,400,"invalid");
    noWrites(f);
  });
  it("rejects hidden visibility intent even when a different valid intent is first",async()=>{
    const f=fixture();
    const a=form({...topicForm,intent:"reply"});
    a.append("intent","setTopicVisibility");
    expectFailure(await f.submit(a),400,"invalid");
    const b=form({...topicForm,intent:"setPostVisibility"});
    b.append("intent","setTopicVisibility");
    expectFailure(await f.submit(b),400,"invalid");
    const c=form({...topicForm,intent:"closeTopic"});
    expectFailure(await f.submit(c),400,"invalid");
    noWrites(f);
  });
  it.each(["intent","editorActorId","hidden","expectedVisibilityVersion",
    "expectedRevisionId","reason","postId"])("rejects File in %s without a write",async field=>{
    const f=fixture(),payload=form(field==="postId"?postForm:topicForm);
    payload.set(field,new Blob(["file payload"]),field+".txt");
    const result=await f.submit(payload);
    expectFailure(result,400,"invalid");
    noWrites(f);
  });
  it("checks POST, same Origin, session and changed editor identity without a write",async()=>{
    const wrongMethod=fixture();
    expectFailure(await wrongMethod.submit(form(),{method:"PUT"}),400,"invalid");
    noWrites(wrongMethod);
    const foreign=fixture();
    expectFailure(await foreign.submit(form(),{origin:"https://other.example"}),403,"origin");
    noWrites(foreign);
    const noOrigin=fixture();
    expectFailure(await noOrigin.submit(form(),{origin:null}),403,"origin");
    noWrites(noOrigin);
    const guest=fixture({signedIn:false});
    expectFailure(await guest.submit(form()),401,"unauthenticated");
    noWrites(guest);
    const switched=fixture();
    expectFailure(await switched.submit(form({...topicForm,editorActorId:"other-user"})),409,"conflict");
    noWrites(switched);
  });
  it("requires current visibility permission independently of generic Admin/History rights",async()=>{
    const denied=fixture({allowed:false});
    expectFailure(await denied.submit(form()),403,"forbidden");
    noWrites(denied);
    denied.granted.value=true;
    expect((await denied.submit(form())).data).toMatchObject({ok:true});
    const unavailable=fixture({permissionError:new AuthorizationUnavailableError()});
    expectFailure(await unavailable.submit(form()),503,"unavailable");
    noWrites(unavailable);
  });
  it.each([
    [new AccountInactiveError(),"unauthenticated",401],
    [new AccountMissingError(),"unauthenticated",401],
    [new UserMeasureRestrictedError("admin.forum"),"forbidden",403],
    [new ForumAuthorizationError("current visibility capability revoked"),"forbidden",403],
    [new ForumEntityNotFoundError("PRIVATE_CURRENT_TITLE"),"notFound",404],
    [new ForumStateConflictError("PRIVATE_CURRENT_TITLE"),"conflict",409],
    [new ForumVisibilityReasonError("reason is required on change"),"invalid",400],
    [new ForumStorageUnavailableError(),"unavailable",503],
    [new AccountStateUnavailableError(),"unavailable",503],
    [new AuthorizationUnavailableError(),"unavailable",503],
  ] as const)("maps writer %s to neutral %s/%s without hidden current metadata",async(error,code,status)=>{
    const f=fixture();
    f.setTopicVisibility.mockRejectedValueOnce(error);
    const result=await f.submit(form());
    expectFailure(result,status,code);
    expect(f.setTopicVisibility).toHaveBeenCalledTimes(1);
    expect(f.readTopicPage).not.toHaveBeenCalled();
  });
  it("never auto-retries or reads a hidden current baseline on a stale post revision",async()=>{
    const f=fixture();
    f.setPostVisibility.mockRejectedValueOnce(new ForumStateConflictError("PRIVATE_CURRENT_BODY"));
    const result=await f.submit(form(postForm));
    expectFailure(result,409,"conflict");
    expect(f.setPostVisibility).toHaveBeenCalledTimes(1);
    expect(f.readTopicPage).not.toHaveBeenCalled();
  });
  it("leaves unexpected internal faults to the existing neutral route error boundary",async()=>{
    const f=fixture();
    f.setTopicVisibility.mockRejectedValueOnce(new Error("SECRET INTERNAL SOURCE"));
    await expect(f.submit(form())).rejects.toThrow("SECRET INTERNAL SOURCE");
    expect(f.setTopicVisibility).toHaveBeenCalledTimes(1);
    expect(f.readTopicPage).not.toHaveBeenCalled();
  });
});
