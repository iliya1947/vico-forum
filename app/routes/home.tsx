import { forumReadLoader } from "../forum/read-availability.server";
import { data } from "react-router";
import { useLoaderData, type RouterContextProvider } from "react-router";
import type { HomepageCategoryOverview } from "../forum/homepage";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumStorageUnavailableError } from "../../db/hyperdrive-forum";
import { ForumRouteError } from "../forum/ui";
import { HomeView } from "../forum/views";

export function meta() {
  return [{ title: "Vico Forum" }];
}

// Public online identities change with privacy settings; do not cache the document or data.
export const homepagePrivateHeaders = { "Cache-Control": "private, no-store" } as const;
export function headers() { return homepagePrivateHeaders; }

export const loader = forumReadLoader(async function loader({ params, context }: { params: { locale?: string }; context: RouterContextProvider }) {
  const reader = forumReaderForRequest(context);
  const [categories, onlinePresence] = await Promise.all([
    reader.readHomepage(),
    reader.readOnlinePresence().catch((error: unknown) => {
      // An optional online card cannot take down otherwise available forum content.
      if (error instanceof ForumStorageUnavailableError) return null;
      throw error;
    }),
  ]);
  return data({ locale: params.locale ?? "en", categories: categories satisfies HomepageCategoryOverview[], onlinePresence },
    { headers: homepagePrivateHeaders });
});

export default function Home() {
  const data = useLoaderData<typeof loader>();
  return <HomeView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
