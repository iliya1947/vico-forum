import type { Pool, PoolClient, QueryResultRow } from "pg";
import { AUTHORIZATION_MANAGE_PERMISSION, type PermissionKey } from "../app/authorization/catalog";

export type OverrideEffect = "allow" | "deny";
export interface AuthorizationRole { id: string; slug: string; displayName: string; isSystem: boolean }
export interface UserAuthorization {
  role: AuthorizationRole;
  explicitAssignment: boolean;
  grants: PermissionKey[];
  overrides: Partial<Record<PermissionKey, OverrideEffect>>;
  effectivePermissions: PermissionKey[];
}

export class AuthorizationForbiddenError extends Error {}
export class AuthorizationLockoutError extends Error {}
export class AuthorizationNotFoundError extends Error {}
export class AuthorizationRoleAssignedError extends Error {}

type Queryable = Pick<Pool | PoolClient, "query">;

export class PostgresAuthorizationRepository {
  constructor(private readonly pool: Pool) {}

  async listRoles(): Promise<AuthorizationRole[]> {
    const result = await this.pool.query<RoleRow>(
      "select id, slug, display_name, is_system from authz_roles order by is_system desc, slug",
    );
    return result.rows.map(mapRole);
  }

  async readRole(roleId: string): Promise<(AuthorizationRole & { grants: PermissionKey[] }) | undefined> {
    const role = await this.pool.query<RoleRow>(
      "select id, slug, display_name, is_system from authz_roles where id = $1", [roleId],
    );
    if (!role.rows[0]) return undefined;
    return { ...mapRole(role.rows[0]), grants: await this.readRoleGrants(roleId) };
  }

  async readRoleGrants(roleId: string, database: Queryable = this.pool): Promise<PermissionKey[]> {
    const result = await database.query<{ permission_key: PermissionKey }>(
      "select permission_key from authz_role_permissions where role_id = $1 order by permission_key", [roleId],
    );
    return result.rows.map((row) => row.permission_key);
  }

  async resolveUser(userId: string, database: Queryable = this.pool): Promise<UserAuthorization> {
    const role = await database.query<RoleRow & { explicit_assignment: boolean }>(`
      select r.id, r.slug, r.display_name, r.is_system, (ur.user_id is not null) explicit_assignment
      from "user" u
      left join authz_user_roles ur on ur.user_id = u.id
      join authz_roles r on r.id = coalesce(ur.role_id, (select id from authz_roles where slug = 'user'))
      where u.id = $1`, [userId]);
    const selected = role.rows[0];
    if (!selected) {
      const existingUser = await database.query("select 1 from \"user\" where id = $1", [userId]);
      if (!existingUser.rowCount) throw new AuthorizationNotFoundError("user does not exist");
      throw new AuthorizationNotFoundError("built-in user role is missing");
    }
    const [grants, overrideRows] = await Promise.all([
      this.readRoleGrants(selected.id, database),
      database.query<{ permission_key: PermissionKey; effect: OverrideEffect }>(
        "select permission_key, effect from authz_user_permission_overrides where user_id = $1 order by permission_key", [userId],
      ),
    ]);
    const overrides: Partial<Record<PermissionKey, OverrideEffect>> = {};
    for (const row of overrideRows.rows) overrides[row.permission_key] = row.effect;
    const keys = new Set<PermissionKey>(grants);
    for (const row of overrideRows.rows) {
      if (row.effect === "allow") keys.add(row.permission_key);
      else keys.delete(row.permission_key);
    }
    return {
      role: mapRole(selected), explicitAssignment: selected.explicit_assignment,
      grants, overrides, effectivePermissions: [...keys].sort(),
    };
  }

  async hasPermission(userId: string, permission: PermissionKey): Promise<boolean> {
    return effectivePermission(this.pool, userId, permission);
  }

  createCustomRole(actorId: string, role: { id: string; slug: string; displayName: string }) {
    return this.mutate(actorId, async (client) => {
      await client.query(
        "insert into authz_roles (id, slug, display_name, is_system) values ($1, $2, $3, false)",
        [role.id, role.slug, role.displayName],
      );
    });
  }

  renameCustomRole(actorId: string, roleId: string, input: { displayName: string }) {
    return this.mutate(actorId, async (client) => {
      const result = await client.query(
        "update authz_roles set display_name = $2, updated_at = now() where id = $1 and not is_system",
        [roleId, input.displayName],
      );
      if (result.rowCount === 0) throw new AuthorizationNotFoundError("custom role does not exist");
    });
  }

