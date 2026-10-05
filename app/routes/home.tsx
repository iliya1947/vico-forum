import { useLoaderData, type RouterContextProvider } from "react-router";
import type { HomepageCategoryOverview } from "../forum/homepage";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { HomeView } from "../forum/views";

export function meta() {
  return [{ title: "Vico Forum" }];
}

export async function loader({ params, context }: { params: { locale?: string }; context: RouterContextProvider }) {
  const categories: HomepageCategoryOverview[] = await forumReaderForRequest(context).readHomepage();

  return {
    locale: params.locale ?? "en",
    categories,
  };
}

export default function Home() {
  const data = useLoaderData<typeof loader>();
  return <HomeView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
