import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const MANIFEST_PATH = ".github/production-schema-manifest.json";

const actionByCode = new Map([
  ["a", "NO ACTION"],
  ["r", "RESTRICT"],
  ["c", "CASCADE"],
  ["n", "SET NULL"],
  ["d", "SET DEFAULT"],
]);

function sortedByName(values) {
  return [...values].sort((left, right) => left.name.localeCompare(right.name));
}

function checkHash(expression) {
  return createHash("sha256").update(expression).digest("hex");
}

export async function loadProductionSchemaManifest(path = MANIFEST_PATH) {
  const manifest = JSON.parse(await readFile(path, "utf8"));
  assert.equal(manifest.version, 1, "Unsupported production schema manifest version");
  assert.equal(manifest.schema, "public", "Production schema manifest must target public schema");
  assert.ok(manifest.targetMigration, "Production schema manifest target migration is required");
  assert.ok(manifest.tables && typeof manifest.tables === "object", "Production schema manifest tables are required");
  return manifest;
}

export async function readProductionSchemaSnapshot(client) {
  const columnRows = await client.query(`
    SELECT relation.relname AS table_name,
      attribute.attname AS column_name,
      pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) AS type,
      NOT attribute.attnotnull AS nullable,
      attribute.attnum AS ordinal
    FROM pg_catalog.pg_class relation
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
    JOIN pg_catalog.pg_attribute attribute ON attribute.attrelid = relation.oid
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
      AND attribute.attnum > 0
      AND NOT attribute.attisdropped
    ORDER BY relation.relname, attribute.attnum
  `);

  const constraintRows = await client.query(`
    SELECT relation.relname AS table_name,
      constraint_row.conname AS name,
      constraint_row.contype AS type,
      constraint_row.condeferrable AS deferrable,
      constraint_row.condeferred AS initially_deferred,
      constraint_row.convalidated AS validated,
      COALESCE(constraint_index.indnullsnotdistinct, false) AS nulls_not_distinct,
      referenced.relname AS referenced_table,
      constraint_row.confupdtype AS on_update_code,
      constraint_row.confdeltype AS on_delete_code,
      CASE WHEN constraint_row.contype = 'c'
        THEN pg_catalog.pg_get_expr(constraint_row.conbin, constraint_row.conrelid, false)
        ELSE NULL
      END AS check_expression,
      ARRAY(
        SELECT attribute.attname::text
        FROM unnest(constraint_row.conkey) WITH ORDINALITY AS key(attnum, ordinal)
        JOIN pg_catalog.pg_attribute attribute
          ON attribute.attrelid = constraint_row.conrelid
         AND attribute.attnum = key.attnum
        ORDER BY key.ordinal
      )::text[] AS columns,
      ARRAY(
        SELECT attribute.attname::text
        FROM unnest(constraint_row.confkey) WITH ORDINALITY AS key(attnum, ordinal)
        JOIN pg_catalog.pg_attribute attribute
          ON attribute.attrelid = constraint_row.confrelid
         AND attribute.attnum = key.attnum
        ORDER BY key.ordinal
      )::text[] AS referenced_columns
    FROM pg_catalog.pg_constraint constraint_row
    JOIN pg_catalog.pg_class relation ON relation.oid = constraint_row.conrelid
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
    LEFT JOIN pg_catalog.pg_class referenced ON referenced.oid = constraint_row.confrelid
    LEFT JOIN pg_catalog.pg_index constraint_index ON constraint_index.indexrelid = constraint_row.conindid
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
      AND constraint_row.contype IN ('p', 'u', 'f', 'c')
    ORDER BY relation.relname, constraint_row.conname
  `);

  const indexRows = await client.query(`
    SELECT table_relation.relname AS table_name,
      index_relation.relname AS name,
      index_row.indisunique AS unique,
      access_method.amname AS method,
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', attribute.attname,
            'order', CASE WHEN (key.options & 1) = 1 THEN 'desc' ELSE 'asc' END,
            'nulls', CASE WHEN (key.options & 2) = 2 THEN 'first' ELSE 'last' END
          )
          ORDER BY key.ordinal
        )
        FROM unnest(index_row.indkey::int2[], index_row.indoption::int2[])
          WITH ORDINALITY AS key(attnum, options, ordinal)
        LEFT JOIN pg_catalog.pg_attribute attribute
          ON attribute.attrelid = index_row.indrelid
         AND attribute.attnum = key.attnum
        WHERE key.ordinal <= index_row.indnkeyatts
      ), '[]'::jsonb) AS columns
    FROM pg_catalog.pg_index index_row
    JOIN pg_catalog.pg_class table_relation ON table_relation.oid = index_row.indrelid
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = table_relation.relnamespace
    JOIN pg_catalog.pg_class index_relation ON index_relation.oid = index_row.indexrelid
    JOIN pg_catalog.pg_am access_method ON access_method.oid = index_relation.relam
    WHERE namespace.nspname = 'public'
      AND table_relation.relkind IN ('r', 'p')
      AND NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint constraint_row
        WHERE constraint_row.conindid = index_row.indexrelid
      )
    ORDER BY table_relation.relname, index_relation.relname
  `);

  const tables = {};
  for (const row of columnRows.rows) {
    const table = tables[row.table_name] ??= {
      columns: [],
      primaryKeys: [],
      uniqueConstraints: [],
      foreignKeys: [],
      checks: [],
      indexes: [],
    };
    table.columns.push({
      name: row.column_name,
      type: row.type,
      nullable: row.nullable,
    });
  }

  for (const row of constraintRows.rows) {
    const table = tables[row.table_name];
    assert.ok(table, `Constraint references unexpected public table ${row.table_name}`);
    assert.equal(row.validated, true, `Constraint public.${row.table_name}.${row.name} must be validated`);

    if (row.type === "p") {
      table.primaryKeys.push({ name: row.name, columns: row.columns });
    } else if (row.type === "u") {
      table.uniqueConstraints.push({
        name: row.name,
        columns: row.columns,
        nullsNotDistinct: row.nulls_not_distinct,
      });
    } else if (row.type === "f") {
      table.foreignKeys.push({
        name: row.name,
        columns: row.columns,
        referencedTable: row.referenced_table,
        referencedColumns: row.referenced_columns,
        onDelete: actionByCode.get(row.on_delete_code),
        onUpdate: actionByCode.get(row.on_update_code),
        deferrable: row.deferrable,
        initiallyDeferred: row.initially_deferred,
      });
    } else if (row.type === "c") {
      assert.ok(row.check_expression, `Check constraint ${row.name} must expose an expression`);
      table.checks.push({
        name: row.name,
        columns: [...row.columns].sort(),
        definitionSha256: checkHash(row.check_expression),
      });
    }
  }

  for (const row of indexRows.rows) {
    const table = tables[row.table_name];
    assert.ok(table, `Index references unexpected public table ${row.table_name}`);
    table.indexes.push({
      name: row.name,
      unique: row.unique,
      method: row.method,
      columns: row.columns,
    });
  }

  for (const table of Object.values(tables)) {
    table.primaryKeys = sortedByName(table.primaryKeys);
    table.uniqueConstraints = sortedByName(table.uniqueConstraints);
    table.foreignKeys = sortedByName(table.foreignKeys);
    table.checks = sortedByName(table.checks);
    table.indexes = sortedByName(table.indexes);
  }

  return { tables };
}

export function assertProductionSchemaManifest(actual, expected) {
  const pending = [];
  for (const [tableName, table] of Object.entries(expected.tables)) {
    for (const check of table.checks) {
      if (check.definitionSha256 !== "PENDING") continue;
      const actualCheck = actual.tables[tableName]?.checks.find(({ name }) => name === check.name);
      pending.push(`${tableName}.${check.name}=${actualCheck?.definitionSha256 ?? "MISSING"}`);
    }
  }
  assert.deepEqual(
    pending,
    [],
    `Production schema manifest contains pending check hashes:\n${pending.join("\n")}`,
  );
  assert.deepEqual(
    normalizeTableColumns(actual.tables),
    normalizeTableColumns(expected.tables),
    "Production schema does not match repository manifest",
  );
}

function normalizeTableColumns(tables) {
  return Object.fromEntries(
    Object.entries(tables).map(([name, table]) => [
      name,
      {
        ...table,
        columns: [...table.columns].sort((left, right) => left.name.localeCompare(right.name)),
      },
    ]),
  );
}
