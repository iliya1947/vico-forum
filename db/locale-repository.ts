import { asc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { ClientBase, DatabaseError, QueryResult } from "pg";
import { locales } from "./schema";
import { parseLocaleCandidate, type LocaleDefinition } from "../app/localization/locale";
import {
  RegistryIntegrityError,
  assemblePersistentRegistry,
  parsePersistentLocaleRow,
  type PersistentLocaleRepository,
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

export class ControlledLocaleWriter {
  constructor(private readonly client: ClientBase, private readonly maxRetries = 2) {}

  async apply(mutation: LocaleDesiredState): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      try { await this.applyOnce(mutation); return; }
      catch (error) {
        const code = (error as DatabaseError).code;
        if ((code === "40001" || code === "40P01") && attempt < this.maxRetries) continue;
        throw error;
      }
    }
  }

  private async applyOnce(mutation: LocaleDesiredState) {
    await this.client.query("begin isolation level serializable");
    try {
      const current = await this.client.query(`select tag, translation_status as "translationStatus",
        publication_status as "publicationStatus", direction, fallback_chain as "fallbackChain",
        aliases, match_tags as "matchTags", native_name as "nativeName",
        presentation_metadata as "presentationMetadata" from locales order by tag`);
      const definitions = current.rows.map(parsePersistentLocaleRow);
      const tag = mutation.type === "put" ? mutation.locale.tag : mutation.tag;
      if (parseLocaleCandidate(tag)?.translationTag === "en") {
        throw new RegistryIntegrityError("controlled writer cannot mutate bootstrap en");
      }
      const proposed = definitions.filter((locale) => locale.tag !== tag);
      if (mutation.type === "put") proposed.push(mutation.locale);
      await assemblePersistentRegistry(proposed.map((locale) => ({
        ...locale, aliases: locale.aliases ?? [], matchTags: locale.matchTags ?? [],
        presentationMetadata: locale.presentationMetadata ?? {},
      })));
      if (mutation.type === "delete") await this.client.query("delete from locales where tag = $1", [tag]);
      else await this.upsert(mutation.locale);
      await this.client.query("commit");
    } catch (error) {
      await this.client.query("rollback");
      throw error;
    }
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
