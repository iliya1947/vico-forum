import { useLoaderData, type RouterContextProvider } from "react-router";
import { forumReaderForRequest } from "../forum/request-context";
import { ForumRouteError } from "../forum/ui";
import { HomeView } from "../forum/views";

export function meta() {
  return [{ title: "Vico Forum" }];
}

export async function loader({ params, context }: { params: { locale?: string }; context: RouterContextProvider }) {
  return {
    locale: params.locale ?? "en",
    categories: await forumReaderForRequest(context).listCategories(),
  };
}

export default function Home() {
  const data = useLoaderData<typeof loader>();
  return <HomeView {...data} />;
}

export const ErrorBoundary = ForumRouteError;
