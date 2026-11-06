import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { requireMeasureSession, measurePrivateHeaders, measureResponseError } from "../measures/routes.server";
import { userMeasuresForRequest } from "../measures/request-context";
import { OwnMeasuresIndex } from "../measures/views";
import { ForumRouteError } from "../forum/ui";

export function headers() { return measurePrivateHeaders; }
export function meta() { return [{title:"My measures · Vico Forum"}]; }
export async function loader({ params, context }: {
  params:{locale?:string};context:RouterContextProvider;
}) {
  const subjectId=requireMeasureSession(context);
  try {
    const measures=await userMeasuresForRequest(context).ownList(subjectId);
    return data({locale:params.locale??"en",measures},{headers:measurePrivateHeaders});
  } catch(error) { throw measureResponseError(error); }
}
export default function AccountMeasuresRoute() {
  return <OwnMeasuresIndex {...useLoaderData<typeof loader>()}/>;
}
export const ErrorBoundary=ForumRouteError;
