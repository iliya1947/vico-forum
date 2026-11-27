import type { Pool, PoolClient } from "pg";
import type { AuthorizationCapability } from "./authorization-service";
import { isBoundOwner } from "../app/authorization/owner";
import { assertActiveAccountForMutation } from "./account-state";
import { assertNoActiveUserMeasureRestrictionPg } from "./user-measure-policy";
import {
  appendStructureHistory, historyLabel, type CategoryHistoryState,
  type SectionHistoryState, type StructureHistoryChange, type StructureHistoryVersion,
} from "./admin-history";
import { HELP_SOLUTIONS_CATEGORY_ID, HELP_SOLUTIONS_SERVICE_SECTION_ID } from "./forum-identifiers";

export const STRUCTURE_PERMISSION = "forum.structure.manage" as const;
import { BIGINT_MAX, StructureValidationError, StructureForbiddenError, StructureNotFoundError, StructureInvariantError, StructureConflictError, parseStructureCounter } from "./forum-structure-contract";
export { StructureValidationError, StructureForbiddenError, StructureNotFoundError, StructureInvariantError, StructureConflictError, parseStructureCounter } from "./forum-structure-contract";

export function validateStructureName(value: unknown): string {
  if (typeof value !== "string" || /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/u.test(value)) {
    throw new StructureValidationError("Invalid structure name");
  }
  const name = value.trim();
  if (!name || Array.from(name).length > 200 || new TextEncoder().encode(name).byteLength > 800) {
    throw new StructureValidationError("Invalid structure name");
  }
  return name;
}
function identity(value: unknown): string {
  if (typeof value !== "string" || !value || /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/u.test(value)) {
    throw new StructureValidationError("Invalid structure identity");
  }
  return value;
}
function ordinaryCategory(id: string): void {
  if (id === HELP_SOLUTIONS_CATEGORY_ID) throw new StructureNotFoundError("Ordinary category not found");
}
function ordinarySection(row: SectionStructure): void {
  if (row.id === HELP_SOLUTIONS_SERVICE_SECTION_ID) throw new StructureNotFoundError("Ordinary section not found");
  ordinaryCategory(row.categoryId);
}
function nextCounter(current: bigint, reason: "version-exhausted" | "position-exhausted"): string {
  if (current === BIGINT_MAX) throw new StructureConflictError(reason);
  return (current + 1n).toString();
}
function storedCounter(value: unknown): string {
  try { return parseStructureCounter(value).toString(); }
  catch { throw new StructureInvariantError("Invalid persisted structure counter"); }
}

export interface CategoryStructure { id: string; name: string; sortPosition: string }
export interface SectionStructure extends CategoryStructure { categoryId: string }
export interface StructureExpectation { expectedStructureVersion: string }
export interface StructureResult<T> { value: T; structureVersion: string; changed: boolean }
export type StructureDirection = "up" | "down";
export interface StructureWriter {
  createCategory(actorId: string, input: StructureExpectation & { name: string }): Promise<StructureResult<CategoryStructure>>;
  renameCategory(actorId: string, categoryId: string, input: StructureExpectation & { name: string }): Promise<StructureResult<CategoryStructure>>;
  reorderCategory(actorId: string, categoryId: string, input: StructureExpectation & { direction: StructureDirection }): Promise<StructureResult<CategoryStructure>>;
  createSection(actorId: string, categoryId: string, input: StructureExpectation & { name: string }): Promise<StructureResult<SectionStructure>>;
  renameSection(actorId: string, sectionId: string, input: StructureExpectation & { name: string }): Promise<StructureResult<SectionStructure>>;
  reorderSection(actorId: string, sectionId: string, input: StructureExpectation & { direction: StructureDirection }): Promise<StructureResult<SectionStructure>>;
  moveSection(actorId: string, sectionId: string, input: StructureExpectation & { expectedCategoryId: string; targetCategoryId: string }): Promise<StructureResult<SectionStructure>>;
}
type Prepared<T> = { value: T; apply?: (versions: StructureHistoryVersion) => Promise<{ value: T; history: StructureHistoryChange }> };
type CategoryRow = { id: string; name: string; sort_position: string };
type SectionRow = CategoryRow & { category_id: string };
const category = (r: CategoryRow): CategoryStructure => ({ id: r.id, name: r.name, sortPosition: storedCounter(r.sort_position) });
const section = (r: SectionRow): SectionStructure => ({ ...category(r), categoryId: r.category_id });
const categoryState = (r: CategoryStructure): CategoryHistoryState => ({ name: historyLabel(r.name), sortPosition: r.sortPosition });
const sectionState = (r: SectionStructure): SectionHistoryState => ({ ...categoryState(r), categoryId: r.categoryId });

