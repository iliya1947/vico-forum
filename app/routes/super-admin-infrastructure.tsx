import { data, useLoaderData, type RouterContextProvider } from "react-router";
import { useTranslation } from "react-i18next";
import { requireSuperAdmin, superAdminPrivateHeaders } from "../super-admin/access.server";
import { SuperAdminShell } from "../super-admin/view";
import { ForumRouteError } from "../forum/ui";
export {headers,meta} from "./super-admin";
export function loader({params,context}:{params:{locale?:string};context:RouterContextProvider}) {
  requireSuperAdmin(context);
  return data({locale:params.locale??"en"},{headers:superAdminPrivateHeaders});
}
export default function SuperAdminInfrastructureRoute() {
  const {locale}=useLoaderData<typeof loader>();const {t}=useTranslation("common");
  return <SuperAdminShell locale={locale} current="infrastructure">
    <section className="admin-overview" aria-labelledby="super-admin-infrastructure-heading">
      <h2 id="super-admin-infrastructure-heading">{t("superAdminInfrastructure")}</h2>
      <p className="super-admin-placeholder">{t("adminInDevelopment")} · {t("superAdminStage6")}</p>
      <p>{t("superAdminInfrastructureBoundary")}</p>
    </section>
  </SuperAdminShell>;
}
export const ErrorBoundary=ForumRouteError;
