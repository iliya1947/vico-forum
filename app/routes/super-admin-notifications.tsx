import { useLoaderData,type RouterContextProvider } from "react-router";
import { loadNativeCurrentArea } from "../super-admin/native-loader.server";
import { SuperAdminNativeCurrent } from "../super-admin/native-current";
import { ForumRouteError } from "../forum/ui";
export {headers,meta} from "./super-admin";
export function loader(args:{request:Request;params:{locale?:string};context:RouterContextProvider}){
  return loadNativeCurrentArea(args,"notifications");
}
export default function NativeAreaRoute(){return <SuperAdminNativeCurrent {...useLoaderData<typeof loader>()}/>;}
export const ErrorBoundary=ForumRouteError;