/** Server-only capability. Actor is supplied by the authenticated request, never form authority.
 * No routes/UI or transaction nesting: every command owns exactly one READ COMMITTED transaction. */
export class PostgresStructureWriter implements StructureWriter {
  constructor(
    private readonly pool: Pick<Pool, "connect">,
    private readonly authorization: AuthorizationCapability,
    private readonly ownerUserId?: string,
  ) {}

  private async admit(client: PoolClient, actorId: string): Promise<void> {
    await assertActiveAccountForMutation(client, actorId);
    await assertNoActiveUserMeasureRestrictionPg(client, actorId, "admin.forum", this.ownerUserId);
    if (isBoundOwner(actorId, this.ownerUserId)) return;
    // Recheck real RBAC after any domain/actor wait; request hints never grant a write.
    const result = await client.query<{ allowed: boolean }>(`select case
      when o.effect='deny' then false when o.effect='allow' then true
      when rp.permission_key is not null then true else false end as allowed
      from "user" u
      left join authz_user_permission_overrides o on o.user_id=u.id and o.permission_key=$2
      left join authz_user_roles ur on ur.user_id=u.id
      join authz_roles r on r.id=coalesce(ur.role_id,(select id from authz_roles where slug='user'))
      left join authz_role_permissions rp on rp.role_id=r.id and rp.permission_key=$2
      where u.id=$1`, [actorId, STRUCTURE_PERMISSION]);
    if (result.rows[0]?.allowed !== true) throw new StructureForbiddenError("Structure permission required");
  }

  private async run<T>(actorId: string, expected: string, prepare: (client: PoolClient) => Promise<Prepared<T>>): Promise<StructureResult<T>> {
    identity(actorId);
    const expectation = parseStructureCounter(expected).toString();
    if (!await this.authorization.forUser(actorId).has(STRUCTURE_PERMISSION)) {
      throw new StructureForbiddenError("Structure permission required");
    }
    const client = await this.pool.connect();
    try {
      await client.query("begin isolation level read committed");
      const state = await client.query<{ version: string }>("select version::text from forum_structure_state where id=1 for update");
      if (state.rowCount !== 1) throw new StructureInvariantError("Structure singleton is missing");
      const current = storedCounter(state.rows[0].version);
      if (current !== expectation) throw new StructureConflictError("stale");
      const prepared = await prepare(client); // All container locks precede actor admission.
      await this.admit(client, actorId); // Includes validated no-op.
      if (!prepared.apply) {
        await client.query("commit");
        return { value: prepared.value, structureVersion: current, changed: false };
      }
      const version = nextCounter(BigInt(current), "version-exhausted");
      const effect = await prepared.apply({ previousVersion: current, version });
      const saved = await client.query("update forum_structure_state set version=$1::bigint where id=1 and version=$2::bigint returning id", [version, current]);
      if (saved.rowCount !== 1) throw new StructureInvariantError("Structure CAS failed under mutex");
      // Last domain effect. No domain lock/query or other command follows History.
      await appendStructureHistory(client, actorId, effect.history);
      await client.query("commit");
      return { value: effect.value, structureVersion: version, changed: true };
    } catch (error) {
      try { await client.query("rollback"); } catch { /* Preserve the original failure. */ }
      throw error;
    } finally { client.release(); }
  }

  private async categories(client: PoolClient, ids: string[]): Promise<Map<string, CategoryStructure>> {
    for (const id of ids) ordinaryCategory(id);
    const result = await client.query<CategoryRow>(`select id,name,sort_position::text from forum_categories
      where id=any($1::text[]) order by id collate "C" for no key update`, [[...new Set(ids)]]);
    const rows = new Map(result.rows.map(r => [r.id, category(r)]));
    if (ids.some(id => !rows.has(id))) throw new StructureNotFoundError("Ordinary category not found");
    return rows;
  }
  private async findSection(client: PoolClient, id: string): Promise<SectionStructure> {
    const result = await client.query<SectionRow>("select id,name,category_id,sort_position::text from forum_sections where id=$1", [id]);
    if (!result.rows[0]) throw new StructureNotFoundError("Ordinary section not found");
    const row = section(result.rows[0]); ordinarySection(row); return row;
  }
  private async sections(client: PoolClient, initial: SectionStructure, neighbor?: SectionStructure): Promise<SectionStructure[]> {
    const result = await client.query<SectionRow>(`select id,name,category_id,sort_position::text from forum_sections
      where id=any($1::text[]) order by id collate "C" for no key update`, [[initial.id, ...(neighbor ? [neighbor.id] : [])]]);
    const map = new Map(result.rows.map(r => [r.id, section(r)]));
    return [initial, ...(neighbor ? [neighbor] : [])].map(before => {
      const row = map.get(before.id);
      if (!row) throw new StructureNotFoundError("Ordinary section not found");
      ordinarySection(row);
      if (row.categoryId !== before.categoryId || row.sortPosition !== before.sortPosition) throw new StructureConflictError("parent-changed");
      return row;
    });
  }
  private async appendPosition(client: PoolClient, categoryId?: string): Promise<string> {
    const result = categoryId === undefined
      ? await client.query<{ position: string | null }>("select max(sort_position)::text position from forum_categories where id<>$1", [HELP_SOLUTIONS_CATEGORY_ID])
      : await client.query<{ position: string | null }>("select max(sort_position)::text position from forum_sections where category_id=$1", [categoryId]);
    const max = result.rows[0].position;
    return max === null ? "0" : nextCounter(BigInt(storedCounter(max)), "position-exhausted");
  }