  replaceRoleGrants(actorId: string, roleId: string, permissions: readonly PermissionKey[]) {
    return this.mutate(actorId, async (client) => {
      if (!(await client.query("select 1 from authz_roles where id = $1", [roleId])).rowCount) {
        throw new AuthorizationNotFoundError("role does not exist");
      }
      await client.query("delete from authz_role_permissions where role_id = $1", [roleId]);
      for (const permission of permissions) {
        await client.query("insert into authz_role_permissions (role_id, permission_key) values ($1, $2)", [roleId, permission]);
      }
    });
  }

  deleteCustomRole(actorId: string, roleId: string) {
    return this.mutate(actorId, async (client) => {
      try {
        const result = await client.query("delete from authz_roles where id = $1 and not is_system", [roleId]);
        if (result.rowCount === 0) throw new AuthorizationNotFoundError("custom role does not exist");
      } catch (error) {
        if (isDatabaseCode(error, "23503")) throw new AuthorizationRoleAssignedError("role is assigned to users");
        throw error;
      }
    });
  }

  assignUserRole(actorId: string, userId: string, roleId: string) {
    return this.mutate(actorId, async (client) => {
      await client.query(`insert into authz_user_roles (user_id, role_id) values ($1, $2)
        on conflict (user_id) do update set role_id = excluded.role_id, assigned_at = now()`, [userId, roleId]);
    });
  }

  setUserOverride(actorId: string, userId: string, permission: PermissionKey, effect: OverrideEffect | null) {
    return this.mutate(actorId, async (client) => {
      if (effect === null) {
        await client.query("delete from authz_user_permission_overrides where user_id = $1 and permission_key = $2", [userId, permission]);
      } else {
        await client.query(`insert into authz_user_permission_overrides (user_id, permission_key, effect) values ($1, $2, $3)
          on conflict (user_id, permission_key) do update set effect = excluded.effect, updated_at = now()`,
        [userId, permission, effect]);
      }
    });
  }

  private async mutate(actorId: string, operation: (client: PoolClient) => Promise<void>): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const state = await client.query<{ managers_ever_existed: boolean }>(
        "select managers_ever_existed from authz_mutation_lock where id = 1 for update",
      );
      if (!state.rows[0]) throw new AuthorizationNotFoundError("authorization mutation lock is missing");
      const before = await countManagers(client);
      if (!(await effectivePermission(client, actorId, AUTHORIZATION_MANAGE_PERMISSION))) {
        throw new AuthorizationForbiddenError("actor cannot manage authorization");
      }
      await operation(client);
      const after = await countManagers(client);
      if ((state.rows[0].managers_ever_existed || before > 0) && after === 0) {
        throw new AuthorizationLockoutError("mutation would remove the last access manager");
      }
      if (!state.rows[0].managers_ever_existed && (before > 0 || after > 0)) {
        await client.query("update authz_mutation_lock set managers_ever_existed = true where id = 1");
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
}

interface RoleRow extends QueryResultRow { id: string; slug: string; display_name: string; is_system: boolean }
function mapRole(row: RoleRow): AuthorizationRole {
  return { id: row.id, slug: row.slug, displayName: row.display_name, isSystem: row.is_system };
}

async function effectivePermission(database: Queryable, userId: string, permission: PermissionKey): Promise<boolean> {
  const result = await database.query<{ allowed: boolean }>(`select case
    when o.effect = 'deny' then false when o.effect = 'allow' then true
    when rp.permission_key is not null then true else false end allowed
    from "user" u
    left join authz_user_permission_overrides o on o.user_id = u.id and o.permission_key = $2
    left join authz_user_roles ur on ur.user_id = u.id
    join authz_roles r on r.id = coalesce(ur.role_id, (select id from authz_roles where slug = 'user'))
    left join authz_role_permissions rp on rp.role_id = r.id and rp.permission_key = $2
    where u.id = $1`, [userId, permission]);
  return result.rows[0]?.allowed ?? false;
}

async function countManagers(database: Queryable): Promise<number> {
  const result = await database.query<{ count: number }>(`select count(*)::int count from "user" u
    where coalesce(
      (select effect = 'allow' from authz_user_permission_overrides o
        where o.user_id = u.id and o.permission_key = $1),
      exists(select 1 from authz_role_permissions rp
        where rp.role_id = coalesce((select role_id from authz_user_roles ur where ur.user_id = u.id),
          (select id from authz_roles where slug = 'user')) and rp.permission_key = $1), false)`,
  [AUTHORIZATION_MANAGE_PERMISSION]);
  return result.rows[0]?.count ?? 0;
}

function isDatabaseCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
