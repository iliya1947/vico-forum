import { asc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { ClientBase, DatabaseError, QueryResult } from "pg";
import { locales } from "./schema";
import { canonicalizeTranslationLocale, type LocaleDefinition } from "../app/localization/locale";
import {
  RegistryIntegrityError,
  assemblePersistentRegistry,
  parsePersistentLocaleRow,
  type PersistentLocaleRepository,
  type PersistentLocaleRow,
} from "../app/localization/persistent-registry";

export class DrizzleLocaleRepository implements PersistentLocaleRepository {
  constructor(private readonly database: NodePgDatabase) {}

  readAll() {
    return this.database.select({
      tag: locales.tag, translationStatus: locales.translationStatus,
      publicationStatus: locales.publicationStatus, direction: locales.direction,
      fallbackChain: locales.fallbackChain, aliases: locales.aliases, matchTags: locales.matchTags,
      nativeName: locales.nativeName, presentationMetadata: locales.presentationMetadata,
    }).from(locales).orderBy(asc(locales.tag));
  }
}

export type LocaleDesiredState =
  | { readonly type: "put"; readonly locale: LocaleDefinition }
  | { readonly type: "delete"; readonly tag: string };

export class AmbiguousCommitOutcomeError extends Error {
  constructor(
    readonly preState: string,
    readonly expectedPostState: string,
    readonly actualState: string | undefined,
    options: ErrorOptions,
  ) {
    super("locale mutation commit outcome could not be reconciled", options);
    this.name = "AmbiguousCommitOutcomeError";
  }
}

export class ControlledLocaleWriter {
  constructor(
    private readonly client: ClientBase,
    private readonly reconciliationRepository: PersistentLocaleRepository,
    private readonly maxRetries = 2,
  ) {}

  async apply(mutation: LocaleDesiredState): Promise<void> {
    const normalizedMutation = normalizeDesiredState(mutation);
    for (let attempt = 0; ; attempt++) {
      try { await this.applyOnce(normalizedMutation); return; }
      catch (error) {
        const code = (error as DatabaseError).code;
        if ((code === "40001" || code === "40P01") && attempt < this.maxRetries) continue;
        throw error;
      }
    }
  }

  private async applyOnce(mutation: LocaleDesiredState) {
    await this.client.query("begin isolation level serializable");
    let committing = false;
    let preState: string | undefined;
    let expectedPostState: string | undefined;
    try {
      const current = await this.client.query(`select tag, translation_status as "translationStatus",
        publication_status as "publicationStatus", direction, fallback_chain as "fallbackChain",
        aliases, match_tags as "matchTags", native_name as "nativeName",
        presentation_metadata as "presentationMetadata" from locales order by tag`);
      const definitions = current.rows.map(parsePersistentLocaleRow);
      preState = (await assemblePersistentRegistry(asRows(definitions))).semanticIdentity;
      const tag = mutation.type === "put" ? mutation.locale.tag : mutation.tag;
      const proposed = definitions.filter((locale) => locale.tag !== tag);
      if (mutation.type === "put") proposed.push(mutation.locale);
      expectedPostState = (await assemblePersistentRegistry(asRows(proposed))).semanticIdentity;
      if (mutation.type === "delete") await this.client.query("delete from locales where tag = $1", [tag]);
      else await this.upsert(mutation.locale);
      committing = true;
      await this.client.query("commit");
    } catch (error) {
      await this.rollbackIgnoringFailure();
      if (committing && preState && expectedPostState && isAmbiguousCommitError(error)) {
        await this.reconcile(preState, expectedPostState, error);
        return;
      }
      throw error;
    }
  }

  private async rollbackIgnoringFailure() {
    try {
      await this.client.query("rollback");
    } catch {
      // Preserve the transaction/commit error; rollback cannot clarify an ambiguous outcome.
    }
  }

  private async reconcile(preState: string, expectedPostState: string, originalError: unknown) {
    let actualState: string | undefined;
    try {
      actualState = (await assemblePersistentRegistry(await this.reconciliationRepository.readAll())).semanticIdentity;
    } catch {
      throw new AmbiguousCommitOutcomeError(preState, expectedPostState, undefined, { cause: originalError });
    }
    if (actualState === expectedPostState) return;
    if (actualState === preState) throw originalError;
    throw new AmbiguousCommitOutcomeError(preState, expectedPostState, actualState, { cause: originalError });
  }

  private upsert(locale: LocaleDefinition): Promise<QueryResult> {
    return this.client.query(
      `insert into locales (tag, translation_status, publication_status, direction, fallback_chain,
        aliases, match_tags, native_name, presentation_metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (tag) do update set translation_status=excluded.translation_status,
        publication_status=excluded.publication_status, direction=excluded.direction,
        fallback_chain=excluded.fallback_chain, aliases=excluded.aliases, match_tags=excluded.match_tags,
        native_name=excluded.native_name, presentation_metadata=excluded.presentation_metadata, updated_at=now()`,
      [locale.tag, locale.translationStatus, locale.publicationStatus, locale.direction,
        locale.fallbackChain, locale.aliases ?? [], locale.matchTags ?? [], locale.nativeName,
        locale.presentationMetadata ?? {}],
    );
  }
}

function normalizeDesiredState(mutation: LocaleDesiredState): LocaleDesiredState {
  const rawTag = mutation.type === "put" ? mutation.locale.tag : mutation.tag;
  const tag = canonicalizeTranslationLocale(rawTag);
  if (!tag) {
    throw new RegistryIntegrityError("controlled writer tag must be a translation locale without formatting extensions");
  }
  if (tag === "en") {
    throw new RegistryIntegrityError("controlled writer cannot mutate bootstrap en");
  }
  if (mutation.type === "delete") return { type: "delete", tag };
  return { type: "put", locale: { ...mutation.locale, tag } };
}

function asRows(locales: readonly LocaleDefinition[]): PersistentLocaleRow[] {
  return locales.map((locale) => ({
    ...locale,
    aliases: locale.aliases ?? [],
    matchTags: locale.matchTags ?? [],
    presentationMetadata: locale.presentationMetadata ?? {},
  }));
}

function isAmbiguousCommitError(error: unknown): boolean {
  const code = (error as DatabaseError | undefined)?.code;
  return code === "40003" || code === "08007" || code?.startsWith("08") === true;
}
