import { useLoaderData } from "react-router";
import { UnderDevelopmentView } from "../forum/under-development-view";

export function loader({ request, params }: { request: Request; params: { locale?: string } }) {
  return {
    locale: params.locale ?? "en",
    requestedFeature: new URL(request.url).searchParams.get("feature"),
  };
}

export default function UnderDevelopmentRoute() {
  return <UnderDevelopmentView {...useLoaderData<typeof loader>()} />;
}
