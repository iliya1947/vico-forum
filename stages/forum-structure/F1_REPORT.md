# Task 6 / F1 — авторская самопроверка

- Draft implementation PR: [#379](https://github.com/iliya1947/vico-forum/pull/379).
- Branch: `feat/forum-structure-f1`.
- Base main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Stable head: `8227db6003f5a23a369e11b645194da229315f7a`.
- Scope: только F1 из S8 [PLAN.md](PLAN.md), не whole-feature review. F1 не merge отдельно.

## Реализовано

1. Forward migration 0072, Drizzle schema/snapshot/journal и PG17-derived production manifest: bigint category/section positions, structure singleton/version0 и независимая topic.location_version0. Ordered indexes с C collation, nonunique. Seed singleton только миграцией.
2. Backfill сохраняет legacy `created_at,id` порядок ordinary categories, sections отдельно по parent; ID/content/timestamps/revisions и reserved Help сохранены. Нет History backfill.
3. Каталог и initial grants: structure.manage — builtin admin, topic.move — builtin moderator/admin; custom roles не получают новые права автоматически.
4. Общий Admin/Settings/header admission, AP-10 admin.forum projection и raw authority учитывают оба ключа. History/Owner/visibility authority из них не следуют.
5. Типы восьми structural History actions и закрытый SQL action/target CHECK; bigint context values — strings. Добавлены только action labels EN/RU/HE, чтобы расширение общего union компилировалось. Structural producers/details/Owner projection остаются F2/F5; новых events или пользовательских writes в F1 нет.
6. Web ACL: categories/sections SELECT+INSERT+UPDATE, singleton SELECT+UPDATE; без DELETE, singleton INSERT, DDL, sequence, localization/provider grants. Реальные rollback-only row INSERT/UPDATE/NO KEY UPDATE probes и отрицательные probes включены в штатный CI.
7. Trusted setup helpers appending sibling positions сериализуются singleton и возвращают прежние JSON-safe DTOs. Они не становятся actor/CAS/History commands. Прямые browser setup inserts тоже получают order metadata.

## Необходимая сверка генератора

Первая реальная генерация выявила существующие препятствия schema parity: JSON serialization двух BigInt defaults, текстовое представление partial/expression indexes, null ordering трёх индексов и имя notification suppression FK. Объявления согласованы с уже принятыми SQL/snapshots без DDL этих существующих объектов. В новом snapshot все unrelated tables равны 0071; accepted migration artifacts не изменены. Повторная генерация возвращает `No schema changes`, а PG17 manifest подтверждает неизменность всех unrelated tables/functions/triggers.

## Сверка исторических тестовых стендов

Первый полный CI выявил пять стендов, использующих текущий writer с устаревшими migration subsets, и два schema-ceiling expectations. Стенды текущего форума применяют весь актуальный набор миграций; удалены прежние compatibility ALTER columns. Исторический 0054→0055 upgrade заполняется SQL своей реальной версии без вызова current writer и позднейших полей. Соответствующие восемь файлов: 178 tests PASS. Это test-only корректировка, production head-код первого commit не изменялся. Все 14 acceptance-наборов первого head PASS; финальные CI/acceptance повторены для stable head.

## Локальная проверка

- PG17 clean + upgrade foundation: 14 tests. Legacy order/IDs/content/times, singleton, version0, exact bigint max/overflow/negative checks, Help, indexes, catalog/grants, восемь action-target pairs и invalid targets, setup DTO/positions.
- Existing migrations/constraints: 57 tests; AP-10 enforcement: 49 tests.
- Targeted unit suite: 445 tests; после уточнения assertion header/Settings projection — 26 locale tests.
- TypeScript, lint: 0 errors (один существующий warning `app/forum/ui.test.tsx:174`); Drizzle check и generation parity; migration immutability guard.
- Production manifest parity: 75 public tables; реальные web privilege probes PASS.
- Локальный split-authority provisioning не стартовал из-за фиксированных ролей, оставшихся от прежних disposable tests. Итоговый gate использует чистый PG17 GitHub CI, без изменения этих старых ролей.

## GitHub exact-head gate — PASS

Stable head: `8227db6003f5a23a369e11b645194da229315f7a`; PR #379 по-прежнему Draft, base main `a3dae5815e26d158c566a27c552127b4b1ab29aa`.

- [CI / checks](https://github.com/iliya1947/vico-forum/actions/runs/45205128204/job/137802256448): PASS — 233 files / 2973 unit tests, lint/typecheck, build, UI preview build, migration guard, Drizzle check и generation parity (`No schema changes`).
- [CI / database](https://github.com/iliya1947/vico-forum/actions/runs/45205128204/job/137798657433): PASS — 115 files / 1707 PostgreSQL tests, manifest75, positive/negative runtime privileges, split-authority provisioning, credential diagnostic/recovery/bootstrap, build and Worker smoke.
- Все 14 applicable acceptance workflows на том же head — PASS:

- [SA05 whole Owner deactivation connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45205144895) — PASS.
- [Topic Bookmarks connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45205145056) — PASS.
- [SA08 Overview and whole-program entry connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45205145527) — PASS.
- [SA04-K5 connected attachment Worker R2 Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45205145037) — PASS.
- [Topic Watch connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45205145631) — PASS.
- [SA04-L3 connected authorization Owner Worker Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45205145121) — PASS.
- [SA04-J12 connected AccountState Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45205145058) — PASS.
- [Own topic title connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45205145117) — PASS.
- [SA-03 unified profile connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45205145074) — PASS.
- [Personal Mute/Block connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45205145431) — PASS.
- [SA06 native monitoring connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45205145276) — PASS.
- [SA-01 Super-admin connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45205145098) — PASS.
- [SA07 Background Localization Files Data and Integrations connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45205144959) — PASS.
- [AP-10 isolated browser acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45205145486) — PASS.

В первой попытке checks на этом final head один прежний Settings 409 UI test не дождался сообщения; 2972 остальных прошли. Production код относительно первого green unit head не менялся; отдельный локальный Settings suite9 PASS. Повторена только failed checks job без изменения head: все2973 PASS, затем сборки/metadata/parity PASS. Однократный сбой зафиксирован, исправление unrelated Settings в F1 не заявляется.

## Передача

Exact-head CI/acceptance подтверждены. Следующий — Мира — bounded F1 coordinator checkpoint по PLAN/AGENTS. F2 только после её PASS и назначения. Leva STOP; независимый final whole-feature Codex reviewer — Марк, если остаётся вне реализации. Merge/deploy/Stage6 не выполнялись.
