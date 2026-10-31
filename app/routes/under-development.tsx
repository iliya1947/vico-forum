import {adminForumPath} from "../admin/forum-paths";
import { redirect, useLoaderData } from "react-router";
import { UnderDevelopmentView } from "../forum/under-development-view";

export function loader({ request, params }: { request: Request; params: { locale?: string } }) {
  if (new URL(request.url).searchParams.get("feature") === "admin-forum") return redirect(adminForumPath(params.locale ?? "en"));
  return {
    locale: params.locale ?? "en",
    requestedFeature: new URL(request.url).searchParams.get("feature"),
  };
}

export default function UnderDevelopmentRoute() {
  return <UnderDevelopmentView {...useLoaderData<typeof loader>()} />;
}
