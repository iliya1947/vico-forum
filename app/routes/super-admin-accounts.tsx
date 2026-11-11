import { useLoaderData, type RouterContextProvider } from "react-router";
import { loadSa02CurrentArea } from "../super-admin/current-loader.server";
import { SuperAdminSa02Current } from "../super-admin/current-route";
import { ForumRouteError } from "../forum/ui";
export {headers,meta} from "./super-admin";
export function loader(args:{request:Request;params:{locale?:string};context:RouterContextProvider}){
  return loadSa02CurrentArea(args,"accounts");
}
export default function SuperAdminAccountsRoute(){
  return <SuperAdminSa02Current {...useLoaderData<typeof loader>()}/>;
}
export const ErrorBoundary=ForumRouteError;
