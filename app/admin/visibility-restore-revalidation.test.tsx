import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import {
  createMemoryRouter, data, RouterContextProvider, RouterProvider,
  type ActionFunctionArgs, type ClientActionFunctionArgs,
} from "react-router";
import { HeaderAuthProvider } from "../auth/auth-controls";
import type { HiddenInspection } from "../../db/private-visibility-queue";
import { canonicalEnglishCatalog } from "../localization/catalog";
import { createTranslationRuntime } from "../localization/runtime";
import { clientAction } from "../routes/topic";
import VisibilityInspector from "./visibility-inspector";
import { hiddenInspectionPath } from "./visibility-queue-path";

vi.mock("./shell", () => ({
  AdminShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const topicId = "topic/hidden";
const postId = "post/hidden";
const actorId = "moderator";
const reason = "Restore after moderation review";
const common: Record<string,string> = {};
for (const [key,descriptor] of Object.entries(canonicalEnglishCatalog.common)) {
  if (typeof descriptor.source === "string") common[key] = descriptor.source;
  else for (const [branch,value] of Object.entries(descriptor.source))
    common[`${key}_${branch}`] = value;
}
const i18n = createTranslationRuntime({
  locale: {translationLocale:"en",direction:"ltr",formatting:{locale:"en",timeZone:"UTC"},
    fallbackLocales:[],nativeName:"English",presentationMetadata:{}},
  fallbackLocales:[],resourcesByLocale:{en:{common}},
  bundleVersions:{en:{common:"b7-restore-revalidation"}},staleKeys:{},
});

afterEach(() => cleanup());

function inspection(kind: "topic" | "post", restored: boolean): HiddenInspection {
  const commonState = {
    isHidden: !restored,
    visibilityVersion: restored ? 4 : 3,
    visibilityChangedAt: "2026-11-22T00:00:00.000Z",
    currentRevisionId: "private-current-revision",
    lastEvent: {
      action: (kind==="topic"
        ? (restored ? "topic.restored" : "topic.hidden")
        : (restored ? "post.restored" : "post.hidden")),
      at: "2026-11-22T00:00:00.000Z",
      reason: restored ? reason : "Prior Hide reason",
    },
  };
  if (kind==="topic") return {
    ...commonState,kind:"topic",id:topicId,topicId,isOrdinary:true,
    lastEvent:{...commonState.lastEvent,
      action:(restored?"topic.restored":"topic.hidden") as "topic.restored"|"topic.hidden"},
  };
  return {
    ...commonState,kind:"post",id:postId,topicId,parentPostId:"parent/hidden",
    parentUnavailable:true,topicHidden:true,
    lastEvent:{...commonState.lastEvent,
      action:(restored?"post.restored":"post.hidden") as "post.restored"|"post.hidden"},
  };
}

describe("B7-B3c private inspector Restore success revalidation", () => {
  it.each(["topic","post"] as const)(
    "refreshes %s current private state without public navigation or stale Restore controls",
    async (kind) => {
      let restored = false;
      const privateLoader = vi.fn(async () => data({
        locale:"en", access:{
          canEnter:true,canReadForum:true,canManageAuthorization:false,
          canManageVisibility:true,actorId,
        },
        inspection:inspection(kind,restored),canReadPostHistory:false,revisions:null,
      },{headers:{"Cache-Control":"private, no-store"}}));
      const publicLoader = vi.fn(() => {
        throw new Response("Public topic is not available", {status:404});
      });
      const requests: Record<string,string>[] = [];
      const serverAction = vi.fn(async(request: Request) => {
        const posted = Object.fromEntries((await request.formData()).entries());
        requests.push(posted as Record<string,string>);
        restored = true;
        return data({
          operation:"contentVisibility",ok:true,target:kind,topicId,
          ...(kind==="post"?{postId}:{}),
          actorId,hidden:false,changed:true,visibilityVersion:4,
        },{headers:{"Cache-Control":"private, no-store"}});
      });
      const target = kind==="topic" ? {kind:"topic" as const,topicId}
        : {kind:"post" as const,topicId,postId};
      const initialPath = hiddenInspectionPath("en",target);
      const router = createMemoryRouter([
        {path:"/en/admin/forum/topics/:topicId/inspect",loader:privateLoader,
          element:<VisibilityInspector/>},
        {path:"/en/topics/:topicId",loader:publicLoader,
          action:({request,params}:ActionFunctionArgs)=>clientAction({
            request,params,context:new RouterContextProvider(),pattern:"",
            url:new URL(request.url),
            serverAction:(()=>serverAction(request)) as ClientActionFunctionArgs["serverAction"],
          }),
          element:<p>PUBLIC TOPIC MUST NOT LOAD</p>},
      ],{initialEntries:[initialPath]});
      try {
        const view = render(<I18nextProvider i18n={i18n}>
          <HeaderAuthProvider initialUser={{id:actorId,name:"Moderator"}}>
            <RouterProvider router={router}/>
          </HeaderAuthProvider>
        </I18nextProvider>);
        const form = await waitFor(() => {
          const element = view.container.querySelector<HTMLFormElement>("form.visibility-restore-form");
          expect(element).not.toBeNull();
          return element!;
        });
        expect(screen.getByText("Hidden")).toBeInTheDocument();
        expect(form.querySelector<HTMLInputElement>('input[name="expectedVisibilityVersion"]')?.value)
          .toBe("3");
        expect(form.querySelector<HTMLInputElement>('input[name="expectedRevisionId"]')?.value)
          .toBe("private-current-revision");

        fireEvent.change(form.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')!,{
          target:{value:reason},
        });
        fireEvent.submit(form);
        await waitFor(() => expect(serverAction).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(view.container.querySelector("form.visibility-restore-form")).toBeNull());
        expect(screen.getByText("Visible")).toBeInTheDocument();
        expect(screen.getByText(kind==="topic"?"Topic restored":"Post restored"))
          .toBeInTheDocument();
        expect(screen.getByText(reason)).toBeInTheDocument();
        expect(view.container.querySelector(".admin-forum-counts")).toHaveTextContent("4");
        expect(privateLoader).toHaveBeenCalledTimes(2);
        expect(publicLoader).not.toHaveBeenCalled();
        expect(router.state.location.pathname + router.state.location.search).toBe(initialPath);
        expect(router.state.errors).toBeNull();
        expect(screen.queryByText("PUBLIC TOPIC MUST NOT LOAD")).not.toBeInTheDocument();

        expect(requests).toEqual([{
          intent:kind==="topic"?"setTopicVisibility":"setPostVisibility",
          editorActorId:actorId,hidden:"false",
          expectedVisibilityVersion:"3",expectedRevisionId:"private-current-revision",
          ...(kind==="post"?{postId}:{}),reason,
        }]);
        if (kind==="post") {
          // An individually restored post may still be effectively unavailable
          // under a hidden parent/topic; private inspection must remain accessible.
          expect(view.container.querySelector(".admin-forum-counts"))
            .toHaveTextContent("Parent/topic unavailable");
        }
      } finally {router.dispose();}
    },
  );
});
