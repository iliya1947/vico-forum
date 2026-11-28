import { requireAdminActorAccess } from "../admin/access.server";
import { readAdminOverview } from "../admin/overview.server";
import { createHyperdriveAuthorization } from "../../db/hyperdrive-authorization";
import { withForumAdministrativeRestrictions } from "../../db/user-measure-admin-forum";
import { createHyperdriveForumReader } from "../../db/hyperdrive-forum";
import { createHyperdriveAdminHistory } from "../../db/hyperdrive-admin-history";
import type { ForumControlGrant } from "./delegation-admission.server";
import type { OverviewOutcome } from "./request-store.server";
/** Same native effective authorization as workers/app.ts. A fresh resolver
 * per execution/result admission, not a saved permission claim. */
export function createAdminOverviewReader(connectionString: string, ownerUserId: string) {
  const accessFor = (grant: ForumControlGrant) => requireAdminActorAccess(
    withForumAdministrativeRestrictions(createHyperdriveAuthorization(connectionString, undefined, ownerUserId),
      connectionString, undefined, ownerUserId), grant.userId);
  return {
    async read(grant: ForumControlGrant): Promise<OverviewOutcome> {
      try {
        const access = await accessFor(grant);
        const { counts, recent } = await readAdminOverview(access, createHyperdriveForumReader(connectionString),
          createHyperdriveAdminHistory(connectionString));
        if (!counts && !recent) return { status: "unavailable" };
        const projection = {
          counts: counts ? { categories: counts.categories, sections: counts.sections,
            topics: counts.topics, posts: counts.posts } : null,
          // Explicit minimal projection; no raw history context, fingerprint,
          // private notes, arbitrary URL or other fields.
          recent: recent?.events.map(event => ({ eventId: event.id, at: event.at,
            action: event.change.action, targetType: event.change.targetType, targetId: event.change.targetId,
            actorLabel: event.actorLabel, targetLabel: event.change.targetLabel })) ?? null,
        };
        return { status: "read-ok", result: { observedAt: new Date().toISOString(),
          coverage: counts && recent ? "complete" : "partial", source: "web", nextCursor: null, projection } };
      } catch (error) {
        if (error instanceof Response && error.status === 403) return { status: "denied" };
        if (error instanceof Response && error.status === 503) return { status: "unavailable" };
        throw error;
      }
    },
    async canReadResult(grant: ForumControlGrant): Promise<boolean> {
      // Any prior overview can include both aggregates and History. Exact
      // Owner currently has both; if admission ever changes, fail closed.
      const access = await accessFor(grant);
      return access.canReadHistory === true;
    },
  };
}
