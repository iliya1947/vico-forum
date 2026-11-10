import type { HistoryCursor } from "../../db/admin-history";
import { defaultAdministrativeRouting, type AdministrativeRouting } from "../administrative-routing/addresses";
export function historyPagePath(locale: string, cursor?: HistoryCursor | null, routing: AdministrativeRouting = defaultAdministrativeRouting) {
  return routing.admin.history(locale, cursor?.position);
}
