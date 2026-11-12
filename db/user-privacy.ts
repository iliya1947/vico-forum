import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { forumOnlinePresence, user, userPrivacyPreferences } from "./schema";

export class UserPrivacyAccountMissingError extends Error {
  constructor(message = "Authenticated account no longer exists") {
    super(message);
    this.name = "UserPrivacyAccountMissingError";
  }
}

type PrivacyTransaction = Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];

/** Serialize a subject's preference mutation and heartbeat without a global lock. */
export async function lockPrivacySubject(tx: PrivacyTransaction, actorId: string): Promise<Date | null> {
  const [account] = await tx.select({ id: user.id, deactivatedAt: user.deactivatedAt }).from(user)
    .where(eq(user.id, actorId)).for("update");
  if (!account) throw new UserPrivacyAccountMissingError();
  // Return the authoritative lifecycle value under the same row lock.
  // Privacy saves intentionally do not enforce account activity in SA04-F.
  return account.deactivatedAt;
}

export class DrizzleUserPrivacyRepository {
  constructor(private readonly database: NodePgDatabase) {}

  async read(actorId: string): Promise<boolean> {
    const [account] = await this.database.select({
      id: user.id, showOnline: userPrivacyPreferences.showOnline,
    }).from(user)
      .leftJoin(userPrivacyPreferences, eq(userPrivacyPreferences.userId, user.id))
      .where(eq(user.id, actorId));
    if (!account) throw new UserPrivacyAccountMissingError();
    // An absent preference row is ON, not a fallback for a failed SQL read.
    return account.showOnline ?? true;
  }

  async save(actorId: string, showOnline: boolean): Promise<void> {
    await this.database.transaction(async (tx) => {
      await lockPrivacySubject(tx, actorId);
      await tx.insert(userPrivacyPreferences).values({ userId: actorId, showOnline })
        .onConflictDoUpdate({
          target: userPrivacyPreferences.userId,
          set: { showOnline, updatedAt: sql`clock_timestamp()` },
        });
      // Repeated OFF must also remove a newly inserted stale presence row.
      if (!showOnline) {
        await tx.delete(forumOnlinePresence).where(eq(forumOnlinePresence.userId, actorId));
      }
    }, { isolationLevel: "read committed" });
  }
}
