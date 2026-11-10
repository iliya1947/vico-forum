import { useAdministrativeRouting } from "../administrative-routing/provider";
import { data, useLoaderData, Link, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { requireSuperAdmin, superAdminPrivateHeaders } from "../super-admin/access.server";
import { ownerMonitoringForRequest } from "../super-admin/request-context";
import { OwnerSystemUnavailableError } from "../../db/hyperdrive-owner-system";
import { SuperAdminShell, SystemMonitorCards } from "../super-admin/view";
import { superAdminMonitoringPath } from "../super-admin/paths";
import { ForumRouteError } from "../forum/ui";
export {headers,meta} from "./super-admin";
export async function loader({params,context}:{params:{locale?:string};context:RouterContextProvider}) {
  requireSuperAdmin(context);
  try {
    return data({locale:params.locale??"en",system:await ownerMonitoringForRequest(context).readSystem()},
      {headers:superAdminPrivateHeaders});
  } catch(error) {
    if(error instanceof OwnerSystemUnavailableError) throw new Response("Unavailable",{status:503,headers:superAdminPrivateHeaders});
    throw error;
  }
}
export default function SuperAdminSystemRoute() {
  const {locale,system}=useLoaderData<typeof loader>();
  const {t}=useTranslation("common");
  const routing=useAdministrativeRouting();
  return <SuperAdminShell locale={locale} current="monitoring">
    <section className="admin-overview" aria-labelledby="super-admin-system-heading">
      <h2 id="super-admin-system-heading">{t("superAdminSystem")}</h2>
      <p>{t("superAdminSystemCoverage")}</p>
      {system.recording==="unavailable" ? <p role="status">{t("superAdminRecordingUnavailable")}</p>:null}
      <SystemMonitorCards locale={locale} system={system}/>
      <p><Link to={superAdminMonitoringPath(locale,routing)}>{t("superAdminMonitoring")}</Link></p>
    </section>
  </SuperAdminShell>;
}
export const ErrorBoundary=ForumRouteError;
