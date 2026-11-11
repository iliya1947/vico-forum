import type { RouterContextProvider } from "react-router";
import { authSessionForRequest } from "../auth/request-context";
import { userMeasuresForRequest } from "../measures/request-context";
import { UserMeasureRestrictedError } from "../../db/user-measure-policy";
import { UserMeasureForbiddenError, UserMeasureConfigurationUnavailableError } from "../../db/user-measure-authority";
import { UserMeasureNotFoundError } from "../../db/user-measures";
import { UserMeasuresUnavailableError } from "../../db/hyperdrive-user-measures";
import { AuthorizationNotFoundError } from "../../db/authorization-repository";
import { AuthorizationUnavailableError } from "../../db/authorization-service";
import { authorizationForRequest, authorizationOwnerContext } from "../authorization/request-context";
import { canMutateAuthorization, isBoundOwner } from "../authorization/owner";
import { PERMISSION_CATALOG } from "../authorization/catalog";
import { canReadProfileAdminSection } from "./admission.server";
import { ownerProfileForRequest } from "./request-context";
import { OwnerProfileUnavailableError } from "../../db/hyperdrive-owner-profile";
import { InvalidOwnerProfileSessionCursorError } from "../../db/owner-user-profile";
import { InvalidOwnerUserHistoryCursorError } from "../../db/owner-user-history";
import type { ProfilePrivilegedSections, ProfileSection } from "./sections";

const privateHeaders = { "Cache-Control": "private, no-store" } as const;
const unavailable = { status: "unavailable" } as const;
const ready = <T,>(value: T): ProfileSection<T> => ({ status: "ready", value });

async function adminSections(context: RouterContextProvider, targetId: string):
  Promise<Pick<ProfilePrivilegedSections, "measures" | "authorization">> {
  const actorId = authSessionForRequest(context)?.user.id;
  if (!actorId) return {};
  const sections: Pick<ProfilePrivilegedSections, "measures" | "authorization"> = {};
  let canReadMeasures = false;
  let canReadAuthorization = false;
  try {
    canReadMeasures = await canReadProfileAdminSection(context, "measures");
  } catch (error) {
    if (!(error instanceof AuthorizationUnavailableError)) throw error;
    sections.measures = unavailable;
  }
  try {
    canReadAuthorization = await canReadProfileAdminSection(context, "authorization");
  } catch (error) {
    if (!(error instanceof AuthorizationUnavailableError)) throw error;
    sections.authorization = unavailable;
  }
  if (canReadMeasures) {
    try {
      const binding = context.get(authorizationOwnerContext);
      // AP-10 forbids adminTarget(Owner,self). Use the existing own-list path
      // only for the exact Owner viewing their own profile.
      const rows = actorId === targetId && isBoundOwner(actorId, binding)
        ? await userMeasuresForRequest(context).ownList(actorId)
        : (await userMeasuresForRequest(context).adminTarget(actorId, targetId)).measures;
      sections.measures = ready(rows);
    } catch (error) {
      if (error instanceof UserMeasureForbiddenError || error instanceof UserMeasureRestrictedError ||
          error instanceof UserMeasureNotFoundError) {
        // A permission bit cannot override current AP-10 hierarchy or restrictions.
      } else if (error instanceof UserMeasuresUnavailableError ||
                 error instanceof UserMeasureConfigurationUnavailableError) {
        sections.measures = unavailable;
      } else throw error;
    }
  }
  if (canReadAuthorization) {
    try {
      const management = await authorizationForRequest(context).readUserManagementState(targetId);
      const isOwner = isBoundOwner(actorId, context.get(authorizationOwnerContext));
      sections.authorization = ready({
        actorId, management, permissions: PERMISSION_CATALOG,
        canManageElevated: isOwner,
        canMutateAuthorization: canMutateAuthorization(actorId, context.get(authorizationOwnerContext)),
      });
    } catch (error) {
      if (error instanceof AuthorizationUnavailableError || error instanceof AuthorizationNotFoundError) {
        sections.authorization = unavailable;
      } else throw error;
    }
  }
  return sections;
}

async function ownerSection(request: Request, context: RouterContextProvider, targetId: string):
  Promise<ProfilePrivilegedSections["owner"]> {
  const access = ownerProfileForRequest(context);
  if (!access) return undefined;
  const query = new URL(request.url).searchParams;
  if (query.getAll("sessionsBefore").length > 1 || query.getAll("historyBefore").length > 1) {
    throw new Response("Invalid cursor", { status: 400, headers: privateHeaders });
  }
  const sessionsBefore = query.get("sessionsBefore") ?? undefined;
  const historyBefore = query.get("historyBefore") ?? undefined;
  const account = await access.readTarget(targetId, sessionsBefore).then(value => ready(value)).catch((error: unknown) => {
    if (error instanceof OwnerProfileUnavailableError) return unavailable;
    if (error instanceof InvalidOwnerProfileSessionCursorError) {
      throw new Response("Invalid cursor", { status: 400, headers: privateHeaders });
    }
    throw error;
  });
  if (account.status === "ready" && account.value === null) {
    throw new Response("Not Found", { status: 404, headers: privateHeaders });
  }
  const history = await access.readHistory(targetId, historyBefore).then(value => ready(value)).catch((error: unknown) => {
    if (error instanceof OwnerProfileUnavailableError) return unavailable;
    if (error instanceof InvalidOwnerUserHistoryCursorError) {
      throw new Response("Invalid cursor", { status: 400, headers: privateHeaders });
    }
    throw error;
  });
  return { viewerId: authSessionForRequest(context)!.user.id,
    account: account as NonNullable<ProfilePrivilegedSections["owner"]>["account"],
    history };
}

/** Public profile read must succeed first; sections are never selected from UI hints. */
export async function readProfilePrivilegedSections(
  request: Request, context: RouterContextProvider, targetId: string,
): Promise<ProfilePrivilegedSections> {
  const [admin, owner] = await Promise.all([
    adminSections(context, targetId), ownerSection(request, context, targetId),
  ]);
  const sections = { ...admin, ...(owner ? { owner } : {}) };
  const viewerId = authSessionForRequest(context)?.user.id;
  // Bind all privileged sections, including measures-only, to the authenticated viewer.
  return viewerId && Object.keys(sections).length ? { viewerId, ...sections } : {};
}
