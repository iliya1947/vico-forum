# Task 6 / F2 — авторская самопроверка

- Stacked Draft implementation PR: [#380](https://github.com/iliya1947/vico-forum/pull/380).
- Branch: `feat/forum-structure-f2`; base `feat/forum-structure-f1`, accepted F1 `8227db6003f5a23a369e11b645194da229315f7a`.
- Stable F2 head: `11a2808f14a79efd69dbbb120f5b732bf2880d4f`.
- Scope: только F2 из S8 [PLAN.md](PLAN.md). Четыре файла diff, новых миграций/изменений accepted F1 нет. Не merge F1/F2 отдельно.

## Реализация

`db/forum-structure.ts`: typed server-only `StructureWriter` / `PostgresStructureWriter`. Create/rename/reorder ordinary categories/sections; moveSection с expectedCategoryId и targetCategoryId. Новые ID — server UUID; Unicode trim/1–200 code points/800 UTF-8 bytes, без controls/newlines/unpaired surrogates. Display names могут совпадать; reserved Help определяется stable IDs и authoritative parent, не названием.

Каждая команда проверяет exact server request capability. Одна собственная READ COMMITTED transaction: structure singleton FOR UPDATE + global expected version → необходимые category/section/neighbor NO KEY UPDATE в C-sorted ID order → active account NO KEY UPDATE → shared native AP-10 admin.forum policy + current raw DB grants/overrides/Owner binding. Никакого нового authz mutex/revocation commit barrier не обещается.

Actual effect изменяет только нужные container fields и один global version CAS/RETURNING. Reorder выбирает соседа SQL из полной sibling group до любых page/search ограничений; меняет две позиции с одной History. Create/reparent append max+1, empty→0, source holes допустимы. Current no-op проходит все guards, не меняет version/event; stale desired-state конфликтует. Bigint DTO/context — canonical decimal strings, включая значения выше Number precision; overflow и наблюдаемый равный order не выдают fake success.

`db/admin-history.ts`: один transaction-owned `appendStructureHistory`, last effect под общим History order lock. Labels и name snapshots bounded200; context закрыт существующим typed union/CHECK. Producer не читает topic source; future topic.moved label принудительно neutral ID. Actual topic-move command здесь отсутствует.

## Проверка

- 37 unit tests — Unicode/control/size и canonical signed-PG-bigint boundary.
- 36 real PG17 tests:
  - все семь операций и их persisted before/after, одна version/History на effect;
  - empty groups, Unicode/duplicate names, stable IDs/timestamps/subtree, inactive content author;
  - reserved IDs, forged Help relationships, missing targets, stale/current no-op, parent CAS;
  - exact bigint above2^53/max, version/append overflow, equal-position conflict;
  - exact permission/custom role/override allow+deny/revoke, Owner binding, AP-10 floor/expiry/Owner immunity, native active/missing actor admission;
  - forced History INSERT failure для каждой из семи операций: domain/version/history rollback;
  - все семь реальных commands под точной web-ролью из runtime contract; без DELETE/singleton INSERT/DDL;
  - bounded legacy name snapshots и source-free neutral structural producer.
- Concurrency использует реальные отдельные PG connections и gate **после фактического acquired row lock**, затем `pg_blocking_pids`:
  - same expected global version: rename/create/reorder/reparent и второй writer дают один effect, второй stale;
  - revoke и AP-10 до native actor admission не проходят по прежнему request hint;
  - deactivation first / admission first, actual effect и no-op;
  - structure parent NO KEY UPDATE → actor wait, тогда publication с тем же actor завершает FK KEY SHARE без deadlock; обратная очередь также завершается и сохраняет topic.section_id/current parent.
- TypeScript и lint PASS; migration immutability guard PASS: 0 new migrations.

## Exact-head CI/acceptance — PASS

Stable head: `11a2808f14a79efd69dbbb120f5b732bf2880d4f`. F1 dependency и base #380 остались `8227db6003f5a23a369e11b645194da229315f7a` / `feat/forum-structure-f1`; Draft, unmerged, 4-file bounded diff.

- [CI checks](https://github.com/iliya1947/vico-forum/actions/runs/45235340129/job/137905436687) — PASS: 234 files / 3010 unit tests, lint/typecheck, build, UI preview build, accepted migration guard, Drizzle metadata/check и generation parity (`No schema changes`).
- [CI database](https://github.com/iliya1947/vico-forum/actions/runs/45235340129/job/137905436347) — PASS: 116 files / 1743 PostgreSQL tests, manifest75, runtime privilege/row-lock probes, split-authority provisioning, credential diagnostic/recovery/bootstrap, build и Worker smoke.
- Все 4 применимых acceptance workflows, выбранные штатными path-фильтрами, — PASS:

- [Topic Watch connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45235352494) — PASS.
- [Own topic title connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45235352475) — PASS.
- [Personal Mute/Block connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45235352521) — PASS.
- [Topic Bookmarks connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45235352449) — PASS.

Все jobs прошли с первой CI-попытки; code/head после запуска не менялись. Это author gate F2, не независимый review и не завершение всей Task 6.

## Граница передачи

Exact-head checks подтверждены. Следующая — Мира для bounded F2 coordinator checkpoint, не whole-feature/independent author review. После PASS — отдельное назначение F3. F3 move/hidden/receipt, F4 readers/contexts/routes, F5 UI/Owner projection и F6 assembly не начинались. F1/F2 остаются Draft/unmerged; docsF7 только после финального implementation merge.