  async createCategory(actorId: string, input: StructureExpectation & { name: string }) {
    const name = validateStructureName(input.name);
    return this.run<CategoryStructure>(actorId, input.expectedStructureVersion, async client => {
      const value = { id: crypto.randomUUID(), name, sortPosition: await this.appendPosition(client) };
      return { value, apply: async versions => {
        await client.query("insert into forum_categories(id,name,sort_position) values($1,$2,$3::bigint)", [value.id, name, value.sortPosition]);
        return { value, history: { action: "category.created", targetType: "category", targetId: value.id, targetLabel: name,
          context: { ...versions, before: null, after: categoryState(value) } } };
      } };
    });
  }
  async renameCategory(actorId: string, categoryId: string, input: StructureExpectation & { name: string }) {
    const id = identity(categoryId), name = validateStructureName(input.name);
    return this.run<CategoryStructure>(actorId, input.expectedStructureVersion, async client => {
      const before = (await this.categories(client, [id])).get(id)!;
      return { value: before, ...(before.name === name ? {} : { apply: async (versions: StructureHistoryVersion) => {
        await client.query("update forum_categories set name=$2 where id=$1", [id, name]);
        const value = { ...before, name };
        return { value, history: { action: "category.renamed" as const, targetType: "category" as const, targetId: id, targetLabel: name,
          context: { ...versions, before: categoryState(before), after: categoryState(value) } } };
      } }) };
    });
  }
  async createSection(actorId: string, categoryId: string, input: StructureExpectation & { name: string }) {
    const parent = identity(categoryId), name = validateStructureName(input.name);
    return this.run<SectionStructure>(actorId, input.expectedStructureVersion, async client => {
      await this.categories(client, [parent]);
      const value = { id: crypto.randomUUID(), categoryId: parent, name, sortPosition: await this.appendPosition(client, parent) };
      return { value, apply: async versions => {
        await client.query("insert into forum_sections(id,category_id,name,sort_position) values($1,$2,$3,$4::bigint)", [value.id, parent, name, value.sortPosition]);
        return { value, history: { action: "section.created", targetType: "section", targetId: value.id, targetLabel: name,
          context: { ...versions, before: null, after: sectionState(value) } } };
      } };
    });
  }
  async renameSection(actorId: string, sectionId: string, input: StructureExpectation & { name: string }) {
    const id = identity(sectionId), name = validateStructureName(input.name);
    return this.run<SectionStructure>(actorId, input.expectedStructureVersion, async client => {
      const initial = await this.findSection(client, id);
      await this.categories(client, [initial.categoryId]);
      const [before] = await this.sections(client, initial);
      return { value: before, ...(before.name === name ? {} : { apply: async (versions: StructureHistoryVersion) => {
        await client.query("update forum_sections set name=$2 where id=$1", [id, name]);
        const value = { ...before, name };
        return { value, history: { action: "section.renamed" as const, targetType: "section" as const, targetId: id, targetLabel: name,
          context: { ...versions, before: sectionState(before), after: sectionState(value) } } };
      } }) };
    });
  }
  async moveSection(actorId: string, sectionId: string, input: StructureExpectation & { expectedCategoryId: string; targetCategoryId: string }) {
    const id = identity(sectionId), expected = identity(input.expectedCategoryId), target = identity(input.targetCategoryId);
    return this.run<SectionStructure>(actorId, input.expectedStructureVersion, async client => {
      const initial = await this.findSection(client, id);
      // Classify the Help destination only after validating the ordinary source.
      if (target === HELP_SOLUTIONS_CATEGORY_ID) throw new StructureConflictError("reserved-destination");
      await this.categories(client, [initial.categoryId, target]);
      const [before] = await this.sections(client, initial);
      if (before.categoryId !== expected) throw new StructureConflictError("parent-changed");
      if (before.categoryId === target) return { value: before };
      const sortPosition = await this.appendPosition(client, target);
      return { value: before, apply: async versions => {
        const value = { ...before, categoryId: target, sortPosition };
        const moved = await client.query("update forum_sections set category_id=$2,sort_position=$3::bigint where id=$1 and category_id=$4 returning id", [id, target, sortPosition, expected]);
        if (moved.rowCount !== 1) throw new StructureConflictError("parent-changed");
        return { value, history: { action: "section.moved", targetType: "section", targetId: id, targetLabel: value.name,
          context: { ...versions, before: sectionState(before), after: sectionState(value) } } };
      } };
    });
  }
  async reorderCategory(actorId: string, categoryId: string, input: StructureExpectation & { direction: StructureDirection }) {
    const id = identity(categoryId); const direction = this.direction(input.direction);
    return this.run<CategoryStructure>(actorId, input.expectedStructureVersion, async client => {
      ordinaryCategory(id);
      const found = await client.query<CategoryRow>("select id,name,sort_position::text from forum_categories where id=$1", [id]);
      if (!found.rows[0]) throw new StructureNotFoundError("Ordinary category not found");
      const initial = category(found.rows[0]);
      const neighbor = await client.query<CategoryRow>(`select id,name,sort_position::text from forum_categories
        where id<>$1 and (sort_position,id collate "C") ${direction.comparison} ($2::bigint,$3::text collate "C")
        order by sort_position ${direction.order},id collate "C" ${direction.order} limit 1`, [HELP_SOLUTIONS_CATEGORY_ID, initial.sortPosition, id]);
      const other = neighbor.rows[0] ? category(neighbor.rows[0]) : undefined;
      const locked = await this.categories(client, [id, ...(other ? [other.id] : [])]);
      const before = locked.get(id)!;
      if (before.sortPosition !== initial.sortPosition || (other && locked.get(other.id)!.sortPosition !== other.sortPosition)) throw new StructureConflictError("order-invariant");
      if (!other) return { value: before };
      if (other.sortPosition === before.sortPosition) throw new StructureConflictError("order-invariant");
      return { value: before, apply: async versions => {
        await this.swap(client, "forum_categories", before, other);
        const value = { ...before, sortPosition: other.sortPosition };
        return { value, history: { action: "category.reordered", targetType: "category", targetId: id, targetLabel: value.name,
          context: { ...versions, before: categoryState(before), after: categoryState(value), neighborId: other.id,
            neighborBeforePosition: other.sortPosition, neighborAfterPosition: before.sortPosition } } };
      } };
    });
  }
  async reorderSection(actorId: string, sectionId: string, input: StructureExpectation & { direction: StructureDirection }) {
    const id = identity(sectionId); const direction = this.direction(input.direction);
    return this.run<SectionStructure>(actorId, input.expectedStructureVersion, async client => {
      const initial = await this.findSection(client, id);
      await this.categories(client, [initial.categoryId]);
      const neighbor = await client.query<SectionRow>(`select id,name,category_id,sort_position::text from forum_sections
        where category_id=$1 and id<>$2 and (sort_position,id collate "C") ${direction.comparison} ($3::bigint,$4::text collate "C")
        order by sort_position ${direction.order},id collate "C" ${direction.order} limit 1`, [initial.categoryId, HELP_SOLUTIONS_SERVICE_SECTION_ID, initial.sortPosition, id]);
      const other = neighbor.rows[0] ? section(neighbor.rows[0]) : undefined;
      const [before, lockedOther] = await this.sections(client, initial, other);
      if (!lockedOther) return { value: before };
      if (lockedOther.sortPosition === before.sortPosition) throw new StructureConflictError("order-invariant");
      return { value: before, apply: async versions => {
        await this.swap(client, "forum_sections", before, lockedOther);
        const value = { ...before, sortPosition: lockedOther.sortPosition };
        return { value, history: { action: "section.reordered", targetType: "section", targetId: id, targetLabel: value.name,
          context: { ...versions, before: sectionState(before), after: sectionState(value), neighborId: lockedOther.id,
            neighborBeforePosition: lockedOther.sortPosition, neighborAfterPosition: before.sortPosition } } };
      } };
    });
  }
  private direction(direction: StructureDirection) {
    if (direction !== "up" && direction !== "down") throw new StructureValidationError("Invalid reorder direction");
    return direction === "up" ? { comparison: "<", order: "desc" } : { comparison: ">", order: "asc" };
  }
  private async swap(client: PoolClient, table: "forum_categories" | "forum_sections", before: CategoryStructure, other: CategoryStructure) {
    const result = await client.query(`update ${table} set sort_position=case when id=$1 then $3::bigint else $4::bigint end
      where id=any($2::text[]) returning id`, [before.id, [before.id, other.id], other.sortPosition, before.sortPosition]);
    if (result.rowCount !== 2) throw new StructureInvariantError("Reorder targets missing under lock");
  }
}
