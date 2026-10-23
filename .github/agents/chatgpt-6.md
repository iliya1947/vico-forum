# Лира — ChatGPT-6

**Единственный действующий план: объединённый аудит Vico Forum (2026-10-23).** Два прежних аудита объединены по прямой команде владельца. Все записи ниже новой секции — *исторический ledger*, а не два действующих параллельных плана. Первый обязательный проход — ПОВТОРНО проверить ранее просмотренное; только после его завершения приступать к ранее не проверенному. Никаких implementation changes и преждевременного формального объявления findings.

Этот файл используется для собственных рабочих результатов, выводов и технического контекста Лиры в рамках текущего служебного PR.

## ЕДИНЫЙ ПЛАН И РЕЕСТР ОБЪЁМА — 2026-10-23 (ACTIVE, v1)

**Статус: объединённый аудит ОТКРЫТ; PASS A1–A12 и PASS B1–B9 ранее проведены только на описанной historical/static/source/test глубине, НЕ runtime sign-off. GAP-CLOSURE B1–B3 и B4–B7 проведены дополнительной доказательной сверкой исходников и существующих тестов; ни один этап не повышен до live/fully-tested PASS. GAP-CLOSURE B8–B9 проведён дополнительной статической сверкой исходников и тестов, runtime-пробелы открыты; GAP-RECONCILIATION B1–B9 ВЫПОЛНЕН на уровне инвентаризации/evidence, runtime-пробелы остаются; PASS B10 выполнен на статических исходниках и выбранных тестовых assertions без runtime-подтверждения; B11 проведён на ограниченной глубине исходников/компонентов/CSS и существующих тестов без реальной browser acceptance; B12 завершён как статическая source/CI сверка и повторная проверка исторических Actions, без нового независимого full local runtime-тестирования; B13 реестр/итоговая классификация ВЫПОЛНЕНЫ; 437 путей сведены в evidence-index, но обязательные runtime/браузерные и семантические gate НЕ ЗАКРЫТЫ; общий аудит ОТКРЫТ. Новые кандидаты на findings сохраняются ТОЛЬКО в чате владельца до разрешённой публикации, личный журнал содержит статус/покрытие без их деталей. Собственные PG/Vitest/Worker/R2/форум-browser/Better Auth 429/2-tab A→B НЕ ВЫПОЛНЕНЫ; старые E1/N1/E3/I1/A5-AP1 и другие observations не закрыты.** Этот раздел заменяет два прежних активных плана, но не стирает их историю и не приписывает прошлому фиктивные PASS. Baseline GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. При drift main сначала зафиксировать новый SHA и определить affected files; нельзя смешивать версии.

### Объём, происхождение и запреты

1. Из `AUD-20261022` наследуется **единый существующий manifest baseline** в его историческом разделе ниже: **491 путь**, из них **437 INCLUDED**, **42 EXCLUDED (service/operational external)**, **12 CONTEXT (archived)**. Это инвентаризация, не отметка о review. Среди INCLUDED: 18 актуальных Markdown документов, 45 SQL migrations, 45 Drizzle schema snapshots; прочие app/db/tests/config/workflows. Сохранить каждую file identity в manifest и не дублировать файл, даже если у него несколько функций.
2. Из первого 14-этапного аудита наследуются все **предметные журналы этапов 9–13, сводка этапа 14 и последующие целевые проверки** как исторические evidence *разной глубины*. Исходных подробных checkpoint 1–8 нет: `HISTORICAL_EVIDENCE_UNKNOWN`; номера не восстанавливать догадками. Второй аудит на прежнем этапе 1 фактически завершил чтение **18 из 18** included Markdown документов: 14 ранее учтены в crosswalk, а ещё четыре `CONTENT_TRANSLATION.md`, `STORAGE_AND_VERSIONING.md` (PR #236 issuecomment-6327783686), `PROVIDERS_AND_JOBS.md`, `RESEARCH.md` (issuecomment-6327809506) были ошибочно пропущены при объединении; все четыре теперь повторно проверены. Это не означает выполнения AUD-20261022 этапов 2–13 как отдельного цикла.
3. Не проверять внешние service-account/production состояния, OAuth live, real translation providers/Queues, Neon/Hyperdrive operations, R2 live, deployment/backup/restore. **Внутренние** session/authz, adapters, SQL, data lifecycle, providers-independent contracts включены. Future Stage6 issues не назначать current Stage defects по факту наличия.
4. Во время аудита реализацию не менять; evidence/findings до полного окончания сообщать владельцу в чате. Личный файл является рабочим журналом; общий `.github/service-channel.md` и чужие personal files не менять; отдельный implementation PR не трогать.

### Фактический предварительный ledger: проверено ранее ≠ подтверждено повторно

Обозначения: `DOC_READ` — документ ранее прочитан полностью; `SOURCE_REVIEW` — проверена конкретная цепочка и выборка assertions тестов, но не весь файл/все варианты; `SQL_READ` — прочитана SQL migration; `SNAP_PARSED` — JSON parsed/chain+delta checked, не полная семантика каждого поля; `CI_OBSERVED` — ранее успешный внешний CI exact-tree; `UNKNOWN` — нет надёжного достаточного доказательства; `NOT_EXECUTED` — runtime test не проводился. Ссылка на файл сама по себе **не повышает** `UNKNOWN` до `SOURCE_REVIEW`.

- `DOC_READ`: **18 из 18** INCLUDED Markdown в прежнем `AUD-20261022` (части 1–7), см. issuecomment-6327783686 и issuecomment-6327809506 для ранее пропущенной четвёрки. Первые 14 перепроверены в A1; оставшиеся четыре получили full-EOF повторный review с текущего exact `main` в корректирующей B1/A1 сверке 2026-10-23. Следовательно, B1 не содержит документального new/unread remainder. Исторический A1 checkpoint ниже отражает состояние на момент его записи и дополнен текущим исправлением.
- `SQL_READ`: все **45/45 SQL 0000–0044**, согласно двум отдельным прямым пакетным source checks. `SNAP_PARSED`: **45/45 snapshots 0000–0044**, цепочка+эволюция таблиц; для поздних transitions — дополнительная constraints/delta проверка. Не утверждать exhaustive hand-review всех 45 JSON.
- `SOURCE_REVIEW`: у старого аудита есть конкретные следы по базовой архитектуре и auth, публичным маршрутам, Help, Editor, attachments, localization, PostgreSQL, security, UI; примеры в этапах 9–13, early source-ledger, отдельных тематических checkpoints. Существующие tests в этих пунктах *читались*, а не запускались нашим новым тестовым прогоном. Детальная полнота ветвей НЕ доказана.
- Сопоставление точных путей из первого/второго журнала с manifest **без его собственной таблицы**: среди 437 INCLUDED **172 пути прямо упоминались**, **265 не имеют точного текстового упоминания**. Это только диагностический указатель для классификации: **не** 172 verified files и **не** 265 unreviewed files (например, SQL и snapshots проверены пакетами по диапазонам). Не путать `NAMED` с `REVIEWED`.
- `CI_OBSERVED`: GitHub Actions `#39615502080`, jobs checks+database SUCCESS на идентичном Git tree `18e73a062eb06984fd0b28132f510a5b12b1cfe2`; не самостоятельный новый прогон. `NOT_EXECUTED`: точные multi-tab/edit409/network ACK, full UI browser accessibility/hydration/LTR/RTL, самостоятельно весь PG/Worker test run, external service integration.
- Старые findings `E1`, `N1`, `E3`, `I1`, `L1`, `D1`, `E2` — **предварительные исторические выводы для НЕЗАВИСИМОЙ повторной проверки**, а не автоматически принятый набор дефектов. Уточнять actual requirement/current Stage, воспроизведение, альтернативы, доказательства. `E2` не повышать без контракта, `L1` не называть доказанной утечкой, `D1` — documentation only.

### Единая матрица 0–13 — содержательные области, каждый пункт проходит ДВА последовательных режима

`A` — ПОВТОРНАЯ проверка ранее просмотренного; `B` — ПЕРВАЯ проверка оставшегося. **Глобальная граница:** не начинать НИ ОДНОЙ `B`-проверки, пока все `A` по областям 1–12 и прежним findings не завершены и не зафиксированы. На этапе подготовки разрешён только учёт путей/доказательств, без substantive audit нового кода. По окончании каждой логической подзадачи дать отчёт владельцу и STOP до команды.

| № | Единый раздел проверки | Есть фактическое старое evidence | Недоказанное/дальнейший режим B |
|---|---|---|---|
| 0 | baseline, manifest, правила статусов, crosswalk двух аудитов | manifest 491/437/42/12; crosswalk составлен сейчас | повторить tree/baseline при drift; stage 0 DONE |
| 1 | source-of-truth и 18 документов, приоритеты Stage/current contracts | 18 `DOC_READ` full-EOF (14 переоценены A1, 4 корректирующая сверка) | Все 18 source docs повторно прочитаны; external claims в RESEARCH остаются датированным контекстом, не current verification |
| 2 | архитектура, Worker/SSR, route graph, bindings, config, dependencies | маршруты, request context, session/init, Node/pnpm/CI wiring — `SOURCE_REVIEW` по выборкам | непроверенные файлы/ветки, runtime assembly и другие config paths |
| 3 | Better Auth email/password/session; permissions/roles/overrides/ownership | auth/session, scoped roles, lockout, degradation — частичные source/tests | полная auth/authz × role × route × stale/failure matrix; без live OAuth |
| 4 | public categories/sections/topic/search/popular/tags/unanswered; participation/unread/notifications/profile/presence | предметные этапы 9–10 + extra targeted source checks | оставшиеся routes, request variants, DB/UI transitions, test assertions |
| 5 | Help, solved/best-answer, moderation signals, duplicate/appeals/attention | старый этап 11 + help-specific checks | оставшиеся cases, negative/concurrent/authorization paths |
| 6 | Editor 2.0 Simple/Advanced, Markdown, clipboard, history, quotes/mentions, published edit | этап 13 и E1/N1/typed failures source/tests | новые editor cases и реальный runtime/browser failures |
| 7 | attachments: validation, upload/download, ownership, private refs, publish, cleanup | этап 13 и selected PG/browser upload flow source/tests | незакрытые zip/container/format checks, actual browser/transport error transitions |
| 8 | locale/translation UI+content, registry, fallback, RTL, durable provider-neutral jobs | translation-specific source/tests, source-locale work | существенная часть полного source/test manifest, task/provider-neutral branch cases |
| 9 | PostgreSQL, schema, SQL, snapshots, transactions, query plans, indexes | 45 SQL full, 45 snapshot parsed, selected DB assertions/CI | собственный PG execution/query plans и неподтверждённая семантика snapshot/DB paths |
| 10 | сквозная security и dependency failure boundaries | selected cross-user, CSRF/origin, SSR cache, links, logs, E3/L1/I1 | систематическая negative/fault/error matrix по включённому объёму |
| 11 | UI browser: accessibility, responsive, keyboard, hydration, LTR/RTL, performance | static CSS/component tests, partial keyboard inspection | real browser matrix **NOT_EXECUTED**; явно фиксировать среды/блокеры |
| 12 | tests/quality: mapping assertions, lint/type/test/build/DB/Workers CI | старый exact-tree green CI; прочитаны отдельные test assertions | полный test-file review и собственные исполнимые quality gates, если среда доступна |
| 13 | покрытие manifest, requirements/scenarios, findings, final | прежние частичные сводки и текущая инвентаризация | только после A + B + применимых executions: reconciliation и один итоговый отчёт |

Первичные привязки 437 файлов к этапам уже существуют в историческом `AUD-20261022` manifest: этап 1 — 18; 2 — 20; 3 — 29; 4 — 49; 5 — 2; 6 — 18; 7 — 31; 8 — 128; 9 — 108; 10 — 2; 11 — 17; 12 — 9; cross-cut `4/5/6/7` — 6. Они **не ограничивают** сквозные проверки в иных этапах; статус выставляется по actual evidence каждой required branch.

### Безусловный порядок и критерии остановки

**PASS A (сначала только повторная проверка):** составить по существующим checkpoints пофайловый список с уровнем доказательств; заново прочитать 14 уже full-read docs; заново проверить 45 SQL/45 parsed snapshots в соответствующей прежней глубине и поднять проверенные источники/tests по всем предметным областям 2–12. Каждый кейс: exact baseline+path/lines, действующее требование, positive/negative/concurrent/failure, выбранные реальные test assertions (READ vs EXECUTED), вывод. Ранее не просмотренный файл/сценарий при встрече **включить в будущий B**, не начинать новый substantive review. Доказанный результат A — не прежний штамп и не зеленый CI, а новая проверка. **PASS A CLOSED** только когда ни одно достоверно ранее проверенное требование/файл/сценарий не осталось без повторной проверки и записанного evidence.

**PASS B (строго после полного A):** все INCLUDED items/scenarios manifest без удовлетворительной A-проверки, включая файлы, отсутствующие в source ledger (четыре ранее неверно классифицированных документа уже повторно прочитаны); полный требуемый negative/error/concurrent paths и проверяемые browser/PG/Worker executions. При недоступной среде `BLOCKED/NOT_EXECUTED` с конкретной причиной, не PASS и не бесконечное повторение исходников. Отдельно решать necessity проверок по current Stage.

**CLOSURE:** убрать дубли старых findings, классифицировать verified current defects vs hypothetical/future vs doc-only; пофайлово и по требованиям/сценариям reconcile весь INCLUDED manifest. Полным назвать аудит только после фактического выполнения обязательных проверок; иначе один честный отчёт о незакрытых blockers/limits, без объявления успеха. Не инициировать исправления до завершения и прямой команды владельца. **СЛЕДУЮЩАЯ ПОДЗАДАЧА после команды: PASS A / этап 1 — повторное чтение ранее проверенных 14 документов; затем шаги по следующей области, только по явной команде.**


### PASS A / этап 1 — повторная проверка ранее читавшихся 14 документов (2026-10-23)

**Выполнено как одна завершённая ограниченная подзадача. Глобальный PASS A ещё НЕ завершён.** Frozen main `d72b27ca762dd930f0e7ad614e5b00832a07ec0c` повторно сверено; все 14 исторически `DOC_READ` документов целиком fetched exact `main` до EOF, структурно/семантически просмотрены по ключевым source-of-truth и Stage границам; каждый файл обработан по строкам в полном объёме для внутренней проверки локальных Markdown-ссылок и version/status markers. Для особо длинного `PROJECT_STATE.md` содержательная сверка действующего состояния и противоречий выполнена по относящимся к текущему scope фрагментам, **не утверждается полный построчный ручной перечит всех 2020 строк legacy log**. Иных source/test full review не выполнялось: это ТОЛЬКО документационный A-slice, не whole Stage 1 including 4 untouched docs.

14 документов / 6615 физических строк / 435295 UTF-8 JS characters; пути и blob SHA:
```text
AGENTS.md                              20acb9210685bf3347f153c0d44d19420e8dc9bc
PROJECT.md                             d261cf8f85d2ecfb44c54ff327fc2cf8fce70e7e
README.md                              c6e23326b23c6982bdf521b7dd60b351d73c25f4
ROADMAP.md                             5cbaf503e3e6715f50635f8f131ee6034c90367c
SCAFFOLD_PLAN.md                       996f542bc166afa8b29952b4beb7501f9a54e43c
TRANSLATION_ARCHITECTURE.md            0294c0245e846b5fdd5dab22bbc6afe79733cdcf
PROJECT_STATE.md                       0affd914738d9c94733d0e0ec1473f7b2569097c
PROJECT_HISTORY.md                     a86ca1c654316e921c3f182437d69907faf4cab0
docs/EDITOR.md                         a43653c66f323255e2fd2f63c3339fb18267bf3e
docs/UI_UX_PASS.md                     340d8e93d8669ee2212098f83ecaa8b87746652f
docs/auth/AUTHORIZATION.md             79b68863e17bb1202609abd9d5641b5fc6454917
docs/database/MIGRATIONS.md            e8ad5ef6b862ab4b7d57d9664a6f25fe810a685d
docs/translation/LOCALES.md            f58527e4a3067ca593c9a91ee7cdd195c0459193
docs/translation/UI_TRANSLATION.md     dabc15f8c466f670c60b97395e818c50891b597c
```

- **Ссылки**: 78 Markdown local file/directory links after excluding external and anchors checked against exact main tree; missing target **0**. This does not mean every section anchor or external URL was checked.
- **Stage boundaries reviewed**: Stage 0–5 implemented local/CI; current standalone UI/UX product pass; Stage 6 external infra paused; future Stage7 release gate excluded. Editor 2.0 in-memory source/history, draft/autosave intentionally deferred; its own visual/Pages gate owner-waived except explicit request; wider UI_UX_PASS final real-runtime browser acceptance remains its separate task gate. No contract contradiction inferred from this context. Dynamic permission/authz next-request freshness, write failure semantics and no-client-side role claims; locale authority/canonical en/current source priority, specific method-aware routing and no translation provider in SSR; immutable SQL migration history+separate external rollout.
- **D1 RECONFIRMED documentation factual error:** `PROJECT_STATE.md:1568` says repository migration history `0000–0043`. Actual `drizzle/meta/_journal.json` 45 entries through `0044_attachment_draft_conflict_boundaries`, corroborated by `PROJECT_STATE.md:367`, `docs/EDITOR.md:389`. Historical external accepted prefix through `0020` is separate and not mistaken.
- **D2 NEW document-hygiene contradiction, not a functional defect:** `PROJECT_STATE.md:5–21` says only current state and that per-PR commit SHA/CI run history is not duplicated; the same file has >100 lines with PR/CI/commit specifics (`~125` matching lines), including multiple long old Editor PR sections and dated CI successes. `PROJECT_HISTORY.md:5–23` declares itself appropriate history source; this discrepancy undermines current-vs-historical source-of-truth boundary. Don't demand full history rewrite before pre-release by default; no project docs changed.
- **No new proven runtime defect** from this documentation-only subtask. All old code findings remain `PENDING RECHECK IN A 2–12`, not accepted by rereading docs alone.
- **PASS B / stage 1 deferred strictly:** `docs/translation/CONTENT_TRANSLATION.md`, `PROVIDERS_AND_JOBS.md`, `RESEARCH.md`, `STORAGE_AND_VERSIONING.md`, and any more exact holes. Do NOT read them before **all** PASS A stages complete.
- **STOP** until user continuation. Next `PASS A stage 2`: recheck only source/config/runtime wiring already demonstrably reviewed and record exact per-file assertions; newly encountered unreviewed items become B queue. Do not publish findings in shared channel until audit completed and owner authorizes transfer.



### PASS A / этап 2 — повторная проверка ранее исследованной архитектуры и конфигурации (2026-10-23)

**STATUS: A2 COMPLETED for reliably previously reviewed source/config chains; whole audit and PASS A OPEN.** Exact frozen GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, `AGENTS.md` read fully; baseline `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `SCAFFOLD_PLAN.md` reviewed already in A1. Review is new direct source+existing-test read of the same old cases, **NOT** actual execution of app/tests/build/Worker browser/live CDN. No new service calls.

**Previously reviewed manifest Stage 2 files now source-rechecked (16/20), exact blobs in same main:**
```text
.env.example                      91caeb78d06e3607dadb7fd10bfc039694c9fbd5
.gitignore                        c363c907bdae46191319e6918079447b9b025aff
.node-version                     df6ae3370f9f89272d88629c442cf554d6c1f9fb
app/routes.ts                     24ac49aff9bbe60bf0cbd977172ba4e3e69c6c43
package.json                      f0e7429d23c7c25724293cdcd7ba370ca8a1fbf3
pnpm-lock.yaml                    88ade74044c2590923eb519e12a75a059ccc53ff
pnpm-workspace.yaml               fba2ee8c2be560e3b446fe2a778e14f94a7b24a1
react-router.config.ts            722b4a8dc2d45d8e79a6dd7b6e12b504bfbd98ae
tsconfig.json                     d7ce9e49b09efb6c613e4c90e10854e33011f995
vite.config.ts                    6a5db4717ef1208b4417b0320e7edca26f54d111
vitest.config.ts                  b8b2fdec0c02f84406a8080e1b64210d321ff79c
vitest.database.config.ts         223bc3c11c73c99235064dcef523caf095d22c1a
workers/app.ts                    daf3268db5c397c8f6023bce6bd74a4fddbfbead
workers/database-bindings.test.ts a4d421b00aa05ee7d6e3e55585cfe9ab7309e966
workers/database-bindings.ts      539f21dcaced85afe62a71e8814157c64f226722
wrangler.jsonc                    58b568003397b79310f9e68a890656ef6698076f
```

Additional **historically reviewed architectural cross-cut** rechecked at source, without advancing their own A phases: `app/entry.server.tsx` (22aa313b17eaec69014e61dffe945dd3a520ba3d), `app/root.tsx` (c1708e1ea80d15b72a74242130221daa1606717f), `app/routes/locale-boundary.tsx` (c156f4302543bb31988d53e8d03d0c4728faa4d2), `app/routes/locale-negotiation.ts` (c22c8c48b85b4d88650da97b5c4e234acdbd32c6), `app/routes/api.ts`, `app/routes/auth-api.ts`, `app/routes/not-found.ts`, `app/auth/session-context.ts`, `app/server-logging.ts`; existing source assertions re-read in `app/routes/locale-boundary.test.ts`, `locale-negotiation.test.ts`, `auth-api.test.ts`, `app/auth/session-context.test.ts`. Old confirmed config CI source also re-read: `.github/workflows/ci.yml`, `ui-preview-pages.yml`, `production-worker-rollout.yml`; no attempt to execute workflows.

**Rechecked exact chains and assertions:**
1. Route graph `app/routes.ts:1–33`: technical `/api/auth/*`, attachments and `/api/*` remain outside generic `/:locale`; route boundary carries index/home and independent catch-all 404, main public forum routes. `locale-boundary.tsx:32–61` middleware guards noncanonical mutation before action; `locale-boundary.tsx:67–151` loader builds per-request locale/i18n snapshot and identity presentation; auth role is server-resolved, unlike client user input. `locale-negotiation.ts:1–21` handles request-specific root locale selection with `307` and no-store. `locale-boundary.test.ts` asserts redirect-required POST `404` with zero downstream calls, canonical-locale POST reaches downstream, registry-degraded `307` no-store, unexpected authorization errors propagate. `locale-negotiation.test.ts` tests authenticated locale priority, root no-store, HEAD, POST fail-closed. `auth-api.test.ts` proves RR route registration before API catchall and forwarding to injected request-scoped handler. **These tests READ, NOT executed.**
2. `workers/app.ts:25–53` creates `RouterContextProvider` per HTTP request, resolves bindings, initializes actual request session before RR handler, injects scoped forum/authz, registry/translation, attachments, sets generated translation action disabled. `workers/database-bindings.ts` rejects absent/blank `HYPERDRIVE` and `WEB_HYPERDRIVE` without cross-capability fallback. `database-bindings.test.ts` contains split routing, both missing/blank negatives, and a composition source check — *not* a behavioral HTTP integration test. `app/auth/session-context.ts` propagates only Set-Cookie headers, preserving page's actual caching headers; `session-context.test.ts` covers session and wrapper but not real browser cookie behavior.
3. `app/entry.server.tsx` returns bodyless HEAD; GET SSR renders `ServerRouter`, waits `allReady`, adds text/html; `onError` reports after-shell failures via limited kind-only reporter. `app/root.tsx` derives HTML `lang/dir` from loader data, embeds theme bootstrap and hydrated router scripts. This is source-level SSR wiring, **not actual SSR/hydration or browser-accessibility proof**.
4. `package.json` pins 35 direct deps/dev deps without semver ranges, Node `24.21.0`, pnpm `12.3.4`; `.node-version`, `pnpm-workspace.yaml` allowBuilds esbuild/workerd checked. `pnpm-lock.yaml` contains **two actual nonempty YAML documents** separated by `---` (not corrupt): 1st package-manager bootstrap; 2nd project importer. Re-evaluated 35/35 direct dependency versions in the project importer; **zero missing/mismatched**. Initial naive split in this check momentarily reported 35 missing due selecting first importer; corrected before any conclusion, actual second doc verified. `vite.config.ts` uses cloudflare plugin+RR SSR, `react-router.config.ts` `ssr:true` and documented pinned-version `routeDiscovery: initial`, `tsconfig.json` references node/cloudflare TS configs, `vitest.config.ts` excludes DB while `vitest.database.config.ts` targets Node database tests. `.gitignore` excludes `.env*`/`.dev.vars*` and preserves blank local placeholder `.env.example`; `wrangler.jsonc` binds public Hyperdrive identifiers and enables query redaction.
5. Existing `.github/workflows/ci.yml` sets frozen pnpm install, lint, TS, app tests, build, UI preview build, DB metadata/manifest checks, PG17 fresh DB suite and local Workers smoke; Pages preview workflow publishes **mock static site only**. External production Worker workflow has manual `workflow_dispatch` gating; reading does not mean testing live deployment. Historical exact-tree green run `#39615502080` is prior evidence, not independently rerun now. No secret content, real Cloudflare settings, real PostgreSQL, installed package modules or live HTTP validated.

**Outcome**: re-reviewed described config/request/route/SSR chains with no new **confirmed current-Stage functional defect**. Does NOT prove there are no defects in full architecture. Earlier conditional SSR cache/anti-framing issues remain **conditional observations** without demonstrated active Worker cache or exposed attack origin; Stage6 Hyperdrive advisory lock incompatibility remains **future Stage6 compatibility gate** until authorized stage, not current defect; any E1/N1/E3/I1/L1 still **pending their independent A6/A10 rechecks**.

**Deferred strictly to PASS B (no new substantive review):** manifest-stage2 `db/web-runtime-wiring.test.ts`, `eslint.config.js`, `tsconfig.cloudflare.json`, `tsconfig.node.json` (no reliable prior standalone review). They are not silently counted as A2 PASS; source and tests in other stages remain scoped to their own A/B requirement cases. Real application/Worker/browser/runtime CI runs `NOT_EXECUTED`.

**STOP** after this bounded A2 check. Next explicit owner continuation: `PASS A stage 3`, repeat previously reviewed Better Auth session, roles, authorization/ownership and existing negative tests without starting previously unreviewed files. Implementation, main, other people's files and shared communication not altered.



### PASS A / этап 3 — повторное изучение Better Auth, permissions, role management, resource ownership (2026-10-23)

**A3 завершён на уровне ранее заявленного source+existing-test evidence, но A4–A12 и PASS B НЕ НАЧАТЫ.** Frozen exact GitHub main `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; current full AGENTS read. 29/29 files assigned to Stage 3 in previous manifest fetched anew; full source logic evaluated for auth session/credential and PostgreSQL effective authorization; test code inspected with concrete selected assertions, NOT independently executed. Additional previously reviewed cross-cut entrypoints and test slices re-examined where required. Owner action is continuation after STOP, not asking owner to do testing/transfer findings.

**Rechecked Stage-3 manifest files (29):**
- Auth 11: `app/auth/auth-client.ts`, `auth-controls.tsx`, `auth-controls.test.tsx`, `auth.server.ts`, `auth.server.test.ts`, `credential-path.ts`, `credential-view.tsx`, `credential-view.test.tsx`, `request-context.ts`, `session-context.ts`, `session-context.test.ts`.
- Authorization 4: `app/authorization/admin-view.tsx`, `admin-view.test.tsx`, `catalog.ts`, `request-context.ts`.
- Auth/management routes 6: `app/routes/auth-api.ts`, `auth-api.test.ts`, `authorization-admin.tsx`, `authorization-admin.test.ts`, `credential-sign-in.tsx`, `credential-sign-up.tsx`.
- DB 5: `db/authorization-repository.ts`, `authorization-repository.test.ts`, `authorization-service.ts`, `hyperdrive-authorization.ts`, `hyperdrive-authorization.test.ts`.
- PostgreSQL integration 3: `tests/database/auth-runtime.test.ts`, `authorization-snapshot.test.ts`, `forum-email-registration.test.ts`.
- Historical cross-cut recheck: `workers/app.ts`, `app/routes/locale-boundary.tsx`, `app/forum/mutations.server.ts`, `app/forum/actions.server.ts`, `app/forum/editor-permission.server.ts`, `app/routes/post-edit.ts`, `app/routes/topic.tsx`, `app/routes/attention.tsx`, `app/routes/attachment-upload.ts`, `app/routes/attachment-download.ts`, `app/forum/online-presence-heartbeat.tsx`, `app/routes/presence.ts`. Existing test assertions read in `tests/database/migrations.test.ts:1458–1584`, `tests/database/stage4-core-e2e.test.ts:175–379`, `app/forum/write-actions.test.ts:189–261,571–638`, `app/forum/online-presence-heartbeat.test.tsx`; these source slices will also be reconciled in their own later numbered A stages, NOT a whole-stage pre-credit.

**Exact verified source → tests evidence:**
1. `workers/app.ts:25–53` initializes new per-request `RouterContextProvider` and Better Auth `getSession` before RR handler, `auth.server.ts:24–34,54–87,90–112` enables email/password (8–128), trimmed 1–100 server-validated signup names, database-backed rate limiting and trusted `cf-connecting-ip`; server-only Better Auth secret/URL/Google credentials; no explicit CSRF disabling. `session-context.ts:6–37` stores server session and forwards Set-Cookie only. Existing `auth.server.test.ts`, `session-context.test.ts` assert configuration and cookie scope; actual PG tests `forum-email-registration.test.ts:52–127` assert hashed credential, good/incorrect passwords, invalid names rejected/no user and trim; `auth-runtime.test.ts:64–167` tests sliding refresh and expired session→null, deletion of expired session row. **No rate-limit exhaustion/429, live OAuth/Cloudflare or independently run tests**.
2. `credential-path.ts` origin+canonical-locale-safe `returnTo`, query/hash safe; `credential-sign-in/up.tsx` validates loader redirect; `credential-view.tsx` navigates on authenticated success, rejects unsafe form state and shows generic provider errors; `auth-controls.tsx` revalidates after same-tab signout. `credential-view.test.tsx:65–183`, `auth-controls.test.tsx:124–185` assert sign-in/up, message anchor, forged external URL fallback, header reconciliation, error redaction. **Not** integrated two-tab session test.
3. Permission definitions `app/authorization/catalog.ts` exactly match `docs/auth/AUTHORIZATION.md`: 15 keys; three independent built-in role initial grants; dynamic role/override precedence. `db/authorization-repository.ts:103–141,231–252` complete resolve snapshot via `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`; `readManagementState:37–86` consistent bulk snapshot; permission `deny` overrides `allow` and role grant; missing account denied. `db/hyperdrive-authorization.ts:15–68` request-local promise cache, only typed dependency availability classified as `AuthorizationUnavailableError`, programming/schema errors preserved. Native concurrency test `authorization-snapshot.test.ts:158–318` asserts wholly-before snapshot despite interleaving author changes (two distinct barriers). Adapter tests `hyperdrive-authorization.test.ts:46–133` assert classified timeout/connect vs TypeError/42P01 and next capability freshness, **read not run**.
4. All role-management mutators `db/authorization-repository.ts:144–211,255–282` reacquire actor permission **inside serialized DB transaction**, `authz_mutation_lock FOR UPDATE`, then mutation and `countManagers` protect last manager even for concurrent deny/removal. `app/routes/authorization-admin.tsx:14–88` checks current actor/permission, same-Origin and input, returns explicit 401/403/400/409/503 and throws unexpected; `admin-view.tsx` supports create/edit/delete/grants/roles/overrides. `tests/database/migrations.test.ts:1458–1584` asserts catalog/seed, overrides allow+deny+inherit, invalid permission rejection, rollback of last manager removal, concurrent removal only one succeeds; `routes/authorization-admin.test.ts:35–103` asserts forged actor ignored/401/403/outage and unexpected error. Test cases read; no own PG run.
5. Protected forum actor uses server session: `app/forum/mutations.server.ts:63–112,137–178`, permission guarded writer paths `app/forum/actions.server.ts`, editor temporary upload `app/forum/editor-permission.server.ts` checks current author of published post and relevant permission, `app/routes/attachment-upload.ts` checks session/origin/owner/context before DB/R2; `attachment-download.ts` grants private ref only for current session owner, pub by published ref. `app/routes/post-edit.ts` requires post author and current `forum.post.editOwn`. `app/forum/write-actions.test.ts:189–261,571–638` asserts forbidden edit without capability, ignore forged actor in form, separately history.read; `stage4-core-e2e.test.ts:175–379` *direct PG test source* asserts user role changes, next-request grant/deny/override effects and forged elevated form denied. **Not a fresh end-to-end browser/Worker test**.
6. **I1 RE-OBSERVED (previous preliminary finding, not new)**: `auth-controls.tsx:30–43` only reconciles header to new loader data when revalidation occurs, Better Auth `createAuthClient` functions in `auth-client.ts` are not consumed through `useSession` in HeaderAuthProvider; `online-presence-heartbeat.tsx:16–45` 401 triggers refresh but successful 204 causes revalidation only on forum home, not open topic. Server `presence.ts` returns 204 for signed-in B. Consequently A→B cross-tab while topic editor of A open has no guaranteed revalidation; server side continues with B session, producing potential unintended user attribution on text-only submit, not authz bypass. `online-presence-heartbeat.test.tsx` has 401 and 204/visible tests but no two-tab A→B active-topic test. Source-level causal gap reconfirmed; **real two-tab browser execution NOT DONE**. Does not invalidate same-tab logout behavior.
7. **D3 NEW confirmed source-of-truth inconsistency, requires owner product interpretation later:** `docs/EDITOR.md:285–286` says only moderators/admins can read published edit history, ordinary users cannot even their own; `docs/auth/AUTHORIZATION.md:40–47` explicitly says `forum.post.history.read` allows anyone with effective permission, moderator/admin only default, dynamic grants and overrides authoritative. `app/authorization/catalog.ts`, `app/forum/actions.server.ts:460–473`, `app/routes/topic.tsx:98–113`, `db/authorization-repository.ts` implement the general dynamic rule; an ordinary built-in user granted override may read another post's history. Default built-in user remains denied. **This is NOT automatically a confirmed security bug:** the authoritative docs conflict. No product-policy choice, code change or scope expansion made during audit; surface the conflict to developer chat and defer decision until warranted.
8. Earlier writer catch-all `runForumMutation` broad fallback 503 (E3) is **not newly cleared or reclassified** by this authz-only review; will be independently re-examined in A6/A10. No unsupported post-edit/history capability claim or new auth bypass.

**Coverage caveat:** 29/29 manifest stage3 exact files fetched for this recheck and meaningful source/test excerpts examined. This is code review + selected real assertions, NOT 29/29 files exhaustively exercised across every path, NOT complete negative matrix, NOT execution. Exhaustive untested combinations and real OAuth/provider/Cloudflare acceptance are outside this A slice; current Stage vs Stage6 classification unchanged.

**PASS B**: no previously unknown specific stage3 file newly proved in this slice, but still keep entire uncovered role/resource/browser concurrent matrix, fresh runtime two-tab/revocation, rate-limit 429, and unreviewed cross-cut files in global future B. No B substantive review begun. **STOP, next owner instruction should advance to PASS A / stage 4** — forum discovery, participation, profile, notification, presence old source/tests. Do NOT publish findings to shared communication before whole audit and owner authorization.


### PASS A / этап 4 — форум, discovery/search, profile, unread, notifications, presence (2026-10-23)

**СТАТУС: завершена повторная проверка ранее исследованных evidence-чейн по области A4.** Exact GitHub `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c` и актуальный `AGENTS.md` fully read. Сопоставлены 49 stage-4 manifest items + 6 cross-cut stage 4/5/6/7 с прежними записями этапов 9–10, source-ledger и тематическими findings. В историческом ledger точные имена этих файлов вне manifest встречались у **37/55**, не встречались **18/55**; это **только текстовая эвристика**, не оценка реального исторического покрытия. Некоторые без exact mention (например `app/routes/unread.tsx`, `tests/database/forum-online-presence.test.ts`, `app/forum/online-presence-heartbeat.test.tsx`, `app/routes/notifications.test.ts`) доказанно раньше проверялись тематически; часть не имеет доказательств прежней source inspection и отложена B. Проверка B не начинается до закрытия A1–A12.

**Новые прямые source/test сверки (READ ONLY, NOT EXECUTED):**
- Public discovery routes: `app/routes/home.tsx`, `category.tsx`, `section.tsx`, `topic.tsx`, `search.tsx`, `popular.tsx`, `unanswered.tsx`, `tags.tsx`, `tag.tsx`; `app/forum/views.tsx:55–118,265–411,428–583,1756–1950,2056–2302`; `app/forum/paths.ts`, `homepage.ts`. `db/forum-repository.ts:851–1198,2343–2585` and `db/hyperdrive-forum.ts` reader adapter: current title revision only, search NFKC/trim/whitespace normalize + escaped ILIKE (!%_), rank title>tag>post then activity/id, limit 50, no obsolete revisions; popularity separate 24h/7d/30d, actual post-derived counts; unanswered unsolved+exactly one post; tags/readTag deterministic source, canonical locale profile/topic URLs. Category per-section pin bounded 10 / latest 6; SQL activity uses current record, avoids synthetic empty topics, normal and Help service categories distinct; source-only.
- Forum write participation: `app/forum/actions.server.ts:145–216` and `app/forum/mutations.server.ts`: route/session-origin + specific role authorization, server-owned actor, no public mutation from client actor/role; section/topic write, markTopicRead owner, pinTopic separate permission; `db/forum-repository.ts:1419–1451` pin row lock idempotency / transactional conflict serialization; `db/forum-service.ts` validation, `db/forum-write-policy.ts` 5000ms cooldown. Negative proof examples `app/forum/write-actions.test.ts:263–325,571–650` includes actor forgery, guest/cross-origin/permission rejection, cooldown 429+Retry-After. UI details in `app/forum/public-read.test.tsx` whole set of relevant titles/selected assertions, `app/forum/homepage.test.tsx` actual category links & counts and good empty states. Tests *existing only*.
- Unread: `app/routes/unread.tsx` rejects guest 401 and loads current `session.user.id`, `section.tsx` optional user read-state fallback handles only typed storage unavailable, `topic.tsx` current marker, `views.tsx:2252–2302` auto marked-read snapshot. DB `forum-repository.ts:1200–1360`: topic-scoped marker per user, first unread by (createdAt, postId), consistent latest and grouping; monotonic ON CONFLICT conditional progression preventing stale/concurrent regression. Native PG assertions in `tests/database/migrations.test.ts:1991–2147` cover NEW→UNREAD→READ, invalid post FK, two pools concurrently advancing 2 and 3, stale rollback rejected, newly added later post unread, delete cascades. Route `app/routes/unread.test.ts` guest + session binding. Not new PG execution.
- Notifications: `app/routes/notifications.tsx` checks auth before reader and `runForumMutation` on action to derive actor; `views.tsx:357–411` POST notification form, no unsafe public URL. DB `forum-repository.ts:1361–1418` list/count by recipient user id, `UPDATE` by BOTH id+recipient and idempotent readAt COALESCE. Native `tests/database/migrations.test.ts:2151–2340`: parent+topic recipient dedup, no self, idempotent mark, cross-user not found, FK/unique constraints, transaction rollback when notification insertion fails, cascade. Route `app/routes/notifications.test.ts` 401, Origin, invalid ID, owner-bounded mark/read and redirect tests; case source read, not executed.
- Profiles: `app/routes/profile.tsx`, `app/forum/profile.ts`, `app/forum/profile-view.tsx` source owner POST, same-origin, public field projection no email/permission, Unicode bio scalar length <=500, HTTP(S) URL strict, GitHub only canonical profile, inert bio JSX, safe external link rel, own post/best answer counts `db/forum-repository.ts:504–526`. Existing `app/routes/profile.test.ts`, `app/forum/profile.test.ts`, `app/forum/profile-view.test.tsx`, `tests/database/forum-profiles.test.ts` check forged role/actor ignored, public/private, URL escapes and SQL upsert/FK/counters. No concurrency browser run. Profile last-commit-wins is within current documented MVP and no required CAS.
- Presence: `app/routes/presence.ts` POST + guest 401 + Origin 403, user from session, `db/forum-repository.ts:475–503` lastSeen >=5min, count-over bounded 12 members, monotonically update no more often than 45 sec. `app/routes/home.tsx` only classified optional storage outage returns null, actual UI distinguishes unavailable vs genuine zero. `app/forum/online-presence-heartbeat.tsx` visible-only 60sec, 401 revalidates; `app/routes/presence.test.ts`, `app/forum/online-presence-heartbeat.test.tsx`, `tests/database/forum-online-presence.test.ts`, `homepage.test.tsx` relevant cases read, not executed. Re-reviewed **I1** cross-tab A→B successful 204 on open topic does not revalidate, old client identity persists until another route event; server already uses B; source-level current Stage mismatch previously found, browser confirmation not executed. NO new I1 classification or invented authorization bypass.
- Cross-cut runtime: `app/forum/request-context.ts`, `db/hyperdrive-forum.ts` typed availability, `db/hyperdrive-forum.test.ts` compares typed unavailable vs unexpected exceptions and deadline; `app/forum/route-error.test.tsx` checks safe 401/403/404/503/500 presentation; `app/forum/public-authz-degradation.test.ts` cases for public read degraded-safe optional authorization and unexpected error propagation; `db/hyperdrive-registry.ts`, `db/hyperdrive-registry.test.ts` previous request-local registry behavior reviewed (shared architecture/locale boundary not full Stage8); `tests/database/stage4-core-e2e.test.ts:175–474` existing true PG + route action tests cover actor and grant/override/revocation next request and deterministic global search ordering. Tests read, not run.

**Outcome**: No NEW confirmed current-Stage forum-core/read-state/notification/profile/search defect in newly repeated paths. I1 previously confirmed at source level and preserved, but not counted as new stage4 finding. E3 broad unknown-error→503 in `runForumMutation` is pre-existing finding reserved for its dedicated A6/A10 failure-boundary review, not reclassified here. Search cap, draft autosave absence, profile CAS absence and standalone pre-release browser performance are not new accepted product defects. Production/Worker/browser/PG standalone executions `NOT_EXECUTED`; historical exact-tree successful CI run is not a fresh test.

**Deferred B or other A domain, not falsely assigned A4 PASS**: independently unproven prior file inspection `app/forum/under-development.ts`, `app/forum/under-development-view.tsx`, `app/routes/under-development.tsx`, `app/i18next.d.ts`, `db/forum-identifiers.ts`, `app/forum/homepage.ts` (type inspected incidentally, not counted as old evidence), `db/editor-draft-context.ts` (belongs substantive editor A6 or future B), `tests/database/hyperdrive-registry.test.ts` (belongs locale A8 or future B); additional complete case-by-case read/DB/UI scenario coverage not claimed. Full previously declared A4 functional checkpoints reviewed against actual source/tests; keep B manifest paths/unknowns without inventing previous PASS.

**STOP** after this one coherent A4 subtask. Next explicit owner command: `PASS A / этап 5` Help, best answer, signals/duplicates/moderation workflows, only previously reviewed source/test parts. No code, `main`, shared communication or other agents' records changed.


### PASS A / этап 5 — Help & Solutions повторный аудит ранее изученных механизмов, 2026-10-23

**DONE only for previous reviewed A5 source/test cases; overall first unified audit still OPEN; A6–A12 and all B NOT STARTED.** Frozen GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, full current `AGENTS.md` re-read. Original historical Stage 11 and subsequent targeted Help-signal cooldown, duplicate, attention and rebase notes used solely as audit-scope map; all source files re-fetched from frozen main. Reviewed/inspected code paths: `app/routes/attention.tsx` (full 204 lines, blob f19adc6605234fb23aa996c6f0e8542b2c1d52dc), `app/routes/category.tsx` (current full source), `app/routes/topic.tsx` (Help permission/appeal loader), `app/forum/actions.server.ts` (selected Help paths, blob bc065366ffd0b867e6a368b53cb2ca637d5334db), `app/forum/mutations.server.ts` (source mutation guards), `app/forum/views.tsx` Help lists, topic admin panel, attention cases (blob c65846dd39cb478e4860a6df55c6e89a4eae8b05), `db/forum-service.ts` Help validation/forwarding (blob 43f3947b69df1dbdf7506e2fa4da195cb6c3fe69), `db/forum-repository.ts` Help reader/search/attention counts+pages/signal/duplicate/appeal/answer transactions (blob cf1994d369658f7a8062526cb4787bec2728ea16), `db/hyperdrive-forum.ts` adapter (blob b6d37ab09092077991eb66ba8ca86f0530a8b23c).
Cross-check from source-of-truth previously read A1: `PROJECT_STATE.md` accepted PR #205 duplicate + appeal support, PR #206 user signal backend boundary, PR #217 attention queue and Help UI requirements; `docs/auth/AUTHORIZATION.md`, `docs/UI_UX_PASS.md`, `ROADMAP.md`. No implementation edit, no new docs introduced.

**Exact prior subject areas retested at source level:**
- `Help & Solutions` category mode dispatch `all/open/active/solutions/mine/help/for-me`, unknown-mode default, four combinable filters, `needs-review` auth; server-fixed Help service section on create, optional similarity check read-only with original draft, bounded rank by title/tags/current post revisions, empty/invalid/unavailable paths; reference `category.tsx:21–142`, `actions.server.ts:55–143`, repository `:1451–1658,1892–2238`.
- Solution ownership `scope own/any`, selected best answer independent of `isSolved`, rejecting original/cross-topic post, repo topic-row lock, old answer moderation/outdated status on replacement, duplicate/solved exclusivity; source `actions.server.ts:374–423`, repo `:3488–3610`.
- Help signal permission map by kind, form guard, withdrawal only original author under lock, accepted only if target still current else superseded, duplicate signal validation, per-user 5s cooldown & topic→user lock order, pending uniqueness; source `actions.server.ts:275–334`, `db/forum-service.ts:278–360`, repo `:2728–3228`, tests in `tests/database/migrations.test.ts:732–1195` including two connection races, source read only.
- Duplicate relation root and self/cycle guards, no solved or best answer on duplicate, appeal author-only and pending per relation, remove/resolve lifecycle with transaction lock and optional `expectedAppealId`; source `actions.server.ts:336–373`, repo `:3286–3487`, `db/schema.ts:786–824`, `tests/database/migrations.test.ts:485–582`.
- Moderator `/:locale/attention` loader 401/403, per-kind role and independent attachment-security capability, visible case-only lists/counts/mixed/pages and user-independent 50-case paging, same-origin actions for actual pending signal/case; `attention.tsx:1–203`, repo `:1679–1887`, `tests/database/forum-help-attention.test.ts:105–286` (blob 14aabe9844fe959383da121b72aebfbf678200c1). `app/forum/public-read.test.tsx:480–1945,2855–3190` cases and `app/forum/write-actions.test.ts:325–565,651–1013` selected assertions on role/rejection/concurrent forms. **Existing assertions read, test suite NOT EXECUTED**; no full browser/DB/Worker integration executed.

**Finding handling / privacy:** At least one NEW source-evidenced possible current-Stage defect encountered and disclosed **only to owner in conversation** at this step, not published as team finding to shared PR or journal pending complete audit. Old observations pending A6/A10 stay independent; old H1 is an unrelated anti-framing observation. No additional established current-Stage regressions in other repeatedly inspected Help paths. Stage6 external/deployed verification excluded, do not demand fixes on future-only speculation.

**Limits:** A5 covers historical reviewed behaviors; 2 stage-5 dedicated files plus six cross-cut files revisited *only in Help-related slices*, not claimed comprehensive 8-file semantic audit. Native PG, browser multitab, loaded app and all negative combinations `NOT_EXECUTED`; distinct untouched cases and unknown manifest evidence preserved for PASS B. Do not mark whole 437 file audit complete. No source changes or updates to `main`, other agents or shared communication.
**STOP** after logical A5 task. Next command from developer: `PASS A stage 6` Editor 2.0 and revision conflict/error state previously reviewed; new source branches deferred to later B.


### PASS A / этап 6 — Editor 2.0, source-preserving modes, edit/revision/errors, mentions/quotes (2026-10-23)

**A6 RECHECK COMPLETED for previously evidenced source/test slices; A7–A12 and global B NOT STARTED; unified audit remains OPEN.** Frozen GitHub main `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; full current `AGENTS.md` read. No tests executed independently. Main implementation, general service-channel and other agents' files untouched. Owner-directed audit recheck only; no source fixes. Previous detailed historical Stage 13 and targeted Editor cases used as audit map, not credited as new PASS.

**Re-fetched all 18/18 stage6 manifest-specific source+test files**, at their main blobs (source:
`app/forum/clipboard-markdown.ts` 0fde94be,
`editor-document.ts` 7febd899,
`markdown-editor.tsx` 13cfd96f,
`markdown.tsx` ab52bcfc,
`mentions.ts` c088c130,
`quote-markdown.ts` c31eb2c3,
`quote-presentation.tsx` f62ed07e,
`technical-markdown.ts` 12b938b7,
`visual-markdown-editor.tsx` d4d9378c,
`app/markdown-syntax.ts` b67e2363,
`app/routes/mentions.ts` ac7025d1;
tests `clipboard-markdown.test.ts` f211f4f7, `editor-document.test.ts` f50f49a8, `markdown-editor.test.tsx` 7188044b, `markdown.test.tsx` b6555123, `mentions.test.ts` ff87c41a, `routes/mentions.test.ts` c16fb089, `technical-markdown.test.ts` 94f5f0bf).
Not every 1,630-line test file assertion executed or individually evaluated, but test case index and representative assertions in prior evidenced scope reviewed.

**Cross-cut source/test reviews relevant to A6** (not whole-file closure of another stage): `app/routes/topic.tsx`, `app/forum/views.tsx:2056–2375,2730–2865,2890–3080`, `app/forum/actions.server.ts:440–522`, `app/forum/mutations.server.ts:1–185`, `db/forum-repository.ts:3652–3738`, `app/forum/ui.tsx:401–433`, `app/localization/catalog.ts:397–408,584–591`, `app/forum/public-read.test.tsx:2204–2708,2740–2818`, `app/forum/write-actions.test.ts:189–261,1111–1190`, `app/forum/route-error.test.tsx:60–84`, `docs/EDITOR.md:155–169,259–292,328–400`.

**Exact reacquired evidence:**
1. Single source/Undo: `markdown-editor.tsx:189–208,343–425` `value/historyRef` held in open component, `editor-document.ts:200–254` unchanged Markdown is no-op history edit and 100 bounded undo; `markdown-editor.test.tsx:592–644,775–848,1391–1458` tests mode transitions/Undo, exact FormData incl CRLF, account-scoped preferences and scope-reset; `markdown-editor.test.tsx:1599–1629` verifies intentional no local/server text autosave/reopen recovery. Viewed test assertions only, not executed.
2. Simple+Advanced: `visual-markdown-editor.tsx:279–369,542–635` uses editable safe prose leaves and protected technical sections, fails closed on ambiguous selection, source-span mapping, safe plain/paste fallback. `technical-markdown.ts:163–207` handles tables/spoilers/code fences; `app/markdown-syntax.ts` selectively enables ~~ strike and ltr/rtl authored direction; `markdown-editor.test.tsx` covers focus, visual Enter, Ctrl/Cmd+Enter, Tab only in code, keyboard shortcuts, split/preview/fullscreen, spreadsheet paste, protected code, stable revision. Actual browser, screenreader, IME behavior `NOT_EXECUTED`.
3. Clipboard/render security: `clipboard-markdown.ts` safe subset of HTML, reject active content/unsafe links, text fallback; `markdown.tsx:1–48,314–410` markdown URL transformation only permits actual verified `vico-attachment:UUID` raster refs, no arbitrary src, external rel nofollow noopener noreferrer ugc; code block copy reads original code, optional highlighting bounded. Existing `clipboard-markdown.test.ts` and `markdown.test.tsx` cases/selected assertions re-read.
4. Quote/Reply and mentions: `views.tsx:2280–2375` reply target and whole/selection attributed quote, permanent permalink, keeps original quote lines; `quote-markdown.ts` recognized metadata in Markdown not privileged HTML; `quote-presentation.tsx` collapses by computed visual line count >=6 without losing source; `public-read.test.tsx:2740–2818`, `markdown.test.tsx:70–165` test attribution/permalinks/nested content/show full, existing jsdom geometry mocks only. `mentions.ts` recognizes Unicode token at caret and extracts immutable recipient IDs only from eligible profile links outside code/quotes/images; `routes/mentions.ts` session 401, no-store, minimal ID/name payload, typed outage 503 and unexpected propagate; matching `mentions.test.ts` and `routes/mentions.test.ts` read.
5. Published edit/history and conflict: `actions.server.ts:458–498` checks current session editOwn / history.read and author in repository, revision fence + attachment operation ID; `db/forum-repository.ts:3672–3738` locks post row, checks owner+expected revision, writes new revision and idempotent receipt within DB transaction; `views.tsx:2149–2250,2817–2855` retains open edit buffer and only offers explicit current-revision rebase once new loader post revision is observed. Actual returned 4xx/5xx action data keep form mounted; unexpected throw instead reaches route `ErrorBoundary` and unmounts in-memory text. Existing `public-read.test.tsx:2314–2385` invokes **explicit router.revalidate()**, NOT default post-409 refresh; `:2621–2708` exercises 400 buffer retry; `write-actions.test.ts:1134–1190` explicitly checks classified dependency vs unexpected exception. Official React Router current `https://reactrouter.com/how-to/optimize-revalidation` confirms SSR Framework failed 4xx/5xx submissions don't refresh loader by default; `https://reactrouter.com/how-to/error-boundary` explains thrown action ErrorBoundary renders in place of route. These two old user-facing findings were **reconfirmed at source/framework contract** and discussed with owner in chat, NOT newly formalized in service communication before complete review. Browser/Worker actual multi-tab reproduction `NOT_EXECUTED`. Incorrect shared error copy: `catalog.ts:588` says "That solution cannot be selected for this topic" even when `editPost` returns conflict; same already related old edit-conflict deficiency, not silently assigned a standalone unreviewed issue.
6. General `runForumMutation` unrecognized catch→generic 503 is a **cross-cut error classification subject reserved for A10** and not adjudicated in A6. Account-change identity reconciliation I1 goes to A10; all attachment cleanup/security/concurrency beyond editor-facing usage belongs A7. `docs/EDITOR.md:159–169` explicitly excludes persistent text drafts/autosave/reload recovery in current Stage, while `:271` explicitly requires preserving mounted authoring text/attachments after server/internet submission failure. No invented requirement for whole-page reload recovery.

**Classification**: no NEW independent current-Stage Editor mechanism defect in reviewed modes/quotes/mentions. Previously owner-disclosed issues rechecked and kept owner-only until final complete audit; E3 future cross-cut recheck remains open. No unreviewed file from A6 prematurely marked full PASS for B. Unexecuted route 409, unexpected exception preservation, XHR/network lost ACK, browser IME + accessibility and PG race cases are **BLOCKED / NOT_EXECUTED** with runtime environment limitation already evidenced in history, rather than claimed PASS. Fresh current repo trace may reveal more B cases later; do not extend this A slice to all possibilities.

**STOP** after this bounded stage. On user's next explicit continuation, proceed to `PASS A stage 7` — repeat previously reviewed attachments/read/write/security/cleanup source/test chains, keep genuinely unreviewed details for B. Do not transmit proposed fixes to implementation/other agents at this time.


### PASS A / этап 7 — повторная проверка вложений, private upload/download, publication, cleanup (2026-10-23)

**Граница: повторный source/test review ранее документированных upload, download, attachment operations, server-fence, cleanup chains. A7 DONE in its historical evidence limits; A8–A12 and ALL B NOT STARTED. Whole audit OPEN.** Exact `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; current `AGENTS.md` полностью прочитан; `PROJECT.md`, `PROJECT_STATE.md`, `docs/EDITOR.md`, `docs/auth/AUTHORIZATION.md` re-fetched to actual EOF, same blobs as A1. No source edits, test executions, Cloudflare R2/PG/real browser accesses or deploys. Service communication and other agents' files unchanged.

**Coverage reconciliation**: All **31/31 stage7 manifest-specific files FETCHED** exact main for structural/metadata/case inventory (incl 14 relevant test modules plus 1 CSS; not all exhaustively inspected). The old journals specifically name **14/31 by exact full path** outside the manifest (some non-full-path basename mentions in addition), and do **not** give adequate file-specific old review records for the other **17**. This is an evidence-quality split, NOT proof that unnamed files were never read. During this A7 pass, auxiliary excerpts of several unnamed files were viewed solely to verify already-reviewed causal chains, not accepted as independently complete B audits. Keep these 17 in B file-coverage reconciliation until proper case-by-case review: `app/forum/actions-attachment-publication.test.ts`, `attachment-container-validation.ts` and `.test.ts`, `attachment-presentation.css` / `.tsx` / `.test.tsx`, `attachment-r2.ts` / `.test.ts`, `attachment-request-context.ts`, `attachment-structural-validation.ts` / `.test.ts`, `attachment-validation.ts` / `.test.ts`, `attachment-zip-validation.ts` / `.test.ts`, `editor-attachments.test.tsx`, `workers/attachment-storage.ts`. Some have topical tests covered historically without pathname log; don't infer detailed PASS or fix for these solely from presence of tests. Remaining 14 old explicitly named files and their relevant earlier cases were rechecked now. Cross-cut `app/forum/actions.server.ts`, `mutations.server.ts`, `views.tsx`, `db/forum-repository.ts`, `forum-service.ts`, `hyperdrive-forum.ts` re-fetched for attachment-specific slices only, not whole-file closures.

**Re-established chains (source and existing assertions READ, NOT RERUN)**:
1. **Private ingest and account**: `app/routes/attachment-upload.ts:91–252` GET draft list & POST/DELETE, session first, same-Origin for mutations, context key/operation UUID and current `authorizeEditorWrite` permission plus current post owner where applicable BEFORE any storage; `editor-permission.server.ts:13–45` permission difference section/topic/post, document exception typed only. Validation `attachment-validation.ts` `DEFAULT_ATTACHMENT_MAX_BYTES=50_000_000`, stream sample 4096, binary magic/extensions/MIME mismatch, executable rejection, utf8 check and secret-file warning in client; structural validators for image/PDF, ZIP/ZIP64/Office and 7z/gzip/tar/ole are bounded/fail-closed at storage gate, but NOT AV guarantee. `attachment-r2.ts:151–300` private random R2 keys, byte-length-bounded stream, finalize and drop inconsistent object, neutral octet-stream metadata; suspicious reject events persisted with deterministic hash (not rejected objects). Existing `attachment-upload.test.ts:148–442`, `attachment-r2.test.ts:77–275`, `attachment-validation.test.ts`, structural tests case lists re-inspected. Tests not executed. No claim of real Cloudflare runtime.
2. **Stable operation and UI failure handling**: `app/forum/editor-attachments.tsx:132–268,280–335` immediate XHR upload via picker/drop/paste, progress, error / Retry same upload+operation ID / Remove, displayed busy state, secret-containing .env confirmation. User/context or operation identity changes ignore late ACK and abort inflight request. `attachment-operation.test.tsx:105–215` asserts absent text draft sync, canceled stale operation, cross-account isolation, ambiguous ACK remove/retry, retained/new rebasing; `editor-attachments.test.tsx:149–392` case index previously topical, not full B pass. `markdown-editor.tsx:933–939` submits stable ID with selected and retained refs. `docs/EDITOR.md:159–208,355–394` current Stage intentionally NO persisted text autosave, uploaded refs in temporary active operation. Upload XHR lacks explicit timeout (old E2 observation); not by itself a current requirement defect, and actual network stall not reproduced.
3. **Download authorization and inert MIME**: `app/routes/attachment-download.ts:29–87` public only by existing published post→attachment association (not by guessing asset ID), temporary by current session owner/context/operation and ref; `db/forum-attachments.ts:190–225` confirms published association against existing post and owner-fenced draft reference. Storage reads after DB authorization; missing/revoked returns 404, absent bucket 503. Safe response: octet-stream attachment default, nosniff, CSP sandbox, private no-store, disposition escaped; verified raster inline and small verified text only on explicit view mode. `app/routes/attachment-download.test.ts:43–105`, `attachment-presentation.test.tsx`, `forum/markdown.test.tsx` relevant tests read. No real browser CSP/inline file test.
4. **Atomic publication and retry**: `db/forum-repository.ts:569–640,664–748,783–850,3674–3738` owner/context lock, fingerprinted receipt on exact payload, selected uploaded refs only, terminally retire upload generation and detach temporary refs atomically with new post/revision. Same operation/payload replay yields same result; changed input 409; edit includes exact retained previously-published IDs, verifies original owner and expected published revision. `app/forum/actions.server.ts:36–53,98–118,145–174,480–516` form parses ID and selected set and forwards actor server-side. Native PG tests `tests/database/forum-attachments.test.ts:442–616,711–805`, `forum-attachment-publication.test.ts:75–195,280–378` assert file-only publication, replay after lost ACK, no duplicates, invalid IDs and concurrent Cancel/upload/Save serialization, rebase retention. Test source viewed, not run. Does NOT prove user-facing network-loss recovery once editor unmounted (no persisted draft by contract); N1 error-page form unmount and E1 revalidation remain A6 findings, distinct from server-side idempotence.
5. **Orphan cleanup**: `db/forum-attachment-cleanup.ts:8–13,44–140` 24h operation idle, bounded 20 items/run, 1h grace, 5min durable claim lease. Advisory owner/context lock protects expire vs upload; row lock + post/draft ref recheck before durable `deleting` mark, only then idempotent private R2 deletion; claim token fenced DB deletion and lease retries failed/ambiguous deletes, skips still-referenced assets. `tests/database/forum-attachments.test.ts:825–1006` native PG source tests cover shared post refs, stale operations fenced, lost delete ACK replay, failed claim and overlapping cleanup loops. `workers/attachment-storage.ts` wrapper uses `FixedLengthStream` and abort on failed R2; adapter test assertions read; deployed schedules/external R2 belong paused Stage6.
6. Legacy comment in `db/forum-attachments.ts:209` mentions old "30-day text-draft TTL", while current source-of-truth `docs/EDITOR.md:159–169,380–389` has no user text drafts and 24h temporary upload TTL. **Stale source comment**, NOT runtime enforcement or current Stage code defect. Can tidy in future applicable doc/code maintenance, not an automatic fix order.

**Classification:** No NEW substantiated functional current-Stage defect in the previously inspected attachment chains. Existing A6 E1/N1 untouched, A3/A4 I1 untouched. Suspected E2 upload request without XHR timeout remains a **source fact, not demonstrated mandatory current-Stage defect**, no network integration run. Orphan/cleanup races supported by source and legacy native PG tests but NOT newly executed. Host app has no compatible Node24/pnpm/project checkout and no actual deployed permission; cannot claim live R2/Worker/PostgreSQL/browser PASS; constraints explicitly preserved.

**STOP** this single logical A7 subtask. Next owner command: PASS A / Stage 8 recheck only previously reviewed locale/translation UI+content/provider-neutral code and assertions; do not begin new B file coverage early or publish findings in service shared channel.


### PASS A / этап 8 — повторная проверка локализации, UI и content translation, provider-neutral transitions (2026-10-23)

**Граница:** повторно проверены previously evidenced source/tests, без нового полного A8=128-file прохода, B и внешнего провайдера. Status A8 historical scope RECHECKED, whole audit OPEN; A9–A12 and B NOT STARTED. Frozen current GitHub `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; full latest `AGENTS.md` fetched and read. Source-of-truth translation contract from A1 (`TRANSLATION_ARCHITECTURE.md`, `docs/translation/LOCALES.md`, `UI_TRANSLATION.md`, `PROJECT_STATE.md`, `ROADMAP.md`) unchanged exact blobs; **4 docs without historical full-read evidence still deferred to B** (`CONTENT_TRANSLATION.md`, `PROVIDERS_AND_JOBS.md`, `RESEARCH.md`, `STORAGE_AND_VERSIONING.md`): their content NOT newly read in this A8 pass. Prior targeted "Первый аудит — дополнительная подзадача: локализация и переводы" and locale fallback recheck used only as scope, not accepted without fresh source.

**Manifest evidence:** Stage8 baseline has **128 INCLUDED** paths; exact full pathname mention outside manifest in historical journal **24/128**, basename text mention **49/128**. These are trace heuristics, **not** 24 verified / 104 unverified counts. Re-fetched and reviewed verified historical locale+translation mechanism files and related selected tests listed below; not all 128 were fetched or semantically reviewed. Newly encountered connected implementations only sampled to verify the old causal chains; full individual source, input/role/error contract and standalone tests for each still B. Do NOT declare 128/128 stage8 PASS; B needs manifest-by-file + scenario reconciliation.

**A8 directly rechecked exact code paths (with source and targeted actual existing test assertions, tests READ not RUN):**
1. **Locale routes and registry** — `app/routes/locale-boundary.tsx` `c156f430`, `locale-negotiation.ts` `c22c8c48`, `app/localization/locale.ts` `be96abce`, `registry.ts` `25db3937`, `resolver.ts` `1fd749e3`; request-scoped registry, canonical BCP-47 explicit locale; non-canonical method POST/DELETE rejected `404` before action; aliases safe GET/HEAD `308`, disabled/unknown `307` to English; degraded registry nonbootstrap GET/HEAD English `307` `Cache-Control: no-store`, mutation 404; `/:locale` middleware guards downstream; root preference logged-in `user.locale` > cookie > Accept-Language and noncacheable 307. Bootstrap `en` code-owned, active `ru/he` supported; configured `ka` inactive, `iw` alias `he`. `app/routes/locale-boundary.test.ts:21–115,151–175`, `locale-negotiation.test.ts:19–92` source assertions reviewed; no live browser/HTTP.
2. **UI language resource priority, versions** — `app/localization/resource-loader.ts` `0e84e076`, `persistent-sources.ts` `8811c0d8`, `bundles.ts` `aee1fc69`, `runtime.ts` `139c13d0`, `db/hyperdrive-ui-translations.ts` `4daa28f2` and `locale-boundary.tsx:77–150`: requested tag → fallbacks → English, each namespace independent, persisted verified exact-locale compiled bundle shortcut; otherwise local current manual > DB manual > machine > canonical English, stale source fingerprints/policy omitted, values validated, structural invalid bundle caught and falls back to source resolution, only typed dependency outage/schema/timeouts open a request-local circuit; unexpected errors propagate. Snapshot is isolated i18next server+client, no per-request external provider. `app/localization/resource-loader-bundles.test.ts:30–115` exact persisted bundle short-circuit/target fallback plural parity/source version, `resources.test.ts:35–181,265–280` local dominance, stale exclusions, source correctness and isolated runtimes; tests read not run. Integrity exception for malformed bundle is caught at adapter, so it is NOT source proof of user-content leakage into default React Router logs (L1 retained as conditional).
3. **Visible content selection** — `app/routes/topic.tsx:36–80` current title and nonempty post-body revisions, excludes attachment-only zero-byte body, `app/localization/content-translation.ts` `757049ac`, `content-translation-presentation.ts` `4590ef6f`, `db/content-translation-store.ts` `ce550317`: exact `contentType/id/revisionId/targetLocale`, known same-source skips DB, unknown source 'und' never guessed for reads, stale/invalid/missing/typed storage outage selects current original revision; unrelated/wrong target ignored, manual provenance outranks machine. Quote-source attribution and source link preserved, per-block source/translated language+direction; `content-translation.test.ts:55–240`, `content-translation-presentation.test.ts:52–234`, `tests/database/content-translation-store.test.ts:69–312` test assertions read for stale/ownership/manual race; runtime not executed.
4. **Generation planning and safe provider-neutral task dispatch** — `content-translation-planning.ts` `6d716399`, `content-post-body-planning.ts` `7943d16d`, `content-translation-task-consumer.ts` `f9bd062f`, `content-post-body-task-consumer.ts` `d359f5f5`, `content-translation-execution.ts` `2d636659`, `content-post-body-execution.ts` `979c7ee1`; planning rechecks current authoritative revision, canonical active target, known/und source policy, capability, unchanged current translation, budget admission under store, durable stable task before queue enqueue; consumer rechecks generation head, revision, protected policy and claim before translation; retry can repeat external segment calls but may not repeat durable write. `app/localization/content-post-body-planning.test.ts:46–327`, `tests/database/content-post-body-task-planning.test.ts:128–715` case list and selected admission/rollback assertions read, NOT RUN. No new external provider network calls.
5. **Markdown safety and atomic publication** — `app/localization/content-markdown-translation.ts` `1c4da2d8`, `content-post-body-publication.ts` `1e95ef03`, `content-translation-publication.ts` `10b32258`: AST text segmentation, protected code/links/quotes/technical tokens including author/permalink, collision-safe markers, verify exact restored marker count/structural identity and segment size, invalid result → original fallback. `db/content-topic-title-execution-store.ts` `eeec8ece`, `db/content-post-body-execution-store.ts` `7361f4c7`, `db/translation-task-store.ts` `e2088fea`: transaction lock ordering generation head → claimed task → authoritative current revision, verify generation/policy/fingerprint/claimToken/source; manual current translation beats machine; transaction publishes result and completes task atomically; if task completion fails, translation insert rolls back. `app/localization/content-markdown-translation.test.tsx:28–316`, `tests/database/content-post-body-task-planning.test.ts:762–1308` and `tests/database/content-topic-title-execution.test.ts:127–599` case titles plus source assertions read: overlapping provider calls vs manual translation, revision switch while provider pending, generation changed, claim reclaimed, completion fault rollback. No own Worker/PG/provider/browser integration execution.
6. **Actual tests ≠ runs:** listed test modules and selected actual assertions re-read, zero independently executed; old exact-tree `#39615502080` green CI is historical, not A8 fresh result. `i18next` SSR hydration was not independently launched. New provider, Queue, Neon/Hyperdrive and Cloudflare real-service activation belong paused Stage6; not defects purely because not run. No new confirmed current-Stage functional defect in repeat-reviewed A8 chains. No finding in shared team PR. Potential data/cross-locale future negative cases and full end-to-end failure recovery parked for B.

**A8 result:** historical reviewed locale/resources/content/provider-neutral transactional chains rechecked against unchanged `main`, no newly proven current Stage defect; source/tests still not prove all 128 scope or real runtime behavior. Preserve B for all uncovered files & scenario matrix, future Stage6 external acceptance separately. **STOP. Next on explicit user continuation: PASS A stage9 — recheck historical PostgreSQL SQL migration chain and schema/index/transaction assertions; do not start new B material.**


### PASS A / этап 9 — повторная проверка PostgreSQL, SQL migration chain, Drizzle metadata, tests (2026-10-23)

**STATUS: A9 COMPLETED only in previously evidenced source/static/checkpoint depth. A10–A12 and ALL PASS B NOT STARTED; overall unified audit OPEN.** Current GitHub `main` SHA `d72b27ca762dd930f0e7ad614e5b00832a07ec0c` confirmed, `AGENTS.md` fully fetched/read. Source-of-truth `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/database/MIGRATIONS.md` fetched through EOF unchanged from A1. No code, schema, main or other agents' files changed; this private coverage note is not handoff of findings. No local PostgreSQL, app tests, migration runner, native database introspection, real privilege probes, pg_stat_statements or EXPLAIN executed.

**Manifest accounting:** 108/108 Stage9 included paths fetched from exact main. This comprises **45/45 migration `drizzle/0000–0044*.sql`**, **45/45 `drizzle/meta/0000–0044_snapshot.json`**, `drizzle/meta/_journal.json`, `db/schema.ts`, `drizzle.config.ts`, `db/postgres-deadlines.ts`, `db/postgres-deadlines.test.ts`, 11 `.github` migration/schema/privilege scripts, manifests and tests, and `tests/database/migrations.test.ts` + `tests/production-migration-verifier.test.ts`. Full source strings consumed programmatically for all SQL and JSON; **this is structural exhaustive file acquisition and named metadata analysis, not 45+45 human hand-audited field semantics**, and test assertion verification focused on previously reviewed relevant cases. Not every script line or 3109-line PG test re-reviewed with exhaustive assertions: do not equate "fetched" with end-to-end PASS.

**Independent fresh static proof (not merely relying on old notes):**
1. Journal `_journal.json` version 7/dialect postgresql has contiguous integer idx 0–44, 45 distinct migration tags, strict increasing `when`, each corresponding SQL re-fetched and nonempty. SQL grouped 0000–0014 / 0015–0029 / 0030–0044 fetched; recorded per-tag SHA, bytes, line count, created table/index/check/trigger/function inventory. Later changes 0026 (drops obsolete solved-bestAnswer coupling), 0038 (durable cleanup claims+manual SECURITY DEFINER trigger), 0039 (receipt and file-only post revision), 0040/0043 (authz check evolution), 0044 (draft context/boundary tables) cross-rechecked vs source and selected actual PG test expectations.
2. All 45 snapshot JSON re-parsed, across 3 overlapping contiguous batches 0000–0014, 0014–0029, 0029–0044, `prevId === preceding.id` for **44/44 transitions**, all version 7, no missing/removed table, declarative table counts evolve **1 → 37 at 0033 → 47 at 0044**. All snapshots compared table+constraint kinds `columns/indexes/foreignKeys/compositePrimaryKeys/uniqueConstraints/checkConstraints` by additions/removals/modified serialized definition in batches 0014–0044, and presence/count evolution in early 0000–0014. Early 0000–0014 serialized modifications not exhaustively compared for every shared column: future B full semantic parity if needed.
3. `db/schema.ts` declares exactly **47 `pgTable` names**. Their sorted set matches final 0044 snapshot's **47 public tables** with zero missing/excess. Checked `.github/production-schema-manifest.json` target migration exactly `0044_attachment_draft_conflict_boundaries`, also **47 table names**, zero missing/extra. **This is name-level static parity, NOT proof every column/default/check/index hash matches a *real* PostgreSQL catalog.** Production schema manifest includes pg_catalog introspection of constraints, expressions and indexes, detects representation-only Drizzle differences through actual DB, and is enforced by script test in existing CI.
4. Manual SQL-only constraints/triggers are expected and cannot be treated as missing from declarative Drizzle snapshot by themselves. Examples `forum_topics_current_title_revision_fk`, `forum_posts_current_revision_fk`, `forum_topics_best_answer_topic_post_fk` `DEFERRABLE`, immutable revision trigger guards 0004, built-in role identity lock 0006, translation task metadata triggers 0015/0016 and attachment cleanup active-ref trigger 0038. Current 0026 schema intentionally lacks obsolete `forum_topics_best_answer_requires_solved_check`. `tests/database/migrations.test.ts:2431–2468` explicitly checks best-answer FK deferrability, independent solved, and removed coupling; `:2565–2642` checks SQLSTATE `55000` on immutable revision update, strict current-revision FKs, CAS revision transitions; `:1458–1475` role/permission catalog guards; `:1414–1456` persisted-English checks.
5. Existing source tests `tests/database/migrations.test.ts:42–71` `beforeAll` resets disposable schemas and invokes `migrate`, explicit PostgreSQL **17/UTF8**, second `migrate` idempotent and **45 applied rows**; `:2817–2935` graph-level serializable locale lock, ambiguous COMMIT without blind retry, preservation of primary failure if rollback also fails; concurrency tests for authz/help/notifications/read/attachments reviewed during prior A3–A7 and reindexed here, not re-executed. `.github/scripts/migration-history.mjs` enforces accepted append-only SQL/snapshots and journal idx/timestamps; tests cover modification/rename/deletion and missing append. `production-migration-contract.mjs` post-state exact timestamp+hash, pre-state known-applied required prefix, tests negative. `runtime-privileges.mjs` checks least privilege across localization/web, no object owners/DDL/cross-domain access and ACLs; `verify-runtime-privilege-probes.mjs` guard against live DB by `*_test`, positive+negative SQLSTATE 42501; existing test titles/targeted assertions read only. `db/postgres-deadlines.ts` enforces caller connection/query timeout configurations, source test covers exact error shape; not real performance profiling.
6. **D1 pre-existing doc-only mismatch reconfirmed:** `PROJECT_STATE.md:1568` calls current history 0000–0043, but frozen main `drizzle/meta/_journal.json` has 45 entries 0000–0044; `PROJECT_STATE.md:367` and `docs/EDITOR.md:389` independently acknowledge 0044. No new defect based on this duplicate.
7. **No NEW confirmed current Stage functional/schema defect** across these repeat-reviewed DDL, metadata, critical transactional invariants. Static proof is not substitute for independent replay in PostgreSQL 17, `EXPLAIN (ANALYZE)`, real-role grants, production schema drift, cloud/Neon rollout, or live contention. Disposable DB and actual plan/index latency evaluations are `NOT_EXECUTED` and assigned to PASS B / execution block if necessary for current Stage. Production/Neon/external migration is paused Stage 6 and must not be demanded as a current Stage fix.

**STOP** at A9 boundary, according to owner multi-stage instruction. Next after explicit '...' owner continuation: **PASS A stage10** — previously checked cross-cut security and failure boundaries, including E3, L1, I1 as appropriate, without opening B. No premature audit closure or findings publication.


### PASS A / этап 10 — повторное рассмотрение previously checked security, diagnostic/error boundaries (2026-10-23)

**A10 source/test recheck completed in historical evidence scope only; A11–A12, all PASS B and complete audit still OPEN.** Frozen GitHub main `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, full active `AGENTS.md` fetched/read at start. Source and selected existing tests re-fetched, actual test execution, signed-in browser 2-tab, Worker, DB, CDN and exception/log injection `NOT_EXECUTED`. No implementation changes, no changes to shared communication or another agent personal file. Both A10 manifest-specific `app/server-logging.ts` (SHA f37758fa554e05e68437ed46b8698eba032773be) and `app/server-logging.test.ts` (SHA 316bcd8b03537966c3030f01136209df78b9a793) read **FULL**. Both had `NOT_REVIEWED` flags in 2026-10-22 per-file manifest, but older first-audit `серверные ошибки, логи и диагностическая приватность` checkpoint indisputably source-read both; they are legitimate A scope, not fictional newly completed B.

**Revisited old cross-cut chains, with evidence:**
- Source `app/forum/mutations.server.ts:91–118,119–142,137–173`, `db/hyperdrive-forum.ts:61–78,119–165`, `app/forum/actions.server.ts:107–115,171–175,189–215,461–517`, `app/routes/notifications.tsx`, `app/routes/authorization-admin.tsx`, `app/forum/ui.tsx:401–433`. `runForumMutation` catches every otherwise unknown writer exception and returns controlled `503`, which is not an unexpected thrown Error. Unlike `read()`, usual `write()` does NOT type-classify DB transport/timeouts; ordinary typed correction `writeCorrection` and `requireForumPermission` do classify known unavailable and rethrow unexpected. Old E3 owner-visible finding rechecked at source/framework contract, not transferred to team; external production occurrence not observed, and naïve rethrow interacts with N1 editor text-loss risk. Existing tests `app/forum/write-actions.test.ts:1098–1190` check unexpected correction and authz throw vs typed 503; `db/hyperdrive-forum.test.ts:28–165` only reader, not ordinary writer 42P01/TypeError outcomes; `app/forum/route-error.test.tsx:60–84` checks generic 500 safe DOM. Source test assertions **READ, NOT RUN**.
- `app/server-logging.ts:1–30` produces fixed `ssr_stream_error/after-shell/errorKind` only, `app/server-logging.test.ts:4–49` tests injected OAuth/session/cookie/token query secrets never appear there; `app/entry.server.tsx:1–46` custom SSR callback only sanitizes after-shell and has no exported `handleError`. Official current React Router `https://reactrouter.com/api/framework-conventions/entry.server.tsx` and `https://reactrouter.com/how-to/error-reporting` say default logs caught server loader/action unexpected errors to console unless handleError provided; status-returned 503 doesn't call handleError (`https://reactrouter.com/how-to/resource-routes`). `workers/app.ts:25–53` resolves DB and initializes getSession before RR router, uncaught initial exceptions skip SSR reporter. `wrangler.jsonc` observability enabled, head_sampling_rate=1, redact_query_string=true. Current official Workers Logs `https://developers.cloudflare.com/workers/observability/logs/workers-logs/` includes errors/uncaught exceptions; 2026-08-24 changelog `https://developers.cloudflare.com/changelog/post/2026-08-24-preserve-exception-info/` confirms console.Error object metadata incl message/stack. Old L1 log-sanitation boundary remains source-confirmed but **no concrete deployed exception revealing real secret nor dashboard access/exfiltration verified**; do not label observed leak.
- `app/auth/auth-controls.tsx:30–43,61–90` HeaderAuthProvider syncs only on initialUser updated by loader; same-tab signOut setUser+revalidate. `app/auth/auth-client.ts` Better Auth client actions don't bind `useSession` state into HeaderAuthProvider. `app/forum/online-presence-heartbeat.tsx:10–45` visible-tab 401 revalidates, authenticated 204 revalidates only on forum index; `app/routes/presence.ts:1–29` derives server owner from current session and returns 204. Thus signed-in A→B switch in second tab leaves mounted topic editor owner identity A while subsequent actual action derives B session and may publish unsent A text if B has rights. `app/forum/markdown-editor.tsx:109–157,189–209,252–258` draft/history reset only when local accountId changes; attachments `editor-attachments.tsx:132–168` fence stale requests *once observed accountId changes*. Test evidence `auth-controls.test.tsx:145–170` revalidation only explicit, `online-presence-heartbeat.test.tsx:30–88` 204/401 but no A→B two-tab, `attachment-operation.test.tsx:152–163` owner prop switched explicitly, not implicit cookie transition. Previously reported I1 rechecked on source causal path, **browser two-tab actual execution absent**, server checks remain authoritative (no authorization bypass).
- Other historical security slices replayed: `workers/app.ts` fresh per-request context; `auth/session-context.ts:6–37` transports session cookies only, `locale-boundary.tsx:64–140` request-authUser/header permission links, `unread.tsx`/`notifications.tsx` owner read + 401, `attachment-download.ts:29–87` verifies authorized ref before bucket read and returns `private,no-store`, `CSP:sandbox`, `nosniff`; `mentions.ts:7–30`, `attachment-upload.ts`, `presence.ts` explicit no-store/Origin guards; `app/forum/public-authz-degradation.test.ts:202–222,465–479` tests typed optional degradation only and unexpected propagation. Personal SSR document loaders have no universal explicit no-store, but no checked active Worker cache.enabled/cache.put route or externally confirmed replay, so old HTTP cache concern remains **conditional**, not a confirmed present leak. `entry.server.tsx` lacks global SSR frame-ancestors/X-Frame-Options, yet real HTTP header/iframe/site-origin attacker not tested and default Better Auth Lax cookies mitigate ordinary cross-site authenticated iframe. Old anti-framing H1 remains defense-in-depth/future production gate, not an established exploitable current-Stage bug. No application-wide text/form byte cap for server post/publish, but no accepted max-size contract or observed actual Worker resource failure, so old T1 remains conditional Stage6/abuse-gate observation. Do not prescribe speculative fixes.
- **Current Stage defect classification:** previously owner-visible E3 **source-confirmed unexpected error misclassification/normal diagnostics bypass**, I1 **source-level confirmed cross-tab stale-account submission causal gap**; L1 **real uncovered diagnostics-sanitization path** without observed secret exposure, cannot claim measured confidentiality incident or fix design. No NEW separate verified current-Stage defect found in this bounded A10 recheck. Previously identified E1/N1 not revisited as independent A10 findings (already A6); A5-AP1 not conflated with historical anti-framing H1. All these findings remain developer-chat only pending whole audit closure and owner's publication command.
- **Remaining evidence to B:** real browser signed-in A→B + active editor test, unexpected writer injection and observe route/log, pre-router exception capture, actual final worker HTTP headers and positive/negative privilege outcomes when relevant; independently enumerated unseen files/security branches, real PG/Worker execution if environment permits. These are `NOT_EXECUTED/TO_CHECK`, not fictitious PASS. All unrelated external production systems are Stage6 scope and not automatic fixes.

**STOP** after this A10 subtask. On explicit owner next '...': **PASS A stage 11 — repeat only previously checked UI/browser/A11 static evidence and accessibility + responsive + hydration LTR/RTL acceptance limits.** No B until A12 done; no new audit or fix.


### PASS A / этап 11 — ранее проверенные UI/UX shell, keyboard, RTL, responsive, SSR/hydration wiring (2026-10-23)

**А11 завершён ТОЛЬКО для old source/test/checkpoint scope; Pass A Stage12 and all B NOT STARTED; unified audit remains OPEN.** `main` exact `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, main `AGENTS.md` fully reread. Reconstructed historical old bounded checkpoint `Первый аудит — адаптивность, RTL и доступность интерфейса форума (2026-10-22)` plus older SSR/cache, preview and Editor audit crosscuts. Source-of-truth `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/UI_UX_PASS.md`, `docs/EDITOR.md` fetched fully to actual EOF before checking contract. Existing source tests READ, NONE executed. No direct browser, screenshots, layout capture, real URL Worker/SSR, Pages preview, hydration, screenreader or Playwright execution. No code or team shared file changed.

**Manifest A11 = 17 filenames**, all originally labeled `NOT_REVIEWED` by 2026-10-22 per-file manifest, although **8 were explicitly named in old first-audit logs outside manifest** and several had direct reviewed source/case evidence; label is not proof source never read. Exact previous path mentions outside manifest 8/17 and basename mentions 9/17, merely heuristics. Re-fetched **13/17 text/source files** from frozen main in this stage for earlier-chain verification; **four not fetched/reviewed at all:** `app/assets/vico-forum-logo-dark.webp`, `app/assets/vico-forum-logo-light.webp`, `app/ui-preview/index.html`, `app/ui-preview/preview.css`, all deferred B. Source-linked newly encountered files without old file-specific review (e.g. `app/entry.client.tsx`, `app/theme.ts`, `app/ui-preview/preview-app.test.tsx`, `preview-i18n.ts`, `vite.config.ts`) were inspected only to establish earlier verified SSR/theme/mock separation; do not falsely credit exhaustive individual B review. Large `app/styles.css` (9644 lines), `app/ui-preview/preview-app.tsx` (2158 lines) were fetched and selected prior-analyzed portions inspected; **not** exhaustive CSS/layout/preview semantic inspection.

**Rechecked previous subject areas with precise evidence:**
1. `app/root.tsx` (blob `c1708e1e`): `Layout` finds route loader locale and renders `<html lang ... dir ...>`, viewport meta, in-head `THEME_BOOTSTRAP_SCRIPT`, RR Meta/Links/Scripts; `app/entry.server.tsx` (`22aa313b`) streams `ServerRouter` and awaits `allReady`, text/html, bodyless HEAD; `app/entry.client.tsx` (`487c480b`) `hydrateRoot(document, <StrictMode><HydratedRouter /></StrictMode>)`. `app/theme.ts` (`c92403e2`) pre-hydration theme derived from localStorage or media preference. This confirms *wiring*, NOT hydration equivalence, no flicker, runtime keyboard or locale reconciliation. Root `suppressHydrationWarning` deliberately controls root lang/dir attributes but does not mean test PASS.
2. `app/forum/ui.tsx` (`3544dac3`): `ForumShell` localized skip link immediately before repeating header, `href="#forum-content"` and focus target div `tabIndex=-1`; native select for language preserving path+query+fragment, accessible icon-only discovery links via `aria-label`, notification count has text label but visible numeric badge `aria-hidden`; theme toggle has current target accessible name, auth status server-projected. `ui.test.tsx` (`bcd8e15c`) source assertions: first Tab targets skip link, target attribute (NOT click-and-focus test), native locale switch URL anchor preserved, preview locale override takes precedence, theme bootstrap executes in synthetic JSDOM and system/manual transitions. No actual browser Tab sequence or screenreader pass.
3. `app/styles.css` (`afb2a818`): review of previously examined `:131–145` common focus ring/fluid shell; `:1131–1199,1719–1794` responsive (52rem, 44rem, 38rem, 30rem); `:2872–2945,6945–7059` intermediate high-zoom/compact nav, icon pills and logical geometry; `:7170–7220` visible skip on focus, header overflow visible, bounded children and language selector focus; `:9232–9269` editor fullscreen and compact toolbar with wrap. `@media (prefers-reduced-motion: no-preference)` gating on known transitions `:1199–1213`. Source contains LTR isolating code `:803,893`, RTL arrows `:1627–1641`, semantic focus ring. Static read does NOT prove no clipped controls, 320px zoom, phone keyboard overlap, WCAG 2.2 contrast, reduced motion in all animations, or exact Hebrew visual ordering.
4. `app/forum/views.tsx` and `app/forum/markdown.tsx` prior crosscut re-evaluated from source/test evidence: `<bdi dir=auto>`, independently directed original English vs Hebrew translated blocks, `dir=ltr` code even inside RTL, safe links; `app/forum/public-read.test.tsx:389–449` EN/LTR and HE/RTL structural category/section/topic route/link assertions and `:2062–2121` translated RTL title/original EN switch, no executable `script`; `app/forum/markdown.test.tsx:375–482` auto direction for prose lists/headings, authored direction markers, code LTR. Existing `app/forum/public-read.test.tsx:3190–3245` checks accessible named create-topic/reply forms, toolbar, field hints and pending state, `app/forum/route-error.test.tsx:60–83` tests error heading/alert and safe copy. Semantic JSDOM assertions READ but not independently rerun.
5. `app/ui-preview/main.tsx` (`13e03571`) uses separate `createRoot` (NOT hydrateRoot) to show `PreviewController`/`EmbeddedPreview`; `app/ui-preview/preview-app.tsx` (`f4f250fa`) uses component presentation and fixtures/scenarios with `createMemoryRouter`, guest/user/manager, EN/RU/HE, mock mocked client actions, bypasses actual SSR/Workers/auth/DB; `preview-i18n.ts` (`1762bc31`) uses preview-specific local pack; `preview-app.test.tsx` (`332e6643`) tests only state/role selection and link for static view. `docs/UI_UX_PASS.md:38–56,666–705` explicit that Pages represents visual progress only and never real-runtime acceptance. No deployed Pages review in this A step; no inference Pages=Worker functional gate.
6. **Current Stage vs future scope**: `PROJECT_STATE.md:56–58` explicitly says separate Editor 2.0 visual/Pages gate waived by owner; `:193–204` previous bounded historical Chromium toolbar geometry evidence but NOT execution on this current A11 audit. `docs/UI_UX_PASS.md:666–705` explicitly states **separate full product UI/UX real-browser acceptance** is blocking before public launch (desktop/intermediate/mobile, guest/user/manager, mixed LTR/RTL, content heavy/empty, error, UI focus, keyboard, 100–400% zoom, motion, color contrast, screenshots and exact head). `ROADMAP.md:121–135` standalone UI priority and Stage6 paused; `docs/EDITOR.md:328–348` editor keyboard contract still applies without escalating waived per-PR aesthetic acceptance. No contradictions resolved unilaterally.

**A11 conclusion:** No NEW supported current-Stage UI/accessibility functional defect established by repeating the already-audited source paths. Static mitigations do not constitute evidence of live layout/keyboard/RTL/SSR hydration correctness. Previous A6 E1/N1 and A3 I1 are separate underlying interaction effects and remain; no new finding in bounded A11 repeat. Source visual deficiencies without actual reproduction/accepted current contract are **NOT CONFIRMED**, do not order fixes. Current exact-browser acceptance and files not specifically old-reviewed remain in global PASS B, with external production/Stage6 gated separately. No screenshot or test run performed.

**STOP** after A11. Next explicit developer command `... / Продолжай` → **PASS A stage12**, repeat previously checked tests/CI/toolchains/build/Worker smoke *without claiming fresh CI run*. Then STOP and only after another explicit command may global B begin. Do not publish findings to shared channel before whole audit complete.


### PASS A / этап 12 — повторная проверка тестовой инфраструктуры, CI, quality/toolchain evidence (2026-10-23)

**A12 завершён только по ранее документированному уровню проверки; общий PASS A 1–12 завершён с явными ограничениями; PASS B НЕ НАЧАТ; объединённый аудит ОТКРЫТ.** Проверен GitHub main d72b27ca762dd930f0e7ad614e5b00832a07ec0c; активный AGENTS.md получен и полностью прочитан. Все действия read-only относительно main, приложения, схемы, workflows и командного service-channel. Отдельная запись только в личный журнал, без публикации findings или исправлений.

**Прежнее coverage** восстановлено из старых «exact-main CI evidence», «Stage1 reproducible toolchain» и профильных A2/A3/A4/A6/A9/A10/A11 сведений, а не из старого номера «этап 12» (тот касался authorization). Из девяти основных INCLUDED путей этапа 12 в baseline manifest прямое старое file-specific evidence обнаружено только для `.github/workflows/ci.yml` и `.github/workflows/ui-preview-pages.yml`. Их текущие contents перепроверены; оставшиеся семь не получили ретроактивного PASS: `.github/scripts/production-privileges.mjs`, `production-privileges.test.mjs`, `verify-recovery-v2-validation-run.mjs`, `verify-recovery-v2-validation-run.test.mjs` (все под `.github/scripts/`), `.github/workflows/codex-service-channel-bridge.yml`, `scripts/configure-localization-deadlines.sql`, `scripts/smoke-workers.sh`. Они отложены B для отдельного определения настоящей текущей области и глубины; CI-вызов скрипта не доказывает source-level review самого скрипта. EXCLUDED external operational файлы не включены автоматически.

**Конфигурация и наблюдаемое выполнение.**
1. `package.json` (blob f0e7429d), `.node-version` (df6ae337), `pnpm-workspace.yaml` (fba2ee8), `vitest.config.ts` (b8b2fdec) и `vitest.database.config.ts` (223bc3c1) повторно сверены в пределах прежнего architecture/toolchain review: Node=24.21.0, pnpm=12.3.4, direct pinned scripts, Vitest5 app/jsdom с исключением DB tests и отдельный DB/node suite `tests/database/**/*.test.ts` timeout 30s. Нет права выдавать разные запуски за один suite.
2. `.github/workflows/ci.yml` (full current file) triggers pull_request, jobs `checks` и `database`; install --frozen-lockfile, JS script guards, lint/typecheck/app tests/build/ui-preview, Drizzle metadata+generated parity; PostgreSQL 17 service DB tests/probes, local Worker build и `smoke-workers.sh` через Vite preview с локальными DB connection overrides. Реальные external Hyperdrive/Neon/production не тестируются этим workflow.
3. `.github/workflows/ui-preview-pages.yml` (full current file) builds/deploys static mock preview on push(main) and supported preview branches; not SSR forum, no production Worker/backend acceptance. `.github/workflows/production-worker-rollout.yml` прочитан как разграничение scope: manual workflow_dispatch с exact-main SHA and confirmations, отдельный Stage6 rollout, не выполнялся.
4. По GitHub API `git/commits/{sha}` проверены Git trees: PR #232 final head `a528c6d2cfba8029072c1f18ae963946a0bbd744` и current squash main `d72b27ca762dd930f0e7ad614e5b00832a07ec0c` имеют идентичное дерево `18e73a062eb06984fd0b28132f510a5b12b1cfe2`. Сам pull_request CI #39615502080 на **PR head**, не main SHA: completed success, attempt1; обоим jobs `checks` и `database` подтверждён success всех рабочих steps через /jobs. Скачанные job logs дополнительно показывают **94 test files / 979 application tests PASS** и **26 test files / 279 native DB tests PASS**. Это независимая проверка исторического выполнения, а не самостоятельный тестовый запуск.
5. GitHub Pages push run #39637268492 на exact main completed success; оба jobs `build` и `deploy` success через /jobs, не реальный functional browser acceptance.
6. Перечитаны выбранные ранее просмотренные assertions: `app/auth/auth.server.test.ts:1–35` проверяет конфигурацию credentials/rateLimit/Origin, а не реальный exhaustion-429; `app/forum/write-actions.test.ts:1070–1185` проверяет classified 503 / unexpected propagation в correction/authz, не все обычные writer exceptions; `app/forum/public-read.test.tsx:2290–2400` проверяет explicit revalidate/rebase редактора, не failed-409 automatic refresh; `app/forum/online-presence-heartbeat.test.tsx:1–68` проверяет guest/POST/401/visibility, не 2-tab A→B; `tests/database/migrations.test.ts:1980–2160` содержит native monotonic unread/concurrent transaction assertions. Это существующие частные assertions; A12 не меняет прежнюю классификацию finding или test gaps, не выводит whole-scenario coverage из зелёного CI.
7. Текущее локальное окружение проверено: `node v22.16.0` вместо project 24.21.0, `pnpm` отсутствует, project checkout/node_modules отсутствуют. В этой A12 задаче **не запускались** собственные lint/typecheck/test/db:test/build/ui-preview/smoke, browser, PG, real Worker или external services. CI remote ≠ own execution. Подробный test-case-by-case coverage и пригодные runtime gates остаются в B с честными статусами.

**Итог:** нового подтверждённого дефекта текущего Stage только из A12 не установлено; исторические findings нельзя снять зелёным CI. 9 manifest-specific A12 paths: 2/9 old-evidenced workflow rechecked, 7/9 без прямого доказательства прежнего file-specific review — defer B, не добавлять их как прошедшие проверку. Сквозные tests/config из ранних этапов реchecked в указанной глубине, не каждый тест каждого файла. Исторический PASS A завершён только по доказанным прежним цепочкам; это НЕ закрытие полного 437-file/requirements audit и НЕ гарантия выполнения runtime acceptance.

**STOP.** Следующий шаг только по явному указанию владельца — PASS B: сначала согласовать/применить existing included-file manifest и statuses A vs B, затем начать ранее не проверенное по этапам 1–12; не начинать B в этой подзадаче. Перед каждым дальнейшим шагом сверять `main` SHA.


### PASS B / этап 1 — сверка документов и исправление A1 crosswalk (2026-10-23)

**Подзадача завершена.** При проверке происхождения четырех оставленных на B1 документов обнаружена ошибка объединённого crosswalk: прежний `AUD-20261022` **уже прочитал все 18 документов**, включая `CONTENT_TRANSLATION.md`/`STORAGE_AND_VERSIONING.md` в issuecomment-6327783686 (этап1 ч.6) и `PROVIDERS_AND_JOBS.md`/`RESEARCH.md` в issuecomment-6327809506 (ч.7). Это были **документы, ошибочно пропущенные повторным A1**, а не исторически никогда не проверенные. Исправлено в текущих статусах без изменения исходных архивных записей. Сама повторная проверка четырёх документов выполнена с `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; чтение до EOF, 1315 физических строк:

| Exact path | Git blob SHA | Full physical lines | Result |
| --- | --- | ---: | --- |
| `docs/translation/CONTENT_TRANSLATION.md` | `0232535f8967cc944612a51c17f23d4b561e0000` | 165 | Re-read full; CNT-01…06 |
| `docs/translation/STORAGE_AND_VERSIONING.md` | `68606ec24ae213d15e1de4f8791acd805d42faab` | 305 | Re-read full; STO-01…07 |
| `docs/translation/PROVIDERS_AND_JOBS.md` | `2cfb77d420d268c13fe43b616ad2e73b29bf0146` | 281 | Re-read full; PRV-01…02, JOB-01…06, SEC-02/04 |
| `docs/translation/RESEARCH.md` | `9679948c99f4ba3d9934c5e3fdb7dfab5855d9e7` | 564 | Re-read full; dated research, NOT implementation requirements |

**Cross-document consistency:** `TRANSLATION_ARCHITECTURE.md` (blob `0294c0245e846b5fdd5dab22bbc6afe79733cdcf`) перечитан до EOF и сопоставлен с новыми документами; в четырёх проверяемых файлах 23 distinct component IDs, и все 23 присутствуют в architecture registry и ROADMAP traceability. Все Markdown relative file links (4 на architecture и 1 из provider docs на storage) разрешаются на существующие файлы в exact main; anchors и внешние URL не перепроверялись. PROJECT.md/ROADMAP.md current Stage boundaries и ранее A1 reviewed docs использованы для различения Stage5 local implementation от Stage6 external integration. Проверено согласование ключевых invariants: revision-bound content identity/source-locale corrections; exact current original fallback и пустой attachment-only body; protected Markdown/AST/title units; sourceFingerprint/manual freshness, generationPolicyVersion, exact-locale bundle и deploy identity; registry semantic hash/health split; claim/current-generation fenced publication; commit-before-enqueue, retry/reconciliation, no exactly-once external API promise; provider-neutral/manual ingestion and secrets boundary.

**Результат документальной сверки:** нового доказанного противоречия между четырьмя detail docs, component registry и roadmap не найдено. `RESEARCH.md` имеет явно указанную последнюю внешнюю проверку 2026-09-11; её Hyperdrive, Queues, Workers AI, Google/attribution и прочие внешние сведения НЕ актуализировались и не использовались как current operational verification. Стек, изученный в research (например remix-i18next 8.0.0), не автоматически означает установленную direct dependency; current package.json не содержит этот package, это само по себе не конфликт реализации. Ни source/test/backend/runtime/external provider pass по этим детальным контрактам в данном документальном шаге не выполнялся; они принадлежат B8/профильным этапам. Новых подтверждённых defects текущего Stage на уровне этой сверки нет. Старые D1/D2 и прочие findings остаются независимыми, здесь не отменены.

**Coverage decision:** 18/18 INCLUDED актуальных Markdown документов повторно просмотрены до EOF в объединённом цикле (14 в A1, 4 сейчас); B1 не имеет остатка документов для первого чтения и может считаться закрытым как reconciliation, однако это НЕ полная проверка всех source/tests/requirements и не overall audit PASS. Следующий substantive stage — **PASS B / этап 2**: непроверенные конфигурации/архитектурные ветки, только по следующей явной команде владельца. Во время этой подзадачи `main`, реализация, общие/чужие служебные файлы и CI не изменялись; исправлялся только личный coverage ledger.


### PASS B / этап 2 — ранее непроверенные архитектурные/конфигурационные файлы (2026-10-23)

**Этап B2 ЗАВЕРШЁН в repository/source + static CI evidence scope. Общий аудит ОТКРЫТ. PASS B3–B12 НЕ НАЧАТЫ.** Baseline `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c` повторно подтверждён API; `AGENTS.md` 1–EOF (blob `20acb9210685bf3347f153c0d44d19420e8dc9bc`) прочитан. PROJECT/ROADMAP/PROJECT_STATE и Stage1 scaffold материалы сопоставлены с ранее A1 подтверждёнными документальными контрактами, без заявления повторного полного содержательного аудита всей хроники PROJECT_STATE. Чтение exact `main` через GitHub; никакой реализации, migration, CI, deployment и других личных/общих служебных файлов не меняли.

**Разделение фактического покрытия.** Из 20 INCLUDED первичных файлов Stage2 `A2` ранее заново проверил 16 по специфическим архитектурным цепочкам (см. A2 journal, это не exhaustive test всех строк). Четыре недоказанно проверенных ранее файла теперь получены полностью до EOF, их содержимое и связи непосредственно рассмотрены:

| Путь | Git blob SHA | Scope/evidence |
| --- | --- | --- |
| `db/web-runtime-wiring.test.ts` | `00af56fcb565935b4a6abdaf5bba58e6176aea27` | 29 lines; два Vitest tests, **source string** assertions о web PG factories и отключённом generation action |
| `eslint.config.js` | `f4f8fe1104e7b02ab6368f7759d7a29db41c4195` | 15 lines; recommended ESLint+typescript-eslint, generated-path ignores, globals browser+node+worker |
| `tsconfig.cloudflare.json` | `991a73681ebaef8591941a66ef58c5c5bf51a85a` | 26 lines; extends strict/noEmit base, TS app/db/workers/generated route and Worker types, DOM/ES2022 |
| `tsconfig.node.json` | `e5888460bf1ae5d82d0be85793810c01d873bffa` | 92 lines; Node/test/CLI projects, TS source explicit includes, strict inherited base, ES2022 |

**Independent exact-tree structural checks:** GitHub tree SHA `18e73a062eb06984fd0b28132f510a5b12b1cfe2`, `truncated=false`, **491 tracked files**. For `tsconfig.node.json` all **73 exact (nonglob) included paths exist**; the two glob patterns (`db/**/*.ts`, `tests/database/**/*.ts`) were **not** misclassified as nonexistent literal files. `tsconfig.cloudflare.json` broad `app/**/*`, `db/**/*`, `workers/**/*` plus generated React Router/worker types. In `app/routes.ts` all **27 referenced route module paths exist**, no duplicates. This proves tracked file identity/structural relation, not compiler inclusion semantics or route runtime outcomes.

**Test-to-implementation causal scope:** `db/web-runtime-wiring.test.ts` checks literal current source contents. Independently checked actual `app/auth/auth.server.ts`, `db/hyperdrive-forum.ts`, `db/hyperdrive-authorization.ts`, `workers/app.ts`: createWebClient auth default, two forum reader/writer factory matches, createWebPool authz default, DISABLED_CONTENT_GENERATION_ACTION_RUNTIME present and status-reader wiring absent — **all current string assertions match**. `workers/database-bindings.ts` separately enforces two required nonblank connection strings with no cross-capability fallback; its previous A2 tests exercise positive/negative cases, but live Hyperdrive/Worker binding behavior NOT executed. The string-inspection tests **do not** execute auth/forum/authorization requests or establish actual DB runtime isolation. Their restricted confidence is accurately tracked, not labeled a current implementation defect.

**Quality/toolchain relation:** `tsconfig.json` has two project references, strict/noEmit; `package.json` pins Node24.21.0, pnpm12.3.4, `typecheck: wrangler types && react-router typegen && tsc -b`, `lint: eslint .`. `vitest.config.ts` excludes native DB tests and .github/scripts from jsdom runner; `vitest.database.config.ts` includes `tests/database/**/*.test.ts` under Node. Linter's shared browser/node/worker global set is broader than per-runtime proof; no concrete current Stage fault attributed to that generic lint config. The preexisting A2 exact client bundle check and historical PR CI must not be represented as freshly rerun.

**Execution evidence & limits:** GitHub Actions CI #39615502080 on PR #232 final head `a528c6d...`, identical Git tree to current main, concluded success; prior A12 fetched logs recording app 979/979 and PostgreSQL 279/279. Pages run #39637268492 on exact main success but static mock preview only. No fresh check or cloud deployment triggered. Local environment directly checked this turn: Node v22.16.0 (pin v24.21.0), no pnpm, no repository checkout, no psql; therefore `pnpm typecheck/lint/test/db:test/build`, real Worker/SSR runtime or browser were **NOT_EXECUTED** by Lira. Test execution confidence remains historical CI plus previous limited verification. This difference is deliberate and does not imply a defect.

**Current Stage assessment:** current owner-only local/CI Stage0–5 + Editor2, Stage6 external integration paused; production web wiring and deployment tests do not make external live Hyperdrive/Neon/OAuth/Queue evidence a B2 obligation. Route auth/session actual same-origin, writer error semantics, privacy negative/revocation/concurrency, browser hydration and native PG semantics must be evaluated in their functional B3–B11/Stage6 gates as assigned — not silently upgraded by this config review. No new confirmed CURRENT-STAGE architectural implementation defect in the four newly reviewed files and examined composition boundaries. Preexisting E1/N1/I1/E3, DOC contradictions, etc. remain in separate ledger with their own evidence and are not cleared/reclassified by this stage.

**Coverage:** 20/20 Stage2 primary INCLUDED source/config file identities now have A- or B-review evidence **at declared levels**, NOT all 20 exhaustively exercised for all error/negative paths. Structural inspection of existing 27 routes and tsconfig manifest complete; runtime scenarios marked NOT_EXECUTED. The larger manifest continues with unrelated functional/DB/security/test-quality paths and a separate final reconciliation; whole audit NOT COMPLETE.

**STOP** after this subtask. Next, only upon new owner instruction: `PASS B / этап 3` — as-yet unreviewed auth/session/role/override/ownership files/scenarios, preserving exclusions on live OAuth, and record missing runtime evidence without speculative fixes.


### PASS B / этап 3 — новая negative/session/authorization/ownership scenario matrix (2026-10-23)

**B3 COMPLETED as a static/source/test coverage subtask, NOT a live runtime sign-off; full project audit remains OPEN.** Current baseline `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c` reverified through GitHub branch API; AGENTS.md (blob `20acb9210685bf3347f153c0d44d19420e8dc9bc`) fetched/read through EOF. Read `docs/auth/AUTHORIZATION.md` (blob `79b68863e17bb1202609abd9d5641b5fc6454917`) full 1–264 and compared with previous A1/A3 and current routes/DB adapters. Project Stage0–5 local/CI complete, Stage6 external operations and live Google OAuth excluded. Audit is read-only w.r.t. application/main/workflows/external environment, only personal ledger updated. STOP before B4.

**Source coverage:** all 29/29 primary Stage3 manifest paths were fetched from exact `main` once more this pass, with domain/source code and selected tests inspected rather than a claim that every test assertion has been individually exhaustive. A3 already fetched these 29; consequently B3 does **not** falsely label 29 files as newly discovered. B3 adds previously incomplete scenario/negative/revocation/failure analysis and explicit execution coverage, with cross-cut `workers/app.ts`, `app/routes/locale-boundary.tsx`, `app/forum/mutations.server.ts`, `app/forum/actions.server.ts`, `app/forum/editor-permission.server.ts`, `app/routes/post-edit.ts`, `app/routes/topic.tsx`, `app/routes/attachment-upload.ts`, `app/routes/attachment-download.ts`, `app/forum/online-presence-heartbeat.tsx`, `app/routes/presence.ts`, `app/forum/ui.tsx`, `app/root.tsx` and selected tests inspected as needed; no premature PASS for these files' distinct B4/B5/B6/B7 phases.

| Case / roles / failure | Direct source path and evidence | Verification depth |
| --- | --- | --- |
| Guest/no session + logout/revocation | `workers/app.ts:25–53` request-local auth initialization; `app/auth/session-context.ts:6–35` session/cookie propagation; native `tests/database/auth-runtime.test.ts:64–167` covers real PostgreSQL signed-in cookie sliding, no cookie guest, expired+deleted session | SOURCE+EXISTING TEST read; native CI historical success, own RUN NOT_EXECUTED |
| Email signup/signin and invalid password/display name | `app/auth/auth.server.ts:24–41,54–104` enables credentials, validates trimmed 1–100 name; `tests/database/forum-email-registration.test.ts:53–127` asserts hashed password, wrong password rejected, valid login, names blank/>100 rejected without DB insert, trim stored | SOURCE+TEST; no own PG run |
| ReturnTo origin/cross-locale and UI auth | `app/auth/credential-path.ts:3–24` constrains return destination to same canonical locale; `app/auth/credential-view.tsx` and `app/routes/credential-sign-in.tsx`/`credential-sign-up.tsx` protect client and signed-in redirect; `credential-view.test.tsx:94–171` covers message anchors, shared header fresh after local sign-in, generic provider error | SOURCE+existing component test, not browser; live Google OAuth Stage6 EXCLUDED |
| Auth rate limit exhaustion and 429 | `app/auth/auth.server.ts:44–54` config has database-backed Better Auth rateLimit and trusted cf-connecting-ip; `app/auth/auth.server.test.ts:21–34` asserts config, native email tests only limited failures | **UNVERIFIED runtime 429/limit exhaustion**; cannot infer absence or correctness of all other tests without broad sweep; no current defect proven |
| Application permissions dynamic grant/deny/allow and next-request | `app/authorization/catalog.ts` = 15 code-backed keys; `db/authorization-repository.ts:103–141,231–252` consistent `REPEATABLE READ READ ONLY` snapshots and effective permission order; `db/hyperdrive-authorization.ts:15–68` per-request Promise cache; `tests/database/stage4-core-e2e.test.ts:333–379` exercises grant/revoke/override + forged actor across new request contexts | SOURCE+existing native PG tests, not own fresh execution |
| Concurrent auth snapshot | `tests/database/authorization-snapshot.test.ts:158–235,237–319` use deliberate two-connection barriers for resolveUser and full management state, assert no hybrid snapshot and then fresh state | DETERMINISTIC EXISTING PG TEST SOURCE; local EXECUTION NOT DONE |
| Unauthorized role management and forged actor | `app/routes/authorization-admin.tsx:14–83` separately protects loader/action, 401 guest/403 denied/503 classified error, requires same-origin, actor always session user, validates input/status; `app/routes/authorization-admin.test.ts:35–100` asserts guest, denied, resolver outage, unexpected error passthrough, forged form actor, role conflict | SOURCE+existing unit tests; cross-origin action test not proven in these selected route tests; actual source guard observed |
| Last manager lockout, concurrent management | `db/authorization-repository.ts:231–282` uses `authz_mutation_lock ... FOR UPDATE` and rechecks effective actor inside transaction; count before/after prevents final-manager removal; existing `tests/database/migrations.test.ts:1458–1584` tests grant/override and concurrent last-manager mutations | SOURCE+existing DB test reviewed in A3; new own PG execution NOT DONE |
| Typed availability vs unexpected error | `db/hyperdrive-authorization.ts:77–101` follows bounded cause-chain and maps classified availability only; `db/hyperdrive-authorization.test.ts:46–133` tests timeout/SQL error; `db/authorization-repository.test.ts:81–171` tests transaction rollback/COMMIT preservation; `authorization-admin.test.ts:41–100` ensures 503 only classified, programming failures propagate | SOURCE+test, no live failure injection |
| Published edit/attachments resource ownership | `app/routes/post-edit.ts:7–19` checks authoritative author plus `forum.post.editOwn`; `app/forum/editor-permission.server.ts:13–45` checks server author for post; `app/routes/attachment-upload.ts:96–116` session/Origin/context/permission; `app/routes/attachment-download.ts:40–54` owner-only private refs; `app/forum/actions.server.ts:480–498` edit actor from session, tests `app/forum/write-actions.test.ts:189–231,571–638`; server status separate from client-stale editor | SOURCE+selected existing tests, NOT full cross-account browser/transport, remainder B6/B7 |
| Cross-tab A→B account switch while topic editor open (**preexisting I1**) | `app/auth/auth-controls.tsx:30–43` header user changes on loader update; `online-presence-heartbeat.tsx:11–45` triggers session revalidation on 401, but 204 only when on forum homepage; `app/routes/presence.ts:12–24` returns 204 for authenticated B. Old topic tab A can therefore keep A header/editor view while new request server session identifies B (authenticated B is not unauthorized). No guaranteed timely revalidation/account-specific editor reset. `online-presence-heartbeat.test.tsx:31–66` tests 204 and 401 but not two-tab A→B topical editing | RECONFIRMED causal **source-level gap** from earlier A3; real 2-tab browser reproduction `NOT_EXECUTED`. Do not equate with authz bypass; no new finding formally published. Account/editor correctness current-stage scope, not deferred Stage6 merely because future cross-tab tests could help |
| Published revision-history policy conflict (**preexisting D3**) | `docs/EDITOR.md:285–286` prohibits ordinary users even own history; `docs/auth/AUTHORIZATION.md:40–47` grants effective capability dynamically regardless role; `app/forum/actions.server.ts:460–478` and `app/routes/topic.tsx:98–114` implement permission; default grants user DENIED, moderator/admin ALLOWED | VERIFIED contradictory source-of-truth text, not independently selected policy and not authorization bypass finding; owner decision later in audit |

**Classification:** no **new** confirmed exploitable authorization bypass from B3 source. Historical I1 remains source-supported **current-scope potential functional correctness defect** pending real two-tab/browser evidence. Historical D3 remains a documentation/product-rule contradiction; don't choose a new rule unilaterally. Other old E1/N1/E3 in B6/B10 must not be silently dismissed; E3 broad `runForumMutation` 503 catch-all is again directly visible `app/forum/mutations.server.ts:89–111`, distinct from classified authz adapter behavior, but is **not** newly investigated as a standalone B3 finding. No speculative severity/patch recommendation. Real external OAuth/Hyperdrive/R2/Queue/cloud integration excluded under owner Stage6 scope.

**Execution / blockers:** local runtime has Node22.16.0, no pnpm, no checked-out repository and no psql (checked this turn); project pin Node24.21.0. No fresh Vitest, PostgreSQL, actual browser or production Worker call. Historic remote CI #39615502080 checks and DB succeeded on tree-identical PR head; confirms existing test suite PASS on source tree but cannot simulate the A→B race or certify every negative variant. Full runtime validation needed before calling **whole audit** complete; B11/B12 separately maintain the NOT_EXECUTED ledger.

**B3 close:** All 29 primary source/test files mapped; important negative/guest/user/moderator/manager and concurrent/failure paths now have explicit evidence vs gap labels. This is completion of B3 **static inspection subtask**, not a complete auth runtime/acceptance PASS. Remaining source/negative scenarios crossing forum, attachments and editor are assigned B4–B7, not marked satisfied. Next logical subtask only upon explicit owner continuation: `PASS B / этап 4` — public forum/discovery/participation/unread/notifications/profile/presence leftover files/scenarios. Stop here.


### PASS B / этап 4 — public forum/discovery/participation/unread/notifications/profile/presence (2026-10-23)

**STATUS: B4 bounded source/test + uncovered-file review COMPLETE, NOT real-runtime test/whole-audit PASS.** Exact baseline `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c` rechecked via GitHub branch; current `AGENTS.md` blob `20acb9210685bf3347f153c0d44d19420e8dc9bc` read full 1–EOF. Current Stage0–5 local/CI and standalone UI/UX pass, real Stage6 external integration paused; no service/API/production actions. Reviewed active A4 old checkpoint and 49 primary manifest Stage4 identities plus six `4/5/6/7` cross-cut. A4 gave functional source/test reviews to most Stage4 paths; B4 focuses on 8 files flagged there as not independently old-reviewed, and unverified negative/error/concurrent/public-vs-private scenarios. No false claim that *all 49 files were re-read byte-for-byte* in B4 or all cases executed.

**Eight A4 deferrals obtained/read FULL to actual EOF in this B slice (exact `main` blobs):**

| Path | Git blob | Findings/scope |
| --- | --- | --- |
| `app/forum/under-development.ts` | `338f978181f424682bd7423b69589d216304f128` | Six approved placeholders incl. drafts; runtime whitelist `isUnderDevelopmentFeatureId` |
| `app/forum/under-development-view.tsx` | `a62cde98a986fc8030ed90e91bcb2acedffbf1cf` | Unknown feature not rendered; `requested` uses static translation keys, JSX escapes input; back link via locale |
| `app/routes/under-development.tsx` | `18e687f9db70653747efa1b684889a89d270b871` | Route loader retrieves `feature` query; output subjected to whitelist in view |
| `app/i18next.d.ts` | `c78b3a135b5d12c1a9b145fa5ae23d6adebaee9c` | Type-only namespace shape `common`, strict keys; no runtime path |
| `db/forum-identifiers.ts` | `0dbe814c8cf2758551cca7102cc5525d58593044` | Shared Help category vs hidden service-section identifiers |
| `app/forum/homepage.ts` | `8aeececf9186a2297da91736d5543d8e7ef32d60` | Interface summary category/section counts used by `home.tsx` and views |
| `db/editor-draft-context.ts` | `e1bc24eeec81dd1c15a865d79b8d189272710440` | Operation context strings `help:new` / `section:*:new` / `topic:*:reply` / `post:*:edit`, not former user draft-autosave persistence; further domain enforcement B6/B7 |
| `tests/database/hyperdrive-registry.test.ts` | `464e1ecdc15fac0047d2637a09ce9ea9fc349683` | Existing test expects error against unreachable local `127.0.0.1:1` → bootstrap `en` health degraded and reporter called once; not independently run; registry system further B8 |

Cross-check `app/forum/homepage.test.tsx:157–205` asserts implemented discovery endpoints vs `under-development?feature=rules`, `drafts` helper page and no stale unfinished placeholders for now implemented features; `app/routes/api.ts` / `not-found.ts` current fallbacks read full. None of eight proves an actual new CURRENT-STAGE defect by itself. The term “draft” in editor context key does NOT imply that intentionally removed text draft autosave was resurrected.

**Independent negative/failure/scenario matrix B4 (source AND selected concrete existing test assertions; not re-executed):**

1. **Public routes/404/search:** `app/routes/home.tsx`, `category.tsx`, `section.tsx`, `search.tsx`, `popular.tsx`, `unanswered.tsx`, `tags.tsx`, `tag.tsx`, `unread.tsx`, `notifications.tsx`, `profile.tsx` opened and read; independent `app/forum/paths.ts` 1–EOF. Unknown category/section/tag/profile 404; search q `NFKC`, trim/collapse whitespace, >200 bounded input nonquery; source uses returned DB reader, not client-constructed SQL. Route presentation existing `app/forum/public-read.test.tsx:1946–2049,3295–3315` covers search, popular, tags, unanswered, 404; `tests/database/stage4-core-e2e.test.ts:381–474` actual PG search priority/activity/id ordering asserted in test source. No own query-plan/runtime/browser or giant query stress; no invented performance defect.
2. **Category/section/Home:** `db/forum-repository.ts:874–939,2343–2572` joins count categories/sections with dedup, hides internal Help section; topic/current title revision and pin ranking with deterministic ties. Homepage presence is optional: `app/routes/home.tsx:12–23` catches only typed unavailable; `app/forum/homepage.test.tsx:59–232`, `app/forum/public-read.test.tsx:395–480` assert category empty states, no fake zero when optional DB unavailable, rethrow unexpected error. Section personal read-state and create permissions degrade for typed outages; source `app/routes/section.tsx:16–43`, `app/forum/public-authz-degradation.test.ts:202–225,465–479` keep public content and propagate programmer error.
3. **Read state/guest/auth:** `app/routes/unread.tsx:13–31` guest 401, session-bound reader call; `app/routes/unread.test.ts:20–52` asserts session identity. `db/forum-repository.ts:1200–1359` unread query by user/topic with marker and stable (createdAt,id) order; upsert conditioned on strictly newer post, guarding stale/concurrent writes, followed by authoritative read. Previously A4 inspected native `tests/database/migrations.test.ts:1991–2147` including concurrent pools, stale rollback rejected/new post unread. No fresh DB execution, and multi-tab read-state UI not independently browser tested.
4. **Notification ownership/CSRF:** `app/routes/notifications.tsx:15–70` guest loader/action protection, required intent+ID, session actor, canonical locale redirect; `app/routes/notifications.test.ts:79–170` explicitly asserts 401 guest, 403 cross-Origin, 400 absent ID, 404 missing record, then actor-bound redirect; `db/forum-repository.ts:1361–1417` filters all reads by `recipientUserId`, UPDATE by both notification ID and recipient and idempotent `readAt`. Earlier native `tests/database/migrations.test.ts:2151–2340` asserts dedup/no-self, recipient isolation and transaction rollback. No confirmed cross-user notification disclosure.
5. **Profile public/private/validation/CSRF:** `app/routes/profile.tsx:20–69` returns only public fields, owner-only editing and update; actor from server session and same-origin, explicit 401/403/400/404/503 and unexpected passthrough; `app/forum/profile.ts:1–52` validates <=500 code points bio and HTTP(S) no credentials/controls URLs with restricted GitHub account URL. `app/routes/profile.test.ts:29–84` asserts forged client role ignored, no email/permission data, guest/other/origin denied, invalid/malformed data, typed outage vs programmer error; `tests/database/forum-profiles.test.ts:54–105` asserts PG upsert/counters/role public projection/cascade. No profile stale-write CAS guarantee required by present MVP; don't classify hypothetical dual-tab last-write-wins as a current defect without requirement.
6. **Presence spoofing/cadence/availability:** `app/routes/presence.ts` 204 only with session/Origin/heartbeat; `app/routes/presence.test.ts:27–56` asserts server-owned user, guest 401, forged Origin 403, bad method 405, malformed intent 400, typed dependency 503 and programmer error preserved. `db/forum-repository.ts:475–503` current <=5m, total count with bounded 12 profile members in one query; update only if >=45 seconds since previous DB write, GREATEST timestamp. `tests/database/forum-online-presence.test.ts:40–82` exercises cooldown/expiry, bounded 12 while total 14, no email leak, cascade. No own real 60-sec timer/browser/Worker/PG execution.
7. **Participation, forged actor and cooldown:** `app/forum/actions.server.ts` and `mutations.server.ts` current source checks, section/topic/post writer receives actor from session and current server-side permission; forbidden writes before writer; specific `forum.topic.pin`, create/reply checks. Existing `app/forum/write-actions.test.ts:263–325,571–650` has actor forgery, guest/cross-Origin, role denied, 429 retry-after, `tests/database/stage4-core-e2e.test.ts:175–379` covers next-request grant/deny. Forum writer broad `runForumMutation` unexpected→503 remains **preexisting E3** reserved B6/B10, NOT independently declared fixed or discovered in B4.
8. **Account switch on active topic:** `app/forum/online-presence-heartbeat.tsx:11–45` 401 triggers loader revalidation; authenticated B gets 204, on non-home topic 204 does not revalidate. `app/auth/auth-controls.tsx:30–43` user changes only when loader new identity arrives. **I1** from A3/B3 remains source-level account/editor state isolation problem; actual A→B browser timing NOT_EXECUTED. Not an authz bypass (server actor is current B). Separate B6/B11 evidence still required.

**Evidence discipline:** B4 gathered exact blobs of the eight new primary files and directly read public route source, selected query fragments and real tests. A4 already source-reviewed the rest of 49 primary Stage4 manifest paths and six cross-cut files; B4 does not silently upgrade previous `SOURCE_REVIEW` to full exhaustiveness or its DB tests to new execution. Historical exact-tree CI #39615502080 succeeded (app 979/979, DB 279/279) as previously verified in A12, not rerun. Local toolchain absent repo/pnpm/PG17/Workers browser, `NOT_EXECUTED`: fresh `pnpm test`, `pnpm db:test`, query plans, concurrent browser sessions, 60s heartbeat, SSR navigation/hydration accessibility. Release/Stage6 external integration remains out of bounds.

**Conclusion:** no NEW confirmed current-Stage defect in B4 code/test scope. I1 and E3 carried from earlier evidence; no assertion that they are closed. No live service, schema, production or implementation change. The **Stage4 source/test B4 subtask is CLOSED at explicitly limited confidence**, not “forum universally bug-free” and not whole audit complete. **STOP** for explicit owner continuation. Next: **PASS B / этап 5** Help, solved/best-answer/moderation signals, duplicates/appeals and current negative/concurrent scope, without entering B6.


### PASS B / этап 5 — Help & Solutions, solutions/signals/duplicate/appeals/attention (2026-10-23)

**B5 COMPLETED at declared static/source/existing-test evidence scope; whole Vico audit OPEN; B6–B12 NOT STARTED.** `main` exact `d72b27ca762dd930f0e7ad614e5b00832a07ec0c` verified through GitHub branch API, `AGENTS.md` full current text read (blob `20acb9210685bf3347f153c0d44d19420e8dc9bc`). Compared A5 prior source/test checkpoint, current `docs/UI_UX_PASS.md:339–378` and `PROJECT_STATE.md:270–315,1237–1302` product/state contract. No source edits, PR comments, shared-channel change, application deployment, production binding or externally owned service operation.

**Primary B5 inventory:** Manifest stage5 has **2 INCLUDED** dedicated files, both independently retrieved from exact `main` and read through EOF in B5:
- `app/routes/attention.tsx` blob `f19adc6605234fb23aa996c6f0e8542b2c1d52dc`, 204 physical lines; protected loader and action, independent `forum.attachmentSecurity.read`, filtered signalKinds, per-case 403/404/409/503, return redirect with current path/group.
- `tests/database/forum-help-attention.test.ts` blob `14aabe9844fe959383da121b72aebfbf678200c1`, 286 physical lines; PG fixture with pending signals and appeals, effective-kind visibility, grouped counts, individual case fields, applied vs pending status, stale `expectedAppealId`, page1 50/page2 4, Needs-review moderator status card. This test file was already read in A5: B5 is independent substantive gap and negative-matrix inspection, NOT first-ever file exposure.
Additional Help domain crosscut `app/forum/actions.server.ts` (blob `bc065366ffd0b867e6a368b53cb2ca637d5334db`), `app/routes/category.tsx`, `app/routes/topic.tsx`, `app/forum/views.tsx`, `db/forum-service.ts` (`43f3947b69df1dbdf7506e2fa4da195cb6c3fe69`), `db/forum-repository.ts` (`cf1994d369658f7a8062526cb4787bec2728ea16`), `tests/database/migrations.test.ts`, `app/forum/write-actions.test.ts`, `app/forum/public-read.test.tsx` examined in **relevant slices** (not 100% exhaustive across their 1000–3900 lines; own B6/B9 coverage retained). `db/hyperdrive-forum.ts` already A5/A4 reviewed in adapter scope, no independent live DB instance opened in B5.

**Contract-to-code/test matrix & negative cases:**
1. **Authorization privacy** `app/routes/attention.tsx:38–140`: protected `401` guest; dynamic independent `forum.solution.manageAny` / `forum.helpDuplicate.manage` / `forum.helpNeedsDetails.manage` / `forum.attachmentSecurity.read`; fails 403 **before** reader access for unauthorized mode. Reader receives exact authorized signal-kind array and appeal boolean. Source `db/forum-repository.ts:1679–1887` filters at DB boundary for each kind/group, 50 individual cases/page, authoritative Needs-review status separately; Mixed is **documented special**: page of up to 50 *topics* with 2+ pending *visible signals*, expanded into their actual individual cases; counts represent mixed **topics**, not individual group tasks. This is explicitly accepted contract `PROJECT_STATE.md:291–309`; do not misclassify as pagination bug. `app/forum/public-read.test.tsx:1180–1221` verifies security-only reader isolated from help, and forum-help-attention native tests cover case/count visibility. Unexpected permission errors propagate; typed availability yields 503.
2. **Action per-kind and case identity** `attention.tsx:142–194`, `app/forum/actions.server.ts:275–334`: Origin check and session source before form, actual signal fetched by case ID, topic equality verified before per-kind `requireForumPermission`; writer actor server session. `app/forum/public-read.test.tsx:1222–1262` asserts forged Origin 403, forged topic/case mismatch 404 and per-kind denial 403 before writer; `app/forum/write-actions.test.ts:750–864` explicitly checks effective permission for needs-details / needs-review / outdated / duplicate and forged actor ignored. No assertion of unauthenticated access.
3. **Signal lifecycle & races** `db/forum-service.ts:278–360` validates kind, normalized bounded explanation, duplicate root; `db/forum-repository.ts:2752–2946` locks topic(s) before user cooldown, prevents identical pending signal and ensures own-only withdrawal pending. `resolveHelpSignal:2948–3227` verifies pending under locks; acceptance rechecks solved/current-best-answer/duplicate preconditions and marks inapplicable reports `superseded`, preventing accidental apply to wrong current revision. `tests/database/migrations.test.ts:732–1045` covers stale replaced answer, accepted current answer, withdraw by other/terminal denied, concurrent double-accept only one success, DB check constraints. `migrations.test.ts:1048–1195` checks per-user 5s cooldown, withdrawal not bypassing, two concurrent users' same-actor submissions serialize, reply+signal no lock inversion. Tests **READ**, NOT_EXECUTED B5.
4. **Solutions/best answer** `db/forum-repository.ts:3488–3615` topic-row `FOR UPDATE`, own/any server-supplied scope, rejects topic original/cross-topic/missing answer, prevents solved/answer for active duplicate; replacing best answer marks prior Help answer outdated and clears new best-answer's old label; pending old-target reports superseded. `actions.server.ts:374–423` derives scope server-side and shows solve confirmation only to topic author on still-unsolved question. `migrations.test.ts:2431–2499` verifies semantic independence and DB FK; `write-actions.test.ts:651–748,962–983` tests forged scope, moderator-only moderation, missing outdated reason and redirect. No bug from selected-answer-without-solved.
5. **Duplicate cycle/self/canonical restrictions** `db/forum-repository.ts:3286–3395` locks two topic rows in sorted order, no self/no existing active duplicate/no same-topic answer/no root-with-incoming-duplicates becoming duplicate; confirmed duplicate makes new reply/answer/solved unavailable. Accepted duplicate signals handle similar authority checks `resolveHelpSignal:3138–3215`. `migrations.test.ts:485–585,960–1010` check direct and signal route, pending supersession, author-only appeal.
6. **Appeal strict identity, negative concurrency** `db/forum-repository.ts:3397–3485` requires Help duplicate author, active relationship, max one pending; accept removes relation atomically, reject retains, manual removal accepts pending appeals; pending exact-case guard `expectedAppealId` under row locks. `attention.tsx:172–190` checks case ID before writer then passes `expectedAppealId`, verified `forum-help-attention.test.ts` (wrong ID must not resolve), `public-read.test.tsx:1264–1290` (stale UI case 409/no writer). `topic` legacy in-topic accept/reject does not pass case fence, so its behavior remains “resolve currently pending appeal” through DB transaction; cannot claim same strict stale-case UI handling there unless product specifically requires it. No invented defect or automatic upgrade.
7. **UI only after authorization** `views.tsx:1436–1673` filters mode navigation by capability, escapes free-text through JSX, includes actual independent case ID, client-side pending state; authoritative Needs-review card links to current post rather than fabricated report actions. `docs/UI_UX_PASS.md:373–378` explicitly accepts MVP UX as “сойдёт” and reserves later polish, so density/scanability alone NOT current functional defect.

**Findings discipline:** No **additional new confirmed** current-stage Help defect established during B5 beyond previously owner-visible A5-Ap1 / other historical ledger observations. Do NOT mark A5-AP1 closed: prior A5 noted a possible source-evidenced current-scope issue owner-chat only; its specifics are not reproduced as a team finding and no independent production/browser behavior was established here. Do not silently replace it with unrelated anti-framing H1. Broad `runForumMutation` unexpected-error→503 E3 remains its own B6/B10 failure-path review, not a new Help-only finding.

**Confidence/execution:** Native fixture tests are not a fresh PG integration run. No local `pnpm`, checked-out repository, real PG17, Cloudflare Worker, browser or external OAuth/R2 acceptance executed in B5. Historical identical-tree GitHub CI previously success in A12 (979 app, 279 DB) is carried only as historical evidence; not claimed rerun. Explicit NOT_EXECUTED: actual network concurrency under locale/origin/session changes, UI browser navigation and direct production infra. Those gaps not silently closed in B5; targeted crosscut negative ownership and evidence remain for B6/B10/B11 and final B12.

**STOP.** B5 static/read/test subtask complete, wider audit still OPEN, B6–B12 NOT STARTED. Next only on new explicit owner command: `PASS B / этап 6` — Editor 2.0 source/editor/save/revision/quote/mentions negative/error, without entering B7 attachment lifecycle.


### PASS B / этап 6 — Editor 2.0 negative/error/revision/mode/quote/mention coverage (2026-10-23)

**B6 COMPLETE as a STATIC SOURCE / EXISTING-TEST EVIDENCE subtask only. WHOLE AUDIT OPEN. B7–B12 NOT STARTED.** Verified exact GitHub `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, full live AGENTS.md read to EOF (blob `20acb9210685bf3347f153c0d44d19420e8dc9bc`). Read relevant contract `docs/EDITOR.md:155–174,261–291,313–314,328–400` and reconciled with A6 and previous owner's first-audit scoped findings; history does not substitute for today's source inspection. Checked current GitHub Actions CI #39615502080 on source-tree-identical prior head `a528c6d2...` succeeded 2026-10-21 (historical, not a new test execution).

**B6 primary manifest:** Exactly **18** stage6 INCLUDED files. Independently reacquired all 18 from frozen main and read complete short files, source modules and test case indices with selected test assertions; 18/18 file identities now have A6+B6 evidence, **NOT** claim every line of all 1,630-line `markdown-editor.test.tsx`, 596-line `markdown.test.tsx`, or 640-line visual implementation is functionally exhausted. Current blobs:
- Sources: `app/forum/clipboard-markdown.ts` `0fde94be`, `editor-document.ts` `7febd899`, `markdown-editor.tsx` `13cfd96f`, `markdown.tsx` `ab52bcfc`, `mentions.ts` `c088c130`, `quote-markdown.ts` `c31eb2c3`, `quote-presentation.tsx` `f62ed07e`, `technical-markdown.ts` `12b938b7`, `visual-markdown-editor.tsx` `d4d9378c`, `app/markdown-syntax.ts` `b67e2363`, `app/routes/mentions.ts` `ac7025d1`.
- Tests: `clipboard-markdown.test.ts` `f211f4f7`, `editor-document.test.ts` `f50f49a8`, `markdown-editor.test.tsx` `7188044b`, `markdown.test.tsx` `b6555123`, `mentions.test.ts` `ff87c41a`, `technical-markdown.test.ts` `94f5f0bf`, `app/routes/mentions.test.ts` `c16fb089`.
Crosscut code explicitly inspected: `app/forum/mutations.server.ts:65–147`, `actions.server.ts:455–521`, `db/forum-repository.ts:3650–3739`, `app/routes/topic.tsx`, `post-edit.ts`, `app/forum/editor-permission.server.ts`, `app/forum/views.tsx:2140–2279,2805–2865`, `app/forum/ui.tsx:401–435`, `app/forum/online-presence-heartbeat.tsx`, current reader/attachment integration references. Crosscut tests selected read: `public-read.test.tsx:2314–2385,2621–2708`, `write-actions.test.ts:1111–1177`, `route-error.test.tsx:60–83`. These are NOT B7 attachment lifecycle signoff, B10 error and B11 browser signoff.

**Direct evidence matrix:**
1. **Source-preserving editing & account/context:** `markdown-editor.tsx:109–157,189–208,251–271,343–426` one Markdown string/history, 100-step bounded undo from `editor-document.ts:200–254`; changes Simple/Advanced/split/preview do not serialize a new source until explicit editing. CRLF/selection/unknown structures addressed by source spans and protected DOM selections `visual-markdown-editor.tsx`. Account preferences in localStorage keyed by `accountId`; editor state keyed by (observed accountId, contextKey, locale), reset if those actually change; no persistent text drafts intentionally: `docs/EDITOR.md:159–174`; `markdown-editor.test.tsx:592–848,1391–1437,1459–1598,1601–1629` exact existing tests for no-op mode/undo/context reset and absent autosave. **No** false report that intentional reload text loss is a current requirement breach.
2. **Clipboard/HTML/technical/RTL:** `clipboard-markdown.ts` whitelist and reject active elements, malformed/lossy table fallback; `technical-markdown.ts` protects uneditable code/oversize/incomplete tables/spoilers and preserves source positions; `app/markdown-syntax.ts` enables only requested double-tilde strikethrough and exact trailing `{:vico-dir=ltr|rtl}` on permitted blocks. `markdown.tsx` ReactMarkdown safe custom URL transform (known rendered raster `vico-attachment:UUID` only, forbid arbitrary image HTTP src) and external link rel flags; existing `clipboard-markdown.test.ts`, `technical-markdown.test.ts`, `markdown.test.tsx:163–596`, `editor-document.test.ts`, `markdown-editor.test.tsx:881–1367` test source inspected. Real DOM IME/copy-paste/browser keyboard input, authenticated image attachment bytes and RTL layout in Chromium **NOT_EXECUTED**; not convert generic hypothetical HTML injection into defect.
3. **Reply/Quote/mentions:** `quote-markdown.ts:15–104` attribution source link+permalink and escaped author, full underlying quote text; `quote-presentation.tsx:10–100` measured >=6 rendered lines collapses presentation only and expands without dropping source. `mentions.ts:5–48` caret regex and mdast path recipients excludes code/quotes/images/HTML and accepts exact encoded locale-profile link userId; `app/routes/mentions.ts:14–32` 401 guest, private no-store, max 64 chars, 400 invalid and 503 typed outage, unexpected rethrow; component fetch AbortController prevents obsolete responses applying after query/account changes (but cannot discover cross-tab cookie switch). Existing `mentions.test.ts`, `routes/mentions.test.ts`, `markdown.test.tsx:72–163`, `public-read.test.tsx:2740–2818`, `markdown-editor.test.tsx:158–198,411–475` inspect tests; no new security finding.
4. **Server published edit, ownership, idempotence:** `actions.server.ts:480–498` session/Origin + `forum.post.editOwn` before body/fence input, `db/forum-repository.ts:3674–3738` actor and post ownership checked under FOR UPDATE, stale expected revision rejected with 409 before modifying old refs, transactional CAS on new revision, mention record and publication receipt with same operation ID/fingerprint; server returns redirect only on success. `post-edit.ts:7–22` GET guarded by own author+permission. `views.tsx:2814–2854` hidden expected revision fixed to editor base, explicit rebase of attachments and typed text not silently overwritten. `public-read.test.tsx:2314–2382` tests only explicit `router.revalidate()` to provide r2 then rebase and retain r1 typed text; no test of failed submission *causing* r2 refresh. Native `tests/database/forum-attachment-publication.test.ts` historical tests cover receipt/replay/stale DB, but own PostgreSQL NOT_EXECUTED.
5. **E1 persists/current-scope SOURCE+framework-confirmed:** Same Save at stale R1 server 409 returned as `data({error:'conflict'}, status 409)` by `runForumMutation`; `app/routes/topic.tsx` does **not** export `shouldRevalidate` and no `useRevalidator` invoked on conflict in `TopicView`. Official current React Router docs `https://reactrouter.com/how-to/optimize-revalidation` externally rechecked 2026-10-23: Framework SSR failed action 4xx/5xx skip active loader revalidation by default. `views.tsx:2236–2247` only clears pending on forumWriteError; `2814–2853` shows rebase only when cached `post.body.id` differs from editBase, which stays R1. Thus no guaranteed immediate discover/rebase after rejected stale edit. A6/A10 known issue, **not new defect**, own real browser reproduction **NOT_EXECUTED**. Error message `forumWriteError_conflict` is previously identified misleading edit copy, not promoted to new defect in B6.
6. **N1 persists/current-scope SOURCE+framework-confirmed:** `actions.server.ts:480–482` awaits `requireForumPermission` **outside** generic `runForumMutation`, which rethrows unexpected authorization errors as required by current authz contract; route exports `ErrorBoundary=ForumRouteError`; `ui.tsx:401–433` full-page error state with no mounted MarkdownEditor; `markdown-editor.tsx:189–208` only in-memory Markdown. `docs/EDITOR.md:270–271` requires open text+attachments survive server/internet submission failure. Official `https://reactrouter.com/start/framework/route-module` and `https://reactrouter.com/how-to/error-boundary` confirmed thrown route action ErrorBoundary **replaces route component**. Therefore unexpected protected-action throw drops unsent open buffer (not a claim that typed validation 503 triggers this). Existing `write-actions.test.ts:1152–1159` tests throw, `route-error.test.tsx:60–83` tests safe copy, neither tests keeping populated editor. Existing N1 from A6 previous first audit, **not new**, real browser test NOT_EXECUTED. Do not propose suppression of unexpected auth faults as 503.
7. **E3 persists/current-scope SOURCE-confirmed error classification, distinct from N1:** `mutations.server.ts:89–111` catches *all* unknown ordinary writer errors as 503 rather than only `ForumStorageUnavailableError`, unlike `runSourceLocaleCorrection:114–134` and authz guard `:137–147`, which propagate unexpected programming bugs. Previous latest first-audit E3 reclassification established ordinary writer unexpected→controlled 503 skips React Router default unexpected `handleError` diagnostics (framework `https://reactrouter.com/how-to/error-reporting`); deployed logs and actual fault occurrence not checked. In this B6 scope source verified but no independent new observed exception injection. Never conflate with N1: **an unexpected writer fault inside runForumMutation normally returns 503/action data and keeps editor**, while unexpected permission precheck outside helper throws and unmounts. A6 old checkpoint's generalized phrasing “unexpected throw goes to boundary” therefore requires this qualification.
8. **Other outcomes and limits:** `public-read.test.tsx:2621–2708` real createMemoryRouter 400 action-data response test preserves same mounted form and exactly replays typed body after storage writes throw; `write-actions.test.ts:638–649` tests 429+Retry-After, but no own actual 409 / 503 populated-form integration. Offline/fetch network result path **NOT VERIFIED** despite current `docs/EDITOR.md:271` internet-failure requirement. Stuck pending upload E2 remains condition-only (no accepted max XHR pending duration; cancel operation exists), attachment failure/retry security/bytes belongs B7. I1 previously source-supported current Stage cross-tab stale account left unresolved and belongs B3/B10/B11. D3 rights docs discrepancy preserved, not B6-changed policy. No other **new independently source-confirmed** current Stage defect from editor's 18 primary files in this slice.

**Execution confidence:** Existing app/DB test sources read; exact-tree prior CI #39615502080 succeeded. No fresh tests, DB, actual browser, route-level browser 409→rebase, exception→buffer retention, IME/RTL/screenreader, internet ACK lost/replay, two-tab A→B, or Worker E2E performed. Current inspection/official docs do NOT license claiming actual browser reproductions or historical A6 gaps closed by new execution. Nonfunctional future autosave/recovery and Stage6 external live providers/Queues/R2/cloud excluded per current plan. Keep B11/B12 execution gap ledger open.

**STOP after B6.** Only upon explicit new owner command: **PASS B / этап 7 — Editor attachments upload/download, proof of authorized refs, media validation, publication/retention/rebase/cleanup and negative concurrency, no external real R2**.


### PASS B / этап 7 — Editor 2.0 attachments: 17 unproven files + negative/lifecycle/cleanup boundaries (2026-10-23)

**B7 bounded source/test coverage CLOSED. Whole audit OPEN, B8–B12 NOT STARTED.** Confirmed latest GitHub main `d72b27ca762dd930f0e7ad614e5b00832a07ec0c` via branch API and read current AGENTS.md from main through EOF (blob `20acb9210685bf3347f153c0d44d19420e8dc9bc`). Compared A7 checkpoint and source-of-truth `docs/EDITOR.md:175–243,261–291,355–394`, `PROJECT_STATE.md` current-stage vs historical Editor2 stages. Current local/CI Stage0–5, external real R2/bucket/provisioning/Workers deployment and background schedule remain paused Stage6. Read-only audit of project, no live bucket/postgres/worker, no app edits; only personal service journal updated, never PR comments, team channel, or other agents' files.

**Coverage reconciliation (do not claim executable pass):** Stage7 primary manifest **31 INCLUDED**. A7 previously evidenced full-path review for 14, plus structural fetches for all 31 and **17 exact-path insufficient-evidence files**. This B7 reacquired all **17/17** from exact main, read complete relevant source modules and inspected actual individual test titles/assertion sets. Therefore 31/31 primary file identities now have review evidence across A7+B7, **not** every line of all long test files exhaustively tested, and no fresh Vitest/PG/real Worker/Chromium or R2 execution claimed. Exact newly reviewed file blobs:

| File | Blob (prefix) | B7 substantive scope |
| --- | --- | --- |
| `app/forum/actions-attachment-publication.test.ts` | `51c9c4fa` | 3 tests: selected IDs forwarded to topic/Help/reply; duplicate/invalid JSON rejects; empty selected array |
| `app/forum/attachment-container-validation.ts` | `34c88671` | 7z start/next CRC, gzip flag/name/trailer, TAR checksum/length, OLE FAT/DIFAT/directory; bounded ranged reads |
| `app/forum/attachment-container-validation.test.ts` | `408b6826` | invalid CRC/header/truncation, 64KiB range bound, malformed OLE chain, read errors propagated |
| `app/forum/attachment-presentation.css` | `ef4a30bb` | responsive max-size/grid/overflow-safe filename presentation, CSS only; not actual browser |
| `app/forum/attachment-presentation.tsx` | `e3b88d9b` | verified raster inline; text view only <=1MB; everything else download-only; defer-image privacy |
| `app/forum/attachment-presentation.test.tsx` | `991421f6` | 3 tests explicit image preview, no automatic temp preview fetch, text inert preview/unknown download |
| `app/forum/attachment-r2.ts` | `d65210b0` | streams bounded exact bytes to random private key, octet-stream neutral metadata, finalize binary/container before accepting, delete partial/invalid storage, range-reader typed failures |
| `app/forum/attachment-r2.test.ts` | `89af1686` | 14 tests incl oversize/executable early rejection, mismatched actual/declared length, partial R2 rejection, ZIP Office semantic and finalization cleanup |
| `app/forum/attachment-request-context.ts` | `bc3f1560` | per-request RouterContextProvider store/bucket binding; typed missing bucket |
| `app/forum/attachment-structural-validation.ts` | `5e44d0a0` | stream PNG/JPEG/GIF/WEBP/PDF structural subset; bounded heads/tails, exact length; no media decoder/AV guarantee |
| `app/forum/attachment-structural-validation.test.ts` | `21c4699c` | 7 tests header-only/truncated/reordered/malformed and stream-length fail-closed |
| `app/forum/attachment-validation.ts` | `3e68579e` | server-side 50MB default (configurable input), 4096B UTF8 prefix, magic/executable/extensions/MIME/name/control rejection, text delivered inert |
| `app/forum/attachment-validation.test.ts` | `740e7376` | MIME/name ambiguity, executable magic in harmless extension, spoofed binary, malformed Unicode and limits |
| `app/forum/attachment-zip-validation.ts` | `136fcef8` | bounded random-access central/local consistency, EOCD and ZIP64, filename-required OOXML parts, ODF stored mimetype |
| `app/forum/attachment-zip-validation.test.ts` | `9eb3e819` | ZIP64, corrupted central/local mismatch, ODF semantics, <=65,557B range read, storage failure propagation |
| `app/forum/editor-attachments.test.tsx` | `16c163af` | 7 UI tests picker immediate XHR, stable id Retry, ambiguous error Remove, dropped/pasted image, busy gating, secret-filename prompt |
| `workers/attachment-storage.ts` | `39ebce54` | fixed length stream into native R2 `put`, parallel pump, abort upstream when upload fails |

**A7 previously named 14 baseline paths not silently counted new here:** `app/forum/attachment-operation.test.tsx`, `app/forum/editor-attachments.tsx`, `app/forum/editor-permission.server.ts`, `app/routes/attachment-download.test.ts`, `app/routes/attachment-download.ts`, `app/routes/attachment-upload.test.ts`, `app/routes/attachment-upload.ts`, `db/attachment-draft-generation.ts`, `db/forum-attachment-cleanup.ts`, `db/forum-attachments.ts`, `db/hyperdrive-forum-attachments.ts`, `tests/database/forum-attachment-publication.test.ts`, `tests/database/forum-attachments.test.ts`, `workers/attachment-storage.test.ts`. They and their relevant source/test slices were independently fetched/examined again in B7 to cross-verify end-to-end cases; this is not full test execution or exhaustive line-by-line 1007-line DB test evaluation.

**Negative/concurrency/authority matrix and actual evidence:**
1. **Admission & guest/Origin/owner:** `app/routes/attachment-upload.ts:91–115,127–153` reads current auth session, verifies Origin for POST/DELETE, decodes valid context+operation UUID, then `authorizeEditorWrite` verifies permission and post author (post-edit) BEFORE bucket/DB read or stream. `attachment-upload.test.ts:148–160` specifically tests real vs other vs absent author and no R2 put if denied. Browser/Worker actual HTTP not rerun.
2. **Bytes & fail-closed:** `app/forum/attachment-validation.ts` rejects empty/over limit, forbidden extensions/magic/mime, sample mismatches and malformed names; accepted text served inert MIME. `attachment-r2.ts:151–300` takes actual streamed prefix before R2, bounds full stream byte count, requires exact stored byteLength and stream structure for PNG/JPEG/GIF/WEBP/PDF; ZIP/7z/gzip/tar/OLE validated by ranged reads after private storage. Tests `attachment-r2.test.ts:77–275`, `attachment-container-validation.test.ts:181–269`, `attachment-zip-validation.test.ts:97–235`, `attachment-structural-validation.test.ts:70–131` inspect positive and corruption, truncated and read-failure variants. Structural signatures do **not** prove malicious file absence/complete parser validity; docs/EDITOR.md:222–232 expressly disclaims antivirus; Stage6 future scanner integration not active. No hypothetical MIME/polyglot risk escalated without a concrete accepted contract failure.
3. **Security event durability:** `attachment-upload.ts:191–220` derives stable SHA-256 event identity over owner/id/context/operation/filename/mime/size/detected/reason and persists suspicious rejections before reply. `db/forum-attachments.ts:226–253` durable unique upload ID and read security events for permission-filtered attention queue (B5). Existing `tests/database/forum-attachments.test.ts:239–291,406–440` covers concurrent dedup/lost response. Never store rejected suspicious bytes as published refs; no AV guarantee implied.
4. **R2 write and ambiguous DB ack:** `attachment-r2.ts:247–300` private/UUID key, neutral octet-stream, object deletion on explicit invalid structure or failed/inconsistent put; upstream reader canceled on failure. `workers/attachment-storage.ts:4–26` uses `FixedLengthStream` needed by R2 Worker API; `workers/attachment-storage.test.ts:8–47` verifies known length, no full prebuffer, upstream abort on R2 rejection. `attachment-upload.ts:223–251` creates owner/context/operation-specific DB ref; if duplicate stable ID committed, returns authoritative existing attachment and removes freshly uploaded duplicate private object. If COMMIT ACK ambiguous, retains object until ownership known rather than deleting potentially authoritative data. If no DB row ever committed and no retry, **possible untracked R2 object** is future operational cleanup risk (DB-only cleaner cannot know its object key); no evidence of observed leak, current Stage6 external R2/scheduler paused; document as **CONDITIONAL STAGE6 operation risk**, not new current-Stage defect or repair mandate.
5. **Owner authorization on reads/publication:** `app/routes/attachment-download.ts:25–87` validates post XOR operation, requires auth for operation, calls `readDraftAttachment(ownerId,context,operation,id)` or `readPublishedAttachment(postId,id)` *before* bucket get; missing refs return 404. `db/forum-attachments.ts:190–224` post association verified against existing published post, temp refs owner+generation scoped. CSP `sandbox`, `private,no-store`, nosniff; text view allowed by explicit `view=text` and size <=1MB, image inline only verified raster (no HTML/SVG auto render). `attachment-download.test.ts:43–105` asserts public/owner/404/503 and safe header cases; real browser behavior NOT_EXECUTED.
6. **Retained selection/rebase/retry idempotence:** `editor-attachments.tsx:132–335` selected stored new IDs distinct from retained published refs, explicit Remove tracks deleted published IDs; `rebasePublishedAttachments` recomputes fresh authoritative baseline while preserving user Remove and uploaded new private IDs. Error Retry reuses same stable ID, Remove only when not uploading, Cancel aborts in-flight and retires generation. `attachment-operation.test.tsx:105–216` tests opposite upload/cancel order, A→B observed owner prop, late ACK, repeated rebase. `app/forum/actions-attachment-publication.test.ts` validates selected IDs for topic/Help/reply; `db/forum-repository.ts:569–850,3674–3739` authority-fenced transaction, publication fingerprinted receipt and expected published revision CAS. `tests/database/forum-attachments.test.ts:442–805`, `forum-attachment-publication.test.ts:77–195,280–378` cover concurrent, idempotent replay/lost ACK, stale 409, no unselected refs published and attachment-only posts. UI stale-409 recovery E1 remains distinct; no user-visible reload recovery implied.
7. **Orphan cleanup and bounded pending:** `db/forum-attachment-cleanup.ts:44–140` uses 24h operation idle and 1h object grace, max20/run, 5min lease with committed deleting claim, lock/recheck refs, idempotent delete after ambiguous ACK. Existing `tests/database/forum-attachments.test.ts:825–1006` proves design for active/shared refs, claim after loss, concurrent processors, late uploads in DB tests already historical success. `db/attachment-draft-generation.ts` lock and retired-generation tombstone; draft read honors ownership/current generation, and no new success refresh from read. Historical misleading comment `db/forum-attachments.ts:209–211` cites former 30-day text draft TTL; actual current docs and cleaner implement 24h idle **cleanup** for file operations. **Stale comment**, not new current runtime defect. Scheduler/real remote R2 is Stage6, not current blocker.
8. **Bounded future/conditional:** E2 XHR upload `editor-attachments.tsx:195–239` lacks explicit timeout/ontimeout, but Cancel exists, errors have Retry/Remove after failure; no accepted maximum upload duration, browser stalled-XHR NOT_EXECUTED. Thus no current Stage defect proven on E2. Lack of full malicious-content scanning and future R2 service configuration similarly future gates. Previously established E1,N1,E3,I1 and documentation conflicts remain in own ledger and were NOT closed by B7.

**Confidence and STOP:** B7 source and selected real test assertions independently inspected, not tests rerun. Historical CI tree-equivalent #39615502080 green, historical `PROJECT_STATE.md` recorded some real local Worker/R2-emulator/PG/browser acceptance before main, but **Лира не выполнила нового выполнения в B7**. No current local pinned Node24/pnpm checkout/PG/R2 running, no external bucket or production authorization. Whole audit is still OPEN, remaining B8–B12 and final file/negative gap reconciliation. **STOP** after this subtask; next solely if owner continues: **PASS B / этап 8 — locale/runtime, translation, provider-neutral queues, registry/content paths, deferred Stage6 boundaries, preserving exact Stage classification**.


### PASS B / этап 8 — locale, UI/content translations, tasks/provider-neutral execution, Stage6 boundary (2026-10-23)

**B8 CLOSED for declared source/selected-test inspection scope; whole audit OPEN; B9–B12 NOT STARTED.** Frozen GitHub source of truth `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c` confirmed at entry and before write. Latest full `AGENTS.md` fetched and read (blob `20acb9210685bf3347f153c0d44d19420e8dc9bc`). Project docs fetched from exact main with evidence and section/contract review: `PROJECT.md` 110 lines, `PROJECT_STATE.md` 2021 lines, `ROADMAP.md` 445 lines, `TRANSLATION_ARCHITECTURE.md` 250 lines, `docs/translation/LOCALES.md` 571, `UI_TRANSLATION.md` 453, `CONTENT_TRANSLATION.md` 166, `PROVIDERS_AND_JOBS.md` 282, `STORAGE_AND_VERSIONING.md` 306, `RESEARCH.md` 565. Previously full-read documents retained B1/A1 historical full-read evidence, today indexed all relevant contracts and key current/pending rollout requirements. External facts from RESEARCH dated Sept 2026 NOT independently revalidated: external provider/binding acceptance deferred to Stage6.

**Major A8 reconciliation: 128/128 distinct Stage8 INCLUDED manifest paths successfully obtained from frozen `main` (via individually addressed GitHub exact-path fetch across batches of <=18).** No retrieval errors: all source blobs accessible. Previously A8 listed **24/128** exact-path historical mentions and 49 basename mentions; these are heuristics, not proof of detailed prior tests. B8 now independently indexed `sha`, physical line count, exported components / named tests for **all 128**; semantically examined relevant source functions, tests and critical transactional slices for cases below. Several huge files (`db/translation-task-store.ts` 1757 lines, `tests/database/content-post-body-task-planning.test.ts` 1638, `app/localization/manual-values.ts` 1139, `app/localization/catalog.ts` 670, `app/localization/content-markdown-translation.ts` 584, `app/localization/content-provider-allowance.ts` 549 and others) were NOT exhaustively read line-by-line/tested individually this turn. Their primary code entry points and test suite inventory are included, runtime/edge-case gaps carried to B9/B12. Do NOT turn FETCHED or indexed cases into exhaustive semantic PASS or freshly green tests.

**B8 source-vs-test matrix (all tests SOURCE READ, NOT rerun):**
1. **Canonical routing and request-local registry:** `app/localization/locale.ts` `be96abce`, `registry.ts` `25db3937`, `persistent-registry.ts` `cbd69cd1`, `resolver.ts` `1fd749e3`, `request-context.ts` `9fb451bd`, `app/routes/locale-boundary.tsx` `c156f430`, `locale-negotiation.ts` `c22c8c48`, `db/locale-repository.ts` `7db3c6c4`; tests `registry.test.ts`, `persistent-registry.test.ts`, `resolver.test.ts`, `locale-boundary.test.ts`, `locale-negotiation.test.ts`, `db/locale-repository.test.ts`. Bootstrap English code-owned; effective registry validated including aliases and top-level reserved segments; `ka` inactive, `ru/he` active in built-in fixture; no implicit language reduction to unregistered locale; GET/HEAD may 307/308 canonicalize, noncanonical/inactive/unknown mutation fails closed (404) before action; root authenticated preference>cookie>Accept-Language>en with request-specific no-store; degraded snapshot fails closed for non-English, no fake working locale. Controlled locale writes with transactional lock and commit-time timeout reconciliation are covered by existing tests, not performed against real DB.
2. **UI catalog + resource priority + isolation:** `catalog.ts` `502be03c`, `manual-values.ts` `0ce5389f`, `manual-fingerprints.ts` `d3d98732`, `manual-packs.ts` `2dd63313`, `sources.ts` `b38c0cc0`, `persistent-sources.ts` `8811c0d8`, `resource-loader.ts` `0e84e076`, `bundles.ts` `aee1fc69`, `runtime.ts` `139c13d0`, `db/ui-translation-bundle-store.ts` `1d97a51a`, `db/hyperdrive-ui-translations.ts` `4daa28f2`. Exact requested locale/fallback/en namespace bundles stay separate; within current non-English exact locale local manual > persisted manual > current machine; old fingerprints/policies excluded; English is always canonical code-owned, compiled plural v4 validated; lazy request DB connection with classified outage circuit and local/English fallback, unexpected programmer errors propagate. Tests `resources.test.ts`, `resource-loader-bundles.test.ts`, `bundles.test.ts`, `persistent-sources.test.ts`, `hyperdrive-ui-translations.test.ts`, `tests/database/ui-translation-bundle-store.test.ts`, `ui-translation-publication-store.test.ts` index source assertions. Bundle reconciliation CLI `scripts/reconcile-ui-translation-bundles.ts` validates localhost and *_test DB only; not invoked (no external DB).
3. **Public content original fallback and revision binding:** `content-translation.ts` `757049ac`, `content-translation-presentation.ts` `4590ef6f`, `content-translation-view.tsx` `26b94ea3`, `db/content-translation-store.ts` `ce550317` and `hyperdrive-content-translations.ts` `17331a2e`. Title/post unit identity includes content id, exact revision id and target locale; user-content source locale is revision metadata independent of UI locale; only current valid target and valid quote attribution selected, otherwise original fallback and per-content `lang/dir`; attachment-only post bypasses empty-body translation unit. Tests `content-translation.test.ts`, `content-translation-presentation.test.ts`, `db/content-translation-store.test.ts`, native `tests/database/content-translation-store.test.ts` assert identity, stale/malformed handling, manual precedence and ownership. Unknown `und` source is not substituted with UI locale. `content-source-locale.ts` `dd08cb68`, `tinyld-source-locale-detector.ts` `a4062af6`: detection only via policy thresholds 24 semantic letters, score .80, margin .20; Georgian unresolved when unsupported (do not invent detection).
4. **Markdown segmentation safety:** `content-markdown-translation.ts` `1c4da2d8`, `content-markdown-translation.test.tsx` `e718a772`: preserve code, URLs, quote source labels/permalinks, protected technical tokens and their canonical markers; invalid provider segment count/marker structure fails publication; full source markdown remains original-safe. Test case inventory covers malicious/corrupt returned marker, protected nesting, size/semantic thresholds; no actual external provider result tested this turn.
5. **Planning, task/failure identity and dispatcher:** `ui-translation-service.ts` `0902ad69`, `translation-tasks.ts` `03648207`, `content-translation-planning.ts` `6d716399`, `content-post-body-planning.ts` `7943d16d`, `translation-task-dispatch.ts` `741804bc`, `translation-task-reconciliation.ts` `47da1ffd`. Durable task committed BEFORE provider-neutral enqueue of only task ID; failed/unknown enqueue leaves pending task and bounded reconciliation retry (max100/batch, 60s reserve throttling) with idempotent claimant; current generation checks and controlled terminal `stale/failed/completed`. Concrete DB source `db/translation-task-store.ts:434–520,544–600,877–1161` enforces row-serialized heads and CAS `processing+claimToken`, attempt budget 3, expired lease handling, retryable vs terminal distinction. `db/content-topic-title-task-store.ts:85–189` and `content-post-body-task-store.ts:85–193` lock generation head then task/current entity/revision/translation and budget within one transaction; no external API inside transaction. Tests `translation-tasks.test.ts`, `translation-task-reconciliation.test.ts`, `translation-task-consumer.test.ts`, `translation-task-dispatch.test.ts`, native `tests/database/translation-task-store.test.ts`, `translation-task-generation-isolation.test.ts`, `translation-task-reconciliation.test.ts`, `content-topic-title-task-planning.test.ts`, `content-post-body-task-planning.test.ts` are present and indexed; representative lock/rollback/duplicate/old generation assertions inspected. Important: **not** exactly-once external provider calls (correct documented contract), and real Queue runner not deployed.
6. **Budget and provider selection/policy:** `content-request-budget.server.ts` `3dadbc22`, `db/content-request-budget-store.ts` `f6e3dd66`, `content-provider-allowance.ts` `0fa9cd1f`, `content-generation-action.server.ts` `9fbf2b0c`, `translation-provider.ts` `76d2e010`, `translation-provider-data-policy.ts` `ea9c6952`, `cloudflare-m2m100-provider.ts` `40341191`. Signed/pseudonymized requester HMAC identity without raw ID in budget rows, versioned global and requester windows (PG-owned clock), transaction rollback on exhaustion; allowance per task generation+attempt/provider with rechecked current revision+permission/policy before an external call; default provider content data policy deny-all. Explicit allow supports controlled public topic-title provider locale pairs only, M2M100 not universal. Automatic post-body semantic threshold 3000 chars, explicit action separate; cost/duration guard and failure classification in existing tests `content-request-budget.server.test.ts`, `tests/database/content-request-budget-store.test.ts`, `content-provider-allowance.test.ts`, `content-generation-action.server.test.ts`, `cloudflare-m2m100-provider.test.ts`, `translation-provider-data-policy.test.ts`. No actual paid provider/API call or quota exhaustion tested in current runtime. Unproven authorization bypass not inferred.
7. **Executor / atomic publication & manual precedence:** `content-translation-task-consumer.ts` `f9bd062f`, `content-post-body-task-consumer.ts` `d359f5f5`, `content-translation-execution.ts` `2d636659`, `content-post-body-execution.ts` `979c7ee1`, `translation-execution.ts` `51c868eb`, publisher layers, `db/content-topic-title-execution-store.ts` `eeec8ece`, `content-post-body-execution-store.ts` `7361f4c7`, `ui-translation-publication-store.ts` `483113c2`. Consumer preflight/allowance → provider → output/provenance validation → transaction with current generation, revision, task claim token and current manual priority → write translation & mark task complete atomically; rollback on partial result or task-complete failure. `db/ui-translation-publication-store.ts:40–155` specifically locks all namespace generation heads before rebuilding exact-locale compiled bundle within same transaction, avoids cross-key stale bundle lost update. Native tests `tests/database/content-topic-title-execution.test.ts`, `content-post-body-task-planning.test.ts`, `ui-translation-publication-store.test.ts` have concurrency/revocation/manual takeover and rollback cases; only test source reviewed, no own PG execution.
8. **Current wired runtime vs future Stage6:** `workers/app.ts:31–50` injects lazy registry, UI resource and original-safe content translation readers but explicitly `context.set(contentGenerationActionContext, DISABLED_CONTENT_GENERATION_ACTION_RUNTIME)`. `app/routes/topic.tsx:97–120,159–170` exposes generate capability & reads status only when both session permission AND action runtime.enabled; with current worker false there is no live generate UI automatic dispatch/status read. `app/forum/actions.server.ts:207–273` checks current session/permission then returns controlled generation `503 unavailable` when action runtime disabled, before provider or planning. `wrangler.jsonc` exact main has only HYPERDRIVE and WEB_HYPERDRIVE binding, no Queues or AI live bindings. `cloudflare-m2m100-provider.ts:50–52` self-describes local/CI adapter only. Hence provider-neutral engine and local/CI test classes do NOT establish external Cloudflare Queues, Workers AI, Google, production secrets, retry schedule/DLQ or externally deployed runtime. Real Stage6 integration/acceptance strictly future/paused under `ROADMAP.md:300–346`; do not require it of current Stage or “fix” absent binding in B8.
9. **B8 additional UI orchestration/source-status:** `content-generation-controls.tsx` `5b990a6d` automatic key/revision state and bounded 2s poll up to15, `content-generation-navigation.test.tsx` `df46ccf2` test cross-topic/locale reuse/late response, `content-generation-view.ts` `9289ae5f` exact cardinality/identity & threshold, `db/hyperdrive-content-generation-status.ts` `a33350e4` limited safe public status batch with classified timeout; all not active in real Worker due disabled capability, no false runtime claim. Current UI resource SSR per-request `app/routes/locale-boundary.tsx:64–150` and `app/localization/runtime.ts` test-source parities; actual hydration/browser RTL full run NOT_EXECUTED.

**Classification / caveats:** No **NEW source-confirmed current-Stage defect** in B8 bounded critical paths. Preexisting L1 framework diagnostic privacy conditional and I1/E1/N1/E3, D1/D3 and A5-AP1 remain separately open; B8 does not dismiss them. Backend task claim/reconciliation/locks have native test evidence but exact real scheduling/provider downtime/replay, request-long network, query plans and Cloudflare service behavior untested; absent future Stage6 wires are explicitly NOT current product defects. Large generated/manual translation content checked by identity/contract/test inventory, not full proofreading/localization parity; owner UI/UX pass distinct. Green historical CI `#39615502080` exact-tree success (979 app, 279 DB) previously verified A12, NOT rerun here. No live DB, Worker, browser, R2, Queue, Workers AI or paid operations performed.

**STOP** on this one subtask. Remaining sequential owner-gated `PASS B9` = SQL migrations/schema/index/constraints/transaction negative/overlap DB evidence; `B10` failure paths/security, `B11` UI/SSR/browser/test-quality gaps, `B12` final manifest+finding/NOT_EXECUTED reconciliation. B9 only upon explicit new `...` / `Продолжай`; overall audit **NOT FINISHED**.


### PASS B / этап 9 — PostgreSQL schema/migrations/constraints/indexes/privilege and concurrency negative paths (2026-10-23)

**Status: B9 CLOSED at explicitly static-source/test analysis depth only. Whole unified audit OPEN. B10–B12 NOT STARTED.** Frozen GitHub `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c` independently confirmed at entry and before write. Latest AGENTS.md blob `20acb9210685bf3347f153c0d44d19420e8dc9bc` fetched/read fully, source-of-truth `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/database/MIGRATIONS.md` (314 lines) re-fetched and read/reconciled by contract section. No developer production action, live DB/prod credential, edits to schema/main, or PR comments.

**Exact manifest and coverage integrity:** 108/108 Stage9 INCLUDED paths available on unchanged main, as A9 initially proved and B9 independently re-fetched: 45/45 migration SQL 0000–0044 (read with names, DDL assertions/constraints/index/trigger/FK shape each); 45/45 sequential `drizzle/meta/0000–0044_snapshot.json` parsed and pairwise compared for **all 44 transitions** (three overlapping batches), `_journal.json` 45 entries, `db/schema.ts` 1574 lines, `drizzle.config.ts`, `db/postgres-deadlines.ts` and 100-line test, 11 .github scripts/manifest/tests, `tests/database/migrations.test.ts` 3109 lines, `tests/production-migration-verifier.test.ts` 31 lines. All source/test files were re-fetched and line counts, test names and relevant invariant assertions inspected, **not** a claim of every line of 3109-line test semantically reviewed or native tests executed. Long manifest 5496 physical lines (47 tables) parsed as JSON and cross-checked by field/constraint names.

**New B9 semantic/static verification beyond A9 name-only 47 table match:**
1. **All SQL 45 migration statements examined by DDL/constraint inventory, not merely tag/byte existence.** 0000 code-owned English excluded from physical locales; 0002 persistent English guard; 0004 deferred matching current-revision foreign keys and immutable revisions trigger; 0005 best-answer same-topic FK; 0006 single mutation lock and role safeguards; 0007–0013 translation task lifecycle/claim/attempt/reconciliation; 0014–0016 revision+locale composite owner FKs and mandatory content-task metadata trigger; 0017 budget counters, 0019 provider allowance; 0021 tags, 0022 reply parent same-topic/self check, 0023 read-state same-topic post FK, 0024 unique notification recipient/post, 0026 intentionally drops bestAnswer requires solved check, 0030–0031 partial unique active duplicate/appeal/signals, 0032 profiles, 0033 presence; 0034 existing editor-draft table is now unused by current editor but historical accepted migration **not to delete in audit**; 0035–0039 attachment ownership/cleanup and idempotent publication receipt, 0040–0043 edit/mentions/rights, 0044 attachment draft boundaries+context backfill. SQL sources verified actual DDL location/syntax and tests for principal invariants; no new missing constraint asserted.
2. **Snapshot lineage and historical diff:** `drizzle/meta/_journal.json` version7 postgresql strict 0000–0044/45 rows. All 45 snapshot JSON source read and 44/44 `prevId` links matched. Compare columns/indexes/FKs/PK/unique/check by serialized semantics between each adjacent snapshot: early 0000–0014 formerly sampled in A9 now examined all adjacent named changes, as did 0015–0044. No snapshot unexpectedly removes tables; 0000=1 table, 0014=24, 0033=37, 0044=47. Expected physical deltas: 0026 drops solved coupling, 0039 drops post-body nonempty DB check to permit ref-only posts with app-level guard, 0041 adds kind, 0044 adds 2 tables. Five `0031→0032` snapshot index diffs proved **serialization property key-order only** (`where` key repositioned, same predicate and columns), not new SQL DDL or functional index mutation.
3. **Final schema normalized structural parity:** Independently compared complete `0044_snapshot.json` `3b3dbf4b6cffcd6f1ad84cfabe4891d1ceb689f7` against `.github/production-schema-manifest.json` `330a35c2d23fc36780eaead0d33c4465de279c92`: **47/47** table names, **329/329** column existence/type/notNull, **61/61** Drizzle-declared foreign key names, **35/35** index names, **115/115** check names, **16/16** unique names all present with **zero normalized discrepancies**. Raw compare initially yielded 23 false mismatches: PostgreSQL maximum 63-byte identifier truncation of 10 long FK/CHECK names, 13 `timestamp` aliases (`timestamp` = `timestamp without time zone`); exact normalized compare resolved all. Manifest additionally has **3 intentional manual SQL-only composite/deferred current FK constraints**: `forum_posts_current_revision_fk`, `forum_topics_current_title_revision_fk`, `forum_topics_best_answer_topic_post_fk` present at SQL 0004/0005; not declared as Drizzle snapshot native FKs. This proves checked-in *metadata/name/type parity*, not DB catalog equality under live PostgreSQL, missing persisted data hazards, default/hash equivalence or real index validity. Manifest `targetMigration=0044_attachment_draft_conflict_boundaries`, 47 tables, 6 trigger function records, 8 trigger records; tests/clean DB parity historical CI only.
4. **SQL-only security and reference concurrency:** Re-read full `0038_forum_attachment_cleanup_claims.sql` 50 lines. `SECURITY DEFINER SET search_path=pg_catalog` with `format('%I.forum_attachments',TG_TABLE_SCHEMA)` safe schema-quoted dynamic query and row `FOR SHARE` prevents insertion of new ref after cleanup moved to 'deleting', without web-role UPDATE on object metadata. `forum_attachment_draft_refs_active_gate` and `forum_post_attachments_active_gate`; A7/B7 DB tests for active ref/claimed removal previously source-inspected and historical green; native race NOT re-executed B9. `0039` receipt PK owner/context/draft; app publication transaction enforces ref for empty post. `0044` draft context FK (attachment ID, owner), primary key owner/context/draft/version, insert backfills legacy refs with `ON CONFLICT DO NOTHING`; snapshot/manifest agreement. `0030`/ `0031` HELP partial unique indexes and valid state/ownership; direct read confirmed.
5. **CI guards & production separation:** Re-read `.github/scripts/migration-history.mjs` (94 lines), `production-migration-contract.mjs` (74), `production-schema-manifest.mjs` (314), `runtime-privileges.mjs` (500), corresponding tests 88/138/574 lines, verifier scripts 38/34/245 lines. Append-only guard forbids accepted SQL/snapshot rename/modify/delete and journal rewrite; prefix exact (created_at + SHA-256) pre-migration and full ledger post. Runtime named capability contract extracted **40 exact relation names**; **40/40 exist** in 47 table manifest, no unknown table, and no general grant over translation-task/budget write operations. Positive/negative disposable PG SQLSTATE 42501 role probes require *_test, not executed. `db/postgres-deadlines.ts` and tests enforce request caller timeout and narrow wrapped timeout classification. No real role/ACL catalog probe/prod introspection now.
6. **Native regression evidence vs execution:** Re-fetched `tests/database/migrations.test.ts` (3109 lines). Existing test scopes include PostgreSQL17/UTF8 + idempotent migration ledger 45, owner-matching post/title pointer deferred violations and revision immutability, authoritative role/permission deny and concurrent last-manager lock, same-topic read and monotonic concurrent progress, deduplicated recipient notifications/rollback, author write cooldown and atomic revision append, serialized graph-wide locale updates + ambiguous COMMIT recovery, and Help pending/stale signals. Read tests *do not mean executed*: `pg`, actual transaction isolation timing, query plan/EXPLAIN ANALYZE, production schema deployment/rollout, Hyperdrive caching and real privilege probes are `NOT_EXECUTED`. No change to implementation source.
7. **Classify historical D1 and boundaries:** `PROJECT_STATE.md:1568` says repository migration up to 0043 while exact `_journal.json` and matching manifest show 0044; already documented D1 doc-only mismatch (also `PROJECT_STATE.md:367` and `docs/EDITOR.md:389` acknowledge 0044). Preserve in finding ledger, no new defect, do not “fix” docs during audit. Live Stage6 migration-evidence gate legitimately only covers applied external `0000–0020`, whereas local/current main includes 0044; this divergence is planned rollout split per `docs/database/MIGRATIONS.md` and `ROADMAP.md`, not latent migration defect. Neither previous successful exact-tree CI #39615502080 nor static manifest can prove external 0044 production state.

**B9 conclusion:** NEW confirmed CURRENT-STAGE DB defect **NONE** at bounded static-source/test scope. Prior E1/N1/E3/I1/A5-AP1 and D1 retained; actual native PostgreSQL17 and end-to-end negative/timeout/concurrency executable evidence STILL NOT_EXECUTED in this audit, not falsely claimed closed. Overall 491-file audit OPEN; B10–B12 not begun.

**STOP** by owner staged workflow. On next user `...` / `Продолжай`: **PASS B / этап 10** cross-cut security, unexpected failures/degradation, diagnostic exposure, session/client state/isolation, error classification and previous findings recheck. Do not jump to B11 or findings publication.


### GAP-CLOSURE / подзадача 1 — ранее недопроверенные сценарии PASS B1–B3 (2026-10-23)

**Owner command `...` after request to close B1–B9 gaps interpreted as doing gap-closure, NOT B10.** Logical plan: first B1–B3, then B4–B7, then B8–B9, then final reconciled confidence/gaps before B10. This session STOPS after the first subtask. Current GitHub main `d72b27ca762dd930f0e7ad614e5b00832a07ec0c` again fetched at start and before write; full `AGENTS.md` blob `20acb9210685bf3347f153c0d44d19420e8dc9bc` reread, PR #236 open and only personal journal touched. Read prior B1/B2/B3 and A1/A2/A3 evidence; no claim new source code/test environment changed. **Goal: improve evidence, not inflate re-reviews into exhaustive PASS.**

**B1 document link gap independently checked with executable JS against actual GitHub tree (truncated=false, 491 tracked files):**
- All **18/18** Stage1 INCLUDED Markdown file paths fetched from exact main again (AGENTS, PROJECT/STATE/HISTORY, README, ROADMAP, SCAFFOLD, TRANSLATION_ARCHITECTURE, EDITOR, UI_UX_PASS, AUTHORIZATION, MIGRATIONS, six translation docs). Prior A1/B1 explicitly read their entire documents; this turn specifically exercised previously-not-checked local Markdown link closure, not full re-proof of all current external research facts.
- Parsed normal inline Markdown link syntax `[label](url)` from those real document source strings, resolved relative parent path and matched GitHub recursive **file or directory** tree nodes: **83 internal links**, **83/83 target exists**. First file-only check flagged `README.md → ./docs/translation/` and `./docs/database/` as missing files; deeper check showed both **existing directories**, not broken links. No new B1 broken internal target.
- **64 external links** were counted but NOT rechecked against live websites. No in-document hash anchor among the 83 normal parsed internal links. Inline regex cannot guarantee validation of reference-style Markdown links, nonstandard constructs, or semantic link correctness. Historical D1, D2, D3 docs contradictions preserved, not individually re-decided here.

**B2 route and runtime composition gap checked by executable pure static assertions against real source:**
- Independently re-fetched `app/routes.ts`, `workers/app.ts`, `workers/database-bindings.ts`, `app/auth/auth.server.ts`, `app/forum/online-presence-heartbeat.tsx`, `app/routes/authorization-admin.tsx`, and true GitHub tree at same exact main. Extracted **27** real `route()/index()` module paths: **27/27** blob exists, **0 duplicate route patterns**, `api/auth/*` declared before `api/*`. No client-provided userId authorization source in inspected admin action.
- 13 independent true/false assertions derived from code source passed, including per-HTTP-request RouterContextProvider allocation, `initializeAuthContext` before `requestHandler`, auth Set-Cookie copied onto final Router response, web/localization distinct connection strings and required binding resolver, DB-backed Better Auth limiter config, absence of `disableCSRFCheck:true`/`disableOriginCheck:true`, 401 presence revalidation and **204 only homepage revalidation**, server-side Origin guard and session owner on authorization route. **These are executed static checks of text-level call ordering/presence**, not proof that framework runtime, typing, build, actual auth APIs, connection retries or cookie setting succeed.
- `db/web-runtime-wiring.test.ts` historical is only string assertions, same limited confidence. Current container checked NOW: **Node v22.16.0 and /usr/bin/chromium available**, but **no checkout, no pnpm, no PostgreSQL psql**; curl GitHub unavailable via DNS. Prior diary phrase “no browser” overly broad: browser binary exists, but an actual running app/real two-tab login is NOT available. Node pinned 24.21.0 by repository; so cannot claim full app/browser/PG execution from container.

**B3 targeted negative/auth/session and the actual open runtime gap:**
- Re-fetched complete `app/auth/auth.server.ts` (111 lines), `auth.server.test.ts` (36), `auth-client.ts`, `auth-api.ts`/test, `session-context.ts`/test, `auth-controls.tsx`, `online-presence-heartbeat.tsx`/test, `workers/app.ts`, `app/routes/presence.ts`, `app/routes/authorization-admin.tsx`, `app/routes/topic.tsx`, `db/hyperdrive-authorization.ts`, `db/authorization-repository.ts`, native `tests/database/auth-runtime.test.ts` (170) and `forum-email-registration.test.ts` (130), relevant `docs/auth/AUTHORIZATION.md:130–208` and `docs/EDITOR.md:284–286`.
- Better Auth `betterAuthRateLimitOptions={enabled:true,storage:'database',modelName:'rateLimit'}`; rateLimit schema provided, request-scoped Better Auth PostgreSQL handler called by API GET/action. Test `auth.server.test.ts` checks CONFIG equality only. Real native auth tests verify sliding Set-Cookie, expired guest and hashed email/password/wrong password, but **DO NOT exercise 429 after exhausting limits in those concrete tests**. This important B3 coverage gap remains **NOT_EXECUTED**; no confirmed rate-limit vulnerability, cannot call 429 protected solely from options.
- Session request-boundary code `workers/app.ts:27–52` initializes server session before routes, server actor comes from request session in admin, and protected admin action checks `Origin`, with mutation repository rechecking effective permission inside serialized transaction. `session-context.test.ts` tests propagation of multiple Set-Cookie headers without copying cache headers. This is source+existing-tests evidence, not new pg/client execution.
- Preexisting **I1 remains direct source-supported**: cross-tab cookie A→B on topic, heartbeat's B session responds 204; `online-presence-heartbeat.tsx` only revalidates on **401** or successful heartbeat when `location.pathname===forumIndexPath(locale)`. `HeaderAuthProvider` cached identity updates only when loader emits new initial user, so opened A topic editor can remain A-labeled despite B session on future server requests. No guaranteed unsolicited refresh of old topic. Existing `online-presence-heartbeat.test.tsx:30–68` tests guest, 204 on home and 401+revalidation, **not** real two-tab identity switch. No assertion of authorization bypass: writer still uses actual B session and DB ownership. Real two-account/two-tab browser case **NOT_EXECUTED**; cannot call I1 browser-reproduced.
- Preexisting **D3** mismatch still source-confirmed: `docs/EDITOR.md:285–286` forbids ordinary user published history even for own message; `docs/auth/AUTHORIZATION.md:51` allows dynamic effective `forum.post.history.read` after grant/override, which implementation follows. No unilateral contract choice/change during audit.
- Other current source/implementation problems E1/N1/E3 and future Stage6 external Google, deployed auth runtime remain separate and unresolved. No **new independently proven current-Stage fault** in this bounded static pass.

**Exact confidence for GAP-CLOSURE B1–B3:** newly executed **document link parser (83/83)** and **route/wiring static assertions (27/27,13/13)**, source/selected-test direct reads; **NOT** new Vitest, local React Router Workers build, same-origin HTTP requests, PostgreSQL17, browser authenticated A→B, Better Auth limiter exhaustion or 429 assertion. The owner requested gaps actually closed, so do NOT mark those dynamic checks PASS or claim B1–B3 fully accepted; **their static inventory gaps improved, runtime gaps explicitly remain OPEN**. Whole audit B10–B12 not started.

**STOP** after this logical group. Next only with new owner `...` / `Продолжай`: GAP-CLOSURE **B4–B7** (public forum/Help/Editor/attachment problematic scenarios, classify source/test vs actual runtime), then separate B8–B9 group.


### GAP-CLOSURE / подзадача 2 — ранее недостаточная глубина B4–B7 (2026-10-23)

**Status: bounded additional B4–B7 source/negative/test-assertion reconciliation DONE; runtime gaps remain OPEN. Whole audit still OPEN, GAP B8–B9 NOT STARTED, PASS B10–B12 NOT STARTED.** Reverified GitHub `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c` at start and before journal write, fully reread current main `AGENTS.md` (blob `20acb9210685bf3347f153c0d44d19420e8dc9bc`). Read existing A4–A7, B4–B7, first B1–B3 gap log and accepted `docs/EDITOR.md:263–287`, `docs/UI_UX_PASS.md:339–378`, `PROJECT_STATE.md:289–307,1237–1269` source-of-truth slices. No code/config/DB/production/external action, no CI run or team finding publication.

**Additional inspection across B4/5/6/7:** Independently re-fetched active frozen-main routes `app/routes/topic.tsx` (212 lines), `section.tsx` (52), `unread.tsx` (40), `notifications.tsx` (73), `attention.tsx` (204), `app/routes/attachment-upload.ts`, `attachment-download.ts`, `app/forum/actions.server.ts` (557), `mutations.server.ts` (181), `views.tsx` (3080, relevant slices only), `markdown-editor.tsx`, `editor-attachments.tsx` (355), `app/forum/ui.tsx`, `db/forum-repository.ts` (selected domain slices), `db/forum-service.ts` (selected slices), `db/forum-attachment-cleanup.ts` full 141 lines and local relevant source. Comparatively inspected case identities, role checks, server actor, stale revisions, error-classification branch ordering, attachment context and cleanup reference/claim fencing. This is not full 3080-line `views.tsx` or complete 3900-line repository exhaustive static line coverage. Original B4 49 files, B5 2, B6 18, B7 31 remain as earlier itemized; this gap pass is **scenario-targeted, not new whole primary-file re-run**.

**Test implementation vs assertions precision:** Reacquired/indexed **15** specific exact-main test suites (`unread.test.ts` 53 lines, `notifications.test.ts` 172, `profile.test.ts` 86, `presence.test.ts` 58, `public-read.test.tsx` 3315, `write-actions.test.ts` 1484, `markdown-editor.test.tsx` 1630, `editor-attachments.test.tsx` 392, `attachment-operation.test.tsx` 216, `attachment-upload.test.ts` 444, `attachment-download.test.ts` 106, `stage4-core-e2e.test.ts` 474, `forum-help-attention.test.ts` 286, `forum-attachments.test.ts` 1007, `forum-attachment-publication.test.ts` 379). Inspected actual named test inventory/representative assertions and match to source per scenario (some long tests only selected excerpts); keyword presence was NOT equated with test covering every negative branch and NO tests executed.

**B4 specific gap:** Session-owned unread route `app/routes/unread.tsx:13–30`; `notifications.tsx:15–67` 401 before reader, actor-bounded notification mutations. `app/routes/section.tsx:20–43` typed failure in optional read-state and optional authorization degrades rather than inventing authoritative denial, unexpected defect propagates. `app/forum/online-presence-heartbeat.tsx:16–45` 401 revalidates; success 204 on topic does not proactively reload session, continuing independently documented cross-tab I1. Tests `unread.test.ts`, `notifications.test.ts`, `presence.test.ts`, `stage4-core-e2e.test.ts` inspect fixtures but do not cover two real signed-in tabs/401→204 identity transition. New cross-user data exposure NOT confirmed. No ungrounded search perf fault.

**B5 domain and moderation-case comparison:** `app/routes/attention.tsx:142–194` case-level moderator action checks current signal topic/kind permission; appeal case invokes `expectedAppealId` both pre-writer and DB-locked. `app/forum/public-read.test.tsx:1264–1289` expressly verifies rejected stale case ID with no writer; `tests/database/forum-help-attention.test.ts:132–205` checks visibility by effective signal kind and dedicated pending case records. Independently compared topic-page action, view form, writer and SQL lifecycle `app/forum/views.tsx:2460–2481,2578–2597`, `app/forum/actions.server.ts:359–373`, `db/forum-repository.ts:3397–3485`, native `app/forum/write-actions.test.ts:927–947`; reasoned a **candidate current-scope case identity negative scenario**. Its details/causal reproduction and confidence are intentionally **owner-chat-only and NOT published here as a finding** under AGENTS.md independent-review rule until whole audit and publication permission. The topic route test has only writer-call shape, not a stale-topic competing appeal test; do NOT claim runtime repro. Previously privately reported A5-AP1 remains separate with no assumption of identity/equivalence or automatic closure. Help solution needs `isSolved && bestAnswer` for new solution signals `db/forum-repository.ts:2850–2853,3065–3070`; matches current source-defined requirement for solution of solved topic despite best-answer/solved independence elsewhere; NOT elevated as new defect. Canonical duplicate/root guards and sorted row locks `3286–3344`, appeal owner/pending unique + case locking `3397–3485` confirmed from source. No Help finding published to service PR comments/team communication.

**B6 exact branch/alternate path comparison:** `app/forum/mutations.server.ts:89–110` typed 400/403/404/409/429, catch-all unexpected writer→503 (old E3), while `requireForumPermission:137–147` propagates unknown auth errors (old N1 potential route ErrorBoundary unmount). `app/forum/actions.server.ts:480–498` POST edit expectedRevisionId and session-derived actor; `app/forum/views.tsx:2228–2247,2814–2853` rebase button gated by newly loaded revision. `app/forum/public-read.test.tsx:2314–2382` **manually calls `router.revalidate()`** to simulate update, not rejected 409 auto-loader reload (E1 gap); `:2621–2705` confirms *only controlled 400 action-data preserves populated editor*, not a thrown authz permission fault or browser transport failure (N1 gap). Verified `app/forum/markdown-editor.tsx:251–339` native form replays submit in later task, does not persist text by deliberate current Editor contract, double-submit guarded while pending. Existing `write-actions.test.ts:1142–1177` confirms unexpected permission errors **throw** in unit isolation; `route-error.test.tsx:60–83` safe error copy but not filled editor retention. No separate new runtime-proven defect. Historic E1/N1/E3 remain open at their separately qualified confidence.

**B7 authority/idempotence and race/cost gap:** `app/routes/attachment-download.ts:25–85` checks published association vs session-scoped private operation before R2 get, sets inert MIME and sandbox/no-store; `attachment-upload.ts:170–251` stores verified private object then DB reference and stable-ID retry, removes confirmed extraneous object, retains private object if DB commit ACK ambiguous. `app/forum/editor-attachments.tsx:132–355` stable operation+file IDs, explicit Cancel calls DELETE and resets, in-flight XHR aborted on identity change, error Retry uses same ID; no explicit XHR timeout/ontimeout (historic E2 conditional only). `db/forum-attachment-cleanup.ts:44–139` transactionally prunes stale refs, row lock + active-reference recheck, durable deleting claim and 5-minute lease; `tests/database/forum-attachments.test.ts:584–611,616–681,829–922` native test source covers missing ref rollback, retired generation, concurrent publication, no stale resurrection, lost delete ACK. `attachment-operation.test.tsx:105–149` actual mock XHR tests same ID, late ACK and cancel. **Untracked R2 object after ambiguous DB failure remains conditional external Stage6 cleanup consideration**, not newly demonstrated current Stage leak. No real R2, live session, Worker or attached blob delivery tested.

**Execution limitations checked on local container in this group:** `node v22.16.0`, executable `/usr/bin/chromium`, **no repo checkout at `/mnt/data/vico-forum`, no `pnpm`, no `psql`**; source accessed via GitHub read-only connector. Chromium binary itself is not forum authenticated browser test; no self-hosted app/isolated real auth/PG buckets provisioned. `NOT_EXECUTED`: 409 failed-action browser revalidation, 500 form unmount, offline/lost-submit ACK, 2-tab A→B, modal/IME/RTL manual, simultaneous different-user DB Help operation, real upload XHR stall/cancel and R2 transport/cleanup. Previous same-source CI 979 app+279 DB historical success, not rerun.

**Conclusion:** B4–B7 scenario/test relation improved, no unjustified overall PASS, historical findings neither cleared nor silently upgraded; a newly examined candidate preserved owner-only per AGENTS.md. Actual current product defect classification depends on source-confirmed scenario, applicable current-Stage requirement and targeted repro; no implementation/patch or developer task assigned during audit. NEXT ONLY WITH OWNER CONTINUATION: GAP-CLOSURE **B8–B9** (huge translation source vs static index gaps and PostgreSQL semantic vs actual execution limits), then separate final coverage reconciliation, then only later B10–B12. STOP.

### GAP-CLOSURE / подзадача 3 — дополнительная доказательная проверка B8–B9 (2026-10-23)

**ONE COHERENT GAP-CLOSURE SUBTASK DONE AT STATIC SOURCE+TEST ASSERTION DEPTH; unified audit remains OPEN; B10–B12 NOT STARTED.** GitHub main exact `d72b27ca762dd930f0e7ad614e5b00832a07ec0c` verified at start and immediately before journal write. Main `AGENTS.md` (106 physical lines, sha `20acb9210685bf3347f153c0d44d19420e8dc9bc`) fetched/read to actual end. Prior B8 and B9 source-evidence logs reconsulted. Source-of-truth `ROADMAP.md`, `docs/translation/PROVIDERS_AND_JOBS.md`, `STORAGE_AND_VERSIONING.md`, `docs/database/MIGRATIONS.md` fetched/indexed for applicable contracts. No implementation, shared service file, other agent, DB, deployment or production changes; findings not published.

**B8 deeper selected source and tests, not 128-file exhaustive re-review:**
1. Previously huge/indexed-only `db/translation-task-store.ts` (1757 lines): inspected provider allowance acquisition, generation-head `FOR UPDATE`, task row lock, lease/admission fencing by `generation+attempt+admissionClaimToken`, deferral and stored provider, reconciliation `FOR UPDATE SKIP LOCKED` with reserve attempt timestamp, kind-specific claim and exhausted-lease re-claim, claim-token guarded failure/terminal states. Inspected `app/localization/content-provider-allowance.ts` (549): topic/body gates recheck revisions/generation after external allowance call, missing/unconfigured vs configured unsupported provider paths, bounded provider request envelope. `app/localization/content-markdown-translation.ts` (584): markers tied to protected AST spans, duplicate/missing/oversized/forbidden segment validations, technical-token sequence check, post-restoration protected Markdown structure signature. These were read in critical ranges, not every line of each file.
2. Actual test *bodies/expectations*, not just names, read in `app/localization/content-provider-allowance.test.ts:244–332,518–573`, `tests/database/content-topic-title-execution.test.ts:665–815`, `tests/database/content-post-body-task-planning.test.ts:951–1402`, `tests/database/translation-task-reconciliation.test.ts:80–126,167–213`: post-allowance generation revocation, missing allowance deferral without attempt increment, concurrent two-connection admission exactly one winner, provider attempt identity after retry, expired admission lease reuse, old claim vs actually reclaimed claim, manual translation during provider window, revision/generation switches, failure atomic rollback, backlogs and concurrent disjoint reconciler reservations. Existing PG assertions READ, NOT executed by this agent.
3. New EXECUTED pure static catalog-key reconciliation using exact source strings from `app/localization/catalog.ts` (670) and `manual-values.ts` (1139): normalized indentation/parser exclusion of two nested descriptor keys `namespace` and `messageKind` yields **527 unique canonical common keys, 527 RU, 527 HE**; zero missing, unexpected or duplicate top-level keys in either manual locale. First raw English regex matched 529 unique tokens due two nested descriptor property names; those are NOT keys, explicitly excluded before result. This tests structural key coverage, NOT translation quality, interpolation semantics, plural morphology, full RTL/browser presentation or runtime i18next bundle load.
4. Stage boundary independently verified: `workers/app.ts:49` sets `DISABLED_CONTENT_GENERATION_ACTION_RUNTIME`, `app/forum/actions.server.ts:216` returns controlled disabled generation 503, `wrangler.jsonc` has only two Hyperdrive bindings, no external translation Queue/AI. `ROADMAP.md:257–346` specifies completed Stage5 local/CI and future paused Stage6 external integration. Absence of production provider/Queue runtime is **not** a current Stage defect.

**B9 deeper selected SQL/transaction cross-component review, not a fresh PG run:**
1. Independently fetched actual SQL migrations `drizzle/0014_content_translation_persistence.sql` (72 lines), `0015_content_topic_title_tasks.sql` (84), `0016_content_post_body_tasks.sql` (84), `0039_forum_publication_receipts.sql` (17), `0044_attachment_draft_conflict_boundaries.sql` (27). Confirmed explicit composite `(topic_id/post_id,revision_id,source_locale)` foreign keys tying stored translations to original revision owner+locale, composite task kind+namespace+content-owner/revision FKs, deferred task metadata required trigger from 0015 extended in 0016, metadata deletion cleanup trigger, 0039 app-guarded attachment-only posts and persistent publication receipt PK, 0044 owner+attachment scoped context keys and backfill. No speculative rewrite/deletion of already accepted migrations.
2. Checked `db/content-post-body-task-store.ts`, `db/content-topic-title-task-store.ts` and corresponding publication stores: planning locks generation head, stable task, current entity/revision, current translation; publication uses generation-head→task→entity/revision→translation row order and validates claimed token/current revision/generation/source/policy/manual priority. `db/content-post-body-execution-store.ts:88–265` shows inserted machine translation and task completion in SAME transaction; failure on completion throws rollback. Source and existing PG test `tests/database/content-post-body-task-planning.test.ts:1254–1307` directly inspect an injected `P0001` failure and assert zero published rows. Concurrent test `:1178–1252` asserts old worker claim-lost after actual reacquisition. Native DB tests also explicitly expect SQLSTATE `23514` orphan task/namespace invalid, `23503` foreign-key mismatch, and metadata delete cleanup `:1362–1402`. `tests/database/content-topic-title-execution.test.ts:740–815` proves concurrent admission/claim assertions in source. None executed here.
3. Executed **static string/cross-file assertions** against nine frozen-main blobs for composite SQL FKs, deferred trigger, source lock-order claims, presence of explicit concurrent/rollback DB test cases; each expected source token present. This is not parsed SQL validity, actual lock behavior, database catalog equality, deadlock stress test, explain plan, isolation acceptance or privilege-probe execution. Previous B9 45/45 SQL, 45/45 snapshots and normalized final schema/manifest inventory evidence remains at its formerly recorded confidence, NOT independently rerun entirely here.

**Hard runtime boundary checked:** local container has Node `v22.16.0`, `/usr/bin/chromium` exists, but **no checkout of forum under /mnt/data/vico-forum, no pnpm, no psql**. Pinned exact Node 24.21.0+dependencies/native PostgreSQL+authenticated forum runtime unavailable. Therefore NEW Vitest, native PostgreSQL transactions/constraint probes, Worker browser tests, authenticated user two-tab, production/R2/provider/Queue, runtime lost-ACK, real browser hydration/RTL, query plans = **NOT_EXECUTED / NOT VERIFIED**. Historical matching-tree GitHub Actions green remains preexisting external CI evidence only, not this agent's runtime test.

**Conclusion:** additional B8–B9 source/test evidence improved; NO NEW independently confirmed current-Stage defect in these bounded examined paths. This does NOT close all 128 translation-file semantic branches, all SQL/negative/live edge cases or historical E1/N1/E3/I1/A5-AP1 and other preliminary owner-only findings. No false overall audit completion, no release approval, no feature fix recommended from a future Stage6 wiring gap. **STOP after this subtask.** Next owner-gated logical subtask: reconcile outstanding evidence/NOT_EXECUTED gaps across B1–B9 without upgrading them to PASS; then only with separate authorization move to B10, B11, B12. 


### GAP-CLOSURE / подзадача 4 — реестр остаточных доказательных пробелов B1–B9 (2026-10-23)

**COMPLETE as finite COVERAGE/GAP RECONCILIATION ONLY; whole audit OPEN; B10–B12 NOT STARTED.** Exact GitHub `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c` reverified at entry and before write. Main `AGENTS.md` full EOF re-read, read standing A/B/gap personal checkpoints against unchanged manifest. This checkpoint performs no fresh B10 security audit or B11 UI or B12 independent CI gate; no implementation, service-channel/common records, other agent files, production/deployment or external service actions.

**Executable source identity reconciliation (NEW):** Read baseline 491-row GitHub-journal manifest and current exact Git tree `18e73a062eb06984fd0b28132f510a5b12b1cfe2` (truncated=false); `491/491` blob paths **exactly identical as sets**, 491 unique manifest paths, **ZERO absent, extra or duplicate** entries. Counts independently parsed: 437 INCLUDED / 42 EXCLUDED / 12 CONTEXT; primary B1–B9 403 distinct INCLUDED paths (B1 18, B2 20, B3 29, B4 49, B5 2, B6 18, B7 31, B8 128, B9 108), plus 6 distinct assigned cross-cut `4/5/6/7`; remaining 28 distinct INCLUDED primary B10 2 + B11 17 + B12 9. 403+6+28=437. The historical manifest's `IN / NOT_REVIEWED` fields are **INITIAL baseline annotations, not live coverage classifications**, retained unchanged for provenance. Counting paths is INVENTORY parity, never semantic or runtime source review proof.

**Evidence-level reconciliation, no fabricated PASS:**
| Stage | Primary INCLUDED | Existing reliable evidence at CURRENT stated depth | Open boundaries |
|---|---:|---|---|
| B1 docs | 18 | 18/18 full-EOF document reviews recorded across A1+B1, additional 83/83 regex-parsed internal markdown target existence in gap pass | 64 external links not live rechecked; contradictions D1/D2/D3 not resolved; links don't prove semantic correctness |
| B2 architecture | 20 | 20 primary identities explicitly linked to source/static/CI checks; 27/27 route modules and 13 route/runtime text assertions checked | no running exact Node24/pnpm/Worker SSR/authenticated integration; partial branch tests |
| B3 Better Auth/authz | 29 | 29 primary source/test items and explicit guest/role/grant/owner+revalidation negative matrix; selected real test assertions | no firsthand 429 after rate-limit exhaustion; no two signed-in-tab A→B runtime; dynamic role/route combinations not exhaustively executed |
| B4 public forum | 49 | A4+B4 source and real test-assertion slices, signed-in read/unread/profile/presence/notification branches; 6 cross-cut files independently listed elsewhere | app/browser integrated UI/navigation and cross-tab session/state transitions NOT EXECUTED |
| B5 Help/moderation | 2 | A5+B5 source+SQL/tests across many cross-cut writers and attention; exact attention case-ID fencing read | competing/stale topic appeal and owner-chat-only A5-AP1 need independent executed/proven branch closure; no PG+2-tab repro |
| B6 Editor | 18 | A6+B6 source/tests read for source preservation, permissions/revisions/409/error, quote/mention | E1 stale edit 409→reload/rebase, N1 thrown-error unsaved buffer, E3 writer unknown→503, offline ACK and I1 browser cases NOT EXECUTED; source findings not dismissed |
| B7 attachments | 31 | A7+B7 validation, private refs/owner, stable operation IDs, XHR, publish, cleanup and selected actual tests | HTTP/XHR stalled/lost ACK/cancel/retry, real private R2 not tested; E2 timeout remains conditional, not automatically defect |
| B8 translation | 128 | 128 blob identities fetched+indexed; relevant task-store/allowance/locale/Markdown/content/localization source/selected tests; 527/527/527 canonical/common manual locale key parity checked in latest gap | many very long blobs have NOT received exhaustive semantic read; live provider/Queue Stage6 OUT OF SCOPE, no firsthand local exact-PG runtime |
| B9 PostgreSQL | 108 | 108 identity inventory, 45 SQL read, 45 snapshots parsed with 44 prevId lineage and normalized schema-manifest parity from B9; selected deep task concurrency/ownership/rollback asserts | not a fresh disposable PG17 migration/query-plan/constraint/role/concurrency execution; huge 3109-line migrations test reviewed selectively |
| Cross-cut | 6 | accounted once and reviewed in A4–A7/B4–B7 relevant source/tests | not exhaustive all security/failure paths; further B10+B12 |

**De-duplicated OPEN evidence cases, not new published findings or chosen fixes:**
- C-RUNTIME-IDENTITY: actual two-account two-tab A→B while topic editor active (I1), server actor + UI/header/buffer coherence, include 401 vs 204.
- C-RUNTIME-EDIT: stale edit R1/R2 causing 409, automatic loader refresh/rebase and unsaved text retention (E1); thrown dependency/programming error after user text filled with ErrorBoundary behavior (N1); unknown ordinary writer failure typed-vs-catch-all/diagnostic path (E3) source-level, with local fault injection only if needed, not a production test. Keep distinct causes, don't bundle with current absent autosave feature.
- C-RUNTIME-HELP: topic appeal A rejected, later B pending, stale moderator approval and exact case identity; compare `attention` strict ID flow; old A5-AP1 independent owner-chat candidate NOT silently conflated.
- C-RUNTIME-AUTH: Better Auth database limiter exhaustion response/status/counter, intended 429; don't call missing test proof of bypass.
- C-RUNTIME-UPLOAD: cancel/retry/ambiguous ack/stalled upload and own/private refs; scoped local emulator useful, live R2 service/production not a current gate.
- C-RUNTIME-DB: disposable PostgreSQL17 migration/role constraints and interleaved locks/rollbacks; old exact-tree CI pass is historical external execution, not this audit. No requirement to inspect real Neon or deploy production.
- C-UI/QUALITY: actual rendered/hydrated SSR browser accessibility, responsive/RTL/keyboard and visual flow, plus quality/CI execution; belong future B11/B12 and remain unexecuted; test inventory alone not acceptance.
- C-COVERAGE: long B8 test/source and B9 metadata branches sampled/indexed, not exhaustive. Full source review of B10 (2), B11 (17), B12 (9) distinct primary manifest items **still ahead**; record actual per-file inspected ranges and rationale, no inherited fake PASS.

**Environmental boundary reconfirmed NOW independently via local container:** `node=v22.16.0` while project pin 24.21.0; `pnpm=absent`, `psql=absent`, forum checkout under `/mnt/data/vico-forum` absent, `chromium=/usr/bin/chromium` present but no runnable forum server/DB/auth fixture. Executable source-independent manifest JS check DID RUN (491/491); actual pinned app Vitest/PostgreSQL/Workers/real forum browser DID NOT RUN. Historical exact-tree GitHub Actions `#39615502080` checks/database green prior audit evidence only. Runtime gaps thus `NOT_EXECUTED` here; do NOT relabel as bugs, green CI, or complete audit. Do not invent developer manual labor as the default resolution.

**Strict Stage classification and next boundary:** External OAuth, real production Neon/Hyperdrive/R2, Queues, live provider credentials, deployment/rollout/backups remain EXCLUDED/Stage6 gate, not blockers of current static source inventory and not current-stage findings for simply being absent. D1/D2/D3 doc-only or source-of-truth contradictions await owner interpretation where product semantics conflict; E2/L1 conditional. Open functional candidates E1/N1/E3/I1 and independent Help candidates stay owner-chat-only per AGENTS. No findings published to team, no implementation changes. Additional blind repeated static B1–B9 loops will NOT convert `NOT_EXECUTED` into runtime PASS; proceed to **B10 cross-cut security/errors/degradation/diagnostics** only after new owner continuation, then B11 browser/UI, B12 tests/quality, and B13 final audit sign-off/reconciliation, one bounded subtask at a time. **STOP.**


### PASS B / этап 10 — cross-cut security / failure-classification / safe diagnostics (2026-10-23)

**B10 source+selected existing-test-assertion review DONE at LIMITED STATIC DEPTH, NOT runtime/security sign-off. Unified audit OPEN. B11–B12 NOT STARTED.** GitHub `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c` verified at start and immediately before journal write; current `AGENTS.md` read fully to EOF from `main`. Compared A10 source evidence and last B1–B9 gap ledger, source-of-truth PROJECT/PROJECT_STATE/ROADMAP/AUTHORIZATION/EDITOR/UI_UX_PASS captured exact main and relevant applicable contract sections. Stage 0–5 local/CI, product UI pass; live external rollout/production/proprietary provider/Neon/R2 Stage6 NOT within current test obligation. No service/production/browser changes; no implementation fix or team finding publication; only this personal file.

**Primary B10 manifest 2/2 FULL source read:**
- `app/server-logging.ts` sha `f37758fa554e05e68437ed46b8698eba032773be`, 30 physical lines: allowlisted fixed event `ssr_stream_error`, phase `after-shell`, classified error kind. No error body, stack, request headers or URLs interpolated.
- `app/server-logging.test.ts` sha `316bcd8b03537966c3030f01136209df78b9a793`, 50 lines: actual asserted JSON shape and absence of OAuth code, Bearer, session cookie and query secret; non-Error thrown value not stringified. TEST SOURCE READ, NOT RUN.

**Cross-cut inspected exact source and negative tests (selected explicit paths/ranges; not whole 437 files):**
1. `app/forum/mutations.server.ts:63–111,114–179` GET/POST origin guard compares parsed Origin to request URL, fail closed on absent/malformed; server session actor identity; classified invalid/notFound/authz/conflict/cooldown 429+Retry-After. `runForumMutation` default case converts **every otherwise unknown** writer exception to controlled unavailable 503; contrast `runSourceLocaleCorrection:125–134` which classifies `ForumStorageUnavailableError` then rethrows unexpected. `db/hyperdrive-forum.ts:61–78,119–169,250–260` confirms generic ordinary `write()` does not type-wrap PG availability failures whereas read/writeCorrection do. Existing `app/forum/write-actions.test.ts:995–1013,1111–1178,638–649` asserts guest/cross-origin/domain statuses, unexpected correction/authz throw vs typed outages, cooldown retry 3 seconds; no ordinary writer unexpected exception regression test confirmed. This is previously owner-chat E3, source-supported **current-scope diagnostics/error-classification issue**; unexpected errors and real live traces NOT injected here, no fix proposed during audit.
2. `app/routes/authorization-admin.tsx:15–74`, `app/routes/authorization-admin.test.ts:35–100`: manager permission checked server before load/write, Origin checked before role mutation, actor server derived, classified outage 503/lockout conflict 409, unknown admin errors rethrown. `docs/auth/AUTHORIZATION.md:164–206` confirms typed availability MAY controlled 503, unexpected SQL/schema/invariant must not be falsely retyped as 503; note `app/routes/post-edit.ts:7–20` GET permission unavailable isn't explicitly mapped to 503, but fail-closed/error-boundary remains; this alone NOT an accepted defect (spec says may, not must). `db/hyperdrive-authorization.ts:19–100` uses fresh request context cached Promise, typed availability only, unexpected rethrows.
3. `app/routes/attention.tsx:142–196`: anti-CSRF, strict signal case+topic check, per-kind permission, appeal `expectedAppealId:caseId` current prior to writer and under DB-locked writer (B5); `app/forum/public-read.test.tsx:1222–1290` asserts forged-origin, cross-case and stale case rejection. Topic-page stale appeal candidate from B5 GAP remains separately owner-only; NOT reclassified or published as fixed by protected Attention Center path.
4. `app/routes/attachment-upload.ts:91–124,127–152,155–250`, `app/forum/editor-permission.server.ts:13–45`, `app/routes/attachment-download.ts:25–87`: authenticated server-session owner+editor-context permission before storage; Origin check for writes, no client-forged writer identity, private draft read checks owner/context/operation and valid referenced object before R2 fetch. Download sandbox+nosniff+private,no-store; SVG/HTML inert, inline only detected raster or bounded text; controlled unavailable only known storage paths before download, broad bucket catch maps 503 and is not automatically separately branded defect without diagnostics/root-cause tests. `app/routes/attachment-upload.test.ts:231–250,288–309,399–440` and `attachment-download.test.ts:42–104` assert guest/cross-origin/authorization denied before storage, missing refs, no secret object key and response security headers; tests READ not run.
5. `app/routes/presence.ts:11–25` and tests `presence.test.ts:27–56`, `app/routes/mentions.ts:7–30`, `app/routes/profile.tsx:19–66`, `app/forum/profile.ts:22–53`, `app/routes/notifications.tsx:15–64`: presence heartbeat actor server-owned/Origin + typed failure only; mentions endpoint owner auth+private,no-store+bounded q; profile publish exposes projected public fields, own-only same-origin POST, http(s) URL/no credentials and GitHub identity validation; notifications own-only reader/writer. `app/routes/locale-boundary.tsx:67–148` optional header permission/unread degrade on typed outage while protected routes still enforce separately. Unexpected permission errors propagate from non-optional paths, per `app/forum/public-authz-degradation.test.ts:202–222,465–479`.
6. `app/auth/auth.server.ts:17–110` authenticates via Better Auth current request getSession, rate-limit database settings and Cloudflare trusted IP header; `app/auth/session-context.ts:9–35` fresh auth session context/cookie forwarding, `workers/app.ts:24–53` new RR request context per fetch and SSR initialization occurs before router, `app/routes/auth-api.ts:9–14` Better Auth handler delegated; existing app + native DB auth tests read previously, no actual live Better Auth fail/success/429/session switch execution in B10. Do not claim Better Auth internal CSRF implementation independently runtime verified.
7. `app/entry.server.tsx:8–46`, `app/server-logging.ts:1–30`, `app/entry.client.tsx`, `app/forum/ui.tsx:401–435`, `wrangler.jsonc:6–10`: SSR onError allowlisted log only on after-shell; route ErrorBoundary displays localized generic message and status rather than raw Error. No exported `handleError` on server; official 2026-10-23 React Router `https://reactrouter.com/api/framework-conventions/entry.server.tsx` states default encountered server-side loader/action exceptions are logged to console unless handler exported, `https://reactrouter.com/how-to/error-reporting` similarly; pre-router auth/binding errors bypass custom stream reporter. `wrangler` observability enabled, `redact_query_string=true`, but not independently observed deployed logging/sensitive exception payload. Old L1 source diagnostic sanitization **COVERAGE GAP**, NOT VERIFIED LEAK. Root rendered SSR data has no globally explicit no-store and no unconditional anti-framing headers, but no current cache.put/remote cache replay/credentialed clickjacking shown; historical cache/frame caveats NOT elevated into current exploitable findings.

**New static source consistency checks actually RUN in current subtask:** 7 targeted assertions across exact main blobs: allowlisted error structure and masking test, no `handleError` vs actual stream reporter path, catch-all writer failure, untyped ordinary writer vs classified correction, strict appeal case ID, owner-bound draft read before bucket, unknown admin error rethrow. All 7 source-token checks TRUE. These checks are not a test runner, HTTP attack simulation, DB, browser, Cloudflare log inspection or quantitative security proof.

**Runtime/tooling** independently checked: Node v22.16.0 whereas repo Node24.21.0 pin, `pnpm` missing, `psql` missing, `/mnt/data/vico-forum` checkout absent; Chromium exists but app/DB/auth fixtures unavailable. Thus all NEW pinned Vitest/native PG17/Worker/HTTP cross-account and actual logs/headers/brute-force tests: `NOT_EXECUTED`. Historical tree-identical GitHub Actions `#39615502080` green is carried as PRIOR CI evidence only. External production Google/OAuth/Neon/R2/provider/Queue & deployment Stage6 excluded; dynamic ordinary Better Auth local 429 and precise SSR/browser paths can be targeted in future B11/B12 if environment becomes available. E1/N1/I1/E3 and independent Help appeal candidate remain owner-chat-only; no fresh confirmed authorization bypass/data disclosure in examined B10 chains. Conditional L1 not an observed secret leak; static error classification is not a request to implement speculative broad logging/HTTP changes.

**Conclusion / STOP:** B10 source/test cross-cut subtask finished at declared static depth; all 2 primary B10 paths fully read, selected cross-cut traces inspected. Not a clean runtime security sign-off; 437-file audit still OPEN, B11 and B12 not started. Next owner-command-only subtask: **PASS B / этап 11 — outstanding static UI/SSR/RTL/a11-missing files and real browser/effective accessibility/hydration evidence limits**, no B12 before next owner instruction.


### PASS B / этап 11 — UI/UX, accessibility, SSR/hydration, responsive/RTL static evidence (2026-10-23)

**B11 concluded as static-source, asset signature, existing-test-assertion and CSS proof subtask only; no actual browser/Worker/hydration/a11y acceptance. Whole audit OPEN, B12 NOT STARTED.** GitHub main `d72b27ca762dd930f0e7ad614e5b00832a07ec0c` reverified start/before write, main `AGENTS.md` read through EOF. Reconsulted A11, B10 and exact `docs/UI_UX_PASS.md:617–705`, `docs/EDITOR.md`, `ROADMAP.md`, `PROJECT.md`, `PROJECT_STATE.md` applicable UI/accepted-stage clauses. Only personal journal changed; no implementation, common communication, team finding, external deployment/service, or runtime edits.

**Primary B11 manifest 17/17 file identities independently fetched/read/indexed at appropriate depths** (no 17/17 *exhaustive* semantic review claim):
1. `app/assets/vico-forum-logo-dark.webp` blob `48b55020de9535a448baeb9696d6b69cac3f8ce4`, base64 length 13640; `app/assets/vico-forum-logo-light.webp` blob `1afb1ef24f4f7b6e9d29e298be59a6b03ecde8ce`, base64 length 11184. Independently decoded initial base64 bytes; both `RIFF .... WEBP VP8X` signatures; actual visual raster inspection, colors, alt semantics **not** established from signatures; `app/forum/ui.tsx:252–266` imports both and marks logo images decorative (`alt=""`, wrapper aria-hidden) with accessible brand link name.
2. `app/entry.server.tsx` (47 lines, full): request Head bodyless; ServerRouter and renderToReadableStream; streams after `allReady`, `streamTimeout=5000`, onError after-shell safe reporter; `app/entry.client.tsx` (13 lines, full): hydrateRoot(document, StrictMode/HydratedRouter). `app/root.tsx` (56 lines, full): route-loader-derived locale `html lang/dir`, viewport, inline pre-hydration theme bootstrap, Meta/Links/Scripts and suppressed attribute hydration warning. `app/theme.ts` (17 lines, full): stored light/dark override fallback system preference. This proves intended *wiring only*, NOT SSR page success, hydration identity or no runtime mismatch, no flicker, no browser title consistency.
3. `app/forum/ui.tsx` (435 lines, selected full relevant shell 205–375), `app/forum/ui.test.tsx` (203 lines, explicit assertions 83–202), `app/forum/avatar.tsx` (15 lines, full): keyboard skip link is first in JSDOM Tab test, skip target focusable via tabindex, native language select and preserved route/query/hash, icon-only aria-labels, notification announcement, pre-hydration/theme selector JSDOM tests, avatar safe http(s) URL with no-referrer and fallback. No physical keyboard/screenreader inspection; link composition from source does not confirm focus ring visibility in all themes.
4. `app/styles.css` (9644 lines / 209182 characters, SHA `afb2a81864df73afa0cce97fe3f62827e3eed5cb`): fresh **full-text lexical brace/comment/quoted-string structural scan** actually executed — 1506 opening/1506 closing braces, 0 unmatched, terminal scanner mode code, 32 closed comments; **51 `@media` directives** enumerated including width 70/52/48/44/38/30rem, prefers-color-scheme and reduced-motion. Source inspected in sampled responsive, focus, bidi, sticky/code, dense editor, toolbar, fullscreen and light/dark palette ranges `:1–160, 2738–2870, 6940–7230, 9198–9355, 9540–9644`. Global focus-visible ring `:131–134`, skip-link focus `:7170–7190`, `:dir(rtl)` arrow overrides `:7148–7167`, code LTR `:803,893`, compact editor flex wrapping `:9247–9269`, fullscreen 100dvh; also detected `html/body min-width:320px` requiring runtime zoom/reflow evaluation. Balanced braces is **not CSS parser validity or cascade/runtime layout proof**. Some unused/historical draft classes are not current drafts feature requirements by themselves.
5. `app/ui-preview/index.html` (14 lines, full; lang EN, width viewport, noindex/nofollow); `app/ui-preview/preview.css` (138 lines, full; independent desktop/tablet 768px/mobile 390px iframe widths, controller responsive <=48rem, 58rem iframe height); `main.tsx` (27 lines, full; `createRoot`, not forum hydrateRoot); `preview-i18n.ts` (82 lines full, EN/RU/HE manual packs and canonical fallback); `vite.config.ts` (11 lines full, relative-base static build); `preview-app.test.tsx` (75 lines, tests only state selector, identity decoupling, mock navigation, not browser acceptance); `preview-app.tsx` (2158 lines, SHA `f4f250fafa7640316eb8681c43178d509e08f682`, source indexed/sampled, not full semantic review). Fresh exact source scan of preview indicates ~70 fixture scenarios with guest/user/manager and independent EN/RU/HE switch, build-key iframe cache boundary, `EmbeddedPreview:940–960` mutates document lang/dir on client effect; all preview state, mock client behavior and English/Hebrew content are representative only. The product `docs/UI_UX_PASS.md:38–56,666–705` expressly forbids treating Pages as actual Worker SSR/auth/permissions/browser acceptance.
6. `app/forum/views.tsx:1960–1990,2818–2845,3041–3069` checked actual `MarkdownEditor` create-topic/reply/edit save *active* `type="submit"` button insertion; `markdown-editor.tsx:1183–1187` actual actions live in `markdown-editor-actions`. `app/forum/markdown.test.tsx:383–481` asserts mixed-language blocks dir=auto, marked author direction, code/pre dir=ltr inside RTL; `public-read.test.tsx:395–448,2050–2119` asserts EN/HE paths, translated RTL+original LTR DOM, injected script inert; `route-error.test.tsx:60–83` safe localized statuses. Source tests read, **none executed** during B11.

**Accessibility numeric static check:** In CSS light scoped `.home-shell:2748–2768`, palette `--color-accent:#fd6d29`, `--color-on-accent:#ffffff`; active `.home-shell .markdown-editor-actions button[type="submit"]:9546–9549` uses exactly that foreground/background; source JSX proves actual live publish/reply/edit buttons. Independently **executed pure WCAG relative luminance math** `(#fff,#fd6d29)=2.839:1`. W3C official WCAG 2.2 SC 1.4.3: normal text >=4.5:1, large text >=3:1, inactive elements exempt. Dark theme scoped pair is `#101416` on `#fd6d29` = 6.524:1, a distinct successful contrast. No claim of a full browser computed-style run or all text color checks, but source-based color pair is independently confirmed and associated with actual *active* buttons, not logo (logo WCAG exemption). **Finding identity/details remain OWNER CHAT ONLY pending complete audit and explicit publication authorization**; personal ledger records limited coverage/status only, no actionable finding leaked to service channel, no fix initiated. Additional unidentified theme pairs not claimed cleared. Official criterion source: `https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum`.

**Actual-browser acceptance NOT_EXECUTED**: `docs/UI_UX_PASS.md:666–705` requires real Worker browser, desktops/tablet/mobile, EN/RU/HE LTR+RTL/mixed, guest/user/manager, keyboard focus, target size, viewport 320 and 100–400% zoom/reflow, color contrast, screen-reader oriented semantics, reduced motion, SSR hydration/error states, screenshots tied to revision. Existing previous PROJECT_STATE recorded scoped Chromium geometry on prior implementation PR, which is not a new independent full exact-main browser matrix. Owner waived separate per-Editor Pages/visual step (`PROJECT_STATE.md:57`, `docs/EDITOR.md:399–400`), not the distinct overall UI/UX product browser acceptance (`UI_UX_PASS.md:666–705`); don't silently conflate. Environment NOW checked: `node=v22.16.0` while pin 24.21.0, `pnpm` absent, `psql` absent, forum checkout `/mnt/data/vico-forum` absent, Chromium installed, Playwright Node module absent; without runnable forum/app fixtures Chromium cannot prove real hydration/SSR/auth/DB. No browser/Worker/native DB/CSS computed styles created or tested. GitHub Pages preview is static fixture not substitute.

**Stage classification / STOP:** no new actual browser-measured overlap/keyboard/RTL bugs independently reproduced; source protections confirmed at bounded level only. Static contrast issue owner-only until whole audit completes. E1/N1/I1 and others remain open across B6/B10 with distinct causal evidence; app code unchanged. **B11 source/asset/test depth finished, but runtime acceptance NOT PASSED, whole audit still OPEN. STOP before B12.** Next, and only after developer `Продолжай` or `...`, proceed to **B12 quality/test/CI/source coverage and applicability of remaining nine primary manifest items**; then B13 final honest reconciliation, never automatic final PASS without evidence.


### PASS B / этап 12 — тестовая инфраструктура, quality gates, workflow source/CI evidence (2026-10-23)

**B12 завершён как file-by-file source/test-workflow audit and GitHub Actions historical-result verification; exact-main independent local test execution NOT_PERFORMED, other runtime gaps OPEN. Whole unified audit OPEN; final B13 NOT STARTED.** GitHub `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c` and tree `18e73a062eb06984fd0b28132f510a5b12b1cfe2` verified at start/before journal write. `main` `AGENTS.md` full EOF re-read; `PROJECT.md`, `PROJECT_STATE.md` (2021 physical lines, 177500 chars), `ROADMAP.md`, `docs/UI_UX_PASS.md`, `docs/EDITOR.md` also fetched to exact EOF and current Stage rules checked, not new semantic full historical document audit. No implementation/workflows/production/external service changes. Personal journal only; existing findings remain owner chat only, no team communication or findings escalation.

**All 9 B12 primary manifest files full-source retrieved and read:** 
| Exact path | main Git blob SHA | lines | Source evidence / boundary |
|---|---|---:|---|
| `.github/scripts/production-privileges.mjs` | `8e4a33448c3186872c7112d589ebe661f71aafcd` | 419 | `assertProductionPrivilegeContract`, catalog ownership, runtime zero schema CREATE/table writes, role attributes, membership, default grants; `readProductionPrivilegeSnapshot` consumes pg_catalog ACL/membership/system tables; static+negative fixture contract, NOT live production role probe |
| `.github/scripts/production-privileges.test.mjs` | `a7afb49ac6fc7fd9ec4005c6956dc01b71230e89` | 386 | 17 top-level node:test declarations incl role/snapshot/ownership/grant/column/default adversarial tests, script itself not independently rerun |
| `.github/scripts/verify-recovery-v2-validation-run.mjs` | `b85179af53b08620edcea22d0653334d4a5ecf44` | 99 | strict run ID, exact `main` head SHA, workflow path, workflow_dispatch, completed success and attempt=1; bounded fail-closed CLI logging, Stage6 recovery validation not actual remote recovery |
| `.github/scripts/verify-recovery-v2-validation-run.test.mjs` | `6965393134d3e7bca8347862f5d56829d5221442` | 91 | 3 top-level node:test declarations incl missing/wrong-workflow/head/failure/rerun and bounded stderr, no independent Node unit execution |
| `.github/workflows/ci.yml` | `39fac246a79b689bcc9ddf682976fc07abaaf29c` | 117 | PR-triggered two jobs, Node24.21/pnpm12.3.4 frozen lockfile, 17 scripts, lint,typecheck, Vitest, React Router build, preview build, Drizzle checks; PG17 DB suite/probes/Worker local smoke |
| `.github/workflows/codex-service-channel-bridge.yml` | `a736f0aa6fece855bf6511878e7d25691d762dfb` | 78 | old coordination bridge intentionally gated to open issue PR #147 + Codex bot, writes historical `chatgpt/ui-ux-product-pass/.github/ui-ux-service-channel.md` with ID dedupe; GitHub PR #147 confirmed **closed** 2026-10-18; no evidence currently mutates active shared service PR #236 or current user-visible feature. Historical deprecation/maintenance observation only, not current Stage defect |
| `.github/workflows/ui-preview-pages.yml` | `5f8b53f6ff450fda8acd74e5d925cfc8ac996fd4` | 51 | push/main and allowlisted UI preview branch, workflow_dispatch, static Vite artifact Pages upload/deploy only; not SSR/auth/Worker |
| `scripts/configure-localization-deadlines.sql` | `89a08b623a8b0037f8b4ae6acfd266e6f43762ac` | 5 | explicit separate non-portable external `ALTER ROLE ... IN DATABASE` `lock_timeout=500ms`, `statement_timeout=1500ms` for calibrated real Hyperdrive Stage6; not part of local schema migration, no real target DB touched |
| `scripts/smoke-workers.sh` | `22a4de1ffba5d0460def7bdb51f0c4aaf99757dc` | 32 | bounded 30×1s ready GET /he/, 200 HTML lang=he dir=rtl, /ru/200, /iw/308 canonical /he/, /ka/ and unknown/307, POST uppercase IW 404, missing route/API 404; app/DB/authenticated scenario not included. CI job starts localhost Vite preview with split PG connection overrides, not remote Worker/public deployment |

**Executable static inventory/quality reconciliation actually performed NOW in tool isolate on exact retrieved `main` tree:** 
- 491 blob paths. All nine stage12 paths present.
- 120 `*.test.ts(x)` source paths partition into **94 app Vitest and 26 tests/database native PG Vitest**; `vitest.config.ts` excludes DB directory, `vitest.database.config.ts` targets DB tests; distinct `pnpm test` and `pnpm db:test`.
- 17 `.github/scripts/*.test.mjs` present and exact 17 references from CI's `node --test` invocations; zero absent test references; no test-file execution implied.
- Extracted **25** `ci.yml` references to `.github/scripts/*.mjs` and `scripts/smoke-workers.sh` across inline shell; all 25 point to actual exact-tree blobs, zero missing.
- Explicit eight required CI command substrings found: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm ui-preview:build`, `pnpm db:check`, `pnpm db:test`, `node .github/scripts/verify-runtime-privilege-probes.mjs`. Script smoke contains all eight route-patterns checked by static text extraction. Lexical presence only, not a test run or validated YAML parser/shell execution.
- Local environment independently re-checked: `node v22.16.0` != pinned `24.21.0`, `pnpm` absent, `psql` absent, `/mnt/data/vico-forum` absent; attempted direct GitHub raw fetch failed DNS `Could not resolve host: raw.githubusercontent.com`. No safe complete local exact-revision checkout via native tooling; independently run pinned `pnpm lint/typecheck/test/db:test/build/db:check/local Worker smoke`: **NOT_EXECUTED**. Existing standalone self-contained JS source tests could not be transferred as exact files into this runtime from connector, so do not claim node:test executed.
- GitHub API historical remote check reverified: CI run `https://github.com/iliya1947/vico-forum/actions/runs/39615502080` `pull_request` at head `a528c6d2cfba8029072c1f18ae963946a0bbd744`, attempt1, completed success; both jobs `checks` and `database` and all substantive step conclusions success. That head's tree **exactly** equals main tree `18e73a062...`; independent A12 previous job logs showed 94 files/979 app test cases + 26 files/279 PG17 cases, passed then. Separate exact-main `push` Pages run `#39637268492` success, not actual Worker/hydration/browser acceptance. No repeat GitHub Actions run created in B12.
- Live PR #147 checked `state=closed`, so workflow's `github.event.issue.state=='open'` gate prevents it running for the old PR in its current state; no speculative "stale bridge alters #236" finding. Stage6 roles/credential-recovery/live external config checked source/test only; no need to execute paid external systems or prescribe cleanup as a current Stage bug. CI 429/session switching/409/editor failure/Help appeal/effective browser contrast/hydration do **not** become covered just because 120 Vitest test files/remote CI green; prior B stage gaps retained.

**Result:** **9/9 B12 primary files inspected as declared; no NEW confirmed current-stage functional/security/data defect in bounded B12 source/CI evidence review.** Current required overall real UI/UX product browser matrix and owner acceptance in `docs/UI_UX_PASS.md:666–705` remain unresolved independent of successful static Pages build. Document contradictions/owner-only cross-cut findings still open until B13; no fixes, merged change or team publication. Avoid declaring 437/437 exhaustive semantics or 100% runtime PASS merely because manifest fully counted. **STOP** after B12. Next ONLY on explicit owner `Продолжай` / `...`: **B13 final reconciliation**, requiring truthful per-file/evidence-level coverage, retained unresolved current-Stage source findings vs future Stage6/conditional and missing independent required runtime proofs. No partial final findings dissemination to other agents before owner authorization.

### PASS B / этап 13 — финальная сверка реестра, доказательств и блокеров (2026-10-23)

**B13 RECONCILIATION FINISHED; UNIFIED AUDIT NOT CLOSED / NO FULL SIGN-OFF.** Frozen authoritative `main d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, Git tree `18e73a062eb06984fd0b28132f510a5b12b1cfe2`; main `AGENTS.md` fetched/read full. Existing 18 documentation files already full-EOF checked (A1+B1), 45 SQL source fully read (A9+B9), 45 JSON snapshots parsed for chain/evolution; 128 B8 localization identities fetched/indexed with selected semantic branches; further selected sources/tests for A/B2–B12. B13 does **not** newly execute the 437 source files or any tests, and file identity coverage is **not** independent evidence for exhaustive behavioral/semantic branch coverage.

**Manifest identity audit executed against actual main Git tree:** exactly 491 Git blob paths vs 491 unique baseline manifest rows; 0 missing/extra/duplicate. 437 INCLUDED / 42 EXCLUDED / 12 archived CONTEXT. Of INCLUDED: stages B1..B12 count respectively `18,20,29,49,2,18,31,128,108,2,17,9` and 6 single-identity crosscut `4/5/6/7`, sum 437. All stage A1–A12 repeated prior evidence; B1–B9 including four gap reconciliation substages, then B10–B12, are recorded strictly at source/index/test-assertion depths. Historical manifest label `IN / NOT_REVIEWED` is preserved as a **snapshot of initial 2026-10-22 state** and must NEVER be misrepresented as live per-file PASS/FAIL.

**NEW 437-row row-by-row PRIMARY-IDENTITY EVIDENCE INDEX below.** Each row is a conservative provenance bucket inferred from contemporaneous stage checkpoints, NOT a guarantee full source audit of every branch/file. Short/full, source/parsed, archive and selected semantics are distinguished. All tests mentioned READ unless separately historical GitHub CI OBSERVED. Evidence bucket definitions:
- `DOC_FULL_EOF`: original source-of-truth docs reviewed to EOF (18).
- `SQL_FULL_EOF`: 45 current migration SQL read (not fresh executed).
- `SNAP_CHAIN_PARSED`: 45 Drizzle snapshot JSON parsed, history + structural constraints sampled (not exhaustive every column attribute).
- `B8_IDENTITY_INDEX_SELECTED_CHAINS`: 128 translation identities fetched/indexed; selected contract/source and testcase checks, long files NOT exhaustively reviewed.
- `FULL_SHORT_SOURCE_WITH_CROSSCUT_SELECTION`: 2 B5 Help / 2 B10 logging primary short files full-read, adjacent crosscut only chosen ranges.
- `B12_FULL_SOURCE_NOT_EXECUTED`: 9 source workflow/scripts full-read, no separate execution.
- `B11_BINARY_RIFF_WEBP_SIGNATURE`: 2 assets verified magic bytes only, no visual binary inspection.
- `B11_FULL_TEXT_SCAN_SELECTED_SEMANTICS`: 2 long CSS/preview files full-text indexed, representative CSS/layout/focus/preview semantics sampled only; balance check does not replace CSS parser/browser.
- `B11_SHORT_OR_TARGETED_SOURCE`: 13 UI primary component+test paths short read or targeted in A11/B11, varies by length.
- `A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS`: remainder 171 primary/crosscut source+selected test evidence (not full per-file semantic audit); exactly as described in respective A/B sections.

**Evidence bucket count independently calculated:** {"A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS":171,"B12_FULL_SOURCE_NOT_EXECUTED":9,"DOC_FULL_EOF":18,"B11_BINARY_RIFF_WEBP_SIGNATURE":2,"B11_SHORT_OR_TARGETED_SOURCE":13,"B8_IDENTITY_INDEX_SELECTED_CHAINS":128,"FULL_SHORT_SOURCE_WITH_CROSSCUT_SELECTION":4,"B11_FULL_TEXT_SCAN_SELECTED_SEMANTICS":2,"SQL_FULL_EOF":45,"SNAP_CHAIN_PARSED":45}. Zero INCLUDED identities omitted from this coarse mapping; **substantial branch-level/unexecuted gaps still open**, notably large B8 localization and B9/DB test cases. Thus explicit 437-item inventory reconciliation is achieved, yet test/requirements scenario *completion* is not. No misleading "437 files fully reviewed" claim.

**Issue classification reviewed owner-only without team publication:**
- Strong current-Stage static causal mechanisms carried forward: post edit failed-409 stale loader/rebase; unexpected action ErrorBoundary discards mounted unsaved editor; catch-all writer errors converted to 503 and missing normal unexpected diagnostics; cross-tab signed-in A→B stale identity on an open topic with possible wrong user attribution. **No first-hand browser or fault-injection reproduction, no recorded actual confidentiality/production incident.**
- Current UI theme's publish/reply/edit action foreground/background ratio from B11 checked as static WCAG 2.2 criterion violation; no Chromium computed style/owner final browser acceptance.
- Help appeal stale identity case from A5/B5/GAP B4–B7: topic in-page action lacks expected case-ID fence, Attention Center has it; pending-current B following old A may be affected, actual competing-live DB+browser untested. Maintain as current-scope candidate, not counted automatically as separately reproduced production defect; do not conflate with other A5-AP1 without proof.
- D1 migration 0043 vs actual journal 0044, D2 current-state file houses duplicate PR/CI history despite stated history separation, D3 published-revision history role-only editor rule vs effective permission authorization rule: doc/source-of-truth discrepancies, **D3 owner contract decision required before technical fix**.
- L1 unverified sensitive exception emitted to system logging (safe reporter only after-shell), H1 lack of SSR anti-framing policy without verified vulnerability, E2 no XHR timeout but no established deadline / Cancel exists; these are conditional/security-hardening or runtime verification, not demonstrated leaks/current product correctness bugs.
- Deferred external Stage6 Neon/Hyperdrive production roles/migration, Google OAuth, real R2, translation provider/Queue, production deployment, backup restore intentionally not active current gates. No demand to run real production services, alter safety rules or invent implementation work.

**Historical execution evidence independently rechecked B13:** GitHub CI run #39615502080 completed SUCCESS at PR head `a528c6d2cfba8029072c1f18ae963946a0bbd744` with **identical source tree** `18e73a062eb06984fd0b28132f510a5b12b1cfe2`; jobs `checks`/ `database` SUCCESS. A12 downloaded old job logs: 979 app tests across 94 suites and 279 PG17 DB tests across 26 suites; B12 matched all 17 node:test script refs, 25 CI script refs, two Vitest configs, pinned Node24/pnpm12, local Worker smoke only, no full deployed acceptance. GitHub Pages push run #39637268492 exact main SUCCESS: **mock preview only**, not SSR Worker/browser acceptance. No new B13 test/CI run performed. Local current reality checked `node v22.16.0` vs expected 24.21.0, no repo checkout, pnpm or psql, installed Chromium but no runnable exact-main app/DB/auth fixture.

**Runtime/applicable gates NOT_EXECUTED and NOT signed off:** full real Worker browser UI/UX matrix in `docs/UI_UX_PASS.md:666–705` (responsive desktop/tablet/mobile, roles, EN/RU/HE RTL/mixed, focus/keyboard, overflow/zoom 100–400%, contrast, errors, hydration) is explicitly blocking for standalone UI/UX product acceptance; cannot replace with historical static Pages or test markup. Independent current exact-tree auth/429 exhausted limiter, A→B two tabs, post-edit 409 stale R1→R2, unexpected-action 500 text preservation, Help appeal case supersession, network/upload timeout & lost ACK and editor recovery, native PG17 concurrency/query plan, Worker/SSR live per-case instrumentation all remain unexecuted by reviewer. Prior historical CI succeeds local-covered cases but does not prove these omitted assertions, nor new exact browser runs. Full semantic exhaustive review of all B8/other large-file branches also NOT claimed. This audit cannot be marked `FULL / PASS` under agreed contract; coverage objective has a detailed bounded evidence ledger and **remaining blocking tasks**, not an owner-authorized release signoff.

**NEXT owner-command-gated subtask / STOP:** Once explicitly told `Продолжай` or equivalent, next logical activity is an independent **runtime-gate feasibility + targeted reproduction setup**: first establish an executable exact-main Node24/pnpm/PG17/Workers/Chromium environment if an authorized available tool permits; then only against local/disposable fixtures perform critical cross-tab/409/error/Help/Browser matrix tests. If impossible, keep `BLOCKED` status with concrete limitation; no privileged external production deployments/secrets or owner manual checkout assumed. After each bounded subtask report and stop for owner continuation. Do NOT edit implementation or formally publish findings to service team until owner authorizes per AGENTS.

#### B13 INCLUDED paths — provenance index (437 distinct)

| Exact included file | Primary Stage | MAX PROVEN provenance level (not runtime pass) |
|---|---|---|
| `.env.example` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `.github/production-schema-manifest.json` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `.github/scripts/migration-history.mjs` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `.github/scripts/migration-history.test.mjs` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `.github/scripts/production-migration-contract.mjs` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `.github/scripts/production-migration-contract.test.mjs` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `.github/scripts/production-privileges.mjs` | 12 | B12_FULL_SOURCE_NOT_EXECUTED |
| `.github/scripts/production-privileges.test.mjs` | 12 | B12_FULL_SOURCE_NOT_EXECUTED |
| `.github/scripts/production-schema-manifest.mjs` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `.github/scripts/runtime-privileges.mjs` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `.github/scripts/runtime-privileges.test.mjs` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `.github/scripts/verify-migration-history.mjs` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `.github/scripts/verify-production-schema-manifest.mjs` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `.github/scripts/verify-recovery-v2-validation-run.mjs` | 12 | B12_FULL_SOURCE_NOT_EXECUTED |
| `.github/scripts/verify-recovery-v2-validation-run.test.mjs` | 12 | B12_FULL_SOURCE_NOT_EXECUTED |
| `.github/scripts/verify-runtime-privilege-probes.mjs` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `.github/workflows/ci.yml` | 12 | B12_FULL_SOURCE_NOT_EXECUTED |
| `.github/workflows/codex-service-channel-bridge.yml` | 12 | B12_FULL_SOURCE_NOT_EXECUTED |
| `.github/workflows/ui-preview-pages.yml` | 12 | B12_FULL_SOURCE_NOT_EXECUTED |
| `.gitignore` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `.node-version` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `AGENTS.md` | 1 | DOC_FULL_EOF |
| `PROJECT.md` | 1 | DOC_FULL_EOF |
| `PROJECT_HISTORY.md` | 1 | DOC_FULL_EOF |
| `PROJECT_STATE.md` | 1 | DOC_FULL_EOF |
| `README.md` | 1 | DOC_FULL_EOF |
| `ROADMAP.md` | 1 | DOC_FULL_EOF |
| `SCAFFOLD_PLAN.md` | 1 | DOC_FULL_EOF |
| `TRANSLATION_ARCHITECTURE.md` | 1 | DOC_FULL_EOF |
| `app/assets/vico-forum-logo-dark.webp` | 11 | B11_BINARY_RIFF_WEBP_SIGNATURE |
| `app/assets/vico-forum-logo-light.webp` | 11 | B11_BINARY_RIFF_WEBP_SIGNATURE |
| `app/auth/auth-client.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/auth/auth-controls.test.tsx` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/auth/auth-controls.tsx` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/auth/auth.server.test.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/auth/auth.server.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/auth/credential-path.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/auth/credential-view.test.tsx` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/auth/credential-view.tsx` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/auth/request-context.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/auth/session-context.test.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/auth/session-context.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/authorization/admin-view.test.tsx` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/authorization/admin-view.tsx` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/authorization/catalog.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/authorization/request-context.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/entry.client.tsx` | 11 | B11_SHORT_OR_TARGETED_SOURCE |
| `app/entry.server.tsx` | 11 | B11_SHORT_OR_TARGETED_SOURCE |
| `app/forum/actions-attachment-publication.test.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/actions.server.ts` | 4/5/6/7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/attachment-container-validation.test.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/attachment-container-validation.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/attachment-operation.test.tsx` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/attachment-presentation.css` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/attachment-presentation.test.tsx` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/attachment-presentation.tsx` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/attachment-r2.test.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/attachment-r2.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/attachment-request-context.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/attachment-structural-validation.test.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/attachment-structural-validation.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/attachment-validation.test.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/attachment-validation.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/attachment-zip-validation.test.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/attachment-zip-validation.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/avatar.tsx` | 11 | B11_SHORT_OR_TARGETED_SOURCE |
| `app/forum/clipboard-markdown.test.ts` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/clipboard-markdown.ts` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/content-generation-controls.test.tsx` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/forum/content-generation-controls.tsx` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/forum/content-generation-navigation.test.tsx` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/forum/content-translation-view.tsx` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/forum/editor-attachments.test.tsx` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/editor-attachments.tsx` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/editor-document.test.ts` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/editor-document.ts` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/editor-permission.server.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/homepage.test.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/homepage.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/markdown-editor.test.tsx` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/markdown-editor.tsx` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/markdown.test.tsx` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/markdown.tsx` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/mentions.test.ts` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/mentions.ts` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/mutations.server.ts` | 4/5/6/7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/online-presence-heartbeat.test.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/online-presence-heartbeat.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/paths.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/profile-view.test.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/profile-view.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/profile.test.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/profile.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/public-authz-degradation.test.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/public-read.test.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/quote-markdown.ts` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/quote-presentation.tsx` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/request-context.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/route-error.test.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/technical-markdown.test.ts` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/technical-markdown.ts` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/ui.test.tsx` | 11 | B11_SHORT_OR_TARGETED_SOURCE |
| `app/forum/ui.tsx` | 11 | B11_SHORT_OR_TARGETED_SOURCE |
| `app/forum/under-development-view.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/under-development.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/views.tsx` | 4/5/6/7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/visual-markdown-editor.tsx` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/forum/write-actions.test.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/i18next.d.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/localization/bundles.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/bundles.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/catalog.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/cloudflare-m2m100-provider.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/cloudflare-m2m100-provider.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-generation-action.server.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-generation-action.server.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-generation-policy.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-generation-response.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-generation-status.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-generation-view.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-generation-view.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-markdown-translation.test.tsx` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-markdown-translation.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-post-body-execution.test.tsx` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-post-body-execution.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-post-body-planning.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-post-body-planning.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-post-body-publication.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-post-body-task-consumer.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-provider-allowance.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-provider-allowance.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-request-budget.server.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-request-budget.server.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-source-locale.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-source-locale.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-translation-execution.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-translation-execution.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-translation-planning.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-translation-planning.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-translation-presentation.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-translation-presentation.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-translation-provider.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-translation-publication.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-translation-task-consumer.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-translation.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/content-translation.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/fingerprint.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/i18next-types.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/locale-navigation.tsx` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/locale-rules.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/locale-rules.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/locale.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/manual-fingerprints.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/manual-packs.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/manual-values.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/persistent-registry.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/persistent-registry.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/persistent-sources.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/persistent-sources.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/registry.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/registry.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/request-context.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/request-context.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/resolver.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/resolver.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/resource-loader-bundles.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/resource-loader.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/resources.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/runtime.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/sources.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/tinyld-source-locale-detector.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/tinyld-source-locale-detector.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-execution.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-execution.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-failures.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-provider-data-policy.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-provider-data-policy.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-provider.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-provider.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-publication.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-publication.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-task-consumer.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-task-consumer.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-task-dispatch.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-task-dispatch.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-task-reconciliation.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-task-reconciliation.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-tasks.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-tasks.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-validation.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/translation-validation.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/ui-translation-service.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/localization/ui-translation-service.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/markdown-syntax.ts` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/root.tsx` | 11 | B11_SHORT_OR_TARGETED_SOURCE |
| `app/routes.ts` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/api.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/attachment-download.test.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/attachment-download.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/attachment-upload.test.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/attachment-upload.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/attention.tsx` | 5 | FULL_SHORT_SOURCE_WITH_CROSSCUT_SELECTION |
| `app/routes/auth-api.test.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/auth-api.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/authorization-admin.test.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/authorization-admin.tsx` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/category.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/credential-sign-in.tsx` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/credential-sign-up.tsx` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/home.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/locale-boundary.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/routes/locale-boundary.tsx` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/routes/locale-negotiation.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/routes/locale-negotiation.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `app/routes/mentions.test.ts` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/mentions.ts` | 6 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/not-found.test.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/not-found.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/notifications.test.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/notifications.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/popular.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/post-edit.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/presence.test.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/presence.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/profile.test.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/profile.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/search.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/section.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/tag.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/tags.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/topic.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/unanswered.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/under-development.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/unread.test.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/routes/unread.tsx` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `app/server-logging.test.ts` | 10 | FULL_SHORT_SOURCE_WITH_CROSSCUT_SELECTION |
| `app/server-logging.ts` | 10 | FULL_SHORT_SOURCE_WITH_CROSSCUT_SELECTION |
| `app/styles.css` | 11 | B11_FULL_TEXT_SCAN_SELECTED_SEMANTICS |
| `app/theme.ts` | 11 | B11_SHORT_OR_TARGETED_SOURCE |
| `app/ui-preview/index.html` | 11 | B11_SHORT_OR_TARGETED_SOURCE |
| `app/ui-preview/main.tsx` | 11 | B11_SHORT_OR_TARGETED_SOURCE |
| `app/ui-preview/preview-app.test.tsx` | 11 | B11_SHORT_OR_TARGETED_SOURCE |
| `app/ui-preview/preview-app.tsx` | 11 | B11_FULL_TEXT_SCAN_SELECTED_SEMANTICS |
| `app/ui-preview/preview-i18n.ts` | 11 | B11_SHORT_OR_TARGETED_SOURCE |
| `app/ui-preview/preview.css` | 11 | B11_SHORT_OR_TARGETED_SOURCE |
| `app/ui-preview/vite.config.ts` | 11 | B11_SHORT_OR_TARGETED_SOURCE |
| `db/attachment-draft-generation.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/authorization-repository.test.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/authorization-repository.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/authorization-service.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/content-post-body-execution-store.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/content-post-body-task-store.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/content-request-budget-store.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/content-topic-title-execution-store.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/content-topic-title-task-store.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/content-translation-store.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/content-translation-store.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/editor-draft-context.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/forum-attachment-cleanup.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/forum-attachments.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/forum-identifiers.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/forum-repository.ts` | 4/5/6/7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/forum-service.ts` | 4/5/6/7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/forum-write-policy.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/hyperdrive-authorization.test.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/hyperdrive-authorization.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/hyperdrive-content-generation-status.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/hyperdrive-content-generation-status.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/hyperdrive-content-translations.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/hyperdrive-content-translations.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/hyperdrive-forum-attachments.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/hyperdrive-forum.test.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/hyperdrive-forum.ts` | 4/5/6/7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/hyperdrive-registry.test.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/hyperdrive-registry.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/hyperdrive-ui-translations.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/hyperdrive-ui-translations.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/locale-repository.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/locale-repository.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/postgres-deadlines.test.ts` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/postgres-deadlines.ts` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/schema.ts` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `db/translation-task-store.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/ui-translation-bundle-store.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/ui-translation-bundle-store.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/ui-translation-publication-store.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/ui-translation-store.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `db/web-runtime-wiring.test.ts` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `docs/EDITOR.md` | 1 | DOC_FULL_EOF |
| `docs/UI_UX_PASS.md` | 1 | DOC_FULL_EOF |
| `docs/auth/AUTHORIZATION.md` | 1 | DOC_FULL_EOF |
| `docs/database/MIGRATIONS.md` | 1 | DOC_FULL_EOF |
| `docs/translation/CONTENT_TRANSLATION.md` | 1 | DOC_FULL_EOF |
| `docs/translation/LOCALES.md` | 1 | DOC_FULL_EOF |
| `docs/translation/PROVIDERS_AND_JOBS.md` | 1 | DOC_FULL_EOF |
| `docs/translation/RESEARCH.md` | 1 | DOC_FULL_EOF |
| `docs/translation/STORAGE_AND_VERSIONING.md` | 1 | DOC_FULL_EOF |
| `docs/translation/UI_TRANSLATION.md` | 1 | DOC_FULL_EOF |
| `drizzle.config.ts` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `drizzle/0000_tan_johnny_storm.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0001_seed-locales.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0002_ui_translation_storage.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0003_gorgeous_donald_blake.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0004_forum_domain_foundation.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0005_calm_proemial_gods.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0006_loving_sentinels.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0007_durable_translation_tasks.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0008_translation_task_claim_lease.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0009_translation_task_completion.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0010_translation_task_generation_order.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0011_persistent_translation_locale_invariant.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0012_translation_task_retry_dlq.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0013_translation_task_reconciliation.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0014_content_translation_persistence.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0015_content_topic_title_tasks.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0016_content_post_body_tasks.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0017_content_translation_request_budget.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0018_source_locale_correction_permissions.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0019_content_provider_allowance_admission.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0020_translation_generation_permission.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0021_forum_tags.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0022_forum_reply_relationships.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0023_forum_topic_read_states.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0024_forum_reply_notifications.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0025_forum_topic_pins.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0026_best_answer_independent_from_solved.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0027_help_solutions_foundation.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0028_help_solution_moderation.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0029_help_question_needs_details.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0030_help_duplicate_workflow.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0031_help_user_moderation_signals.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0032_forum_profiles.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0033_forum_online_presence.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0034_forum_editor_drafts.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0035_forum_attachments_foundation.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0036_forum_attachment_security_events.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0037_forum_attachment_draft_generations.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0038_forum_attachment_cleanup_claims.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0039_forum_publication_receipts.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0040_post_edit_history_permissions.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0041_published_mentions.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0042_attachment_edit_snapshots.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0043_attachment_security_read_permission.sql` | 9 | SQL_FULL_EOF |
| `drizzle/0044_attachment_draft_conflict_boundaries.sql` | 9 | SQL_FULL_EOF |
| `drizzle/meta/0000_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0001_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0002_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0003_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0004_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0005_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0006_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0007_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0008_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0009_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0010_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0011_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0012_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0013_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0014_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0015_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0016_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0017_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0018_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0019_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0020_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0021_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0022_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0023_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0024_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0025_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0026_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0027_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0028_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0029_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0030_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0031_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0032_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0033_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0034_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0035_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0036_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0037_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0038_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0039_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0040_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0041_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0042_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0043_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/0044_snapshot.json` | 9 | SNAP_CHAIN_PARSED |
| `drizzle/meta/_journal.json` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `eslint.config.js` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `package.json` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `pnpm-lock.yaml` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `pnpm-workspace.yaml` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `react-router.config.ts` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `scripts/configure-localization-deadlines.sql` | 12 | B12_FULL_SOURCE_NOT_EXECUTED |
| `scripts/reconcile-ui-translation-bundles.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `scripts/smoke-workers.sh` | 12 | B12_FULL_SOURCE_NOT_EXECUTED |
| `tests/database/auth-runtime.test.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `tests/database/authorization-snapshot.test.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `tests/database/content-generation-status.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `tests/database/content-post-body-task-planning.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `tests/database/content-request-budget-store.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `tests/database/content-topic-title-execution.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `tests/database/content-topic-title-task-planning.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `tests/database/content-translation-store.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `tests/database/forum-attachment-publication.test.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `tests/database/forum-attachments.test.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `tests/database/forum-email-registration.test.ts` | 3 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `tests/database/forum-help-attention.test.ts` | 5 | FULL_SHORT_SOURCE_WITH_CROSSCUT_SELECTION |
| `tests/database/forum-online-presence.test.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `tests/database/forum-profiles.test.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `tests/database/hyperdrive-registry.test.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `tests/database/migrations.test.ts` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `tests/database/source-locale-correction.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `tests/database/stage4-core-e2e.test.ts` | 4 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `tests/database/translation-generation-authorization.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `tests/database/translation-task-generation-isolation.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `tests/database/translation-task-reconciliation.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `tests/database/translation-task-store.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `tests/database/ui-translation-bundle-store.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `tests/database/ui-translation-publication-store.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `tests/database/ui-translation-storage.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `tests/database/ui-translation-store.test.ts` | 8 | B8_IDENTITY_INDEX_SELECTED_CHAINS |
| `tests/production-migration-verifier.test.ts` | 9 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `tsconfig.cloudflare.json` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `tsconfig.json` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `tsconfig.node.json` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `vite.config.ts` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `vitest.config.ts` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `vitest.database.config.ts` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `workers/app.ts` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `workers/attachment-storage.test.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `workers/attachment-storage.ts` | 7 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `workers/database-bindings.test.ts` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `workers/database-bindings.ts` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |
| `wrangler.jsonc` | 2 | A_B_SELECTED_SOURCE_OR_TEST_ASSERTIONS |

**END B13 PROVENANCE CHECKPOINT. WHOLE AUDIT OPEN; owner findings confidential, no implementation/production modifications.**

---

## Независимый технический аудит форума — 2026-10-21

- Аудит выполняется только по чтению `main`; исходники и implementation PR не менялись. Актуальный проверенный SHA: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.
- Ранний отчёт после семи этапов **не является полным аудитом**; выполнена дополнительная функциональная инвентаризация (этап 8), далее аудит по областям.
- Этап 9 завершён: публичное чтение и навигация, категории/разделы/темы, Popular (24h/7d/30d), Unanswered, Tags, Search, локализованные пути, базовые пустые/404 состояния и соответствующие маршруты, repository queries и существующие component/PostgreSQL tests. Новых **подтверждённых** current-Stage defects в проверенной области не установлено. Это static/source+existing-test review, а не новый браузерный E2E или запуск тестов.
- Спорные предварительные наблюдения из прежних этапов, в особенности Editor 2.0, не представлены как подтверждённые командные дефекты; до закрытия всего объёма аудита остаются в текущем чате согласно `AGENTS.md`.
- Следующая самостоятельная подзадача (после команды владельца): этап 10 — пользовательское участие, solved/best-answer, unread, уведомления, профили и presence.
- Этот файл — личная рабочая заметка Лиры. Общий `.github/service-channel.md` не изменён; новых задач другим агентам не назначено.

---

## Поэтапный аудит текущего чата — AUD-20261022

Дата: 2026-10-22 (Asia/Jerusalem). Эта запись относится к новому согласованному 14-этапному плану; номера этапов и результаты предыдущего независимого прохода выше не переносятся в его покрытие.

### Этап 0 — завершён: объём и реестр, без проверки реализации

- Зафиксированный main: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; exact remote main проверен read-only `git ls-remote`, совпадает с base PR #236 и отдельной локальной audit-копией.
- Локальная исходная ветка `/workspace/vico-forum` остаётся на `2138688`; её исходники не изменялись. Аудитировать зафиксированный main, а не эту отставшую ветку.
- Полный Git tree содержит 491 файл: 437 файлов в прикладном объёме (часть имеет исключённые сервисные разделы), 42 сервисных operational-файла исключены, 12 архивных документов — только справочный контекст. Это классификация, НЕ отметка о прочтении/проверке.
- В дереве зарегистрированы 19 актуальных Markdown документов, 45 SQL migrations, 45 schema snapshots, 137 test-файлов и 16 root/config файлов. Категории подсчёта по назначению могут пересекаться; полный manifest ниже не имеет пропусков и дублей.
- Исключены сервисы Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore: их аккаунты, credentials, настройки, provisioning, deploy/rollout, live smoke и фактическая service acceptance. Не делать обращений к этим сервисам ради аудита. Сервисные разделы документации — только контекст, без подтверждения их фактических утверждений.
- В объёме остаются внутренние контракты кода: session identity и permissions, lifecycle файлов, ошибки, транзакции, provider-neutral translation tasks и adapters. Проверять изолированно; обычный PostgreSQL для локальных DB tests не является аудитом Neon. OAuth flow не проверяется даже в общей auth-матрице.
- На этапе 0 новые тесты/сборки/browser/E2E/security checks не выполнялись; source-of-truth документы ещё не прошли полный аудит чтением до конца. Инвентаризация не считается ручной проверкой содержимого файлов.
- Обнаружена разница среды и pinned baseline: доступно Node 24.19.0 / pnpm 11.25.0, проект требует Node 24.21.0 / pnpm 12.3.4. Это ограничение среды для будущих прогонов, не доказанный дефект проекта. Способ получить pinned tools определить до выполнения соответствующих проверок.
- Предыдущие выводы этого чата и чужие personal notes не засчитываются новому циклу автоматически. Ранее сообщённые findings повторно проверять в профильных этапах; до завершения согласованного review не переносить их в общий файл.
- Реализацию, схему, зависимости, PROJECT_STATE и implementation PR не изменять в ходе проверки. Изменения PR #236 — только служебные записи.

### Порядок этапов

| № | Объём | Статус нового цикла |
|---|---|---|
| 0 | Зафиксированная revision, объём, manifest и правила покрытия | Завершён |
| 1 | Полное чтение актуальной документации; требования и противоречия | Не начат |
| 2 | Архитектура, маршруты, server/client, локальная конфигурация и зависимости | Не начат |
| 3 | Email/password, вход/выход, сессии, роли, overrides, resource ownership; без OAuth | Не начат |
| 4 | Public read/discovery/search/tags, участие, unread, notifications, profiles, presence | Не начат |
| 5 | Help, solved/best answer, moderation signals, duplicates, appeals, attention | Не начат |
| 6 | Simple/Advanced, Markdown, clipboard, history, quote/mention, publish/edit | Не начат |
| 7 | Внутренний upload/download/security/lifecycle/cleanup contract; без R2 service | Не начат |
| 8 | Locale registry, routing, UI/content translation, fallback, RTL, task/retry contracts; без real providers/Queues | Не начат |
| 9 | Прикладная PostgreSQL schema, migrations, constraints, transactions, locks, indexes и query plans; без Neon/Hyperdrive operations | Не начат |
| 10 | Сквозная безопасность прикладных границ и dependencies; без исключённых сервисов | Не начат |
| 11 | Browser flows, accessibility, responsive, hydration, LTR/RTL, локальная производительность | Не начат |
| 12 | Качество тестов и применимые локальные CI/build/quality gates; без service rollout и backup/restore | Не начат |
| 13 | Сверка всего manifest, требований/сценариев, findings, остаточных ограничений и итоговый отчёт | Не начат |

### Правила покрытия и остановки

1. Для каждого файла хранить SHA, первичный этап, фактический диапазон/функции прочтения, проверенные требования/сценарии, команды/результаты и остаток. `NOT_REVIEWED` нельзя повышать до PASS по наличию зелёных тестов.
2. Дополнительно вести матрицу требований/сценариев: guest/user/permission-limited/moderator/admin, positive/negative/stale/concurrent/failure paths. Подробные case IDs формировать после чтения требований на этапе 1; не представлять предварительную структуру как готовый test plan.
3. Общие файлы `actions.server`, `mutations.server`, `forum-service`, `forum-repository`, `hyperdrive-forum`, `views` проходят профильные этапы 4–7; локальные DB аспекты также этап 9. Их нельзя закрыть по одному частичному проходу. Безопасность этапа 10 и итоговая сверка этапа 13 сквозные для всего включённого объёма; тесты дополнительно проверяются на этапе 12.
4. Чтение/статический review, выполненный тест, browser observation, подтверждённый defect и непроверенная гипотеза — разные виды evidence. Каждый finding: trigger → expected/actual → causal chain → exact source → reproduction → priority → current scope/future work.
5. Если этап не помещается в ответ, явно сообщить выполненную часть и остаток, остановиться и ждать команды владельца на продолжение. В конце текущего ответа завершить этап 0 и предложить этап 1; этап 1 автоматически не начинать.
6. Изменившийся main не подменяет baseline молча: зафиксировать drift и определить перечень повторных проверок. Автоматического общего PASS/production readiness нет; исключённые области не являются скрытым обязательным gate этого аудита.

### Manifest всех отслеживаемых файлов baseline

`IN / NOT_REVIEWED` — содержимое ещё не проверено в новом цикле. `EXCLUDED` — сервисный объём снят владельцем. `CONTEXT` — архивный материал, читаемый при необходимости для происхождения решения. Первичный этап — маршрут проверки, не исчерпывающий набор пересекающихся проверок.

| Путь | Первичный этап | Объём / статус |
|---|---|---|
| `.env.example` | 2 | IN / NOT_REVIEWED |
| `.github/production-schema-manifest.json` | 9 | IN / NOT_REVIEWED |
| `.github/runtime-migration-evidence.json` | 12 | EXCLUDED |
| `.github/scripts/bootstrap-production-web-credential.mjs` | 12 | EXCLUDED |
| `.github/scripts/bootstrap-production-web-credential.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/diagnose-production-web-credential.mjs` | 12 | EXCLUDED |
| `.github/scripts/diagnose-production-web-credential.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/migration-history.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/migration-history.test.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/production-migration-contract.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/production-migration-contract.test.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/production-privileges.mjs` | 12 | IN / NOT_REVIEWED |
| `.github/scripts/production-privileges.test.mjs` | 12 | IN / NOT_REVIEWED |
| `.github/scripts/production-schema-manifest.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/production-web-credential-bootstrap-workflow.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/production-web-credential-diagnostic-workflows.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/production-web-credential-recovery-v2-workflows.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/production-web-credential-recovery-workflow.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/production-worker-rollout.mjs` | 12 | EXCLUDED |
| `.github/scripts/production-worker-rollout.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/provision-production-web-relations.mjs` | 12 | EXCLUDED |
| `.github/scripts/provision-production-web-relations.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/recover-production-web-credential-v2.mjs` | 12 | EXCLUDED |
| `.github/scripts/recover-production-web-credential.mjs` | 12 | EXCLUDED |
| `.github/scripts/recover-production-web-credential.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/runtime-migration-evidence.mjs` | 12 | EXCLUDED |
| `.github/scripts/runtime-migration-evidence.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/runtime-privileges.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/runtime-privileges.test.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/validate-production-web-credential-input.mjs` | 12 | EXCLUDED |
| `.github/scripts/validate-production-web-credential-input.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-migration-history.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/verify-production-migration-identity.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-production-migration-identity.test.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-production-migration.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-production-runtime-privileges.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-production-schema-manifest.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/verify-recovery-v2-validation-run.mjs` | 12 | IN / NOT_REVIEWED |
| `.github/scripts/verify-recovery-v2-validation-run.test.mjs` | 12 | IN / NOT_REVIEWED |
| `.github/scripts/verify-runtime-migration-evidence.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-runtime-privilege-probes.mjs` | 9 | IN / NOT_REVIEWED |
| `.github/scripts/verify-web-credential-bootstrap-probes.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-web-credential-diagnostic-probes.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-web-credential-recovery-probes.mjs` | 12 | EXCLUDED |
| `.github/scripts/verify-web-relation-provisioning-probes.mjs` | 12 | EXCLUDED |
| `.github/workflows/ci.yml` | 12 | IN / NOT_REVIEWED |
| `.github/workflows/codex-service-channel-bridge.yml` | 12 | IN / NOT_REVIEWED |
| `.github/workflows/production-db-identity.yml` | 12 | EXCLUDED |
| `.github/workflows/production-db-migrate.yml` | 12 | EXCLUDED |
| `.github/workflows/production-runtime-privileges.yml` | 12 | EXCLUDED |
| `.github/workflows/production-web-credential-bootstrap.yml` | 12 | EXCLUDED |
| `.github/workflows/production-web-credential-input-validation.yml` | 12 | EXCLUDED |
| `.github/workflows/production-web-credential-preflight-diagnostic.yml` | 12 | EXCLUDED |
| `.github/workflows/production-web-credential-recovery-v2.yml` | 12 | EXCLUDED |
| `.github/workflows/production-web-credential-recovery.yml` | 12 | EXCLUDED |
| `.github/workflows/production-web-credential-rollback-probe.yml` | 12 | EXCLUDED |
| `.github/workflows/production-web-relation-provision.yml` | 12 | EXCLUDED |
| `.github/workflows/production-worker-rollout.yml` | 12 | EXCLUDED |
| `.github/workflows/ui-preview-pages.yml` | 12 | IN / NOT_REVIEWED |
| `.gitignore` | 2 | IN / NOT_REVIEWED |
| `.node-version` | 2 | IN / NOT_REVIEWED |
| `AGENTS.md` | 1 | IN / NOT_REVIEWED |
| `PROJECT.md` | 1 | IN / NOT_REVIEWED |
| `PROJECT_HISTORY.md` | 1 | IN / NOT_REVIEWED |
| `PROJECT_STATE.md` | 1 | IN / NOT_REVIEWED |
| `README.md` | 1 | IN / NOT_REVIEWED |
| `ROADMAP.md` | 1 | IN / NOT_REVIEWED |
| `SCAFFOLD_PLAN.md` | 1 | IN / NOT_REVIEWED |
| `TRANSLATION_ARCHITECTURE.md` | 1 | IN / NOT_REVIEWED |
| `app/assets/vico-forum-logo-dark.webp` | 11 | IN / NOT_REVIEWED |
| `app/assets/vico-forum-logo-light.webp` | 11 | IN / NOT_REVIEWED |
| `app/auth/auth-client.ts` | 3 | IN / NOT_REVIEWED |
| `app/auth/auth-controls.test.tsx` | 3 | IN / NOT_REVIEWED |
| `app/auth/auth-controls.tsx` | 3 | IN / NOT_REVIEWED |
| `app/auth/auth.server.test.ts` | 3 | IN / NOT_REVIEWED |
| `app/auth/auth.server.ts` | 3 | IN / NOT_REVIEWED |
| `app/auth/credential-path.ts` | 3 | IN / NOT_REVIEWED |
| `app/auth/credential-view.test.tsx` | 3 | IN / NOT_REVIEWED |
| `app/auth/credential-view.tsx` | 3 | IN / NOT_REVIEWED |
| `app/auth/request-context.ts` | 3 | IN / NOT_REVIEWED |
| `app/auth/session-context.test.ts` | 3 | IN / NOT_REVIEWED |
| `app/auth/session-context.ts` | 3 | IN / NOT_REVIEWED |
| `app/authorization/admin-view.test.tsx` | 3 | IN / NOT_REVIEWED |
| `app/authorization/admin-view.tsx` | 3 | IN / NOT_REVIEWED |
| `app/authorization/catalog.ts` | 3 | IN / NOT_REVIEWED |
| `app/authorization/request-context.ts` | 3 | IN / NOT_REVIEWED |
| `app/entry.client.tsx` | 11 | IN / NOT_REVIEWED |
| `app/entry.server.tsx` | 11 | IN / NOT_REVIEWED |
| `app/forum/actions-attachment-publication.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/actions.server.ts` | 4/5/6/7 | IN / NOT_REVIEWED |
| `app/forum/attachment-container-validation.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-container-validation.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-operation.test.tsx` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-presentation.css` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-presentation.test.tsx` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-presentation.tsx` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-r2.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-r2.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-request-context.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-structural-validation.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-structural-validation.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-validation.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-validation.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-zip-validation.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/attachment-zip-validation.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/avatar.tsx` | 11 | IN / NOT_REVIEWED |
| `app/forum/clipboard-markdown.test.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/clipboard-markdown.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/content-generation-controls.test.tsx` | 8 | IN / NOT_REVIEWED |
| `app/forum/content-generation-controls.tsx` | 8 | IN / NOT_REVIEWED |
| `app/forum/content-generation-navigation.test.tsx` | 8 | IN / NOT_REVIEWED |
| `app/forum/content-translation-view.tsx` | 8 | IN / NOT_REVIEWED |
| `app/forum/editor-attachments.test.tsx` | 7 | IN / NOT_REVIEWED |
| `app/forum/editor-attachments.tsx` | 7 | IN / NOT_REVIEWED |
| `app/forum/editor-document.test.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/editor-document.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/editor-permission.server.ts` | 7 | IN / NOT_REVIEWED |
| `app/forum/homepage.test.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/homepage.ts` | 4 | IN / NOT_REVIEWED |
| `app/forum/markdown-editor.test.tsx` | 6 | IN / NOT_REVIEWED |
| `app/forum/markdown-editor.tsx` | 6 | IN / NOT_REVIEWED |
| `app/forum/markdown.test.tsx` | 6 | IN / NOT_REVIEWED |
| `app/forum/markdown.tsx` | 6 | IN / NOT_REVIEWED |
| `app/forum/mentions.test.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/mentions.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/mutations.server.ts` | 4/5/6/7 | IN / NOT_REVIEWED |
| `app/forum/online-presence-heartbeat.test.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/online-presence-heartbeat.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/paths.ts` | 4 | IN / NOT_REVIEWED |
| `app/forum/profile-view.test.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/profile-view.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/profile.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/forum/profile.ts` | 4 | IN / NOT_REVIEWED |
| `app/forum/public-authz-degradation.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/forum/public-read.test.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/quote-markdown.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/quote-presentation.tsx` | 6 | IN / NOT_REVIEWED |
| `app/forum/request-context.ts` | 4 | IN / NOT_REVIEWED |
| `app/forum/route-error.test.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/technical-markdown.test.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/technical-markdown.ts` | 6 | IN / NOT_REVIEWED |
| `app/forum/ui.test.tsx` | 11 | IN / NOT_REVIEWED |
| `app/forum/ui.tsx` | 11 | IN / NOT_REVIEWED |
| `app/forum/under-development-view.tsx` | 4 | IN / NOT_REVIEWED |
| `app/forum/under-development.ts` | 4 | IN / NOT_REVIEWED |
| `app/forum/views.tsx` | 4/5/6/7 | IN / NOT_REVIEWED |
| `app/forum/visual-markdown-editor.tsx` | 6 | IN / NOT_REVIEWED |
| `app/forum/write-actions.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/i18next.d.ts` | 4 | IN / NOT_REVIEWED |
| `app/localization/bundles.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/bundles.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/catalog.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/cloudflare-m2m100-provider.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/cloudflare-m2m100-provider.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-generation-action.server.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-generation-action.server.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-generation-policy.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-generation-response.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-generation-status.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-generation-view.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-generation-view.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-markdown-translation.test.tsx` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-markdown-translation.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-post-body-execution.test.tsx` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-post-body-execution.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-post-body-planning.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-post-body-planning.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-post-body-publication.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-post-body-task-consumer.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-provider-allowance.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-provider-allowance.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-request-budget.server.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-request-budget.server.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-source-locale.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-source-locale.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-execution.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-execution.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-planning.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-planning.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-presentation.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-presentation.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-provider.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-publication.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation-task-consumer.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/content-translation.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/fingerprint.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/i18next-types.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/locale-navigation.tsx` | 8 | IN / NOT_REVIEWED |
| `app/localization/locale-rules.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/locale-rules.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/locale.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/manual-fingerprints.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/manual-packs.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/manual-values.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/persistent-registry.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/persistent-registry.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/persistent-sources.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/persistent-sources.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/registry.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/registry.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/request-context.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/request-context.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/resolver.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/resolver.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/resource-loader-bundles.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/resource-loader.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/resources.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/runtime.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/sources.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/tinyld-source-locale-detector.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/tinyld-source-locale-detector.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-execution.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-execution.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-failures.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-provider-data-policy.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-provider-data-policy.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-provider.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-provider.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-publication.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-publication.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-task-consumer.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-task-consumer.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-task-dispatch.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-task-dispatch.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-task-reconciliation.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-task-reconciliation.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-tasks.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-tasks.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-validation.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/translation-validation.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/ui-translation-service.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/localization/ui-translation-service.ts` | 8 | IN / NOT_REVIEWED |
| `app/markdown-syntax.ts` | 6 | IN / NOT_REVIEWED |
| `app/root.tsx` | 11 | IN / NOT_REVIEWED |
| `app/routes.ts` | 2 | IN / NOT_REVIEWED |
| `app/routes/api.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/attachment-download.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/routes/attachment-download.ts` | 7 | IN / NOT_REVIEWED |
| `app/routes/attachment-upload.test.ts` | 7 | IN / NOT_REVIEWED |
| `app/routes/attachment-upload.ts` | 7 | IN / NOT_REVIEWED |
| `app/routes/attention.tsx` | 5 | IN / NOT_REVIEWED |
| `app/routes/auth-api.test.ts` | 3 | IN / NOT_REVIEWED |
| `app/routes/auth-api.ts` | 3 | IN / NOT_REVIEWED |
| `app/routes/authorization-admin.test.ts` | 3 | IN / NOT_REVIEWED |
| `app/routes/authorization-admin.tsx` | 3 | IN / NOT_REVIEWED |
| `app/routes/category.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/credential-sign-in.tsx` | 3 | IN / NOT_REVIEWED |
| `app/routes/credential-sign-up.tsx` | 3 | IN / NOT_REVIEWED |
| `app/routes/home.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/locale-boundary.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/routes/locale-boundary.tsx` | 8 | IN / NOT_REVIEWED |
| `app/routes/locale-negotiation.test.ts` | 8 | IN / NOT_REVIEWED |
| `app/routes/locale-negotiation.ts` | 8 | IN / NOT_REVIEWED |
| `app/routes/mentions.test.ts` | 6 | IN / NOT_REVIEWED |
| `app/routes/mentions.ts` | 6 | IN / NOT_REVIEWED |
| `app/routes/not-found.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/not-found.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/notifications.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/notifications.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/popular.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/post-edit.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/presence.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/presence.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/profile.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/profile.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/search.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/section.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/tag.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/tags.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/topic.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/unanswered.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/under-development.tsx` | 4 | IN / NOT_REVIEWED |
| `app/routes/unread.test.ts` | 4 | IN / NOT_REVIEWED |
| `app/routes/unread.tsx` | 4 | IN / NOT_REVIEWED |
| `app/server-logging.test.ts` | 10 | IN / NOT_REVIEWED |
| `app/server-logging.ts` | 10 | IN / NOT_REVIEWED |
| `app/styles.css` | 11 | IN / NOT_REVIEWED |
| `app/theme.ts` | 11 | IN / NOT_REVIEWED |
| `app/ui-preview/index.html` | 11 | IN / NOT_REVIEWED |
| `app/ui-preview/main.tsx` | 11 | IN / NOT_REVIEWED |
| `app/ui-preview/preview-app.test.tsx` | 11 | IN / NOT_REVIEWED |
| `app/ui-preview/preview-app.tsx` | 11 | IN / NOT_REVIEWED |
| `app/ui-preview/preview-i18n.ts` | 11 | IN / NOT_REVIEWED |
| `app/ui-preview/preview.css` | 11 | IN / NOT_REVIEWED |
| `app/ui-preview/vite.config.ts` | 11 | IN / NOT_REVIEWED |
| `db/attachment-draft-generation.ts` | 7 | IN / NOT_REVIEWED |
| `db/authorization-repository.test.ts` | 3 | IN / NOT_REVIEWED |
| `db/authorization-repository.ts` | 3 | IN / NOT_REVIEWED |
| `db/authorization-service.ts` | 3 | IN / NOT_REVIEWED |
| `db/content-post-body-execution-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/content-post-body-task-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/content-request-budget-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/content-topic-title-execution-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/content-topic-title-task-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/content-translation-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `db/content-translation-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/editor-draft-context.ts` | 4 | IN / NOT_REVIEWED |
| `db/forum-attachment-cleanup.ts` | 7 | IN / NOT_REVIEWED |
| `db/forum-attachments.ts` | 7 | IN / NOT_REVIEWED |
| `db/forum-identifiers.ts` | 4 | IN / NOT_REVIEWED |
| `db/forum-repository.ts` | 4/5/6/7 | IN / NOT_REVIEWED |
| `db/forum-service.ts` | 4/5/6/7 | IN / NOT_REVIEWED |
| `db/forum-write-policy.ts` | 4 | IN / NOT_REVIEWED |
| `db/hyperdrive-authorization.test.ts` | 3 | IN / NOT_REVIEWED |
| `db/hyperdrive-authorization.ts` | 3 | IN / NOT_REVIEWED |
| `db/hyperdrive-content-generation-status.test.ts` | 8 | IN / NOT_REVIEWED |
| `db/hyperdrive-content-generation-status.ts` | 8 | IN / NOT_REVIEWED |
| `db/hyperdrive-content-translations.test.ts` | 8 | IN / NOT_REVIEWED |
| `db/hyperdrive-content-translations.ts` | 8 | IN / NOT_REVIEWED |
| `db/hyperdrive-forum-attachments.ts` | 7 | IN / NOT_REVIEWED |
| `db/hyperdrive-forum.test.ts` | 4 | IN / NOT_REVIEWED |
| `db/hyperdrive-forum.ts` | 4/5/6/7 | IN / NOT_REVIEWED |
| `db/hyperdrive-registry.test.ts` | 4 | IN / NOT_REVIEWED |
| `db/hyperdrive-registry.ts` | 4 | IN / NOT_REVIEWED |
| `db/hyperdrive-ui-translations.test.ts` | 8 | IN / NOT_REVIEWED |
| `db/hyperdrive-ui-translations.ts` | 8 | IN / NOT_REVIEWED |
| `db/locale-repository.test.ts` | 8 | IN / NOT_REVIEWED |
| `db/locale-repository.ts` | 8 | IN / NOT_REVIEWED |
| `db/postgres-deadlines.test.ts` | 9 | IN / NOT_REVIEWED |
| `db/postgres-deadlines.ts` | 9 | IN / NOT_REVIEWED |
| `db/schema.ts` | 9 | IN / NOT_REVIEWED |
| `db/translation-task-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/ui-translation-bundle-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `db/ui-translation-bundle-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/ui-translation-publication-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/ui-translation-store.ts` | 8 | IN / NOT_REVIEWED |
| `db/web-runtime-wiring.test.ts` | 2 | IN / NOT_REVIEWED |
| `doc_old/PROJECT_HISTORY_old_22.9.26_1.md` | 1 | CONTEXT |
| `doc_old/PROJECT_HISTORY_old_22.9.26_2.md` | 1 | CONTEXT |
| `doc_old/PROJECT_STATE_old_22.9.26_1.md` | 1 | CONTEXT |
| `doc_old/PROJECT_STATE_old_22.9.26_2.md` | 1 | CONTEXT |
| `doc_old/PROJECT_STATE_old_22.9.26_3.md` | 1 | CONTEXT |
| `doc_old/PROJECT_STATE_old_22.9.26_4.md` | 1 | CONTEXT |
| `doc_old/PROJECT_STATE_old_22.9.26_5.md` | 1 | CONTEXT |
| `doc_old/PROJECT_STATE_old_22.9.26_6.md` | 1 | CONTEXT |
| `doc_old/PROJECT_STATE_old_23.9.26_1.md` | 1 | CONTEXT |
| `doc_old/docs/auth/AUTHORIZATION_old_22.9.26_1.md` | 1 | CONTEXT |
| `doc_old/docs/translation/PROVIDERS_AND_JOBS_old_22.9.26_1.md` | 1 | CONTEXT |
| `doc_old/docs/translation/STORAGE_AND_VERSIONING_old_22.9.26_1.md` | 1 | CONTEXT |
| `docs/EDITOR.md` | 1 | IN / NOT_REVIEWED |
| `docs/UI_UX_PASS.md` | 1 | IN / NOT_REVIEWED |
| `docs/auth/AUTHORIZATION.md` | 1 | IN / NOT_REVIEWED |
| `docs/database/HYPERDRIVE.md` | 1 | EXCLUDED |
| `docs/database/MIGRATIONS.md` | 1 | IN / NOT_REVIEWED |
| `docs/translation/CONTENT_TRANSLATION.md` | 1 | IN / NOT_REVIEWED |
| `docs/translation/LOCALES.md` | 1 | IN / NOT_REVIEWED |
| `docs/translation/PROVIDERS_AND_JOBS.md` | 1 | IN / NOT_REVIEWED |
| `docs/translation/RESEARCH.md` | 1 | IN / NOT_REVIEWED |
| `docs/translation/STORAGE_AND_VERSIONING.md` | 1 | IN / NOT_REVIEWED |
| `docs/translation/UI_TRANSLATION.md` | 1 | IN / NOT_REVIEWED |
| `drizzle.config.ts` | 9 | IN / NOT_REVIEWED |
| `drizzle/0000_tan_johnny_storm.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0001_seed-locales.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0002_ui_translation_storage.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0003_gorgeous_donald_blake.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0004_forum_domain_foundation.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0005_calm_proemial_gods.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0006_loving_sentinels.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0007_durable_translation_tasks.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0008_translation_task_claim_lease.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0009_translation_task_completion.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0010_translation_task_generation_order.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0011_persistent_translation_locale_invariant.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0012_translation_task_retry_dlq.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0013_translation_task_reconciliation.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0014_content_translation_persistence.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0015_content_topic_title_tasks.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0016_content_post_body_tasks.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0017_content_translation_request_budget.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0018_source_locale_correction_permissions.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0019_content_provider_allowance_admission.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0020_translation_generation_permission.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0021_forum_tags.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0022_forum_reply_relationships.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0023_forum_topic_read_states.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0024_forum_reply_notifications.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0025_forum_topic_pins.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0026_best_answer_independent_from_solved.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0027_help_solutions_foundation.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0028_help_solution_moderation.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0029_help_question_needs_details.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0030_help_duplicate_workflow.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0031_help_user_moderation_signals.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0032_forum_profiles.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0033_forum_online_presence.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0034_forum_editor_drafts.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0035_forum_attachments_foundation.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0036_forum_attachment_security_events.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0037_forum_attachment_draft_generations.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0038_forum_attachment_cleanup_claims.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0039_forum_publication_receipts.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0040_post_edit_history_permissions.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0041_published_mentions.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0042_attachment_edit_snapshots.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0043_attachment_security_read_permission.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/0044_attachment_draft_conflict_boundaries.sql` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0000_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0001_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0002_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0003_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0004_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0005_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0006_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0007_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0008_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0009_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0010_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0011_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0012_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0013_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0014_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0015_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0016_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0017_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0018_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0019_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0020_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0021_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0022_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0023_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0024_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0025_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0026_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0027_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0028_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0029_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0030_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0031_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0032_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0033_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0034_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0035_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0036_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0037_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0038_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0039_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0040_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0041_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0042_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0043_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/0044_snapshot.json` | 9 | IN / NOT_REVIEWED |
| `drizzle/meta/_journal.json` | 9 | IN / NOT_REVIEWED |
| `eslint.config.js` | 2 | IN / NOT_REVIEWED |
| `package.json` | 2 | IN / NOT_REVIEWED |
| `pnpm-lock.yaml` | 2 | IN / NOT_REVIEWED |
| `pnpm-workspace.yaml` | 2 | IN / NOT_REVIEWED |
| `react-router.config.ts` | 2 | IN / NOT_REVIEWED |
| `scripts/configure-localization-deadlines.sql` | 12 | IN / NOT_REVIEWED |
| `scripts/reconcile-ui-translation-bundles.ts` | 8 | IN / NOT_REVIEWED |
| `scripts/smoke-production-worker.sh` | 12 | EXCLUDED |
| `scripts/smoke-workers.sh` | 12 | IN / NOT_REVIEWED |
| `tests/database/auth-runtime.test.ts` | 3 | IN / NOT_REVIEWED |
| `tests/database/authorization-snapshot.test.ts` | 3 | IN / NOT_REVIEWED |
| `tests/database/content-generation-status.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/content-post-body-task-planning.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/content-request-budget-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/content-topic-title-execution.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/content-topic-title-task-planning.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/content-translation-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/forum-attachment-publication.test.ts` | 7 | IN / NOT_REVIEWED |
| `tests/database/forum-attachments.test.ts` | 7 | IN / NOT_REVIEWED |
| `tests/database/forum-email-registration.test.ts` | 3 | IN / NOT_REVIEWED |
| `tests/database/forum-help-attention.test.ts` | 5 | IN / NOT_REVIEWED |
| `tests/database/forum-online-presence.test.ts` | 4 | IN / NOT_REVIEWED |
| `tests/database/forum-profiles.test.ts` | 4 | IN / NOT_REVIEWED |
| `tests/database/hyperdrive-registry.test.ts` | 4 | IN / NOT_REVIEWED |
| `tests/database/migrations.test.ts` | 9 | IN / NOT_REVIEWED |
| `tests/database/source-locale-correction.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/stage4-core-e2e.test.ts` | 4 | IN / NOT_REVIEWED |
| `tests/database/translation-generation-authorization.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/translation-task-generation-isolation.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/translation-task-reconciliation.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/translation-task-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/ui-translation-bundle-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/ui-translation-publication-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/ui-translation-storage.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/database/ui-translation-store.test.ts` | 8 | IN / NOT_REVIEWED |
| `tests/production-migration-verifier.test.ts` | 9 | IN / NOT_REVIEWED |
| `tsconfig.cloudflare.json` | 2 | IN / NOT_REVIEWED |
| `tsconfig.json` | 2 | IN / NOT_REVIEWED |
| `tsconfig.node.json` | 2 | IN / NOT_REVIEWED |
| `vite.config.ts` | 2 | IN / NOT_REVIEWED |
| `vitest.config.ts` | 2 | IN / NOT_REVIEWED |
| `vitest.database.config.ts` | 2 | IN / NOT_REVIEWED |
| `workers/app.ts` | 2 | IN / NOT_REVIEWED |
| `workers/attachment-storage.test.ts` | 7 | IN / NOT_REVIEWED |
| `workers/attachment-storage.ts` | 7 | IN / NOT_REVIEWED |
| `workers/database-bindings.test.ts` | 2 | IN / NOT_REVIEWED |
| `workers/database-bindings.ts` | 2 | IN / NOT_REVIEWED |
| `wrangler.jsonc` | 2 | IN / NOT_REVIEWED |

## Аудит форума — этап 10 (2026-10-22)

- Проверен `main` на `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Scope: создание тем и ответов; независимые solved/best-answer transitions; post ownership/authz/Origin; unread/new/read markers; reply/mention notifications; профиль и профильные counters; online presence и browser heartbeat.
- Прослежены UI → routes/actions → `ForumService` → `DrizzleForumRepository`/SQL; рассмотрены актуальные source-of-truth `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/UI_UX_PASS.md`, существующие unit/route tests и native PostgreSQL `tests/database/migrations.test.ts`, `stage4-core-e2e.test.ts`, `forum-profiles.test.ts`, `forum-online-presence.test.ts`.
- Подтверждённые свойства по коду и тестовым сценариям: серверные авторизация/Origin и привязка actor к session; topic/post consistency; best answer независим от solved; monotonic per-user unread marker с concurrent regression; owner-bound notification mark-read, dedup, atomic reply/notification transaction; public-only profile projection, owner-only profile write, URL validation; bounded 5-minute authenticated presence and rate-limited heartbeat. Тесты на этом шаге отдельно не запускались, live browser/external runtime не проверялись.
- Новых подтверждённых current-Stage defects по текущему проверенному scope не установлено. Непроверенные/дискуссионные наблюдения предыдущих этапов не повышаются до статуса командных defects до завершения всего аудита.
- Следующий этап после команды владельца: 11 — Help & Solutions и модерация. Изменений implementation, документации `main`, общего `.github/service-channel.md` и комментариев PR не делалось.


## AUD-20261022 — этап 1, часть 1

Статус: **PARTIAL — этап 1 не завершён**. Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Это продолжение поэтапного плана AUD-20261022, а не независимого аудита с другой нумерацией выше.

### Покрытие документации

Документы прочитаны целиком до фактического EOF, включая последние строки без завершающего перевода строки:

| Документ | Строки | Git blob | Статус |
| --- | ---: | --- | --- |
| PROJECT.md | 109 | d261cf8f85d2ecfb44c54ff327fc2cf8fce70e7e | DOC_READ, 1–EOF |
| README.md | 50 | c6e23326b23c6982bdf521b7dd60b351d73c25f4 | DOC_READ, 1–EOF |
| ROADMAP.md | 444 | 5cbaf503e3e6715f50635f8f131ee6034c90367c | DOC_READ, 1–EOF |
| SCAFFOLD_PLAN.md | 435 | 996f542bc166afa8b29952b4beb7501f9a54e43c | DOC_READ, 1–EOF |
| TRANSLATION_ARCHITECTURE.md | 250 | 0294c0245e846b5fdd5dab22bbc6afe79733cdcf | DOC_READ, 1–EOF |

Всего 1288 строк. DOC_READ обозначает полное чтение и сопоставление этих документов; не подтверждает реализацию требований в коде. Таблица manifest этапа 0 остаётся исходным снимком; эта запись — дополнительный журнал покрытия.

### Требования для последующих проверок

- Классическая структура category → section → topic → post; публичное чтение, участие после входа, безопасный Markdown/code.
- Модульный монолит с SSR; права приложения отделены от identity. Изменяемые роли и персональные allow/deny, актуальность полномочий на следующем запросе, защита от потери управления.
- Email verification, рассылки и password reset отложены решением владельца; не объявлять их отсутствие дефектом текущего объёма.
- Каноническая locale в URL имеет приоритет; registry поддерживает BCP47 без жёсткого потолка языков. Root negotiation: пользователь → cookie → Accept-Language → en.
- Locale routing зависит от HTTP method: GET/HEAD canonical redirects; неканонический mutation получает 404 до action без Location. Root negotiation — no-store.
- Для UI en — canonical source; внутри locale current local manual → persistent manual → machine, затем registry fallback → en. Устаревшие fingerprints не считаются текущими переводами.
- SSR i18next request-scoped; locale/resources и входы форматирования должны совпадать при hydration.
- Content translation привязан к неизменяемой revision и target locale; title/body разделены. Техническая структура Markdown сохраняется; invalid/unavailable translation возвращает текущий оригинал.
- Provider не вызывается внутри SSR; durable job сохраняется до enqueue, используются claim/generation/retry/stale fencing. Внешний exactly-once не предполагается.
- Solved и best answer проверяются как независимые состояния.
- Drafts/autosave обозначены ROADMAP как возможное будущее развитие после решения владельца, а не обязательный scope текущего Editor 2.0.
- SCAFFOLD_PLAN описывает исторический Stage 1; его первоначально узкий состав не сравнивается с текущим продуктом как перечень недостающих функций.
- Отложенная косметическая UI/UX полировка не исключает функциональные, security, data-integrity и authz дефекты.
- Operational утверждения об исключённых Cloudflare, Neon, Hyperdrive, R2, OAuth и backup/restore не проверяются и не становятся acceptance gates этого аудита.

### Проверки согласованности и ограничения

- Все 49 уникальных component IDs translation registry присутствуют в ROADMAP; лишних IDs в ROADMAP не обнаружено.
- Проверка файловых целей локальных Markdown-ссылок в этих пяти документах: отсутствующих целей нет. Это не проверка anchors или внешних URL.
- Подтверждённых противоречий внутри прочитанного среза не установлено. Сопоставление с PROJECT_STATE и профильными контрактами ещё впереди; общий вывод о документации или реализации не сделан.
- Исходники не менялись; tests/build/browser и внешние сервисы на этой части не запускались. Findings прежних проходов автоматически не перенесены.

### Остаток этапа 1

PROJECT_STATE.md, PROJECT_HISTORY.md, AGENTS.md (как предмет согласованности документации; инструкции уже прочитаны на этапе 0), docs/EDITOR.md, docs/UI_UX_PASS.md, docs/auth/AUTHORIZATION.md, docs/database/MIGRATIONS.md в прикладном объёме и шесть профильных документов docs/translation. docs/database/HYPERDRIVE.md исключён как сервисный документ; doc_old — только контекст при необходимости.

Следующая часть: полное чтение PROJECT_STATE.md и PROJECT_HISTORY.md с фиксацией действующего состояния и сверкой с базовыми требованиями, затем профильные контракты. По условию владельца исполнитель останавливается после этой части и ждёт разрешения продолжить этап 1.


## Аудит форума — этап 11 (предыдущий независимый проход, 2026-10-22)

- Этот checkpoint продолжает этапы 8–10 предыдущего прохода из текущего чата. Он **не** закрывает этап 5 отдельного цикла `AUD-20261022` и не изменяет его manifest, статусы и критерии покрытия.
- Source: `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Проверены Help & Solutions reader/actions/views: category modes all/open/active/solutions/mine/help/for-me, четыре комбинируемых фильтра, Help question creation и similar questions; server permissions и запросы.
- Проверены moderation signals (needs-details/needs-review/solution-outdated/duplicate), withdraw/accept/reject и устаревшие cases; решение/подмена best answer; duplicate canonical-root, self-link, active relation, appeals, private visibility; `/:locale/attention` с независимыми Signals/Complaints placeholders/Security Attachments, per-permission case visibility, counts, group-specific pagination и exact case IDs.
- Код и тесты: `app/routes/category.tsx`, `attention.tsx`, `topic.tsx`; `app/forum/actions.server.ts`, `views.tsx`; `db/forum-service.ts`, `db/forum-repository.ts`; `app/forum/public-read.test.tsx`, `write-actions.test.ts`; `tests/database/migrations.test.ts`, `forum-help-attention.test.ts`; relevant `PROJECT_STATE.md`, `docs/UI_UX_PASS.md`, `docs/auth/AUTHORIZATION.md`. Тесты прочитаны как evidence, но в этом шаге заново не запускались; live browser, real DB run и external runtime не проверены.
- Не установлено новых **подтверждённых** дефектов текущего Stage по проверенным цепочкам. Отсутствие видимых user-signal submission форм сверено с зафиксированным backend-only scope PR #206 и последующим moderator-queue PR #217; не классифицировать автоматически как дефект. Общий product-completeness вопрос оставить до финального этапа без преждевременного finding.
- Следующий этап предыдущего прохода (по новой команде владельца): 12 — сквозные сценарии авторизации, динамических разрешений и деградации зависимостей. `main`, общий service-channel и implementation PR не менялись.


## AUD-20261022 — этап 1, часть 2

Статус: **PARTIAL — этап 1 не завершён**. Baseline неизменен: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Нумерация относится только к AUD-20261022; записи независимого прохода сохранены.

### Покрытие

| Документ | Строки | Git blob | Статус |
| --- | ---: | --- | --- |
| PROJECT_STATE.md | 2020 | 0affd914738d9c94733d0e0ec1473f7b2569097c | DOC_READ, 1–EOF |
| PROJECT_HISTORY.md | 496 | a86ca1c654316e921c3f182437d69907faf4cab0 | DOC_READ, 1–EOF |
| AGENTS.md | 105 | 20acb9210685bf3347f153c0d44d19420e8dc9bc | DOC_READ, 1–EOF |

Полное чтение до фактического EOF и сопоставление с пятью документами части 1. В части 2 — 2621 строка; накопительно — восемь документов, 3909 строк. DOC_READ не является PASS реализации.

### Зафиксированные границы дальнейшей проверки

- Текущее продуктовое решение о removal drafts/autosave сопоставлено с историческими editor slices: исторические CAS/text-sync/recovery требования не переносятся в текущую обязательную функциональность.
- Upload/publication operation без текста, exact selected-file manifest, publication receipt, revision-fenced post edit и технический idle cleanup остаются прикладными контрактами для последующих этапов.
- Product-first usable MVP и отложенная косметическая полировка не отменяют проверки functional/security/data/authz defects.
- Для Help отдельно учитываются authoritative состояния, backend-only signal foundation, moderator queue и provisional UX; незаявленный текущим slice UI не объявляется автоматически дефектом.
- Historical ledger не используется как источник текущего поведения. В частности, старые записи stale-pack, authorization catch-all, generation ordering и persisted bundle convergence требуют сверки с актуальными профильными контрактами и кодом на соответствующих этапах.
- Чтение упоминаний excluded services — только контекст: внешние состояния, credentials, deployments, service API, grants и live acceptance не проверялись.
- Проверка файловых целей локальных Markdown-ссылок этих трёх документов не нашла отсутствующих целей; anchors и внешние URL не проверялись.
- Для точной сверки repository state read-only просмотрены локальный Git log и checked-in migration journal/наличие файла. Это не выполнение миграций и не аудит внешней БД.

Замечания этой части сообщаются владельцу в текущем чате; в служебный PR перенесены только покрытие, границы и следующий шаг по действующему порядку независимых проверок. Вывод о полном соответствии документации ещё не сделан. Tests/build/browser не запускались; реализация и документы main не менялись.

### Остаток и остановка

Полностью прочитать и сопоставить десять профильных документов: docs/EDITOR.md, docs/UI_UX_PASS.md, docs/auth/AUTHORIZATION.md, docs/database/MIGRATIONS.md в разрешённом прикладном объёме и шесть docs/translation/*.md. После этого — итоговая сверка требований и противоречий всего разрешённого документального объёма. docs/database/HYPERDRIVE.md остаётся исключённым, doc_old — контекстом при необходимости.

Следующая часть: docs/EDITOR.md и docs/UI_UX_PASS.md — действующий authoring/product scope и применимые acceptance требования. Исполнитель останавливается и ждёт разрешения владельца продолжить этап 1, часть 3.


## Аудит форума — этап 12 (предыдущий независимый проход, 2026-10-22)

- Продолжен прежний independent audit stages 8–11, `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. **Не относится к AUD-20261022**, не закрывает его этапы и не обновляет его manifest.
- Scope: Better Auth authenticated request/session/cookies и email/password boundary (без live Google OAuth); permission catalog, roles/grants/overrides, request-scoped PostgreSQL snapshot/freshness, authorization management UI/CRUD, last access-manager lockout, guest/cross-origin/forged input, resource ownership (topic/post/editor/attachments), classified dependency degradation и response status handling.
- Проверены `docs/auth/AUTHORIZATION.md`, `PROJECT.md`, `ROADMAP.md`, соответствующие положения `PROJECT_STATE.md`; `workers/app.ts`, `app/auth/*`, `app/authorization/*`, `app/routes/authorization-admin.tsx`, `app/forum/mutations.server.ts`, `app/routes/locale-boundary.tsx`, `app/routes/topic.tsx`, `app/routes/section.tsx`, `app/routes/category.tsx`, `app/routes/attention.tsx`, `app/routes/post-edit.ts`, `app/forum/editor-permission.server.ts`, `app/routes/attachment-upload.ts`, `app/routes/attachment-download.ts`, `db/authorization-*.ts`, `db/hyperdrive-authorization.ts`, `db/hyperdrive-forum.ts` и relevant existing unit/route/PostgreSQL tests.
- Established evidence from source/existing tests: effective permission independent from session role; one snapshot of role/grants/overrides; next-request request-local resolution; management mutators independently authorize within serialized DB lock, protect final manager; typed classified authorization unavailable vs unexpected errors; optional public UI degradation; protected route owner/Origin and per-permission gating; explicit boundaries on editor upload and download. No tests or live browser/runtime executed in this stage.
- Audit-wide findings are **not** transferred to shared communication channel before completion; preliminary findings remain in the conversation. No implementation, schema, `main`, service-channel or other cycle statuses changed.
- Next step on owner instruction: прежний этап 13 — завершить проверку Editor 2.0/Markdown/attachments и спорных findings (scope уточнить по уже согласованному плану); затем самостоятельный final coverage/test gap stage.


## AUD-20261022 — этап 1, часть 3

Статус: **PARTIAL — этап 1 не завершён**. Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Эта запись относится к AUD-20261022, отдельно от независимого прохода с другой нумерацией.

### Покрытие

| Документ | Строки | Git blob | Статус |
| --- | ---: | --- | --- |
| docs/EDITOR.md | 402 | a43653c66f323255e2fd2f63c3339fb18267bf3e | DOC_READ, 1–EOF |
| docs/UI_UX_PASS.md | 704 | 340d8e93d8669ee2212098f83ecaa8b87746652f | DOC_READ, 1–EOF |

Оба документа прочитаны полностью до фактического EOF и сопоставлены с материалами частей 1–2. В части 3 — 1106 строк; накопительно — десять документов, 5015 строк. DOC_READ не является проверкой реализации.

### Прикладные требования для последующих этапов

- Четыре authoring flows используют один Markdown source: create-topic, reply, Help question, published-post edit. Simple/Advanced и Preview/Fullscreen без правки не изменяют bytes; Undo/Redo переходит между режимами.
- Simple сохраняет protected/unsupported technical blocks, редактирует безопасные текстовые spans и обычные таблицы; изменение соседнего текста не пересериализует сложный блок. Native input/IME, whitespace, focused DOM, cross-leaf selection/Enter и table paste — отдельные обязательные переходы.
- Code Copy сохраняет исходные bytes без gutter/metadata; wrap/line numbers — presentation-only, code всегда LTR. Code-only Tab/indent/pairs не затрагивают prose. HTML/TSV clipboard import не должен молча терять неподдерживаемые данные.
- Цитата сохраняет автора и permanent anchor; collapse зависит от реальных видимых строк, а не только newline count. Simple, Preview/public и translation protection должны согласовываться.
- In-memory body/history сохраняются при mode/view switch и validation failure; reload/navigation не восстанавливают text draft. Account-scoped mode/spellcheck/wrap/line-number settings отделены от сообщения и не переносятся между аккаунтами.
- Немедленная загрузка и typed errors не мешают вводу текста; retained pending/error files блокируют Publish/Save. Attachment-only publication допустима. Stable upload identity и publication receipt защищают от logical duplicates после lost ACK.
- Remove изменяет mounted selection, а не удаляет pool ref; late ACK не возвращает снятый файл. Final submit публикует exact selected uploaded/retained IDs, проверяя authoritative owner/context/operation/permission/verification/ref/cleanup state.
- Save опубликованной правки использует expectedRevisionId и immutable history. Cancel/Remove не меняют public refs. Explicit rebase учитывает актуальный published baseline, явные local removals и новые local uploads; stale Save не применяет частичные изменения.
- Operation закрывается terminally при Cancel/Publish. Abandoned pool имеет 24-hour idle от успешного нового upload; Remove/read/failure/idempotent ACK не продлевают idle. Shared/published refs, durable claims и grace защищают от premature deletion.
- Файлы проверяются server-side по размеру, типу и bounded structure; active HTML/SVG не исполняется. Type-check не называется антивирусом. Suspicious events durable, deduplicated, permission-protected и read-only в Security/Attachments.
- Mentions связываются со stable account ID; уведомления создаются atomically при publish/edit, исключают quotes/code/self и дедуплицируются с reply и lifetime notified-set сообщения.
- Direction auto/manual сохраняет source; supported explicit markers узко распознаются. Technical content остаётся LTR. Browser spellcheck не обещает одинаковые словари/качество во всех ОС.
- Общий UI сохраняет category → section → topic → messages, canonical locale, catalog-owned strings, logical CSS, content lang/dir и safe provenance/original fallback.
- Best answer визуально идёт после original без перенумерации; solved независим. Help internal section скрыт из generic discovery; внимание, пользовательские сигналы, complaints scaffold и attachment security не смешиваются.
- Profiles остаются bounded public projection с owner-only write, без email/session/grants; присутствие основано на authoritative heartbeat и не считает guests. Выборки, ранжирование, counters и permission privacy проверяются по собственным контрактам позднее.
- Финальная browser/product matrix включает desktop/mobile/tablet, LTR/RTL/mixed content, Guest/User/Manager, populated/empty/error/pending и keyboard/focus/reflow/reduced-motion. Static Pages/green CI не доказывают real runtime flows.
- Позднее специальное условие Editor о Pages/owner visual acceptance только по запросу не смешивается с обязательной финальной product acceptance перед публичным релизом. Отложенная косметика не отменяет functional/security/data/authz checks.
- External сервисы и их acceptance из этого аудита исключены по указанию владельца; требования к внутренним lifecycle/download/authz остаются в объёме.

Файловые цели локальных Markdown-ссылок этих двух документов не содержат отсутствующих файлов; anchors/внешние URL не проверялись. Tests/build/browser и сервисные вызовы не выполнялись. Код и документы main не менялись. Замечания сообщены только владельцу в чате по порядку независимых проверок; PR содержит покрытие, требования и следующий шаг.

### Остаток и остановка

Осталось восемь профильных документов: docs/auth/AUTHORIZATION.md, docs/database/MIGRATIONS.md (прикладные контракты; сервисные разделы — только контекст) и шесть docs/translation/*.md. Затем требуется общая сверка всего разрешённого документального объёма. Исключённый docs/database/HYPERDRIVE.md не добавляется в объём.

Следующая часть: полное чтение AUTHORIZATION.md и MIGRATIONS.md, сопоставление dynamic permissions, ownership/lockout/error semantics и локальных schema/migration contracts. Исполнитель останавливается до разрешения владельца продолжить этап 1, часть 4.


## AUD-20261022 — этап 1, часть 4

Статус: **PARTIAL — этап 1 не завершён**. Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Продолжение AUD-20261022; нумерация независимого прохода не изменяется.

### Покрытие

| Документ | Строки | Git blob | Статус |
| --- | ---: | --- | --- |
| docs/auth/AUTHORIZATION.md | 264 | 79b68863e17bb1202609abd9d5641b5fc6454917 | DOC_READ, 1–EOF |
| docs/database/MIGRATIONS.md | 313 | e8ad5ef6b862ab4b7d57d9664a6f25fe810a685d | DOC_READ, 1–EOF; operational sections CONTEXT |

Оба документа прочитаны полностью до фактического EOF; сопоставлены с уже прочитанными базовыми/product/editor документами. В части 4 — 577 строк; накопительно — двенадцать документов, 5592 строки. DOC_READ не является PASS реализации. Внешние утверждения MIGRATIONS прочитаны как контекст без проверки сервисов и без расширения объёма.

### Требования для последующих прикладных проверок

- Better Auth определяет authenticated identity/session; application permissions разрешаются сервером из PostgreSQL, независимо от role claims/client input.
- Одна explicit role на пользователя с built-in user fallback, динамические built-in/custom grants и per-user overrides. Precedence: deny → allow → role grant → deny. Role inheritance/multiple-role membership не входят в текущую модель.
- Permission catalog code-backed: 15 документированных ключей. Все документированные initial grants входят в этот catalog: user — 7, moderator — 14, admin — 15. Это механическая проверка документа, а не сравнение с runtime catalog/seed/schema.
- editOwn, solution.manageOwn и sourceLocale.correctOwn проверяют authoritative ownership; pin и attachmentSecurity.read независимы. Управление duplicate/сигналами проверяется по своей persisted kind/resource applicability, а не по клиентскому выбору permission.
- resolveUser и management-state composite reads требуют internally consistent snapshot; freshness действует со следующего request, cache допускается только внутри request.
- Typed dependency unavailability отделена от denial. Protected mutation fail-closed; optional public controls могут деградировать только при classified availability failure. Unexpected schema/programming/config/invariant errors не подавляются catch-all.
- Каждая management mutation заново проверяет capability, validation и same-origin boundary; custom role удаляется только без assignments. Нельзя атомарно убрать последнего effective authorization manager. External bootstrap исключён; публичный unauthenticated bootstrap запрещён.
- Development schema evolution использует reviewed forward SQL, journal и snapshots. После merge SQL/snapshot/journal history immutable; исправление — forward migration.
- History guard, metadata check и clean PostgreSQL integration имеют разные цели. Local DB tests ограничены disposable PostgreSQL 17 с именем *_test; DATABASE_URL server/admin-only, без browser/Worker bundle и логирования.
- Feature schema и runtime могут merge вместе при доказанной local/CI согласованности; это не требует немедленной внешней миграции. Внешний rollout/evidence остаётся отдельной границей, исключённой из этого аудита; старое accepted external evidence не объявляется дефектом только из-за новых local migrations.
- Прикладное разделение DB capabilities следует реальным queries/least privilege; application roles не тождественны PostgreSQL runtime roles. Проверка внешних grants/credentials/Hyperdrive/deployment не выполнялась.

Проверка файловых целей локальных Markdown-ссылок в этих документах: отсутствующих файлов нет. Anchors и внешние URL не проверялись. Миграции/БД/tests/build/browser не запускались. Реализация и main-документы не менялись. Замечания переданы владельцу только в чате по порядку независимых проверок; в служебный PR записаны покрытие, требования и следующий шаг.

### Остаток и остановка

Остаются шесть документов docs/translation: LOCALES.md, UI_TRANSLATION.md, CONTENT_TRANSLATION.md, STORAGE_AND_VERSIONING.md, PROVIDERS_AND_JOBS.md и RESEARCH.md, затем финальная сверка разрешённого документального объёма.

Следующая часть: полностью прочитать LOCALES.md и UI_TRANSLATION.md, сопоставить locale routing/registry/fallback, UI source fingerprints, trust и SSR/hydration требования. Исполнитель останавливается до разрешения владельца продолжить этап 1, часть 5. Исключённые сервисы в объём не возвращаются.


## Аудит форума — этап 13 (предыдущий независимый проход, 2026-10-22)

- Относится исключительно к старому поэтапному аудиту (8→13) текущей цепочки сообщений. **Не обновляет AUD-20261022** и не засчитывается в его tracked manifest/status.
- Проверенная версия `main`: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Scope: in-memory редактор Simple/Advanced, source-preserving Markdown/Undo/Redo, quote/mention, edit form/history, upload/publish/cancel/ref manifest and private download/cleanup boundaries.
- По исходникам и существующим компонентным/route/native PostgreSQL тестам проверены editor history/CRLF/protected technical blocks; Markdown safe rendering/quotes/mentions; native submit replay/lock; отсутствие runtime text drafts/autosave; stable attachment ID/retry and selected-vs-pool refs; published edit CAS, exact retained+new attachment set, terminal operation, idempotent receipts and cleanup tests.
- Evidence: `docs/EDITOR.md`, top current `PROJECT_STATE.md`, `app/forum/markdown-editor.tsx`, `editor-attachments.tsx`, `editor-document.ts`, `visual-markdown-editor.tsx`, `markdown.tsx`, `quote-*.ts*`, `mentions.ts`, `views.tsx`, `app/forum/actions.server.ts`, `db/forum-repository.ts`, `db/forum-attachments.ts`; `app/forum/public-read.test.tsx`, `markdown-editor.test.tsx`, `editor-attachments.test.tsx`, `attachment-operation.test.tsx`, `editor-document.test.ts`, `markdown.test.tsx`, `tests/database/forum-attachments.test.ts`, `forum-attachment-publication.test.ts` (existing tests inspected, not executed).
- Limit: local runtime has no project checkout and direct GitHub is network-blocked; fresh Chromium+Worker+Postgres/R2 E2E not performed. Checkpoint **does not declare definitive clearance** of potential UI conflicts/stalled uploads. Audit findings remain in chat until owner authorizes publication at completion; no unverified finding placed in general channel.
- Next on explicit owner command: итоговый этап — матрица реализованных функций/requirements против reviewed/tested evidence, remaining gaps, disputed findings and their Stage classification. No modification of implementation/main or other audit cycle.


## AUD-20261022 — этап 1, часть 5

Статус: **PARTIAL — этап 1 не завершён**. Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Эта запись относится только к AUD-20261022.

### Покрытие

| Документ | Строки | Git blob | Статус |
| --- | ---: | --- | --- |
| docs/translation/LOCALES.md | 571 | f58527e4a3067ca593c9a91ee7cdd195c0459193 | DOC_READ, 1–EOF |
| docs/translation/UI_TRANSLATION.md | 452 | dabc15f8c466f670c60b97395e818c50891b597c | DOC_READ, 1–EOF |

Полное чтение до фактического EOF, включая последнюю строку LOCALES без завершающего newline. В части 5 — 1023 строки; накопительно — четырнадцать документов, 6615 строк. DOC_READ не означает PASS реализации.

### Требования для последующих прикладных проверок

- Canonical BCP47 translation identity отделена от formatting extensions/preferences; locale не задаёт timezone. SSR и hydration получают одинаковые formatting inputs и initial relative-time reference.
- Registry — единственный источник разрешённых locale и UI direction; readiness и publication независимы. Alias/match/fallback graph проверяется на ambiguity/cycles/duplicates; exact reserved api/assets не являются prefix ban.
- en code-owned, active/ready bootstrap; persistent en запрещён. Persistent rows валидируются целиком как graph; invalid dataset не публикуется. Empty healthy bootstrap-only state отличается от expected migration acceptance.
- Один lazy immutable registry snapshot на request; technical routes без locale consumer не открывают registry DB path. Cross-request stale registry cache и module-global pg Client/Pool не разрешены этим baseline.
- Classified registry unavailable/schema/integrity failure допускает bootstrap-only English; non-English GET/HEAD временно redirect-ится с no-store без записи preference cookie, writes fail closed. Programming failures автоматически не маскируются.
- Controlled graph writer использует short SERIALIZABLE transaction и self-exclusive table lock до первого SELECT/DML; no external side effects inside transaction. Unknown commit outcome требует reconciliation, а не blind retry.
- Explicit URL authoritative: active alias/case/deprecated GET/HEAD → 308 canonical; unknown/inactive/disabled/malformed → 307 /en с remainder/query. Non-GET/HEAD redirect-required → 404 без Location до action. Root negotiation только GET/HEAD, user → cookie → Accept-Language → en, q=0 исключён.
- Locale boundary server loader обязателен для server validation при client navigation; middleware сам по себе не гарантирует network request. Неизвестный child route возвращает реальный 404.
- Bootstrap/resource fallback не включает implicit i18next locale reduction/dev. По locale specificity exact-target machine может выиграть fallback-locale manual; внутри locale current local manual → persistent manual → machine.
- Resources остаются раздельными по locale; fallback не flatten-ится в target, особенно для plural rules. Только текущая route locale chain/namespaces передаётся клиенту; все language packs целиком не импортируются.
- Canonical English descriptor содержит semantic metadata; missing canonical key — catalog defect. Structured plural/select единица имеет общий lifecycle/fingerprint и полный required branch set.
- Local packs допускают partial/stale state; unknown keys, invalid placeholders/structure/markup — structural errors. Stale value исключается с fallback; автоматический re-fingerprint без review запрещён. Strict zero-stale CI не предполагается.
- SSR i18next request-scoped; browser использует те же locale/chain/resources/versions без повторного language detection.
- Verified persisted bundle hit обходит raw namespace reads; miss/invalid/incompatible deploy использует controlled raw/local/English fallback. Provider в read path не вызывается. Machine publication атомарна с task completion и exact-locale whole-namespace bundle.
- UI generation eligibility: registered canonical non-English, active/inactive допустимы, disabled запрещён; planner/preflight используют один predicate. Self-healing bounded/deduplicated/internal-policy controlled; page request не запускает прямой provider/fan-out.
- Provider/local output недоверен; placeholders, technical tokens, branch structure, size, emptiness и markup проходят runtime validation. Plain provider не объявляется structured-capable.

Указанные в документах 28 уникальных component references присутствуют в architecture registry; неизвестных IDs не обнаружено. Файловые цели локальных Markdown-ссылок существуют; anchors и внешние URL не проверялись. Новых подтверждённых противоречий в прочитанной части не установлено; полная сверка с оставшимися translation/storage/job контрактами ещё не завершена.

Tests/build/browser, внешние сервисы и их acceptance не выполнялись. Исходники и main-документы не менялись.

### Остаток и остановка

Остались CONTENT_TRANSLATION.md, STORAGE_AND_VERSIONING.md, PROVIDERS_AND_JOBS.md и RESEARCH.md, затем итоговая сверка всего разрешённого документального объёма.

Следующая часть: полностью прочитать CONTENT_TRANSLATION.md и STORAGE_AND_VERSIONING.md, сверить immutable revisions, protected content, freshness/trust, bundle identity и cache/read semantics. Исполнитель останавливается до разрешения владельца продолжить этап 1, часть 6.


---

## Рабочая фиксация статуса двух аудитов — 2026-10-22 (без закрытия)

**Статус: ОБА АУДИТА ОТКРЫТЫ.** Эта запись — рабочий checkpoint в личном файле Лиры, **НЕ** финальное заключение, не утверждение о полном покрытии и не согласованный командный finding. Владелец прямо разрешил использовать личный файл как рабочее пространство, но запретил объявлять аудит завершённым до фактического завершения.

### A. Предыдущий независимый проход (14 этапов) — не путать с AUD-20261022

- Поэтапный обзор всех 14 запланированных шагов проведён; статическая сверка основных подсистем, действующих требований и существующих тестов выполнена с неодинаковой глубиной. **Это НЕ подтверждение полного аудита всего согласованного объёма**: нет доказанной исчерпывающей матрицы требований и проверок каждого заявленного сценария/файла; полный браузерный E2E и независимый прогон прикладных/PG тестов в этом проходе не выполнены. Повторение отдельных частей не закрывает эти пробелы.
- Зафиксированный источник: GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; PR #232 head `a528c6d2cfba8029072c1f18ae963946a0bbd744` имеет идентичный Git tree `18e73a062eb06984fd0b28132f510a5b12b1cfe2`. GitHub Actions run #39615502080: jobs `checks` и `database` SUCCESS на том tree; это evidence прошлой CI-проверки, а не свежий самостоятельный test run.
- Области, проверенные в предыдущем проходе: публичные маршруты/категории/разделы/темы, search/popular/unanswered/tags; публикация и reply, solved/best-answer, unread/notifications/profiles/presence; Help & Solutions/duplicate/moderation; auth/authorization/degraded paths; Editor 2.0 Simple/Advanced/Markdown/quote/mentions/history; вложения, приватность, CAS/идемпотентность/cleanup. Ранние checkpoints этапов 9–13 находятся выше в файле; поздние итоги 14-го этапа присутствовали в текущем чате, но не были ранее записаны в личный файл.
- **Предварительное техническое наблюдение E1, current Editor 2.0 scope:** stale published-post edit. `db/forum-repository.ts` отвергает stale expected revision; `app/forum/actions.server.ts` возвращает `409` через `app/forum/mutations.server.ts`; после неуспешного action React Router обычно не revalidate loader; `app/forum/views.tsx` (состояние `editBaseRevisionId`, Save disabled при несовпадении, rebase только при появлении нового `post.body.id`) не инициирует обновление при `conflict`. Тест `app/forum/public-read.test.tsx` около строки 2314 проверяет успешный rebase после **явного** `router.revalidate()`, а не автоматическое восстановление после `409`. Сервер защищает данные, но путь восстановления в UI предположительно недоступен до внешнего refresh. Сильное source-level finding; реальный интегрированный браузерный сценарий не запускался. В текущем чате эта цепочка названа дефектом current Stage; перед окончательным командным статусом сверить отрицательные/альтернативные маршруты обновления и не переоценивать доказательства.
- **Предварительное наблюдение E2, conditional:** `app/forum/editor-attachments.tsx` `XMLHttpRequest` не устанавливает `timeout`/`ontimeout`, `uploading` запрещает индивидуальный Remove, `blocking` не позволяет публиковать при неоконченном upload. Изолированный Chromium опыт с удержанным запросом показал ожидаемое браузерное поведение; интегрированный runtime форума не воспроизведён. Утверждённый `docs/EDITOR.md` обеспечивает retry/remove после **ошибки** и блокирует публикацию во время upload; максимальное ожидание отдельно не задано. Требуется корректно определить, является ли случай current-Stage дефектом или возможным улучшением UX/сети до pre-release; не назначать исправление автоматически.
- **Предварительное наблюдение E3, семантика:** `app/forum/mutations.server.ts` `runForumMutation` переводит любые другие исключения в `503 unavailable`, тогда как `runSourceLocaleCorrection` unexpected error пробрасывает. Это установленный факт кода, но нарушение конкретного current-Stage контракта/реальный сценарий не доказаны. Не назначать исправление только из-за несовпадения стиля.
- **Исключено из дефектов**: drafts/autosave Editor удалены по решению владельца 2026-10-20; Stage 6 live OAuth/providers/Queues/deployment/backup и последующий визуальный refinement не объявлять current-Stage обязательствами без прямого текущего scope.
- **Следующее для этого прохода:** восстановить требования и доказательства ранних этапов из доступного контекста, отделить проверенную реализацию от просто упомянутых тестов, устранить критические незакрытые логические звенья в E1–E3, затем дать честную оценку достаточности покрытия. Итоговая публикация/закрытие — только по фактически установленной полноте.

### B. Отдельный полный аудит `AUD-20261022` (0–13)

- **Статус не изменён:** этап 0 завершён; этап 1 частично выполнен (через часть 5); этапы 2–13 не закрыты этим циклом.
- Сохранены собственный manifest, exclusions, per-file evidence и критерии этапов в секции `Поэтапный аудит текущего чата — AUD-20261022`. Результаты предыдущего прохода **не засчитывать** автоматически.
- Следующая назначенная внутри `AUD-20261022` часть: этап 1, часть 6 — полное чтение `docs/translation/CONTENT_TRANSLATION.md` и `STORAGE_AND_VERSIONING.md`, затем оставшиеся документы и итоговый документальный reconciliation. Этот пункт записан как состояние **другого плана**, не как новая команда текущему чату.

### Правила дальнейшей записи

- Рабочие заметки можно сохранять только в `.github/agents/chatgpt-6.md` в служебной ветке PR #236 с пометками evidence/uncertainty и явным именем аудита.
- Не писать неподтверждённые findings в общий `.github/service-channel.md`, не назначать работу другим агентам, не трогать implementation или `main` во время аудита.
- Не использовать `DONE`, `полный аудит завершён`, `final clearance` до проверки всех обязательных требований выбранного аудита.


---

## Первый аудит — дополнительная подзадача: локализация и переводы (2026-10-22)

**Статус: подзадача проверки source/contracts/tests выполнена; ПОЛНЫЙ АУДИТ НЕ ЗАКРЫТ.** Только предыдущий independent audit из текущего чата, не `AUD-20261022`. Baseline GitHub main `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.

**Контракт:** `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `TRANSLATION_ARCHITECTURE.md`; профильные `docs/translation/LOCALES.md`, `UI_TRANSLATION.md`, `CONTENT_TRANSLATION.md`, `STORAGE_AND_VERSIONING.md`, `PROVIDERS_AND_JOBS.md`. Внешние Stage 6 providers, Queue, Neon, OAuth и deployed acceptance не проверяются и не становятся current-Stage defects только по отсутствию запуска.

**Trace reviewed:**
1. `app/routes/locale-boundary.tsx`, `app/localization/resolver.ts`, `locale.ts`, `resource-loader.ts`, `runtime.ts`, `persistent-sources.ts`, `db/hyperdrive-ui-translations.ts`: canonical explicit locale loader/middleware; non-GET redirect-required paths fail closed; деградация registry → English; target/fallback locale resources separate; local current > persistent manual > machine within locale; persisted compiled hit avoids raw namespace fetch; invalid/degraded bundle falls back to raw/local/English; SSR snapshot initializes request-scoped i18next, without language re-detection or provider request.
2. `app/localization/content-translation.ts`, `content-translation-presentation.ts`, `app/routes/topic.tsx`, `db/content-translation-store.ts`: content identity by type/id/revision/target; same-known-source skips lookup, missing/invalid/stale/classified unavailable shows original current revision; quote attribution check and per-block provenance/language/direction; title and post body distinct; attachment-only empty bodies excluded from translation units; manual translation outranks machine on same exact identity.
3. `app/localization/content-translation-planning.ts`, `content-post-body-planning.ts`, `content-translation-execution.ts`, `content-post-body-execution.ts`, `content-translation-task-consumer.ts`, `content-post-body-task-consumer.ts`, `content-post-body-publication.ts`, `content-translation-publication.ts`, `content-markdown-translation.ts`: authoritative revision + permitted target/source; stable committed task before enqueue; re-evaluate active generation/revision/policy/claim/provider data bounds; protected AST segments exclude code/technical tokens, output reconstituted with structure/attribution check.
4. `db/content-topic-title-execution-store.ts`, `db/content-post-body-execution-store.ts`, `db/translation-task-store.ts`: machine publish locks generation head → task → current topic/post revision; conditional claim and exact expected revision, serialized transactional write and completion; stale provider results rejected, manual current translation preserved, completion failure rolls back body write; lost claim/duplicate delivery protected.
5. Existing tests reviewed as code/evidence (not executed here): `app/localization/content-translation.test.ts` (11), `content-translation-presentation.test.ts` (7), `content-markdown-translation.test.tsx` (12), `content-post-body-planning.test.ts` (11), `resource-loader-bundles.test.ts` (5), `resources.test.ts` (10), `app/routes/locale-boundary.test.ts` (5); `tests/database/content-post-body-task-planning.test.ts` (26), `content-topic-title-execution.test.ts` (14), `content-translation-store.test.ts`. Проверяются stale revision during provider window, manual concurrent writes, claim loss, failed completion rollback, no duplicate provider, budget/dedup, original fallback. Дополнительно есть CI exact-tree success PR #232 run #39615502080, но fresh tests/browser не запускались.

**Результат:** в проверенной translation source/persistence/recovery цепочке новых подтверждённых дефектов актуального Stage не установлено. Отсутствие реальной Queue/provider acceptance — явно Stage 6, не finding текущего scope. Это не PASS каждого translation-модуля и не полный security/release audit.

**Остаток первого аудита:** иные ранее не доказанно покрытые области и cross-boundary матрица требований/реализации/тестов; уточнение E1–E3 предыдущего checkpoint и классификация только при наличии достаточных доказательств. Следующая самостоятельная подзадача по команде владельца: сквозные транзакционные, миграционные и security boundaries на уровне приложения, с акцентом на ранее частично проверенные узлы. `AUD-20261022` state/manifest не изменены.

**Сохранение:** личный файл Лиры; `main`, implementation PR, `.github/service-channel.md` и другие personal files не менялись.


---

## Первый аудит — дополнительная подзадача: миграции, транзакции и прикладная безопасность (2026-10-22)

**Статус:** завершена только эта ограниченная подзадача **первого** независимого аудита; **полный аудит Vico Forum остаётся открытым**. Это НЕ этапы/покрытие отдельного `AUD-20261022`. Baseline GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.

### Требования и Stage boundary
- `AGENTS.md` прочитан с `main`; `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/auth/AUTHORIZATION.md`, `docs/database/HYPERDRIVE.md` получены и просмотрены до EOF. Действующий local/CI Stage 4–5 с последующими Editor 2.0 исправлениями отделён от Stage 6 external providers/OAuth/Neon/Hyperdrive/R2 acceptance. Прочие исторические срезы PROJECT_STATE не заменяют текущий блок 2026-10-20.
- Миграции и схемы **аудированы выборочно по критическим границам**, не заявлено чтение всех 45 SQL или всех snapshots, не заявлен live внешний DB audit.

### Проверенная реализация / evidence
1. **Journal/migrations/CI:** `drizzle/meta/_journal.json` содержит 45 последовательных уникальных tags (0–44), возрастающие timestamps; последняя SQL `drizzle/0044_attachment_draft_conflict_boundaries.sql` с owner/context/attachment FK и backfill, без перезаписи предыдущих migration. `.github/scripts/migration-history.mjs` запрещает переписывать accepted SQL/snapshots/journal; `.github/scripts/production-migration-contract.mjs` проверяет timestamp/hash prefixes и post exact match; `.github/scripts/production-schema-manifest.mjs` сверяет schema shape. `.github/workflows/ci.yml`: migrations-history guards, schema parity, clean PG17, runtime privilege probes, split-Hyperdrive local smoke. `tests/database/migrations.test.ts` проверяет 45 миграций/immutable revisions/FK/concurrency/constraints. GitHub Actions run #39615502080 exact source tree PR #232: checks/database SUCCESS 2026-10-21, but **fresh локальные прогоны в аудите не выполнены**. Live production migrate/privileges не проверялись (Stage 6).
2. **Forum writes:** `app/forum/actions.server.ts`, `app/forum/mutations.server.ts` требуют session user, same-origin, актуальную server-side permission; caller-supplied actor не является авторитетным. `db/forum-repository.ts` `createTopicWithInitialPost`/`createPost` — transaction, owner/context upload scope lock, cooldown, FK-bound topic/post/revisions, selected private refs, receipt request fingerprint и rollback вместе с mentions/notifications. `editPublishedPost` сериализует scope, блокирует post row, проверяет post.authorId и expectedRevisionId, избирательные старые refs, CAS current revision, новый immutable revision + mentioned recipients + receipt в одной transaction; stale edit — 409, опубликованная версия защищена.
3. **Authz:** `app/routes/authorization-admin.tsx`, `db/authorization-service.ts`, `db/authorization-repository.ts` — protected UI manager permission, Origin, повторный permission check **внутри serialized mutation under FOR UPDATE** `authz_mutation_lock`, last-manager lockout. `withReadSnapshot` использует REPEATABLE READ READ ONLY. Negative/concurrency evidence: `tests/database/migrations.test.ts` около 1477/1558, `tests/database/authorization-snapshot.test.ts`; ветки classified unavailable не смешиваются с forbidden. External provisioning excluded.
4. **Private attachments:** `app/routes/attachment-upload.ts` требует identity/Origin/current authoring permission до обращения в private R2; stable UUID, selected safe response без object key; `app/routes/attachment-download.ts` published refs read public (только после публикации), draft read bound to authenticated owner+context+operation; response nosniff/no-store/CSP sandbox/limited safe inline types. `db/forum-attachments.ts` validates ownership/ref creation and serializes owner/context; `db/attachment-draft-generation.ts` uses transaction advisory scope lock + terminal generation marker; `db/forum-attachment-cleanup.ts` claims deletions durably and retries after ambiguous delete, referential checks guard shared refs. Evidence: `app/routes/attachment-upload.test.ts`, `attachment-download.test.ts`, `tests/database/forum-attachments.test.ts` (owner-negative, revoke/closed operation, duplicate retry, concurrent claims, ref cleanup).
5. **Additional tests inspected** `tests/database/migrations.test.ts` (31 cases including cooldown, transaction rollback, duplicate signaling, immutable revisions, manager race, lost COMMIT ACK), `tests/database/forum-attachments.test.ts` (23), `app/routes/attachment-upload.test.ts` (18), `attachment-download.test.ts` (4), `tests/database/authorization-snapshot.test.ts` (2). Их наличие и код **не равны** самостоятельному прогону.

### Вывод и остаток
- В пределах названных **просмотренных** application transactional/security/migration boundaries **новых подтверждённых дефектов текущего Stage не установлено**. **Это не положительный результат независимого исполнения всех DB/security checks** и не означает, что весь manifest проверен.
- Ранее сохранённое E1 (409 → stale UI rebase), E2 (non-terminating upload), E3 (catch-all unknown → 503) остаётся отдельной рабочей классификацией. E3 установлено повторно в `runForumMutation`, но нет достаточного доказательства нарушения конкретного действующего Stage contract: не повышать до current-Stage defect по стилистическому различию.
- **Не проверено**: все 45 SQL и 45 snapshots построчно; полный threat-model/cross-boundary scenario matrix; actual local fresh PG run/real browser; external credentials/provisioning/production state (снято Stage 6). Эти пробелы не скрываются утверждением о «полном аудите».
- **Следующая подзадача первого аудита после отдельной команды:** итоговая сводка реально просмотренных требований и взаимосвязей по первому проходу; определить точные пробелы в исходном scope и остаточную классификацию findings, не подменяя результаты `AUD-20261022`. Сначала диагностика и trace, а не назначение исправлений.

**Границы записи:** обновлён только личный `.github/agents/chatgpt-6.md` PR #236. `main`, implementation PR, общий `.github/service-channel.md` и чужие personal files не изменять. Полный аудит НЕ объявлять завершённым до доказанной полноты.


---

## Первый аудит — сверка доказанного покрытия и E1–E3 (2026-10-22)

**Статус: ПОДЗАДАЧА «МАТРИЦА ПОКРЫТИЯ И ПЕРЕКЛАССИФИКАЦИЯ» ВЫПОЛНЕНА, ПЕРВЫЙ ПОЛНЫЙ АУДИТ НЕ ЗАКРЫТ.** Только предыдущий independent audit с 14 обзорными этапами; **не** `AUD-20261022` с 437 tracked files. Baseline `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; exact-tree CI `checks`/`database` SUCCESS на #39615502080, 2026-10-21, но это не индивидуальный независимый прогон.

### Матрица «требование / реализация / существующие тесты / степень прямой проверки»

`SR` — прямо прослежены исходники и контракты; `TS` — соответствующие тесты прочитаны, но не выполнялись новым прогоном; `EV-PARTIAL` — нет достаточно конкретного журнала покрытия, либо проверены только части. Ниже **нет ни одного заявления о PASS отдельного runtime E2E**.

| Область текущего прикладного Stage | Source-to-contract evidence | Test evidence, просмотрено без запуска | Уверенность/остаток |
| --- | --- | --- | --- |
| Рабочая архитектура/конфигурация, SSR и route graph | Неполный реконструируемый trace этапов 1–8; `PROJECT.md`, `ROADMAP.md`, части `PROJECT_STATE.md` и routing рассмотрены | build/Workers CI старого exact tree | **EV-PARTIAL**: ранние 1–8 не имеют равнозначного предметного checkpoint |
| Email/password session/identity, logged-in guest boundaries (без OAuth) | Этап 12: Better Auth request/session, `workers/app.ts`, `app/auth/*`, protected actions | auth/route/API tests упомянуты в этапе 12; список кейсов не полностью реконструирован | **SR + TS partial** |
| Server authorization (roles/overrides/last manager/degraded) | Этап 12 + отдельная transactional security подзадача; `db/authorization-repository.ts`, manager route, `docs/auth/AUTHORIZATION.md` | `tests/database/migrations.test.ts` manager concurrency, `authorization-snapshot.test.ts`, route security | **SR + TS** |
| Public discovery/navigation, categories/sections/search/popular/tags/unanswered | Этап 9; `app/routes/*`, `db/forum-repository.ts`, relevant read paths | `app/forum/public-read.test.tsx`, `tests/database/migrations.test.ts` и другие профильные | **SR + TS** |
| Create topic/reply, unread, notifications, profiles, presence, solved/best | Этап 10; routes/action/service/SQL | `tests/database/stage4-core-e2e.test.ts`, `forum-profiles.test.ts`, `forum-online-presence.test.ts` и route tests | **SR + TS** |
| Help, moderation signals, duplicate/appeals/attention | Этап 11; readers, actions, moderator permissions, visibility and case IDs | `forum-help-attention.test.ts`, `app/forum/write-actions.test.ts`, `public-read.test.tsx` | **SR + TS** |
| Editor 2.0 Simple/Advanced/Markdown/quotes/mentions, mode switches and live published edit | Этап 13 + последующие E1–E3; `docs/EDITOR.md`, `views.tsx`, editor code | `markdown-editor.test.tsx`, `editor-document.test.ts`, `public-read.test.tsx` | **SR + TS; E1 ещё требует уточнённого test/repro** |
| Attachment auth/upload/download, selected/ref lifecycle, cleanup | Этап 13 + transactional/security подзадача; owner/operation scope locks, private/public ref, R2 gates | `app/routes/attachment-*.test.ts`, `tests/database/forum-attachments.test.ts`, `forum-attachment-publication.test.ts` | **SR + TS; E2 лишь conditional scenario** |
| Locale routing, UI content translation, Markdown protection, jobs/publication | Дополнительная отдельная подзадача; relevant translation architecture/details and content/UI store | `content-translation*.test.ts`, `content-markdown-translation.test.tsx`, `tests/database/content-*-execution*.test.ts`, `resource-loader-bundles.test.ts` | **SR + TS, профилированные source paths** |
| PostgreSQL schema, migrations, constraints, authz races, durable publication | Дополнительная подзадача: journal 45 tags, критические transactional paths/CI guards | `tests/database/migrations.test.ts`, `forum-attachments.test.ts`, migration/history/privilege scripts | **EV-PARTIAL**: не все 45 SQL + 45 snapshots проверены построчно; миграционные guards и CI это не заменяют |
| Runtime error mapping, storage outages and failure recovery | Этап 12 + security/mutation source; typed authz vs storage and failure paths | `app/forum/write-actions.test.ts`, `app/forum/route-error.test.tsx` | **SR + TS partial; E3 contract unresolved** |
| Интерактивная доступность, responsive/hydration, keyboard/IME, actual browser UX | Части editor/design contracts просмотрены; подробной полной матрицы real-state observations в первом аудите нет | CI + component tests; isolated Chromium test чужого браузерного механизма ≠ forum E2E | **EV-PARTIAL; не выдавать за runtime acceptance** |
| Source-of-truth coverage, integration constraints, final triage | Исходные 14 обзорных шагов обсуждены; полноценный requirement/scenario trace восстанавливается сейчас | `main` / CI references | **EV-PARTIAL**: в ранних 1–8 нет надёжного точного доказательного ledger; не переносить manifest или DONE другого `AUD-20261022` |

**Значение матрицы:** `SR + TS` означает положительный **source-level review исследованного механизма**, не исчерпывающую проверку всего поддерева и не запуск tests. Наличие теста не закрывает неописанный сценарий. Расхождение review-depth в ранних этапах 1–8 — главный текущий недостаток доказательного покрытия; нельзя объявить «полный аудит завершён» только потому, что ранее перечислены номера 1–14. Не путать с требованием read-every-file из отдельного AUD-20261022.

### Re-triage E1–E3 с проверкой альтернатив

- **E1 (409 published post edit): сильное, current-Stage source-level defect finding; full integrated 409 repro не проводилось.** `app/forum/actions.server.ts` `intent=editPost` → `runForumMutation` → `db/forum-repository.ts` rejects stale expected revision 409; React Router v8 Framework SSR documented default: failed 4xx/5xx does **not** revalidate active loaders. `app/routes/topic.tsx` no `shouldRevalidate` override; `app/forum/views.tsx` records `editBaseRevisionId`, handles failure only by clearing publication tracker, only enables rebase once `post.body.id` changed via loader; no `revalidator.revalidate` on action error. `app/forum/public-read.test.tsx` 2314 verifies rebase after **manual** `router.revalidate()`; 2621 verifies text remains after 400 but **not** loader refresh after 409. **Alternatives checked:** `OnlinePresenceHeartbeat` revalidates only homepage on normal heartbeat (or 401 session refresh); `ContentGenerationManager` may revalidate when translation work is queued/polled, unrelated to 409 and not guaranteed for ordinary editor. User navigation/refresh can eventually supply new loader data, so claim **not** «rebase impossible ever», precisely «failed stale Save does not guarantee new current revision or discoverable direct recovery, editor stays stale until unrelated revalidation/navigation». Current editor contract requires explicit rebase and preservation of typed text; likely violated in 409 flow. Before assigning implementation, confirm with deterministic route-level failed-409 test (or integrated repro if available) and decide appropriate current-Stage correction.
- **E2 (pending upload indefinitely): NO established current-Stage defect.** `app/forum/editor-attachments.tsx` XHR no timeout/ontimeout; while pending no individual Remove, publish blocked; overall Cancel abort exists. Isolated held-XHR Chromium reproduces browser mechanism only. `docs/EDITOR.md` 192–198, 268–278 requires blocking while pending, Retry/Remove **on failed upload**, but specifies no max pending lifetime/individual in-progress cancel. Treat as potential resilience UX improvement; absent observed application failure or contradictory current contract do not demand fix.
- **E3 (runForumMutation unknown error mapped 503): demonstrated source difference, NOT classified as current-Stage defect on current evidence.** `app/forum/mutations.server.ts` maps unknown catch-all to unavailable/503 vs `runSourceLocaleCorrection` rethrows; `docs/auth/AUTHORIZATION.md` unexpected authorization errors must not be converted into typed availability, but authz permission precheck is outside `runForumMutation` and has its own typed guard; no proof that this generic writer catch violates the same contractual boundary in a real action. Distinguish source fact from proven user/system impact; no implementation action yet.

### What remains before the FIRST audit can truthfully close

1. **Reconstruct early phases 1–8:** accountable list of actual requirements, entrypoints, cases and evidence; for missing segments perform targeted source-to-contract checks, not blanket re-do of 437-file second audit.
2. **E1 targeted 409 failure path:** test or independently verify exact route/action behavior, contrasting successful 2xx auto-revalidation and unrelated periodic revalidators. Do not elevate E2/E3 absent current Stage proof.
3. **Cross-boundary acceptance coverage:** for high-risk current Stage user actions cover guest, authorized, permission-limited, stale, concurrent, storage-down/ambiguous outcome and failure-recovery; identify which truly untested or only read as tests. E2E/browser only when essential to determine actual behavior, **not** prerequisite for source audit as a whole.
4. **Final audited-scope declaration:** list what was actually covered and what wasn't, separate known defects, risks, future Stage and external exclusions; only then potentially close first audit. Do not import separate `AUD-20261022` completion/manifest into this result.

**This is a working checkpoint, not final finding publication or audit clearance.** Updated only personal `.github/agents/chatgpt-6.md`; no change to shared `.github/service-channel.md`, other personal files, source `main`, or `AUD-20261022` plan/state.


---

## Первый аудит — восстановление доказательного покрытия раннего прохода 1–8 (2026-10-22)

**Статус: ограниченная подзадача восстановления текущего code-evidence выполнена. ПОЛНЫЙ АУДИТ ОТКРЫТ.** Только *первый* independent audit (старые этапы 1–14); не обновлять `AUD-20261022`, 437-file manifest и его статусы. Baseline GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, SHA проверен повторно.

### Историческая неопределённость

В личных notes зафиксирована последовательность «ранний отчёт после семи этапов; инвентаризация 8; scope этапа 9 и далее»; **полных исходных чекпоинтов 1–8 с темами, датами, файлами, assertion/evidence и результатами там нет**. Их точную историческую программу/покрытие нельзя надёжно восстановить по одному описанию «этапы 1–8 пройдены». Не придумывать соответствие «этап N = subsystem X» и не ставить ретроактивный PASS всем ранним этапам. Следующий ledger — **новая прямая сверка актуального исходного кода**, не доказательство того, что тот же контроль был сделан в прошлом.

### Восстановленные сейчас цепочки из source/current requirements/test assertions

| Проверяемая граница | Текущая реализация, прямой source trace | Существующее test evidence (прочитано, НЕ выполнено в аудите) | Статус |
| --- | --- | --- | --- |
| App entry + route topology | `app/routes.ts` точные technical /api/auth, attachments и fallback /api/* до nested locale; `app/root.tsx` SSR html lang/dir from loader; `react-router.config.ts` SSR и initial discovery | `app/routes/locale-boundary.test.ts`, `app/forum/route-error.test.tsx` | Reviewed source/selected assertions; no full browser validation |
| Worker dependency composition | `workers/app.ts` создаёт новый `RouterContextProvider` на request, session до handler, injects reader/writer/authz/attachment/locale/UI-translation capabilities; `workers/database-bindings.ts` строго требует separate HYPERDRIVE/WEB_HYPERDRIVE, без substitute | `workers/database-bindings.test.ts` шесть relevant cases, включая strict fail-closed и literal assembly guards; `workers/attachment-storage.test.ts` | Reviewed composition; no real Cloudflare connections |
| Better Auth email identity/session | `app/auth/auth.server.ts` Better Auth 1.7.4 + Drizzle; email/password 8–128, registration name server hook, persistent DB rate limiting; `app/auth/session-context.ts` resolves once/request, propagates only auth Set-Cookie, not unrelated get-session headers; `app/routes/auth-api.ts` delegates to runtime | `app/auth/auth.server.test.ts`, `session-context.test.ts`, `tests/database/forum-email-registration.test.ts`: real PG registration hashed credential, incorrect password, invalid names; `tests/database/auth-runtime.test.ts`: sliding session cookies, expired session→null | Reviewed source and selected real assertions; not live OAuth |
| Credential redirects + guest UX | `app/auth/credential-path.ts` locale-scoped, same-origin validated `returnTo`; `credential-view.tsx` signup/signin client errors, disabled pending, success navigation; deferred email verification/reset disclosed | `app/auth/credential-view.test.tsx` registration/signin/return anchor/safe fallback, `tests/database/forum-email-registration.test.ts` | Current MVP reviewed; email sender/reset out of scope |
| Locale routing/fallback/hydration | `app/routes/locale-negotiation.ts`, `locale-boundary.tsx`, `app/localization/resolver.ts`, `resource-loader.ts`, `runtime.ts`: authenticated user→cookie→Accept-Language→en, canonical active loader/middleware; noncanonical mutations 404; persisted bundle hit / local+manual+machine+English fallback, request-scoped i18next; en code-owned | `app/routes/locale-negotiation.test.ts` four route cases, `locale-boundary.test.ts` six route cases, `app/localization/resource-loader-bundles.test.ts` five compiled bundle cases, `app/localization/resources.test.ts` locale priority and runtime | Reviewed selected code; complete translation subtask recorded separately |
| Authorization/ownership | `app/forum/mutations.server.ts` requires session + Origin, authoritative session.actor; `db/authorization-repository.ts` repeatable read snapshots, mutation-level effective permission recheck+lockout; protected server actions; site header optional degradation fail-closed | `tests/database/migrations.test.ts` manager locking; `authorization-snapshot.test.ts`; `app/forum/write-actions.test.ts` negative cases; `app/forum/route-error.test.tsx` safe errors 401/403/404/503/500 | Reviewed critical paths; complete threat model not claimed |
| Forum/domain persistence | `db/hyperdrive-forum.ts` request capabilities, `app/forum/actions.server.ts` actions, `db/forum-repository.ts` transactions/immutable revisions, readable topic/reply/search/unread; Reader/Writer typed contexts | `tests/database/stage4-core-e2e.test.ts` direct PG layer (not browser E2E), `forum-attachment-publication.test.ts`, `app/forum/public-read.test.tsx` | Subsystem already covered in stages 9–13; no retrospective re-mark |
| Local CI/migration/quality boundary | `package.json` pins Node 24.21.0/pnpm 12.3.4, RR 8.3.1, Better Auth 1.7.4; `.github/workflows/ci.yml` type/lint/test/build/schema/PG17/Workers smoke; migration journal guards | Previous exact-tree GitHub Actions run #39615502080 jobs checks and database SUCCESS 2026-10-21 | CI observed, not independently rerun |
| UI shell/theme/error/action + Editor | `app/forum/ui.tsx` locale switch, theme; `app/root.tsx`; `docs/EDITOR.md`, `docs/UI_UX_PASS.md` source-of-truth reviewed; Editor review in separate prior stage 13 | `app/forum/route-error.test.tsx`, existing Editor tests inspected in stage 13 | No complete interactive responsive/a11y/browser matrix |

Документация `AGENTS.md`, `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `docs/UI_UX_PASS.md`, `docs/auth/AUTHORIZATION.md`, `docs/EDITOR.md`, `TRANSLATION_ARCHITECTURE.md`, `docs/translation/LOCALES.md` получена с exact `main` и прочитана до EOF в этой подзадаче. Source file contents and representative actual test assertions (не только названия) прочитаны по перечисленным entrypoints. Actual `Node/PG/browser/deployed` testing заново не производилось; существующий CI отдельный уже подтверждённый build/test evidence. Нет новых доказанных current-Stage дефектов **в узко проверенных source chains**, но нет global PASS.

### Остаток после восстановления

1. **Документально не восстанавливаются исторические действия 1–8**: при отсутствии старого подробного лога их статус именно `HISTORICAL_EVIDENCE_UNKNOWN`, независимо от настоящих отдельных проверок. Переписывать историю нельзя.
2. Реальные проверенные текущие ядро/forum/Editor/localization/DB цепочки теперь перечислены по предметам и не нуждаются в полном повторном 437-file проходе; однако first-audit claim «полностью проверен весь scope» всё ещё не обоснован. Отдельно требуются связанная matrix по критическим негативным/конкурентным/ошибочным путям и точная граница *исходного* first audit (без выдуманного обязательного browser E2E).
3. **Следующая компактная подзадача, по команде владельца:** окончательно проверить E1 на конкретном route-level action `409` (эффект отсутствия автоматической revalidation vs сохранение local editor text/rebase), опираясь на нынешний исходник/тесты, без требования инфраструктуры ради самой формальности. E2/E3 оставить evidence-only до подтверждения current-Stage contract failure.
4. Лишь после сквозной сверки реального объёма/пробелов можно назвать результат первого технического аудита оконченным или чётко обозначить оставшийся непроверенный объём. `AUD-20261022` независимо открыт и не получает зачёт с этого review.

**Никакого исправления и объявления полного завершения.** Этот checkpoint только в личном файле Лиры; shared service channel, чужие personal notes, implementation/main и второй audit не трогать.


---

## Первый аудит — целевая проверка ошибки 409 в Editor 2.0 (2026-10-22)

**Статус: эта подзадача завершена; полный первый аудит НЕ завершён.** Относится только к independent audit, проходившему ранее по этапам 1–14. `AUD-20261022` (отдельный 437-file audit) не менять. Exact `main`: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.

**Finding E1 — подтверждён по коду и документированному поведению React Router; функциональный дефект текущего Editor 2.0.** Интегрированная браузерная реализация и новый route-level regression test в этой подзадаче НЕ запускались.

**Ожидаемое по контракту:** `docs/EDITOR.md` published post edit uses immutable revision, rejects stale Save, preserves in-memory typed text and local attachment intent, supports **explicit rebase** to latest published revision; failure must not discard entered content. Отменённый text-draft/autosave не использовать как механизм восстановления.

**Trigger / causality:**
1. Two tabs start with `post.body.id=R1`. One saves R2; second submits `R1` with edited text. `app/forum/views.tsx:2815-2839`: hidden `expectedRevisionId=editBaseRevisionId` initially R1; Save allowed while matches cached loader `post.body.id`.
2. `app/forum/actions.server.ts:482-497` forwards expectedRevisionId into `writer.editPublishedPost`; `db/forum-repository.ts:3674-3736` serializes by row lock, checks author/revision and fails stale `ForumStateConflictError` before altering revision/refs. `app/forum/mutations.server.ts:89-111` returns `data({error:"conflict"},{status:409})`; server protects published data correctly.
3. Project `package.json`: `react-router 8.3.1`, SSR mode `react-router.config.ts`. Official React Router documentation `https://reactrouter.com/how-to/optimize-revalidation` states that Framework SSR **4xx/5xx action failures do not revalidate active loaders by default**. `app/routes/topic.tsx` has loader/action but **no shouldRevalidate**, `TopicView` has no `useRevalidator`/conflict refresh.
4. `app/forum/views.tsx:2236-2246`: error effect only resets pending publication tracker; `views.tsx:2556-2561` displays generic alert. **No fetch/revalidation of authoritative R2**, so cached `post.body.id` remains R1; hidden `expectedRevisionId` remains R1. `views.tsx:2844-2851` rebase UI appears only when `editBaseRevisionId !== post.body.id`; no difference → no button. Save enabled again when pending stops, so next submission still R1 → another 409.
5. Typed source remains in live editor (default revision change alone does not reset scope; in-memory state), but user cannot invoke explicit rebase on unchanged loader snapshot. Browser full reload/navigation may fetch R2 but discards typed text (text drafts deliberately gone).

**Alternatives checked:** `app/forum/online-presence-heartbeat.tsx` does not routinely revalidate topics (homepage-only success heartbeat, auth-401 exception). `app/forum/content-generation-controls.tsx` can revalidate when generation queue/poll progresses, but only conditionally and unrelated to a stale edit. Ordinary locale navigation or explicit refresh may refresh loader but not preserve unsent text through full page reload. `app/forum/public-read.test.tsx:2314-2382` confirms text preserved and rebase works after **manual** `router.revalidate()`; :2621-2700 covers failure `400` and local text survival, **not actual 409→automatic refresh**. `tests/database/forum-attachment-publication.test.ts:121-139` covers authoritative stale revision rejection; `app/forum/write-actions.test.ts` verifies server action forwarding/authorization, not end-user recovery.

**Classification:** Confirmed **source-level current-Stage functional defect**: missing guaranteed freshness/recovery transition after failed stale Save. No implication of overwritten server data or lost in-memory typed text. Not to claim «rebase impossible under all circumstances» because unrelated router revalidation may allow recovery. No remaining source-level alternative found that changes the conclusion. **Observation in deployed browser: информация не проверена**. Suitable implementation regression is a deterministic router test `action status 409` + changed loader R2 + type preserved + explicit rebase makes Save ready; no requirement to test production/OAuth/real R2/Neon to establish this defect.

**E2/E3 remain unchanged:** pending XHR no timeout is a conditional UX robustness question, not confirmed current-Stage defect; generic unexpected writer exception→503 is a source fact with insufficient current-Stage contract failure evidence. Do not assign fixes for E2/E3 as if proven.

**Next first-audit subtask after owner instruction:** final cross-boundary requirement × (guest/authorized/permission-limited/stale/concurrent/unavailable/ambiguous retry) gap reconciliation; clarify remaining source/test coverage and audit completion status honestly, without importing separate `AUD-20261022` manifest.

**Service constraints:** only personal `.github/agents/chatgpt-6.md` in PR #236; no change to shared service-channel, other agents' personal files, implementation, main, or separate audit statuses. This checkpoint is not a completed full-audit result nor a handoff to implementation.


---

## Первый аудит — сквозная сверка критических сценариев (2026-10-22)

**Статус: эта подзадача завершена; ПОЛНЫЙ ПЕРВЫЙ АУДИТ ОСТАЁТСЯ ОТКРЫТЫМ.** Только прежний independent technical audit, обзорные этапы 1–14. Не переносить результат в независимый AUD-20261022 (437-file manifest). Exact GitHub `main`: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; проектная реализация не изменялась.

Цель: требования × отрицательные/конкурентные/отказные сценарии across auth, actions, editor, published revisions, attachment lifecycle и recovery. Прямо просмотрены релевантные диапазоны `app/forum/mutations.server.ts`, `actions.server.ts`, `views.tsx`, `app/routes/topic.tsx`, `app/auth/session-context.ts`, `app/routes/attachment-{upload,download}.ts`, `app/forum/editor-attachments.tsx`, `db/forum-repository.ts`, `db/forum-attachment-cleanup.ts`; содержимое целевых assertions в `app/forum/write-actions.test.ts`, `public-read.test.tsx`, `tests/database/forum-attachment-publication.test.ts`, `stage4-core-e2e.test.ts` и список случаев связанных тестов. Это selected source/test review, а **не** прочтение каждого файла целиком и **не** новый run tests/browser.

### Matrix: сценарий → реальная граница → тестовое evidence → оценка

| Сценарий | Evidence реализации и тестов | Результат/остаток |
| --- | --- | --- |
| Гость, чужой Origin, input validation | `mutations.server.ts:63–111` проверяет session+Origin, 401/403 и typed validation. `write-actions.test.ts:622–636` утверждает отсутствие writer calls при отказе. | Trace подтверждён; нет интегрированного Worker/browser прогона в первом аудите. |
| Authorized actor, permission-limited, owner-specific | `actions.server.ts:480–499` server-side editOwn, actor from session; `forum-repository.ts:3698–3707` row+owner check. `write-actions.test.ts:201–218,602–620,995–1013`, `forum-attachment-publication.test.ts:121–139`, `stage4-core-e2e.test.ts:345–375` (grant/deny/forgery). | Source/tests подтверждают guards, включая next-request permission changes; не утверждать полный RBAC matrix для каждой операции. |
| Stale published edit, concurrent writers | `forum-repository.ts:3690–3738` transaction/row lock/expectedRevision CAS; server `409` from `mutations.server.ts:104`; native assertion stale rejects in `forum-attachment-publication.test.ts:121–139`. UI `views.tsx:2236–2247,2815–2853` ожидает обновлённую route post revision для rebase. | Сервер защищает current revision; **E1: подтверждённый source-level current-Stage defect** пути UI после 409, когда loader автоматически не обновился. |
| Concurrent/ambiguous publication and selective attachments | `forum-repository.ts:3691–3697,3708–3738`: operation-scope lock, receipt fingerprint, exact retained/current refs, atomic revision/notifications. `forum-attachment-publication.test.ts:77–119,263–275,280–315`: same-result replay, modified retry conflict, no mention side effect on stale reject, parallel uploads. | Путь реализован и покрыт выбранными native assertions; не выдавать inspected tests за собственный execution или browser network interruption. |
| Attachment read authorization and cleanup | `attachment-upload.ts:91–124` session/Origin/write capability; `attachment-download.ts:25–85` public published vs owner-only temporary, inert Content-Type/CSP/no-store; `forum-attachment-cleanup.ts:44–105` claim/lock/retry/no published-ref deletion. Существуют `attachment-operation.test.tsx:106–177`, `editor-attachments.test.tsx:151–336`, native attachment tests. | Selected flows source/test reviewed; живые service-side/storage, end-to-end browser and production cleanup исключены либо не выполнялись. E2 не подтверждён как current-Stage defect. |
| Storage/authorization unavailable vs unexpected failure | `mutations.server.ts:137–147` distinguishes typed authorization unavailable from unforeseen errors; `topic.tsx:89–131` optional read/authz degradation without granting controls; `write-actions.test.ts:1111–1175` typed vs thrown unexpected; `public-read.test.tsx:455–469` unexpected presence reader errors must surface. | Reviewed major typed error paths, **но не все** dependency failures across routes. E3 writer generic catch→503 — кодовый факт без доказанного нарушения current-Stage контракта. |
| UI recovery after negative result | `public-read.test.tsx:2621–2701` real router action 400 retains unsent in-memory editor text and allows retry; `:2314–2382` rebase preserves text+attachment intent only after **manual** `router.revalidate()`; no actual 409→fresh R2 route test. `views.tsx:2236–2247` clears pending on error without revalidation. | **Fail of automatic post-409 recovery at source/contract level (E1)**; typed buffer survives failed save while page stays mounted. Full reload with no saved draft does not establish recovery. |

### Что подтверждено и чего не доказано

- Across examined boundaries current source implements strong server-side authorization, immutable revision fence, transactional operations, fingerprinted replay, protection of published attachment refs, and typed availability distinctions. Выборочные existing assertions подтверждают intended behavior. **Ни один новый executable test/PG/browser/Worker run в этой подзадаче не выполнялся**; GitHub CI exact-tree SUCCESS из предыдущих notes остаётся отдельным historical evidence.
- Единственный ранее установленный и сохранённый в данном первом аудите current-Stage defect — **E1**, строго source-level UI conflict recovery; online browser observation **информация не проверена**. Official React Router documentation (`reactrouter.com/how-to/optimize-revalidation`, checked 2026-10-22, current docs 8.5.0; project pin 8.3.1) says failed 4xx/5xx submissions by default do not revalidate SSR loaders. Topic route provides no specific shouldRevalidate. Нынешний тест вызывает revalidate вручную.
- **E2**: XHR hanging without timeout is conditional resilience concern; `docs/EDITOR.md` defines block while upload pending and Retry/Remove after error, no explicit maximum pending time. **E3**: unknown writer error → 503 caught broadly, but actual current-Stage violation unproven. Не назначать исправления на этих основаниях.
- Missing first-audit evidence that affects completeness: (a) no reconstructible detailed original phase 1–8 review ledger, despite subsequent targeted rechecks; (b) first-audit reviewed code/test coverage was selective rather than exhaustive; (c) no own fresh reproducible integrated 409→revalidate negative test/browser observation; (d) no systematic real Worker/browser walkthrough of session expiry/revocation while forms are open, failure display/retry after transient outage or ambiguous network ACK; (e) local PG/CI not independently re-run in first audit; (f) full current-app keyboard/hydration/responsive UX and all 45 migrations/snapshots not read line-by-line. Last items describe **evidence limitations, not newly discovered defects or necessarily mandatory gates**.
- External OAuth/Cloudflare/Neon/Hyperdrive/R2/live providers/deployment/backup as **services** are outside declared current first-audit review, not reasons by themselves to block pre-release source review. No importing AUD-20261022 manifest or status to fill gaps.
- **Decision:** Cannot declare the *first complete audit* finished on this evidence. The definitive first-audit result currently is a documented **partial, risk-focused static technical review with one current-Stage source-level defect and explicit limitations**, not whole-project clearance. To move toward closure, next separately authorized task should resolve the **specific observable recovery cases** E1 failed-409 action, session/permission changes while editing, ambiguous reply/upload outcomes and typed/unexpected failure response at route UI boundary. This is a targeted regression/integration evidence effort, not a request for blanket re-audit of 437 files. If environment prevents actually running it, state that rather than fabricate PASS.
- **Stop:** do not begin next subtask without owner's command. Findings not published as agreed team state; this note is only Лира personal working record. Other personal notes, common service channel, implementation and `main` remain untouched.

---

## Первый аудит — проверка переходов восстановления 409/отзыв прав/неопределённая публикация (2026-10-22)

**Статус: ограниченная подзадача source-contract verification завершена; первый ПОЛНЫЙ аудит НЕ закрыт.** Только первый независимый обзор, не `AUD-20261022`. Remote baseline: GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, implementation не менялась.

### Возможность выполнения

Проверка повторно сопоставила `main/AGENTS.md` с регламентом и прямым указанием не исправлять код до конца аудита. Контейнер в текущем чате: `node v22.16.0` (project pin `24.21.0`), `pnpm`, `react-router`, `react`, `vitest`, `jsdom`, checkout проекта, `docker` и `psql` отсутствуют; `git ls-remote https://github.com/iliya1947/vico-forum.git` завершился DNS-ошибкой. GitHub connector даёт read-only source, но не runtime/execution. **Ни один заявленный интеграционный test, browser/Worker/PostgreSQL run не выполнен.** Нельзя считать ниже PASS реальной интеграции. Проверена официальная React Router documentation `https://reactrouter.com/how-to/optimize-revalidation` и changelog для project-pinned v8.3.1: после 4xx/5xx action SSR framework loader revalidation по умолчанию пропускается.

### Четыре целевых сценария

1. **Stale Save R1→R2, action 409, route + UI.** `app/routes/topic.tsx:30–36,205–211` exports topic loader/action and has no `shouldRevalidate` override; `app/forum/actions.server.ts:480–498`, `mutations.server.ts:89–111`, `db/forum-repository.ts:3690–3738` enforce author/expectedRevision with transaction/CAS and return 409 on stale Save. `views.tsx:2236–2247` clears submitted ref on `forumWriteError` but does not refresh; `:2815–2853` displays rebase only when route-provided `post.body.id` changed. Existing `public-read.test.tsx:2314–2382` explicitly invokes `router.revalidate()`; `:2621–2701` tests 400/retry but not 409. **E1 remains a confirmed source/official-framework-contract current-Stage defect**: no guaranteed fresh revision or user-accessible explicit rebase immediately after rejected stale Save. Text is preserved while editor remains mounted. **Integrated browser manifestation: информация не проверена.** Do not claim server overwrites anything.
2. **Session expiry/permission revocation while edit form open.** `app/auth/session-context.ts:8–17` reads session per request; `app/forum/mutations.server.ts:63–77,137–147` rechecks session/Origin/effective permission on each action. `db/forum-repository.ts:3701–3707` rechecks ownership. `topic.tsx:81–131` computes edit rights from next loader, `views.tsx:2814` gates editor by current `editablePostIds`; `online-presence-heartbeat.tsx:23–35` triggers revalidation on heartbeat 401, not generic 403 and not every time. A stale UI may temporarily display an editor until route reload, but unauthorized Save is denied with 401/403 and no mutation; after refresh controls disappear. In-memory text can disappear when editor unmounts after rights removal, while contract `docs/EDITOR.md:159–169` explicitly denies reload/navigation recovery and confines buffer to open form. **No proven extra current-Stage defect** based on authority freshness; exact user transition not integration-tested.
3. **Ambiguous publish/reply/upload ACK.** `app/forum/markdown-editor.tsx:933–939` supplies client operationID/selected refs; `db/hyperdrive-forum.ts:168–205` creates server IDs and forwards operation; `db/forum-repository.ts:664–681,745–747,783–817` matches fingerprinted receipt before new reply and returns same postId on identical repeated operation, rejects changed request; `forum-attachment-publication.test.ts:280–315` inspects replay/duplicate and owner-scope. `editor-attachments.tsx:195–244` uses stable asset ID for XMLHttpRequest retry; error permits Retry/Remove, Cancel aborts; `docs/EDITOR.md:357–389` says new open editor/account/context gets separate operation, reload doesn't restore uploads/text. **Server idempotence for same operation is supported by inspected source/test.** Browser unknown response/retry after route error and across a new editor operation remain untested; no guarantee across fresh operation ID, which is not prohibited by current documented contract. No newly confirmed defect.
4. **Typed availability and unforeseen errors across action/UI.** `mutations.server.ts:98–111` maps domain/permission/rate limits and generic writer error to 503; authorization precheck `:137–147` maps only typed `AuthorizationUnavailableError` and rethrows unforeseen authz errors (matches `docs/auth/AUTHORIZATION.md:184–206`). `app/routes/topic.tsx:89–131` optional UI authorizations degrade on classified unavailability only, unexpected rethrows. Action `data({error}, {status})` feeds `TopicView` `views.tsx:2107–2114,2560–2561` inline error while mounted; thrown route error goes to `app/forum/ui.tsx:401–434` generic localized ErrorBoundary with details concealed, with existing `route-error.test.tsx:60–83` tests. `public-read.test.tsx:2621–2701` demonstrates in-memory edit retention after 400, NOT after thrown network/runtime failure. **E3** (generic writer unexpected→503) is a source fact; protected authorization catches are separate and behave as documented, so no demonstrated current-Stage authorization-contract violation. Other unexpected writer availability semantics and actual user recovery are unverified; no defect classification solely by catch style.

### Итог и точный остаток

- Повторно подтвержден **E1** only as source+framework-contract defect (not browser reproduced). E2 and E3 not elevated. Нет новых доказанных current-Stage defects от этой подзадачи.
- Четыре интегрированных перехода остаются **NOT_EXECUTED**: post-409 action with changed loader R2/rebase UI; expiry/revocation while populated edit form; post-commit network ACK loss and replay from still-open form; typed 503 vs unhandled failure rendering and retained buffer. Они требуют настоящей React Router/React runtime проверки, и имеющаяся среда для этого не подходит. No standalone mocked algorithm harness is a substitute.
- Missing historical first-audit 1–8 evidence and selective rather than exhaustive source/test coverage remain unresolved. No invented full PASS. Follow-up requires suitable pinned checkout/test runner, if made available; otherwise clearly report limit. Do not transfer gaps/results to separate AUD-20261022.
- Stop after this subtask until owner's next instruction. Only this personal file may change; no general service channel, other agents' files, implementation, `main`, or new assignment.


---

## Первый аудит — остаточное покрытие ранних областей 1–8: документальный и source-ledger (2026-10-22)

**Статус: подзадача сверки оставшегося доказательного объёма выполнена; ПЕРВЫЙ ПОЛНЫЙ АУДИТ НЕ ЗАВЕРШЁН.** Только первый независимый обзор (исходные 14 этапов), не `AUD-20261022`. Baseline GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, актуальность remote main сверена при открытии задачи. `AGENTS.md` прочитан до EOF. Ничего в implementation/main и чужих файлах не менять.

### Отдельный реестр текущих проверок — НЕ реконструкция истории

Исторических original checkpoints этапов 1–8, из которых можно вывести дату, весь scoped file list и реальные выполненные assertions каждого этапа, нет. Восстанавливать их из существования поздних записей и зелёного CI нельзя. Это `HISTORICAL_EVIDENCE_UNKNOWN`; **не равно найденному defect кода**. Ниже записана новая прямая выборочная сверка current main, дополняющая ранее выполненные source traces.

| Зона, потенциально относящаяся к раннему проходу | Прямая текущая проверка / test evidence | Результат и граница |
| --- | --- | --- |
| App route graph и SSR | `app/routes.ts` (полный файл: root locale negotiation, specific /api/auth + attachment routes before /api/*, scoped locale children and * fallback); `app/root.tsx` (html lang/dir from loader matches); `react-router.config.ts` (SSR true, initial discovery). | Source graph reviewed; real browser routing/hydration test не выполнен. |
| Worker per-request composition | `workers/app.ts` (новый RouterContextProvider на request, Better Auth session перед requestHandler, injected reader/writer/authz/translation/attachment dependencies); `workers/database-bindings.ts` (strict HYPERDRIVE vs WEB_HYPERDRIVE, missing binding throws instead of fallback); actual assertions в `workers/database-bindings.test.ts:10–74` проверяют fail-closed и направленность адаптеров (часть assembly tests — literal source checks, а не runtime simulation). | Source/selected tests reviewed; service connections excluded. |
| Email/password authentication + session/returnTo | `app/auth/auth.server.ts` Better Auth pinned 1.7.4, 8–128 password, email enabled, registration name checks, DB rate limiting; `app/auth/session-context.ts` (one session lookup/request + only Set-Cookie forwarding), `app/routes/auth-api.ts` auth handler; `app/auth/credential-path.ts` same-locale relative return target. Actual assertions `session-context.test.ts:32–78`, `credential-view.test.tsx:94–103,161–184`, `auth.server.test.ts:12–35`. Historical native email/DB assertions recorded in prior checkpoint, not independently run now. | SSR/session/source/test review; no Google OAuth/live HTTP in this new subtask. |
| Locale and permission boundaries | `app/routes/locale-boundary.tsx:34–106`: authoritative locale, degraded GET/HEAD 307/no-store, redirect-required mutation 404, optional authz unavailable vs unexpected; `locale-negotiation.ts` user locale negotiation; actual assertions `locale-boundary.test.ts:22–64,90–116,152–174`, `locale-negotiation.test.ts:19–91`; `app/routes/authorization-admin.tsx:15–74` checks session, manage permission and Origin before mutations, typed 401/403/503 vs thrown unexpected. | Source/test assertion review. Это не полный provider/i18n integration nor complete role-mutation DB run; latter previously reviewed in stage 12. |
| Test/build/DB migration gates | `package.json` exact versions: Node 24.21.0/pnpm 12.3.4, RR8.3.1; `.github/workflows/ci.yml:10–116` has checks (migration guards, lint, types, test, build, schema) and native PG17 suite + privilege probes + Worker smoke; previous logged exact-tree run #39615502080 had both jobs SUCCESS 2026-10-21. Native tests `tests/database/migrations.test.ts` selected titles and earlier reviewed assertions are evidence of cases, not fresh runs. | CI declaration/source read; no independent execution. Not automatically a full 45-SQL/45-snapshot review. |

### Граница завершённости первого аудита

- Поздние checkpoints 9–13, отдельные localization/transaction/security checks, target E1, cross-boundary scenario matrix и recovery-source audit already capture the *named principal subsystems* (public forum discovery, participation, Help, authorization, Editor, attachments, translations, local database). **This is bounded source/test-audit coverage, not complete file-by-file 437 manifest.**
- Из доступного исторического материала невозможно показать, что первоначальная программа 1–8 была полностью выполнена, и невозможно ретроактивно назвать её PASS. Сейчас расширена фактическая source-ledger early architecture/auth/locale/CI, но не подтверждено прочтение всех исходников/тестов тех неизвестных этапов.
- **Открытый current-Stage finding:** E1 `409` edit conflict recovery remains confirmed on code + router documented behavior, no integrated browser test. E2/E3 are not established defects. Нового current-Stage defect в данной подзадаче не обнаружено.
- **Неустановленное evidence:** independently executed Worker/browser/React Router UI conflict/revocation/ACK recovery; full accessibility/responsive/hydration real-browser states; independent all-tests/PG run; systematic all SQL+snapshots line review. Сами по себе эти пробелы не следует объявлять обязательными gate *первого* source review; user-requested separate detailed AUD-20261022 has its own explicit coverage rules. UI_UX_PASS.md:666–704 requires a real browser for standalone product acceptance, while Editor 2.0 owner waived separate visual/Pages gate. Do not extend one task's acceptance onto another by default.
- **Окончательная оценка:** первый аудит сейчас нельзя обоснованно назвать завершённым полностью или без находок. Допустимое точное название выполненной работы — *documented targeted application source/test audit on the frozen main, with one identified Editor conflict-recovery defect and explicit unverified areas*. Следующий шаг в первом аудите, если владелец разрешит: финальное reconciliation original scope vs реально demonstrated evidence, принятие корректной границы заключения, без выдумывания ранних PASS и без подмены AUD-20261022. При необходимости executable proof требует иной runtime environment.
- **Остановка:** личный файл Лиры — только рабочая фиксация; не публиковать findings в общий канал, не назначать исправления, не менять main/implementation/другой аудит. Следующую подзадачу начинать только после команды владельца.


---

## Первый аудит — финальная сверка исходного объёма и фактических доказательств (2026-10-22)

**Статус: ФИНАЛЬНАЯ СВЕРКА ПЕРВОГО АУДИТА ВЫПОЛНЕНА, НО ПЕРВЫЙ ПОЛНЫЙ АУДИТ НЕ ЗАВЕРШЁН.** Это решение о достоверности покрытия, не final PASS, не final clearance и не публикация командных findings. Относится только к первому independent audit с исходными обзорными этапами 1–14. НЕ к `AUD-20261022` (отдельная явная программа с manifest).

Baseline GitHub `main` = `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, повторно проверен. Текущий полный `AGENTS.md` прочитан из `main`. Режим: read-only source/test review. Не менять код, schema, shared communication, файлы других агентов или другой audit.

### 1. Proven evidence — фактический выполненный обзор

- **Scope/core public forum:** category/section/topic/messages, search/popular/unanswered/tags, notifications/unread/profile/presence, topic/reply create, solved/best answer, Help and moderation/attention. Прямой trace в записях этапов 9–11 и реальных current source/test samples. Для каждого named subsystem есть source-oriented audit evidence, но нет утверждения, что абсолютно каждый файл/ветвь прочитан построчно.
- **Auth/session and authorization:** Better Auth email/password, request-scoped session/actor, permission snapshot + request freshness, owner and same-origin guard, manager lockout, degraded classified failures, safe error routes; текущие дополнительные проверки `workers/app.ts`, `workers/database-bindings.ts`, `app/auth/auth.server.ts`, `app/routes/auth-api.ts`, `app/routes/authorization-admin.tsx` и `workers/database-bindings.test.ts`, `app/auth/session-context.test.ts`, `credential-view.test.tsx`, `locale-boundary.test.ts`, `locale-negotiation.test.ts`, `write-actions.test.ts`, native DB tests. Source scopes включают критические guards, но не blanket PASS всех permissions × routes × roles.
- **Editor 2.0+attachment lifecycle:** Simple/Advanced, source buffer/Markdown, quotes/mentions, history, published-edit optimistic revision, selected attachments, private upload/download, receipt/idempotency/cleanup. Evidence этапа 13 + 409 targeted audit + cross-boundary matrix; выбранные actual assertions inspected in `public-read.test.tsx`, `forum-attachment-publication.test.ts`, `attachment-upload.test.ts`, `attachment-download.test.ts`. Полный browser E2E не выполнялся.
- **Locale/UI/content translations:** canonical locale registry and middleware, fail-closed mutation on redirect-needed locale, original-safe fallback, UI bundle/persistence, content revision/claim/publish/concurrency; отдельная translation source/test subtask details and current boundary assertions в журнале. Real provider/Queues out of scope.
- **Transactions/migrations/security:** native PG schema/test assertions, migration journal/CI guards, owner/permission/concurrent locks, attachment cleanup; 45 SQL and 45 snapshots NOT all line-reviewed. External DB/Cloudflare acceptance excluded.
- **Entry/quality:** `app/routes.ts`, `app/root.tsx`, `react-router.config.ts`, `workers/app.ts`, `workers/database-bindings.ts`, `package.json`, `.github/workflows/ci.yml` directly reviewed. Evidence `workers/database-bindings.test.ts` includes literal source wiring assertions (NOT worker E2E). Existing GitHub Actions run #39615502080 (PR #232 exact-tree) jobs `checks` and `database` success was rechecked via GitHub API in this final task; no independently executed new CI/PG/browser test.

### 2. Finding triage — full causal status

- **E1, current Editor 2.0:** confirmed source-level functional failure of direct stale-409 recovery, not data corruption. Backend enforces expectedRevision/409 correctly; `app/routes/topic.tsx` has no `shouldRevalidate`; RR8 SSR official `reactrouter.com/how-to/optimize-revalidation` section Default behavior says failed 4xx/5xx action doesn't revalidate loaders by default; `app/forum/views.tsx:2236–2247,2814–2853` resets error tracker without initiating fresh load, while rebase control requires `editBaseRevisionId !== post.body.id`. Existing test `public-read.test.tsx:2314–2382` triggers `router.revalidate()` itself. E1 thus blocks **automatic discovery/recovery** from conflict on stale snapshot, until unrelated route refresh or navigation; typed text survives while mounted. Browser integration runtime: **информация не проверена**.
- **E2:** XHR pending without timeout/individual pending Remove; possible resilience UX, no current requirement max pending lifetime, overall Cancel abort exists; NOT confirmed defect.
- **E3:** `runForumMutation` catch-all unknown→503 is real source behavior; protected authorization unexpected errors rethrow according to `docs/auth/AUTHORIZATION.md`; exact breach of current Stage writer contract not established. NOT confirmed defect.
- Additional Stage 6 live OAuth/providers/Queues/service infrastructure and later visual refinement are **not current first-audit defects** by mere omission.

### 3. Evidence ledger and actual unresolved verification

| Предмет | Итог |
| --- | --- |
| Первоначальные этапы 1–8 по исходному замыслу/истории | **HISTORICAL_EVIDENCE_UNKNOWN**: исходные подробные checkpoints/scope/fulfilled assertions отсутствуют; поздний bounded re-review не подтверждает историческое полное выполнение. |
| Этапы 9–13 | Предметные журналы source/test review существуют; НЕ full executed E2E/entire source-line coverage. |
| Обзорный шаг 14 и later reconciliation | Матрица source/tests, E1–E3 triage, permission/negative/error/ambiguous retry, targeted additional reviews now documented; exact original requirement-by-requirement PASS across full stated scope НЕ доказан. |
| Реальный 409 transition + browser runtime | **NOT_EXECUTED**; direct source/contract defect evidence достаточно для provisional E1, но не для утверждения browser reproduction. |
| Session expiry/revocation, post-commit lost ACK, UI 503/unexpected recovery | Source-side boundaries inspected; end-to-end behavior **NOT_EXECUTED**. |
| Fresh full suite/PG, all SQL/snapshots, exhaustive browser accessibility/responsive/hydration | No independent execution/full line-review; обозначить limitation, а не automatically mandatory gate текущего bounded source-review. |
| Отдельный `AUD-20261022` | Независимая 437-in-scope explicit manifest and progress; status **unchanged** and not awarded credit from this first audit. |

### 4. Вердикт

1. **Финальная сверка выполнена; полноту первого аудита подтвердить невозможно.** Нельзя ни объявить `AUDIT COMPLETE`, ни утверждать, что проверено каждый заявленный механизм/негативный переход. Общий исходный объём ранних этапов нельзя достоверно восстановить из имеющихся записей; изменение определения "полный" на "частичный source review" ради статуса DONE недопустимо.
2. Корректная формулировка результата: **частичный независимый технический source/test audit на зафиксированном main с одним source-confirmed current-Stage finding E1**, с указанными непроверенными интеграционными сценариями. Остальные ранние механизмы были перепроверены выборочно с конкретными evidence; это не ретроспективные PASS 1–8. Доказательства недостаточны для whole-audit clearance.
3. Новую разработку и передачу findings другим агентам в рамках этой проверки **не инициировать**. Личный файл — разрешённый owner рабочий checkpoint, но не финальная публикация team findings.
4. Для реального **полного** покрытия нельзя тратить новые циклы на выдумывание исторических шагов 1–8; требуется объективно заданный scope и отдельное доказательное прохождение, в том числе runtime checks там, где от них зависит результат. Такой explicit manifest уже ведётся **отдельно** в `AUD-20261022`; не подменять его результатами первой проверки. Если owner продолжит именно первый аудит, единственный честный путь — новые предметные проверки недоказанных требований со свежим ledger, не декларация завершения.
5. **Stop после этой subtask** до команды владельца. Ни один следующий этап аудита не запущен.



---

## Первый аудит — статическая проверка DB migrations 0034–0044 и актуальности схемы (2026-10-22)

**Одна подзадача завершена. Первый полный аудит всё ещё ОТКРЫТ.** Это только прежний independent source/test audit, не `AUD-20261022`. Фиксированное `main`: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Read-only: implementation/SQL/snapshot/schema/shared service/чужие файлы не менялись.

### Объём и метод

- Полностью прочитаны именно все **11 SQL migrations `drizzle/0034_*.sql`–`drizzle/0044_*.sql`**, включая `0038_forum_attachment_cleanup_claims` с PL/pgSQL guard function и двумя triggers; `0039_forum_publication_receipts`, `0040_post_edit_history_permissions`, `0041_published_mentions`, `0042_attachment_edit_snapshots`, `0043_attachment_security_read_permission`, `0044_attachment_draft_conflict_boundaries`.
- `drizzle/meta/_journal.json` прочитан и сопоставлен с GitHub directory listing: 45 file names `0000`–`0044` на месте, 45 distinct journal entries, `idx=0…44`, строго возрастающие `when`, missing/extra SQL/journal names = **0**. Также получен/разобран целиком машинно текущий `drizzle/meta/0044_snapshot.json` (47 tables) и сравнен с созданными таблицами/именованными constraints/indexes блока `0034–0044`: все десять создаваемых таблиц присутствуют, missing **named constraints / indexes = 0**. Последний authz `authz_permissions_catalog_check` в migration 0043 и `db/schema.ts:621–629`: 15 keys, два направления различий = 0.
- `db/schema.ts:508–534,609–656,855–1117` конкретные PK/FK/UNIQUE/check для редактора, revisions, attached assets, owner-ref, idle cleanup, generation terminal markers, edit snapshot/provenance, receipts, security events и built-in permissions сопоставлены с SQL. Manual `0038` trigger/function не входит в декларативный Drizzle snapshot (не объявлять отсутствие trigger в snapshot нарушением). Существующие DB tests `tests/database/forum-attachments.test.ts:232–236,294–320,712–768,917–932,935–959,961–1005`, `forum-attachment-publication.test.ts:280–315,317–378` прочитаны до релевантных assertions.
- Trigger `forum_attachment_require_active_ref()` под `SECURITY DEFINER` и `SET search_path=pg_catalog` проверяет status целевого asset под `FOR SHARE` до новых draft/published refs; cleanup `db/forum-attachment-cleanup.ts:67–105,108–141` берёт `FOR UPDATE SKIP LOCKED`, свежую проверку refs, durable claim/token+lease перед удалением private object. Тест с двумя PG connections демонстрирует expected `23514` для ref после claim. Дальнейшие tests проверяют shared post refs, rollback, lost object-delete ACK и отсутствие double-claim.
- SQL `0039` drops nonempty post revision content constraint intentional for attachment-only messages; validation+live referenced assets are enforced in application transaction. Native application/PG tests explicitly verify file-only publish, exact submitted subset, post-edit CAS, replay of identical operation after lost ACK, conflict on modified retry and 24h activity semantics. `0034` legacy `forum_editor_drafts`, `0042` snapshots, `0044` draft-boundary tables remain from accepted historical schema **by design**; current `PROJECT_STATE.md:23–60` and `docs/EDITOR.md:159–175,351–389` explicitly remove runtime text-draft/autosave without rewriting accepted migration 0034–0044. No current defect inferred from dormant tables.
- Clean native PG17 history/schema tests and GitHub Actions CI #39615502080 previously completed successfully; **in this subtask tests, migrations or production services NOT EXECUTED**. Static checks of DDL names/Drizzle snapshot and existing test assertions do not prove runtime SQL execution in this audit.

### Новое подтверждённое несоответствие документации (D1)

`PROJECT_STATE.md:1557–1568` в разделе *«Реализованный foundation / Текущий repository baseline»* прямо утверждает **«текущая repository migration history — 0000–0043»**. Но в актуальном `main` checked-in `drizzle/meta/_journal.json` есть 45 записей через `0044_attachment_draft_conflict_boundaries`, сам `drizzle/0044_attachment_draft_conflict_boundaries.sql` и snapshot `drizzle/meta/0044_snapshot.json` существуют; `PROJECT_STATE.md:367` также отдельно упоминает migration 0044. Это **подтверждённая текущая source-of-truth freshness inconsistency**, а не schema/runtime defect и не будущая Stage 6 работа. Различие внешней accepted migration evidence, заканчивающейся на 0020, корректно и не связано с D1.

**Classification:** D1 — documentation/state accuracy issue in current product/project source-of-truth, не требующий архитектурного изменения. Действия по исправлению внутри audit не предпринимать; сведения о finding сообщать владельцу в чате, не делать утверждённой записью в общем канале до разрешения. E1 остаётся отдельным подтверждённым source-level current-Stage UI finding; E2/E3 не подтверждены как дефекты.

### Точный остаток

- По выбранной high-risk области покрытие улучшено: все 11 SQL прочитаны; schema/текущий final snapshot и названия constraints проверены; релевантные native test assertions просмотрены.
- **Не является проверкой всех `0000–0033` SQL построчно, всех 45 промежуточных snapshots/их преобразований, реального execution PG / FKs/DDL, либо runtime Worker.** Не переносить `AUD-20261022` manifest или статусы.
- Первый аудит всё ещё не может получить whole-scope PASS из-за historical 1–8 ledger gaps + selective evidence and unexecuted observable transitions; одна подзадача не закрывает всю работу. Нет нового доказанного функционального дефекта DB migrations 0034–0044 сверх documentation D1.
- **Stop** по регламенту после этой подзадачи; следующая требует явной команды владельца. Сохранять только personal note в PR #236; не менять прочие файлы и не назначать agents.


---

## Первый аудит — полный обзор SQL 0000–0033 и цепочки snapshots (2026-10-22)

**Подзадача 0000–0033 завершена; ПЕРВЫЙ ПОЛНЫЙ АУДИТ НЕ ЗАКРЫТ.** Только прежний технический source/test audit, не `AUD-20261022`; frozen GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; полный актуальный `AGENTS.md` прочитан. Реализация `main`, миграции, snapshots, общий communication-файл и другие личные файлы не изменялись.

### Фактически проверено

- **Все 34 SQL** `drizzle/0000_*.sql`–`drizzle/0033_*.sql` получены с `main` и прочитаны до EOF, в пяти пакетах: 0000–0006, 0007–0013, 0014–0020, 0021–0027, 0028–0033. Функциональные слои по порядку: LocaleRegistry/seed UI storage (0000–0002), Better Auth (0003), forum categories/posts/immutable revisions/current owner FK/solved (0004–0005), dynamic authz roles/grants/lockout (0006), translation durable task lifecycle/generation/DLQ (0007–0013), revision-bound content translation/task metadata/triggers/budgets/admission (0014–0020), tags/reply/read markers/notifications/pins (0021–0025), independent best answer and Help (0026–0031), profiles/presence (0032–0033).
- **Все 34 JSON snapshots `drizzle/meta/0000_snapshot.json`–`0033_snapshot.json` прочитаны программно как JSON, проверена непрерывная последовательность `prevId == prior.id` для всех переходов (включая 0016→0017), список таблиц/новых таблиц на каждом шаге; 0 broken chain, 0 unexpectedly removed tables. На 0033 — 37 tables. Не утверждать, что каждое поле/тип/constraint каждого snapshot был построчно перепроверен. Отдельная предшествующая подзадача: SQL 0034–0044 прочитаны, final 0044 snapshot разобран; history 45 tags `0000`–`0044`.
- По сверке **созданных SQL таблиц 0000–0033 с 0033/0044 snapshots** ни одна таблица не отсутствует. По выборке всех именованных `CREATE/ADD CONSTRAINT`, `CREATE INDEX` против 0033/0044 получены только известные исключения: manual deferrable `forum_topics_current_title_revision_fk`, `forum_posts_current_revision_fk`, `forum_topics_best_answer_topic_post_fk` не перечисляются в Drizzle declarative snapshot; `forum_topics_best_answer_requires_solved_check` появился в 0005, намеренно удалён forward migration 0026. `0026` делает best answer independent from solved; `tests/database/migrations.test.ts:2442–2468` действительно проверяет `pg_constraint` metadata и отсутствие старого coupling constraint. Декларативные `DROP/ADD` catalog/status constraints между historical versions отражают эволюцию, не текущий дефект.
- **Ручные triggers** в SQL 0004/0006/0015/0016: immutable post/title revision guards; built-in role identity protection; deferred required metadata binding for content translation tasks; deletion metadata lifecycle. Разница «manual SQL vs Drizzle snapshot» является ожидаемым representation boundary, а не нарушением. Тест `migrations.test.ts:2565–2596` проверяет `55000` на UPDATE immutable revisions, `:2599–2613` — deferred current-post FK, `:1458–1474` — permission catalog/role protection.
- **Наблюдаемые PostgreSQL test assertions** сверены не только по названиям: `tests/database/migrations.test.ts:59–71` PostgreSQL 17 + UTF8 + expected 45 migrations, `:1414–1456` отсекает canonical en persisted UI resources, `:1458–1475` catalog/seed grants, `:2431–2468` best-answer independent and FK metadata, `:2565–2642` revisions/FK/sourceLocale, `:2821–2885` concurrent locale graph writer ordering, `:2987–3007` reserved locales/invalid arrays; `tests/database/stage4-core-e2e.test.ts:175–210,330–375` exercises real Drizzle/API forum authz grant/override/faked identity (not browser E2E), `tests/database/content-topic-title-execution.test.ts:127–163,392–413,740–769` revision/allowance/concurrency. Other Help/profile/presence test titles/purpose inspected; not asserting all their assertions exhaustively read this turn.
- **No new execution:** no fresh local/CI/PG/Worker/browser run performed in this subtask. Previously verified exact-tree GitHub CI #39615502080 `checks` + `database` SUCCESS remains external existing evidence, not independent run; static parsing and reviewed test assertions do not prove runtime outcomes this turn.

### Stage classification and restrictions

- **New confirmed current-Stage functional/schema defect from 0000–0033: NONE on reviewed evidence.** An old `CHECK` deleted by migration 0026 is *intentional*; historical changes of authz catalog and translation task lifecycle are also intentional. No speculative schema hardening or Stage 6 rollout recommended.
- Existing **D1 documentation mismatch** from previous subtask remains: `PROJECT_STATE.md:1568` says active history 0000–0043, while main journal has 45 migrations through 0044. Do not double-count as a new finding. E1 (409 UI recovery) also unchanged; E2/E3 not elevated.
- After combined recent tasks **45/45 SQL migrations 0000–0044 have been directly read**. **34/45 historical intermediate snapshots (`0000–0033`) have been parsed for chain/table evolution; 0044 final was inspected and compared to schema earlier.** No exhaustive check yet of 0034–0043 intermediate snapshot chains or all intermediate column/type semantics; and no own PG re-execution. These remaining limitations must not silently be converted to PASS. The whole FIRST audit still lacks recoverable old phases 1–8 ledger and actual browser/integration failure recovery evidence.
- **Stop now** as this independent subtask is complete; next possible *bounded* part, with owner approval: `0034–0044` snapshot chain/constraint evolution, to complete historical schema-metadata reconciliation; separate audit `AUD-20261022` not affected. No implementation/fix/agent handoff until approved process.


---

## Первый аудит — цепочка Drizzle snapshots 0034–0044 (2026-10-22)

**Статус: отдельная подзадача проверки snapshots закрыта. ПЕРВЫЙ АУДИТ ФОРУМА ЦЕЛИКОМ ЕЩЁ НЕ ЗАКРЫТ.** Относится только к первому независимому аудиту, а не к `AUD-20261022`. Source `main` exact SHA `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, проверен GitHub branch API. Актуальный `AGENTS.md` из `main` полностью прочитан. Только чтение проверяемой реализации: исходники, tests, migrations и docs не изменялись.

### Доказанное покрытие промежуточной истории 0033→0044

- Получены и разобраны **все 12 snapshot JSON `0033_snapshot.json`–`0044_snapshot.json`**. Для 11 transitions каждая `prevId` точно совпадает с `id` предыдущей, break=0. Table counts: 0033=37, 0034=38, 0035=41, 0036=42, 0037=43, 0038=43, 0039=44, 0040=44, 0041=44, 0042=45, 0043=45, 0044=47. Дрейфа/удаления таблиц в 11 переходах нет.
- Для каждой версии сопоставлены прежняя и следующая snapshots по *all* shared-table `columns`, `indexes`, `foreignKeys`, `compositePrimaryKeys`, `uniqueConstraints`, `checkConstraints` (addition/removal/modification) и перечислены новые таблицы. `0000–0033` chain/tabular evolution уже была проверена в предыдущей подзадаче; суммарно теперь **45/45 snapshots охвачены машинной проверкой исторических ссылок/таблиц**, без утверждения о построчном semantic-review каждого поля каждого snapshot.
- Все 11 SQL `0034–0044` повторно сопоставлены с итоговым `0044_snapshot.json` и зафиксированными **поэтапными** deltas: каждое имя создаваемой таблицы, перечисленные её колонки, именованные PK/FK/UNIQUE/CHECK и индексы обнаружены в итоговом snapshot, errors=0 по выполненной статической name/column inventory. Отдельно проверены определения основных изменённых колонок и catalog check; это не runtime SQL execution.

| Transition | Доказанный snapshot delta и SQL-соответствие |
| --- | --- |
| 0034 | +`forum_editor_drafts` (1 table) |
| 0035 | +`forum_attachments`, `forum_attachment_draft_refs`, `forum_post_attachments` |
| 0036 | +`forum_attachment_security_events` |
| 0037 | +`forum_attachment_draft_generations` |
| 0038 | `forum_attachments` + `cleanup_status` (text, NOT NULL, default `active`), `cleanup_claim_token` nullable, `cleanup_claimed_at` nullable, cleanup index and two CHECK; manual `forum_attachment_require_active_ref` trigger function+2 triggers are in migration SQL, not expressible as Drizzle declarative snapshot |
| 0039 | +`forum_publication_receipts`; intentional removal `forum_post_revisions_content_check` to permit file-only published message with validated refs |
| 0040 | `forum_posts.edited_at` nullable `timestamptz`; `authz_permissions_catalog_check` modified to add post edit/history rights |
| 0041 | `forum_reply_notifications.kind` = text NOT NULL DEFAULT `reply`; check `reply\|mention` |
| 0042 | +`forum_attachment_edit_snapshots` |
| 0043 | catalog CHECK modified to add `forum.attachmentSecurity.read`; final 0043 SQL 15 catalog entries match `db/schema.ts:621–629` |
| 0044 | +`forum_attachment_draft_boundaries`, `forum_attachment_draft_contexts`; foreign keys/indexes captured; historical draft provenance retained |

### Разграничения и тестовое evidence

- Изменение `0040` permission CHECK в snapshot разрешает 14 catalog keys; `0043` добавляет `forum.attachmentSecurity.read`, итоговый `db/schema.ts` содержит те же 15 keys. SQL CHECK сравнен с переходными snapshot expressions, без скрытого whitelist-conflict.
- `0039` SQL `DROP CONSTRAINT "forum_post_revisions_content_check"` совпадает с тем, что в новом 0039 snapshot check исчезает; добавленный `forum_publication_receipts` сохраняет идемпотентный stable operation receipt. Application/PG test assertions в `tests/database/forum-attachments.test.ts` и `forum-attachment-publication.test.ts` уже осмотрены предыдущей подзадачей, в том числе file-only publish, lost ACK replay, 409 revision CAS.
- `0038` cleanup admission trigger+function не представлены в snapshot: ожидаемое manual SQL дополнение, реальная работа и PG contention были проверены *содержанием существующих тестов*, в частности `tests/database/forum-attachments.test.ts:961–988` (PG 23514 after cleanup claim), **но этот чат не запускал PostgreSQL**.
- Таблицы `0034`/`0042`/`0044` с историческим словом `draft` после owner-решения 2026-10-20 НЕ означают, что пользовательские текстовые черновики активны. `docs/EDITOR.md:159–169,351–389`, `PROJECT_STATE.md:23–60` прямо требуют оставить merged SQL intact, убрать runtime text persistence, сохранить attachment/publication machinery. Не трактовать как defect.
- **Отдельные findings:** E1 — прежнее source-confirmed current-Stage 409 edit conflict recovery UI; D1 — stale `PROJECT_STATE.md:1568` (0000–0043 вместо 0000–0044). E2/E3 still unproven. **Новый defect** в рассматриваемой snapshot-chain/DDL parity: **не установлен**. Не обновлять общий channel и не назначать fix.

### Степень завершения

- **Complete bounded schema-history static pass:** 45/45 migration SQL полностью прочитаны двумя подзадачами; 45/45 snapshot files программно разобраны и проверены на continuity/table evolution; changes 0033→0044 reviewed по column/index/FK/PK/unique/check deltas и SQL linkage. Интеграционное применение PostgreSQL/metadata introspection самими агентом здесь **NOT EXECUTED**; exhaustive field-by-field parity для early intermediate snapshots не заявлена.
- Это не equates to complete independent audit whole forum. Недостающие первые historical 1–8 checkpoints cannot be retroactively asserted PASS; React Router runtime 409, revocation and ambiguous network recovery unexecuted. Separate `AUD-20261022` audit remains fully isolated.
- **Остановиться после этой одной подзадачи** до новой явной owner-команды, никаких изменений implementation PR, `main`, общих служебных файлов, чужих personal files.


---

## Первый аудит — интеграционный переход: истёкшая сессия / отозванное право после открытия формы (2026-10-22)

**Одна ограниченная подзадача завершена. ВЕСЬ ПЕРВЫЙ АУДИТ ПО-ПРЕЖНЕМУ ОТКРЫТ.** Frozen `main`: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Полный `AGENTS.md` прочитан из `main`; режим проверки — read-only implementation/test/SoT trace; второй `AUD-20261022` НЕ затронут. Никакого изменения production, implementation code, shared service file, чужих журналов.

### Проверенный сценарий

Пользователь открыл страницу с разрешённой form (Reply/Edit/MarkSolved), затем **перед новым POST** его Better Auth session перестала быть валидной ИЛИ current role grant/override был изменён. Результат должен быть fail-closed, а не доверять ранее отображённым UI controls. Точная обязательная семантика `docs/auth/AUTHORIZATION.md:164–206,223–224`: effective role/grants/overrides server-backed, next-request freshness, request-scoped only cache, protected operation resolves current permission, denial != dependency-unavailable.

**Request chain:**
1. `workers/app.ts:29–51`: new `RouterContextProvider` and `createHyperdriveAuthorization(webConnectionString)` **each incoming fetch**, call `initializeAuthContext` before react-router requestHandler; `app/auth/session-context.ts:9–17` invokes `getSession(request.headers)` before action, stores `AuthSession|null`; `auth.server.ts:85–109` uses real Better Auth `getSession` against DB. Authentication cookies propagated via `withAuthSessionCookies`.
2. `app/forum/mutations.server.ts:74–77`: no session => `{error:"unauthenticated"}` HTTP **401**, no form parsing/domain writer; `app/forum/actions.server.ts:177–188,480–503` topic route guard and action dispatch do not trust earlier UI permissions; uses server-provided actorId. `app/forum/write-actions.test.ts:622–625,995–999` show mock domain writer has **zero calls** when guest/unauthenticated. `app/auth/session-context.test.ts:44–50` covers null context.
3. `tests/database/auth-runtime.test.ts:63–169` is native Better Auth/PostgreSQL **existing source**, specifically `:154–167` artificially ages DB `session.expires_at`, and `runtime.getSession(cookie)` returns null, sets expiry cookie and removes session DB row. This test was *read*, NOT executed afresh.
4. For valid session but revoked grant, `app/forum/actions.server.ts:480–482,500–502,190–193` calls `requireForumPermission` ahead of calling `runForumMutation`. `mutations.server.ts:137–148` asks `authorizationForRequest(context).forUser(session.user.id).has(permission)`, `false` returns **403**, `AuthorizationUnavailableError` maps controlled 503, unexpected error rethrows. `db/hyperdrive-authorization.ts:19–58` keeps promise cache only inside request-local capability; `db/authorization-repository.ts:103–136` loads role+grants+overrides from consistent PostgreSQL snapshot. `app/forum/write-actions.test.ts:201–218,602–620,984–993` confirms denied actions never invoke writer and forged client actor has no effect.
5. **Real PostgreSQL test of NEXT request revocation:** `tests/database/stage4-core-e2e.test.ts:330–375` changes `builtin-moderator` grant and per-user overrides and then submits another protected action through real repo/route context; expects HTTP **403** and unchanged `isSolved` after revoked grant/deny. Regrant/override allow produces 302. This establishes existing integration test coverage of next-request freshness, not live browser form E2E here.
6. `app/routes/topic.tsx:81–130` derives optional edit/reply UI capability from latest server-side permission on loader; typed auth-unavailable may hide controls on public page. `app/forum/views.tsx:2107–2115,2559–2562` maps action failure to visible translated `role="alert"` error. `views.tsx:2236–2247` on failure keeps edit form rather than clearing it; default 4xx/5xx loader skip can leave *presentation* capabilities stale until explicit navigation/revalidation, but server authorization stays authoritative. Contract expressly says optional presentation state is NOT authorization boundary, so stale UI alone does not prove current-Stage functional/security defect; not a second E1.
7. Timing caveat: this checked revoke/expiry **before a NEW protected request**, which is explicit freshness contract. Revocation **after an already accepted in-request authorization snapshot but before commit** is a separate race, not guaranteed immediate invalidation by `docs/auth/AUTHORIZATION.md`; must not retroactively demand stronger cross-transaction locks without current Stage requirement.

### Test execution and conclusion

- **Fresh real end-to-end scenario combining opened browser form → actual DB session expiry or grant revocation → same form submission → UI + no-write:** **NOT_EXECUTED**; available local container had Node 22.16 but no source/deps/pnpm/disposable PG17/browser environment. `tests/database/auth-runtime.test.ts` and `stage4-core-e2e.test.ts` + route/unit mocks only establish the separate critical links. No fresh CI rerun.
- **Source/test-supported expected behavior:** expired request => 401 before writer; revoked grant next request => 403 before writer; client spoofing cannot restore permission; error presentation exists. **New current Stage defect: NOT ESTABLISHED**. This is a bounded, evidence-backed verification of one transition, not blanket runtime PASS and not full forum audit completion.
- Existing separate findings **E1** (post-edit stale 409 loader recovery) and **D1** (`PROJECT_STATE.md` says 0000–0043 despite journal through 0044) remain unchanged. E2/E3 remain not confirmed.
- After this checkpoint **STOP** until explicit user instruction. Next meaningful unreviewed transition: ambiguous publication POST success/response loss and retry continuity *across actual client/server layer*, distinct from server-only receipt tests. Do not mix with second `AUD-20261022`.


---

## Первый аудит — потерянный ACK публикации и idempotent replay (2026-10-22)

**Отдельная ограниченная подзадача завершена. ПЕРВЫЙ АУДИТ В ЦЕЛОМ ОТКРЫТ; `AUD-20261022` НЕ ЗАТРАГИВАТЬ.** Frozen `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; полный актуальный `AGENTS.md` из `main` прочитан. Только read-only source/test/SoT; implementation/shared file/другие agents не изменены.

Проверено: POST успешно сохраняет тему/Help-вопрос/ответ/редактирование; HTTP ACK/302 теряется; идентичный POST повторяется с теми же owner/context/operationId/payload. Отличать server idempotency от client error-recovery.

**Четыре звена:**
1. **Mounted browser identity:** `app/forum/editor-attachments.tsx:132–161,168–178,328–335` устанавливает `draftId=crypto.randomUUID()` при инициализации открытой формы и держит ID в state до reset/смены account/context/unmount; `app/forum/markdown-editor.tsx:933–939` вкладывает `editorOperationId`, exact selected IDs, retained edited IDs в native form. `:283–339` `publicationReplayRef` — технический *native form submit* replay в следующем task для поддержания submitter/validation, **НЕ network-ACK retry**. `app/forum/views.tsx:1254–1309,1925–1997,2814–2855,3015–3070` uses MarkdownEditor across four flows; busy blocks duplicate UI submits, including hook `publicationPreparingRef`.
2. **Action/writer:** `app/forum/actions.server.ts:36–53` parses/validates `editorOperationId` and JSON attachment manifest. `:98–118,145–174,480–516` forwards same to writer and redirects using resulting IDs. `db/hyperdrive-forum.ts:168–205` generates fresh random candidate topic/post/revision IDs on *each* retry but supplies stable `publishedDraft.contextKey/draftId`; repository reconciles to committed receipt IDs.
3. **Server transaction:** `db/forum-repository.ts:569–640` (topic), `:664–748` (reply), `:3674–3738` (post edit) computes stable SHA256 fingerprint over actual normalized content/selected refs/revision and starts `database.transaction`. Under `lockAttachmentDraftScope` (`db/attachment-draft-generation.ts:16–24`, `pg_advisory_xact_lock` scoped owner/context), `publicationReceipt` (`:783–803`) returns stored target IDs for equal fingerprint before cooldown/other writes; divergent content under same op=>ForumStateConflictError, mapped 409. New submit atomically creates revisions/post/mentions/refs, calls `finishPublishedDraft` (`:820–850` verifies selected live refs, retires operation, removes temporary refs), and `recordPublicationReceipt` (`:805–818`) persists durable owner/context/draftId/payload fingerprint and result IDs. `drizzle/0039_forum_publication_receipts.sql` has composite PK owner/context/draft_id. Edit receipt is checked **before stale revision CAS**, same POST does not create another revision.
4. **Regression assertions (READ, NOT freshly RUN):** `tests/database/forum-attachments.test.ts:711–769` actual route action→Hyperdrive writer→service→PostgreSQL tests the same POST twice for section topic, Help question, reply, with first result intentionally "lost" to client; both 302 location equal, receipt count 1, post count 1, exact selected attachment one, divergent body HTTP409 without new post. `tests/database/forum-attachment-publication.test.ts:279–295` repository idem reply+subset and divergent body; `:75–118` same edit Save twice, body/history remains exactly two revisions and retained/new ref selection unchanged; `:359–376` rebase and repeated same Save does not create further revision. `app/forum/markdown-editor.test.tsx:101–135` verifies native submit task replay retains submitter/form id; `app/forum/attachment-operation.test.tsx:118–127` verifies *upload* ambiguous retry ID preservation (different boundary). 
   
**Classification/limits:**
- **Server side duplicate prevention for identical POST same operation id: source + existing real-PG test coverage substantiate it. No new current-Stage defect evidenced in this bounded subtask.** Test suites were not freshly executed by Лира in this step; no actual browser network drop/fetch rejection reproduced.
- Client does **not** automatically retry a transport-failed publication POST. The published contract `docs/EDITOR.md:357–398`, `PROJECT_STATE.md:23–60` explicitly eliminates persisted text drafts/reload recovery; `editor-attachments` operation ID is only in mounted state. After navigation/reload/new form mount, new ID means a new logical request and server idempotency does not suppress accidental human repost. This is a *known boundary*, not defect without a stronger accepted current-Stage requirement. Do not claim lost-ACK browser recovery PASS.
- `editorOperationId` omitted by historical text-only clients is accepted for compatibility (`actions.server.ts:36–43`) without a durable receipt; current mounted Editor 2.0 sends ID. No unwarranted Stage hardening.
- E1 stale 409 client revalidation and D1 migrations docs mismatch remain unchanged; E2/E3 not confirmed. Early first-audit phases 1–8 ledger and actual browser experiments not retroactively called complete. Separate `AUD-20261022` untouched.
- **STOP now.** Next bounded task on explicit owner continuation could be E1 end-to-end post-edit 409 revalidation/rebase path, or independently reconciling first-audit coverage gaps; do not expand audit autonomously.


---

## Первый аудит — E1: 409 stale published edit без reload (2026-10-22)

**Статус подзадачи: закончена по доступным source, тестовому evidence и официальному documented framework behavior. ПЕРВЫЙ АУДИТ ФОРУМА В ЦЕЛОМ ОСТАЁТСЯ ОТКРЫТЫМ.** Второй отдельный `AUD-20261022` не тронут. Frozen GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; full current `AGENTS.md` reread. No implementation changes, no shared-file writes, no assignment or agent communication.

### E1 — published post edit stale 409 recovery path

1. Server authority: `db/forum-repository.ts:3674–3738` obtains a per-post transaction row lock; rejects stale `post.currentRevisionId !== expectedRevisionId` at 3706–3707 and writes no revision/refs; CAS on update at 3727–3731 also rejects concurrent change; transaction rollback. `app/forum/actions.server.ts:480–498` passes original expectedRevisionId from hidden form; `app/forum/mutations.server.ts:103–104` maps `ForumStateConflictError` to `{error:"conflict"}` HTTP **409**. No current-Stage data corruption proven.
2. React Router Framework SSR default: package pinned `react-router@8.3.1` in `package.json:37`. Official React Router v8 Revalidation Optimization https://reactrouter.com/how-to/optimize-revalidation specifically says **failed action submissions returning 4xx/5xx do not trigger loader revalidation by default**. `app/routes/topic.tsx:1–212` exports loader, action, component, ErrorBoundary but *no* `shouldRevalidate`; `app/forum/views.tsx` TopicView has no `useRevalidator` and failed edit useEffect simply clears `editPublicationRef` at `:2236–2247`. Therefore failed post edit **does not force fetching latest topic post revision**.
3. Visible blocking chain: the still-mounted edit form stores initial `editBaseRevisionId` R1 at `app/forum/views.tsx:2197–2210` and hidden field uses that stable base `:2814–2819`. Current loader `post.body.id` remains R1 after 409; `:2835–2836` Save stays eligible because local base===loader R1; `:2844–2853` conditional `postEditRevisionChanged` warning and explicit `rebasePublishedAttachments();setEditBaseRevisionId(post.body.id)` button only render if the loader post revision differs. The external current revision is R2, but client still holds loader R1: no automatic rebase path. Clicking Save repeatedly gets 409. A separate fresh navigation/reload may fetch R2 but current in-memory edit text is intentionally not durable and may be lost on remount, per `docs/EDITOR.md:357–359`. Source-confirmed current-Stage UX dead end after 409, **not a data-integrity defect**.
4. Existing `app/forum/public-read.test.tsx:2314–2382` injects remote R2 then calls `await router.revalidate()` **manually** to make rebase warning/button appear; proves correct preservation of local text + attachment IDs *after external revalidation*, NOT that 409 causes it. `:2524–2620` successful edit submission test only tests submitting→loading→idle; `:2621–2702` real HTTP 400 failure tests editor buffer preserved, not 409 revision update. `tests/database/forum-attachment-publication.test.ts:359–376` covers stale CAS + explicit new baseline and idempotent replay, without browser 409 recovery.
5. Exclusion of apparent alternatives: GitHub code search `shouldRevalidate` found only unrelated `content-generation-controls.tsx` `defaultShouldRevalidate:false`, not topic route. `useRevalidator` found in `app/auth/auth-controls.tsx` (signout), `app/forum/online-presence-heartbeat.tsx` (401 / homepage-only success), `app/forum/content-generation-controls.tsx` (conditional content generation queue/poll), and credential page, **none guarantees TopicView revalidate on post-edit 409**. Passive revalidation from other features can mask the symptom in specific topics, not solve it generally.
6. **Additional concrete current-Stage UI mismatch in same 409 path:** `app/forum/views.tsx:2561` uses generic `t("forumWriteError_conflict")`; `app/localization/catalog.ts:588` English text “That solution cannot be selected for this topic.”, `app/localization/manual-values.ts:548` Russian “Этот ответ нельзя выбрать как решение этой темы.” (Hebrew analogous). That text was written for choosing best-answer, and is erroneous/misleading for edit conflict. Treat as coupled E1 presentation symptom or separable bounded UI bug, not unrelated future Stage issue.

### Classification and evidence boundaries

- **E1 source/framework-doc supported: current Stage post-edit 409 response does not trigger latest loader refresh; repair/rebase UI cannot render latest base without an unrelated refresh.** A functional UX defect of current implementation; no evidence of lost edits on already mounted failure itself, nor unauthorized overwrite.
- Real Chromium/Worker/PG scenario `R1 open -> R2 concurrent save -> POST 409 -> inspect warning/current revision and local text` **NOT_EXECUTED by Лира**: no checked-out runtime or running browser app in this audit step. Thus do not claim fresh browser reproduction, current CI pass, or exact runtime measured observation.
- The names `E1` from this **first independent audit** vs historical `PROJECT_STATE.md:1956–1958` “Editor 2.0 edit lifecycle E1” denote different chains: historical E1 fixed premature unlocking during **successful submitting→loading**, with existing tests. They do not resolve this newly scoped failed **409→latest-loader** recovery gap. Other earlier first-audit D1 mismatch `PROJECT_STATE.md:1568` (journals through 0044) remains unchanged. E2/E3 old suspicions still not confirmed.
- No fix implemented during independent audit. Technical fix choice stays with implementation team, after full audit/review stage. Only personal audit checkpoint saved per developer permission; no formal handoff. **STOP after this bounded task**; next explicit owner continuation should reconcile outstanding first-audit coverage and stopping criteria, rather than conflate with `AUD-20261022`.


---

## Первый аудит — обновлённая инвентаризация доказательств и оставшихся gate (2026-10-22)

**СТАТУС: завершена ТОЛЬКО подзадача reconciliation. ПЕРВЫЙ АУДИТ В ЦЕЛОМ НЕ ЗАКРЫТ.** Не путать с отдельным `AUD-20261022` (0–13; 437-file manifest). Source frozen `main` = `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, branch SHA заново проверен; полный актуальный `AGENTS.md` из `main` перечитан. Рабочие заметки Лиры, без изменений реализации, иных personal files и общего communication.

### Метод и существенная корректировка предыдущей финальной сверки

Прочитаны **собственные личные records** первого аудита (начальное резюме 2026-10-21; этапы 9–13; сводная запись 14; последующие дополнительная локализация/DB/security, E1–E3, ранние 1–8 evidence recovery, target matrix 409/auth/retry/error, финальная reconciliation на строках около 1076–1121; новые checkpoint до 1283). **Предыдущая «финальная сверка» уже выполнялась**, поэтому нынешняя задача не является новым complete audit и не может лишь переименовать прошлую работу в DONE.

Корректировка относительно checkpoint `Первый аудит — финальная сверка ...` (около строк 1076–1121): формулировка «45 SQL and 45 snapshots NOT all line-reviewed» **устарела после новых DB-подзадач**. Сейчас **все 45 migration SQL 0000–0044 прочитаны полностью**, все 45 snapshot JSON 0000–0044 разобраны программно по links/table evolution, последние 0033→0044 дополнительно сравнены по columns/indexes/FK/PK/unique/check and SQL deltas, без обнаруженного нового schema-history mismatch. *Не* подменять это утверждением о полном ручном построчном review семантики каждого из 45 JSON snapshots, либо выполненном PostgreSQL apply.

### Исполненное и фактический результат

| Домен | Доказательный источник | Реально выполнено |
| --- | --- | --- |
| Public read/discovery + participation/profile/presence | Stage 9–10 records, route → service/repository → SQL, selected tests | Bounded static source/test assertions review; no live browser |
| Help moderation, attention, duplicate and appeals | Stage 11, selected PostgreSQL and route cases | Bounded source/negative-case check; no new executions |
| Better Auth session, role/overrides/freshness/owner and negative authorization | Stage 12 + later expiration/revocation checkpoint | Source chain; native PG tests including next-request revocation examined, NOT rerun |
| Editor Simple/Advanced / Markdown / 409 / attachments / receipt / cleanup | Stage 13 + later E1, ACK checkpoints | Source-client/server/DB trace, real-PG test assertions inspected; no integrated browser failure experiments |
| Locale + UI/content translations/queue-neutral persistence | Separate translation subtask | Source and chosen positive/negative test assertions inspected; real providers/Queues Stage6 excluded |
| Migrations, SQL snapshot schema history, locks | DB review checkpoints 1122–1214 | 45/45 full SQL, 45/45 parsed snapshots chain, last 11 transitions delta parity; no PG apply executed by Лира |
| CI and build | Historical exact-tree run #39615502080 + package/CI config read | Observed existing checks/database SUCCESS; no fresh own run |

**Current-stage findings:** E1: documented React Router 8 4xx/5xx skip revalidation + missing `topic.tsx` shouldRevalidate / missing TopicView revalidator + UI rebase depends on fresh post revision; accepted 409 leaves old R1 and blocks direct rebase until unrelated refresh. Also under E1, `forumWriteError_conflict` message wrongly describes selecting a solution rather than editing. D1: `PROJECT_STATE.md:1568` historical max migration 0043 versus true journal through 0044; doc only. E2 stuck pending XHR without timeout/Remove and E3 generic writer unknown→503 remain UNCONFIRMED CURRENT-STAGE defect hypotheses, do not suggest fix on hypothetical risk. No evidence of data overwrite.

### Explicit remaining verification and closure criteria

**Not recovered:** Historical original stages 1–8 detailed evidence/scope/tests cannot be inferred. Earlier new current-main source-ledger about early auth/entry/locale/CI does *not* resurrect historical step PASS. This uncertainty cannot be erased by another summary. For complete original full-scope coverage, independently demonstrate all originally required areas or make a new explicit requirement–module–scenario review program; **never re-label the unknown as done**.

**Not executed by Лира:** runtime React Router/React post-409 rejected action → loader refresh → explicit rebase and preserved current edit; same mounted browser form expiry/revocation; post-commit ACK-loss with browser retry under same operation; actual typed 503 vs thrown error UI retention; systematic keyboard/a11y/responsive/hydration states. Some cases have **existing tests**, which were *read*, not personally run. Local test environment for first audit previously inspected and unavailable/incompatible: no pinned Node 24.21.0/pnpm 12.3.4 checkout, PG17, browser app, real Worker private R2. Do not promise current-turn executable verification or production/service testing.

**Prioritization (not unconditional new Stage gates):**
1. First decide exactly what breadth the *first* technical audit is allowed to certify. For a **full originally promised audit** earlier 1–8 proof/remaining source–test coverage and high-risk browser-specific paths must be supplied by real evidence, not rewritten history. The separate `AUD-20261022` already has a strict 437-file manifest for a genuinely exhaustive pass; its progress MUST stay separate. Do not perform duplicate first-audit pseudo-completeness by borrowing its evidence.
2. Highest-impact actionable uncertainty is E1 route-level integrated rejected POST 409 (R1→R2) + editor rebase visibility/preservation; current source establishes cause, but not browser observation. A correctly pinned runnable environment is a prerequisite for an execution PASS; otherwise say NOT_EXECUTED.
3. Error UX and permission/ACK browser transitions need fresh integration proof **only to extent required by first-audit original product-scope acceptance**, not as grounds for hypothetical changes. No current Stage defect from missing manual full-audit test alone.
4. Conclude with auditable final report: exact baseline, positively reviewed module/scenario scope, executed vs read-only evidence, E1/D1 and E2/E3 classifications, explicit limits and whether full evidence is genuinely complete. Until that point **no whole-first-audit clearance; no general communication/fix assignment**.

**Decision in this bounded step:** updated concise complete-known ledger; *first audit remains OPEN and unproven in exhaustive scope*. Do not redo migrations, E1 or account auth source tracing without fresh test/reproduction benefit. No unrelated fix and no reuse of `AUD-20261022` stage statuses. STOP and await owner explicit continuation.


---

## Первый аудит — typed 400/409/429/503, исключения и сохранение формы (2026-10-22)

**Одна ограниченная подзадача завершена. ПОЛНЫЙ ПЕРВЫЙ АУДИТ ФОРУМА ОТКРЫТ; отдельный `AUD-20261022` НЕ затрагивать.** Frozen and verified `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; complete latest `AGENTS.md` from main reviewed. No project source changes. Evidence: GitHub live source/current requirements + existing tests read (not executed) + official current React Router docs about error action/ErrorBoundary. Scope limited to error-to-client buffer/attached-selection transitions in four Editor 2.0 publication flows.

### Crucial current-Stage contract, overlooked in previous summary

`docs/EDITOR.md:159–169` says text/Undo live only in **mounted editor memory**, no drafts/autosave/reload recovery. Yet `docs/EDITOR.md:262–272`, **especially line 271**, imposes a DIFFERENT direct current Stage requirement: **«При сбое сервера/интернета текст и вложения остаются на месте. Повторный запрос не должен создавать дубликат, даже если первый был обработан, но ответ потерялся.»** Therefore cannot dismiss an error-induced route unmount as permitted merely because text drafts were removed. `PROJECT_STATE.md:23–60` confirms new in-memory runtime + separate attachment operation and existing PG idempotence.

### Verified behavior and evidence levels

| Trigger | Current runtime path | Status |
| --- | --- | --- |
| `400 invalid`, `409 conflict`, `429 rateLimited`, `503 unavailable` returned through `data({error},{status})` | `app/forum/mutations.server.ts:49–50,89–111` returns **action data** instead of throwing; `app/routes/topic.tsx:205–211`, `section.tsx:45–51`, `category.tsx:159–175` pass to views; `views.tsx:1254–1309,1925–1997,2228–2279,2560–2561,2814–2855,3015–3074` show alert without intentionally closing mounted editor | Strong source behavior; `app/forum/public-read.test.tsx:2621–2707` **existing actual createMemoryRouter test** verifies 400 edit text preservation, enabled controls and exact retry body even localStorage writes fail (read not run anew). Statuses 409/429/503 full typed form and attachment retention not independently tested. E1 409 lack of revalidation remains separate finding. |
| 429 cooldown | `runForumMutation` maps `ForumWriteRateLimitError`→HTTP429 + Retry-After `Math.ceil(ms/1000)` (`:105–108`); `write-actions.test.ts:638–649` asserts 2100ms→3sec | Action status header proven by source/inspected test, no UI countdown required by accepted scope |
| Failed *upload* separate XHR | `app/forum/editor-attachments.tsx:211–247,292–316` maps onload unsuccessful/transport onerror to per-file error; Retry reuses stable ID, Remove local selection. `docs/EDITOR.md:180–197` explicit retry/remove and text preservation | Unlike publish transport, this path has explicit in-form error recovery. E2 unbounded uploading without timeout remains unproven contract defect. |
| Remount/identity reset | `app/forum/markdown-editor.tsx:189–208,251–271` retains edit content/history within same owner/context and mounted component, `useEditorAttachments` `editor-attachments.tsx:132–161,171–194,328–335` holds same `draftId` and selected refs unless explicit cancel/reset/identity switch or unmount. UI conditions: Section stable `key={section.id}`, edit `key={post.id}`; no reset at action failure. | Supports controlled-error editor continuity; no automatic persisted recovery after unmount (intentional). |
| **Unexpected protected-action authorization failure** | `app/forum/actions.server.ts:480–482` awaits `requireForumPermission` outside `runForumMutation`; `mutations.server.ts:137–147` **rethrows unexpected error** (rather than incorrectly translating to 503, as `docs/auth/AUTHORIZATION.md:184–206` explicitly requires). `topic.tsx:211`, `section.tsx:51`, `category.tsx` export `ErrorBoundary=ForumRouteError`; `app/forum/ui.tsx:401–433` renders only full-page system panel and back-to-forum link, NOT original `TopicView`/MarkdownEditor. Official React Router docs `https://reactrouter.com/start/framework/route-module` and `https://reactrouter.com/api/hooks/useRouteError` state an action throw renders ErrorBoundary **in place of the route component**. Hence mounted form and solely in-memory text/selected upload set are discarded. `write-actions.test.ts:1152–1159,1170–1177` asserts unexpected authorization error propagates, `route-error.test.tsx:60–83` only tests safe ErrorBoundary copy, does not test previously populated form preservation. | **NEW source/framework-contract-supported current Stage finding N1**: error-induced route replacement destroys unsent authoring state despite `docs/EDITOR.md:271` requirement to keep text/attachments during server failure. Concrete trigger is unexpected authorization error (not a claim about routine 503), full causal source chain complete; no live-browser observation/new test execution. **Do not “fix” authz by suppressing unexpected errors as 503; that violates its own current contract.** Requires a solution reconciling error observability with open-form preservation, subject to team review after audit complete. |
| **No HTTP response / network interruption during Form POST** | Four publication flows use React Router non-fetcher `<Form method="post">`, with no custom `clientAction`/network recovery handler in listed route modules, `views.tsx` or `markdown-editor.tsx`. The standard router may deliver unrecoverable transport failure into the route's ErrorBoundary instead of resolved action data, which then loses open-form state. | **NOT_EXECUTED / UNCONFIRMED exact browser path**. Do NOT assert actual offline fetch result without pinned React Router/Chromium integration. However `docs/EDITOR.md:271` explicitly covers internet loss, so not to dismiss as future Stage; direct browser test needed to determine occurrence. |
| **Unexpected writer exception** | `runForumMutation` catches nonclassified exceptions and converts them to typed `503`; this normally preserves mounted form but potentially masks programmer error. Unlike authz guard, no proven same contract for this writer catch. | Former E3 remains an unproven separate semantics issue, NOT automatically current Stage defect. `runSourceLocaleCorrection` rethrows unexpected errors, separate non-post-edit path. |

### Test coverage/gaps and bounded conclusion

- Inspected source of `app/forum/public-read.test.tsx:2479–2522` (reply loading lock, cancel), `:2524–2620` (successful edit loading lock), `:2621–2707` (400 failure text retention and retry), `app/forum/write-actions.test.ts:638–649,1111–1177`, `app/forum/route-error.test.tsx:60–83`, `app/forum/markdown-editor.test.tsx:101–135`. This is **test source examined**, not independent pass. No integrated browser/Worker/PostgreSQL data-route network failure test run. Local container identified: Node22.16, chromium available, but no checked-out repo or pinned Node24.21.0/pnpm12.3.4/PG17 test runtime. Could not execute faithful app route test.
- **NEW** source + RR-documented N1 is a current-Stage **actual requirement conflict** for unexpected action failures that replace route: safe error presentation but removed in-memory buffer. Exact browser reproduction **Информация не проверена**. Do not promote the still-hypothetical pure network failure to verified bug. Not data corruption or security bypass.
- Previous E1 (stale post-edit 409 no fresh loader/rebase) and D1 (migration history doc stale through 0043 instead of 0044) unchanged; E2/E3 not established. This checkpoint is NOT formal shared-channel finding; report in owner chat, do not assign fix before entire independent audit.
- Do not mix with separate explicit `AUD-20261022` 437-file detailed audit. No change implementation, shared service communication or other agent journal.
- **STOP** after bounded error-recovery subtask. Next owner continuation (if requested): a bounded *different* unverified first-audit high-risk scenario; if testing N1 is required, obtain suitable runnable app/browser environment rather than fabricate browser repro.


---

## Первый аудит — клавиатура и смена представлений Editor 2.0 (2026-10-22)

**Одна ограниченная подзадача выполнена; ПЕРВЫЙ АУДИТ ФОРУМА В ЦЕЛОМ НЕ ЗАВЕРШЁН.** Строго независимый первый аудит (исходные 1–14), НЕ `AUD-20261022` manifest 437 файлов. Frozen verified `main`: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`. Latest full `AGENTS.md` read at start. No implementation changes, no general communication, no other agents files, no edits to second audit. Evidence only source/test files examined via GitHub; tests NOT newly run.

### Current Stage contract

`docs/EDITOR.md:16–43`: Simple WYSIWYG + Advanced Markdown share one source; mode/Preview/Split alone preserves exact Markdown bytes and Undo/Redo history, cursor/selection where feasible. `:47–70` agrees toolbar and mode/preview/fullscreen, compact menu on narrow displays. `:159–169` text/history kept only in mounted form; mode/Preview/Fullscreen/validation does not clear buffer. `:328–348` Ctrl/Cmd+Z/Y/Shift+Z Undo/Redo, Ctrl/Cmd+B/I/K format, Ctrl/Cmd+Enter submit, tab navigation except within Advanced editable code, Ctrl/Cmd+F find only inside editor, labels/focus/mobility. `:351–400` source path and applied test matrix; final cosmetics separate project refinement.

### Source and actual inspected test assertions

1. **Lossless source and history:** `app/forum/markdown-editor.tsx:189–208,213–249,260–270,406–429` stores **one** `value` and `historyRef`, changes mode/view through `setAuthoringMode` and `setMode` without re-serializing Markdown. `app/forum/editor-document.ts:200–252` `recordEditorEdit` adds a step ONLY when Markdown changes, Undo/Redo mutates one shared history; capped 100. `app/forum/editor-document.test.ts:52–60,161–183` asserts no-op change on reparse, exact bytes/selection Undo/Redo. `app/forum/markdown-editor.test.tsx:592–643,703–732,782–805` real assertions on history across Split/Write, Simple→Advanced→Simple then Undo/Redo, exact `FormData` preserving CRLF through view switches and unedited ranges. **Source/test-supported, not fresh runtime pass.**
2. **Selection/caret:** `markdown-editor.tsx:159–178,343–425,652–684` captures selection at authoring mode switch; pending refs + `useLayoutEffect` focus/selection restore to textarea or source-mapped visual leaf. `visual-markdown-editor.tsx:175–270,279–368,542–634` DOM/source mapping and direct contenteditable on safe prose leaves; protected structures cannot silently become editable. `markdown-editor.test.tsx:199–216,352–408,454–499,734–759,1218–1300` selects, format Undo/Redo, calls imperative focus/quote after preview, fails closed on protected source. Actual DOM focus/IME behavior in Chromium, different mobile browsers and screen readers **NOT_EXECUTED**.
3. **Keyboard shortcuts and Tab:** `markdown-editor.tsx:891–931` editor-local event capture Ctrl/Cmd+Enter form.requestSubmit (checked on readiness), B/I/K, simple Z/Y; `:1109–1135` advanced Ctrl/Cmd+F and Z/Y handling; `:555–601` handles Tab indentation and pairs ONLY when cursor is in `editableCodeRanges` (valid fenced code body, not info or closing markers), otherwise falls back to native keyboard navigation. `markdown-editor.test.tsx:85–99,1097–1134,1439–1457` checks formatting/Undo, code-only tab and Ctrl+Enter once for both Simple/Advanced. `docs/EDITOR.md:335` ordinary Simple Tab is navigation, consistent with source.
4. **Preview/Split, hidden textarea and validation:** `markdown-editor.tsx:1017–1046,1059–1171` simple preview toggles, advanced menu has Markdown/Preview/Split; same internal source, hidden source input is the submitted form body; invisible textarea removed from sequential Tab order in preview; native `invalid` reveals editing pane. `markdown-editor.test.tsx:475–530,630–679,1459–1486` asserts preview-to-edit focus, aria region, actual same hidden form value, view-mode transitions. `docs/EDITOR.md:57–62` scope.
5. **Fullscreen focus:** `markdown-editor.tsx:883–903,1044–1046` uses `role="dialog"`, `aria-modal`, aria-label, focus wrap at first/last visible eligible controls and Escape to exit; `app/styles.css:9232–9245` gives fixed-position full viewport and scrollable workspace, visible focus CSS `:9216–9219,5578`. `markdown-editor.test.tsx:1488–1526` checks ARIA and edge Tab/Escape **in jsdom with manually mocked getClientRects**, NOT actual Chromium keyboard traversal, screen-reader modality or mobile UI. No proven defect from this alone.
6. **Attachments survive view changes:** `markdown-editor.tsx:251–258,933–939,1183–1186` calls `useEditorAttachments` from stable component, and `editor-attachments.tsx:132–178,328–335` keys operation on owner/context, not authoring mode, Preview or Fullscreen. Explicit cancel/context reset rotates `draftId` and clears selected; mode/preview/fullscreen `setState` has no reset/cancel. Existing `attachment-operation.test.tsx:106–188` covers in-memory ID/selection and reset, but **there is no found integrated dedicated assertion** that selected attachment + operationId survive every preview/fullscreen switch. Source continuity supports expected behavior, end-user browser check remains open.
7. **IME and F7:** `visual-markdown-editor.tsx:620–634` maintains same DOM leaf across initial typing. `markdown-editor.test.tsx:1368–1389,1618–1629` verifies same focused contenteditable leaf during composition/whitespace; source shows safe markup. Browser-specific F7 focus/IME via actual Chromium not freshly executed here; no claim of whole accessibility acceptance.

**Outcome:** no NEW confirmed current-Stage source-level defect in this bounded keyboard/view/history/state review. This is not a 100% keyboard/a11y/responsive QA PASS, and no fresh runnable tests were executed. Full browser Tab cycle and fullscreen modality, IME/mobile physical+screen keyboards, focus and selection across renderer changes, native form validation, attachment selection through all views remain **NOT_EXECUTED in this first audit**; identify only as evidence limitations pending required browser acceptance. Do not invent new hardening work without current Stage reproducible breach.

Earlier audit status unchanged: E1 stale 409→loader freshness/rebase; N1 unexpected thrown protected action→route ErrorBoundary unmount loses in-memory authoring despite docs/EDITOR.md:271; D1 outdated migration end 0043 vs 0044. E2/E3 conditional observations not confirmed. No source edits / team handoff. **STOP** this subtask until next explicit owner instruction; next distinct high-value audit slice can be responsive/RTL presentation and accessible error/toolbar labels, but must not duplicate this exact review.


---

## Первый аудит — адаптивность, RTL и доступность интерфейса форума (2026-10-22)

**Одна ограниченная подзадача завершена. ПЕРВЫЙ АУДИТ В ЦЕЛОМ НЕ ЗАВЕРШЁН.** Не путать с отдельным `AUD-20261022`/437-file manifest. Frozen GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, `AGENTS.md` полностью перечитан из main; no implementation/shared-channel/other-agent modifications. Only source and existing-test inspection; NO fresh test runs, screenshots, Pages preview, actual Worker or browser visual acceptance.

### Действующий контракт и граница Stage

`docs/UI_UX_PASS.md:617–656` outlines prior shared-shell and mobile-navigation refinements, focused skip-link, RTL and zoom/reflow behavior; its historical accepted mobile nav and PR #167 owner review not re-certified here. `:666–697` **requires browser acceptance with recorded revision, fixtures, viewport, locale/direction, screenshots**, including 3 viewport classes (narrow phone/intermediate desktop), complete LTR/RTL and mixed text, guest/user/manager, empty/populated forum views, multiple messages/code, form/error states, keyboard/focus/contrast/reduced motion/reflow; green CI/source alone insufficient. For Editor 2.0 specifics `docs/EDITOR.md:328–348` focus/labels/mobile and `:14` final cosmetic refinement separate from functionality. No automatic escalation of aesthetic gaps into current-Stage functional findings without reproduction.

### Checked chains with source and actual test assertions

1. **Root/document locale:** `app/root.tsx:8–35` reads trusted locale loader metadata from matched routes and sets `html lang` + `dir` (`en/ltr` fallback), viewport metadata `:39`. `app/forum/ui.tsx:100–130` label-backed native language select uses native language name and preserves current path/search/hash on selection. `app/forum/ui.test.tsx:115–160` contains actual locale route/query/hash asserts, but not newly executed.
2. **Global shell semantics/focus:** `app/forum/ui.tsx:235–362`: localized skip-link FIRST inside ForumShell targets `#forum-content` with `tabIndex=-1`; navbar `aria-label`, discovery links with meaningful `aria-label` even if caption hidden, theme/language controls, unread notifications count label. `app/styles.css:131–134,7170–7205` defines visible `focus-visible`, skip-link keyboard reveal, logical inset and bounded header widths. `app/forum/ui.test.tsx:83–112` tests Tab first onto skip link and its href/focusable target, **does not click skip and assert real browser focus transfer**. No invented full focus PASS.
3. **Responsive layout:** `app/styles.css:1131–1197,1719–1794,2872–2932,6975–7055,7169–7205,9247–9269` shows fluid shell, 52/44/38/30rem adaptive rules, high zoom/intermediate header reflow, narrow mobile centered discovery icon pills (3.6rem each) and localized accessible labels, compact toolbar and stable navigation, minmax(0,1fr) and logical margins/paddings. `app/forum/ui.tsx:285–325` icon+caption markup has accessible title/label, hidden captions under narrow @media. A static CSS branch audit **cannot establish** actual fit/reflow/tap target/100–400% zoom on hardware or exact Hebrew long-label layout; not declared defect.
4. **RTL and mixed source:** `app/root.tsx:32–35` shell direction; `app/forum/views.tsx:98,231,292,404,1336,1585,1627,1643,1696,2569,2661` uses `<bdi dir=auto>`, `dir=auto` for titles, names, reasons/links; `app/forum/markdown.tsx:259–294,317–342` positions rendered prose/list/headings independently via `dir=auto`, and forces code, source language names to `ltr` even under Hebrew RTL. `app/styles.css:803,893,1627–1641,2644–2671,3709,3965,4204,4515,8649,8908` appropriately isolate LTR code and RTL arrow flipping; physical left/right padding/margin/float for core layout not identified in static CSS scan (not exhaustive semantic layout proof). `app/forum/public-read.test.tsx:395–448` parametrized EN/LTR, HE/RTL path/view chain, `:2070–2119` translated HE title + original EN disclosure `lang/dir`; `app/forum/markdown.test.tsx:383–480` mixed language paragraph and code direction assertions. Test source READ, not newly run.
5. **Forms, status and error accessibility:** `app/forum/views.tsx:1255–1309,1925–1997,2560–2561,2815–2855,3015–3070` forms `aria-labelledby/aria-label`, `aria-busy`, field `aria-describedby`, feedback `role=alert`, async `aria-live`; `app/forum/ui.tsx:401–433` safe systemic error `role=alert` and recovery link. `app/forum/public-read.test.tsx:3199–3222` source asserts named topic/reply forms and help hints; `app/forum/route-error.test.tsx:60–83` tests generic/typed safe copy. This inspection does not independently measure keyboard focus order, screen reader announcements, WCAG contrast or form zoom/reflow.
6. **Test inventory and execution boundary:** Source tree includes `app/forum/ui.test.tsx`, `public-read.test.tsx`, `homepage.test.tsx`, `markdown.test.tsx`, `markdown-editor.test.tsx`, `route-error.test.tsx`, screenshot-free React component tests. No first-audit fresh Chromium/Playwright matrix. `docs/UI_UX_PASS.md:648–656` explicitly calls for browser exercise and semantic tooling where available; user-specific visual/Pages acceptance remains as governed by owner/Stage decisions. Do not claim this is an accepted current head.

**Finding classification:** No NEW source-confirmed current-Stage functional/accessibility defect from this finite audit slice. Static evidence of mitigations is not a PASS for real visual clipping, overlap, keyboard focus, reduced motion or screen reader/contrast; those aspects `NOT_EXECUTED` in the FIRST audit. Do not invent fixes or claim full audit closure. E1 (failed 409 latest loader / misleading conflict label), N1 (unexpected thrown action→ErrorBoundary discards mounted form contrary to `docs/EDITOR.md:271`), D1 (migration history documentation max 0043 vs actual 0044) remain; E2/E3 not confirmed. Separate `AUD-20261022` unchanged. STOP this bounded task; next only after explicit user `...`.


---

## Первый аудит — empty/error/loading and locale switch (2026-10-22)

**BOUNDED STEP COMPLETE; ORIGINAL FIRST AUDIT REMAINS OPEN.** This is first audit only, not separate `AUD-20261022`. GitHub main exact `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; complete live `AGENTS.md` read from main. Source + existing test assertions inspected; NO local tests, browser runtime, Worker, actual network switch or visual acceptance performed. Only personal file checkpoint; source/shared channel/other agent files untouched.

### Distinctions checked

1. **True emptiness in public reading:** `app/forum/views.tsx:74–88` displays `categoriesEmpty` only when actual homepage category list empty; `:1792–1810` `sectionsEmpty` only empty category.sections; `:1864–1870` `topicsEmpty` for empty section. Additional `:147–162,203–215,315–325,380–381,467–474,531–543,563–580` implement empty popular/unanswered/unread/notifications/tags/tag results and separate search prompt/query-too-long/no-results. For search, no-results applies when a query exists and results length 0, not when query missing. No proof of DB misreporting.
2. **Optional presence degradation (strongest positive regression):** `app/routes/home.tsx:12–22` performs main `readHomepage()` and optional `readOnlinePresence()` concurrently; only `ForumStorageUnavailableError` for presence maps to null, unexpected error rethrows; `app/forum/views.tsx:90–103` null renders `role=status` unavailable, non-null count=0 renders actual zero + `onlineNoMembers`. `app/forum/public-read.test.tsx:454–477` covers typed unavailable vs unexpected; `app/forum/homepage.test.tsx:209–238` asserts unavailable≠0, actual empty true zero, links. These are existing test *sources*, not freshly executed.
3. **Optional auth/read-state fallback without misrepresenting critical errors:** `app/routes/section.tsx:18–42` throws 404 for missing section; typed `ForumStorageUnavailableError` in optional per-user unread data leaves public topic listing readable, `AuthorizationUnavailableError` in optional editor permission also does not remove public section. `app/routes/category.tsx:78–95` typed authz unavailability preserves general Help reading but protected needsReview filter explicitly gets 503, denied user 403. `app/routes/topic.tsx:84–130,153–176` handles optional permission/content-status failures by type rather than catch-all; unexpected errors propagate. Do not call legitimate forbidden/unavailable a zero-result state.
4. **Route failures vs empty:** `app/forum/ui.tsx:397–433` `EmptyState` and `ForumRouteError` structurally distinct. Error boundary maps 401,403,404,503 to safe localized copy, unexpected to generic 500 with `role=alert` and locale-scoped forum home action. `app/forum/route-error.test.tsx:60–83` existing tests verify 4 statuses + suppression of sensitive unexpected details. Error boundary replacing forms can lose in-memory authoring: already separately classified as N1, not a newly found defect in this task.
5. **Locale switching normal path:** `app/forum/ui.tsx:92–130` native labeled select checks enabled locales; replaces first URL locale segment, preserves `location.search` and `location.hash`. `app/forum/ui.test.tsx:115–160` actually asserts `/en/topics/42?view=latest#post-2`→`/ru/topics/42?view=latest#post-2` and preview override handler. `app/routes/locale-boundary.tsx:34–55,67–87,136–149` validates requested locale, injects its i18n resource snapshot, redirects invalid/legacy locales according to resolution. Under degraded locale registry, GET/HEAD for non-bootstrap locale throws temporary 307 redirect to English preserving server-visible path/search, while protected non-GET gets 404; fragment not available server-side and cannot be assumed preserved across this fallback. This is a distinct contingency; no ungrounded defect assertion.
6. **Current Stage:** `docs/UI_UX_PASS.md:666–697` browser acceptance matrix explicitly includes empty populated sections, auth/error routes, LTR/RTL and actual runtime; missing live browser network-interrupted locale-switch and client visibility tests are evidence gaps, not automatically code defects. No new confirmed current-Stage defect in this bounded slice. Existing E1 (409 failed edit rebase), N1 (unexpected action ErrorBoundary losing mounted editor), D1 docs migration 0043 vs 0044 untouched. E2/E3 unconfirmed.

**STOP.** Next explicit owner continuation should choose distinct originally uncovered first-audit scope; do not repeat empty/error/locale source-only review or conflate the separate 437-file audit. No formal team finding publication.


---

## Первый аудит — пустые выборки, ошибки загрузки и смена локали (2026-10-22)

**Одна ограниченная подзадача завершена; первый аудит форума целиком ОСТАЁТСЯ ОТКРЫТЫМ.** Separate `AUD-20261022` untouched. Frozen `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; current full `AGENTS.md` independently fetched/read first. Audited source/test assertions via GitHub: NO code changes, NO new test/browser runs, no cross-agent or shared communication.

### Scope and verified read chains

1. **Genuine empty data must not impersonate failures:**
   - `app/forum/views.tsx:75–102` home displays `categoriesEmpty` only on legitimate `categories.length===0`, but `onlinePresence===null` renders `role=status` `onlinePresenceUnavailable`, unlike real 0 and no members; `app/routes/home.tsx:12–22` only swallows typed `ForumStorageUnavailableError` from *optional* presence fetch, rethrows unexpected errors, and does not mask required `readHomepage` failures.
   - `app/forum/views.tsx:161–163,212–215,323–326,379–381,467–473,538–540,573–575` render purpose-built empty copy for popularity by window, unanswered, unread, notifications, search (blank, overlength, zero result distinct), tags and tag page. Category/section empty `:1792–1796,1864–1868`, empty pinned/latest `:914–936`. Homepage category with 0 sections maintains visible identity/link without false nested section card `:654–655`; existing `app/forum/homepage.test.tsx:136–155` specifically covers it. Help modes map distinct empty translation keys `app/forum/views.tsx:1096–1125,1389–1402` and have existing tests `app/forum/public-read.test.tsx:865–886,954–975,1005–1024,1349–1394`. Search no-results assertion `:1996–2005`. These sources/tests READ, NOT newly executed.
2. **Required loader failures and auth status must remain distinct:**
   - `app/routes/category.tsx:113,135–136`, `section.tsx:18–19`, `topic.tsx:35–37`, `tag.tsx:16` missing entity throws `404`, not empty result. Help private modes (`mine/help/for-me/needs-review`) require session or permission `category.tsx:67–95`, return `401/403`; optional typed authorization outage may let public mode render without controls; protected needs-review outage returns `503`.
   - `app/routes/notifications.tsx:19–37` and `unread.tsx:17–31`: absent session `401`, typed required storage outage `503`, unexpected error rethrows. `app/routes/section.tsx:23–40` optional unread state or auth presentation failure degrades without changing authoritative core section data; `topic.tsx:92–154` optional read/permission state likewise. `app/routes/locale-boundary.tsx:89–119` typed optional authz / header unread count service failure only suppresses header controls/count; unexpected errors propagate; required private route still checks independently. Thus no evidence that known core-read outages falsely show "empty".
   - `app/forum/ui.tsx:401–433` maps route errors 401,403,404,503 and generic unexpected 500 to localized safe status-specific system page and back-to-forum link. `app/forum/route-error.test.tsx:60–83` tests each HTTP status and leak suppression; no real Chromium error route exercised by Лира. Prior **N1** lost unsent editor buffer after error boundary replacement is a distinct already recorded finding, not retested here.
3. **Locale change + partial/failed registry and translation fallback:**
   - `app/forum/ui.tsx:92–130` `LanguageSwitcher` uses actual current active locale list/native label; modifies URL's locale segment, preserves `location.search` and `location.hash`. `app/forum/ui.test.tsx:115–163` tests change `/en/topics/42?view=latest#post-2`→`/ru/topics/42?view=latest#post-2`, and preview injected handler.
   - `app/routes/locale-boundary.tsx:34–62` explicit canonical resolution, `404` for invalid locale, canonical redirect for aliases, typed context. Degraded registry nonbootstrap GET/HEAD translates path/query to temporary English `307, Cache-Control:no-store` and refuses redirect mutation (`404`); `app/routes/locale-boundary.test.ts:21–118` includes protected mutated alias, canonical Hebrew RTL, and degraded redirect asserting `/en/?from=outage`. `app/root.tsx:26–35` `lang/dir` from context on document root. `app/routes/locale-negotiation.test.ts:19–93` validates signed-in preference/cookie/Accept-Language order, no cache and no mutation root.
   - `app/localization/resource-loader.ts:25–70` loads chain active locale→fallback(s)→canonical EN; `app/localization/catalog.ts:89,249,314,365–367,432` has required status/empty source text, Russian and Hebrew manual translations `app/localization/manual-values.ts:53,213,274,325–327,392,624,782,840,891–893,955`. `app/localization/resources.test.ts:123–174` source asserts stale fallback and reviewed packs. NOT fresh runtime execution.
   - **Cross-locale navigation with already-open authoring form is intentionally NOT text draft recovery**: `docs/EDITOR.md:159–169` says reload/navigation does not restore unsent text, so not automatically current Stage defect. `markdown-editor.tsx:189–208` scope includes `editorLocale`; updating same mounted editor resets body/history; `useEditorAttachments` keys owner/context without locale. Ambiguous same-mounted locale-change lifetime: do **not** claim full UI state transition (may remount), and do not infer a concrete new loss/cross-context defect without browser repro and accepted stronger contract.
4. **Evidence boundaries:** inspected existing actual assertions in `app/forum/public-read.test.tsx:395–451,454–477,865–886,954–975,1005–1025,1349–1395,1975–2005`; `app/forum/homepage.test.tsx:136–155,225–237`; `app/routes/locale-boundary.test.ts:21–118,151–175`; `app/routes/locale-negotiation.test.ts:19–93`; `app/forum/ui.test.tsx:115–163`; `app/forum/route-error.test.tsx:60–83`; `app/localization/resources.test.ts`. None were newly run, no real end-to-end navigation or network outage injection. Need not repeat them just to fill old stages 1–8.

### Bounded outcome

No NEW substantiated current-Stage defect for **genuine empty-vs-error** route states and locale switching based on reviewed source/test evidence. This is NOT full application acceptance, nor proof against transport failures not emulated in browser. Historical E1 (edit 409 failed loader revalidation, plus misleading conflict label), N1 (unexpected action throw → ErrorBoundary destroys mounted editor buffer contrary to `docs/EDITOR.md:271`) and D1 (PROJECT_STATE migration max 0043 vs journal 0044) unchanged. E2/E3 still unverified current-Stage hypotheses. *First audit overall open.* Second `AUD-20261022` not included. **STOP at coherent subtask boundary; await explicit next `...`.**


---

## Первый аудит — HTTP cache boundaries личных SSR-ответов (2026-10-22)

**BOUNDED SUBTASK COMPLETE; FIRST ORIGINAL AUDIT REMAINS OPEN.** Separate `AUD-20261022` is NOT included or updated. Frozen exact `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, main HEAD checked, complete actual `AGENTS.md` re-read. No implementation, shared service channel or other agent file changes. Source + preexisting test files reviewed via GitHub, live tests/Workers/dev-server/HTTP response/CDN settings/browser not executed.

**Why a genuinely distinct slice:** Own journal's first-audit Stage 10 (`chatgpt-6.md:561–567`) ALREADY traced unread/notification actor-bound reads/marks and monotonic state; repeat prohibited. This slice instead asks whether a personalized SSR response generated for user A could be replayed to B by an HTTP edge cache; distinguishes request auth from response cache semantics.

### Traced boundaries

1. **Per-request auth/data:** `workers/app.ts:29–51` allocates a new `RouterContextProvider` per request, populates `initializeAuthContext` before createRequestHandler; the returned data is not a process-level shared response object. `app/routes/notifications.tsx:15–37`, `unread.tsx:13–30` gate with nonnull Better Auth session and read with **`session.user.id`**, unauthenticated 401; `authorization-admin.tsx:15–46` requires per-request `access.authorization.manage` and reads current roles/grants; `profile.tsx:19–41` projects public profile data, `isOwner` computed from session. Nested `locale-boundary.tsx:67–132` SSR loader derives `authUser`, manage/attention links and unreadNotificationCount from same request-bound session, so even public forum SSR can be personalized.
2. **Headers/wrapper:** `app/auth/session-context.ts:21–35` intentionally propagates only Better Auth's Set-Cookie headers to the final page, not getSession cache headers; `session-context.test.ts:53–77` asserts that existing response's `Cache-Control: public, max-age=60` is unchanged by wrapper (synthetic unit test, **NOT evidence any current page actually emits public cache header**). `notifications.tsx`, `unread.tsx`, `authorization-admin.tsx`, `profile.tsx`, `locale-boundary.tsx` do not export route `headers` or explicitly add a page-level private/no-store cache policy in the source. **Actual final SSR response Cache-Control status from RR runtime NOT measured**; do not misstate as a confirmed missing header at network edge or a browser leak.
3. **Known targeted explicit no-store:** `app/routes/mentions.ts:7–12` sets `Cache-Control: private, no-store` and `nosniff` on JSON; `attachment-download.ts:11–15,73–81` same for downloads/errors with other safe headers; `attachment-upload.ts` and `presence.ts` set no-store on relevant responses. `locale-negotiation.ts:10–17`, `locale-boundary.tsx:40–49` 307 locale preference/degraded redirects explicitly no-store. `SCAFFOLD_PLAN.md:181–185` states **root negotiation redirect must no-store but it does NOT require no-store for ordinary canonical `/:locale/...`**. Do not fabricate contractual conflict.
4. **Caching not currently enabled via inspected Worker configuration:** `wrangler.jsonc` contains Worker main, observability, Hyperdrive bindings but **no `cache.enabled`**; `workers/app.ts` does not call `caches.default`, `cache.put`, or subrequest fetch cache. GitHub code search for `cache.enabled`, `caches.default`, `cache.put` returned **no matches in current source**. At 2026-10-22, official Cloudflare Workers Cache docs `https://developers.cloudflare.com/workers/cache/configuration/` (last update 2026-10-12) show new Workers Caching requires explicit `cache.enabled: true` in Wrangler, and `https://developers.cloudflare.com/workers/cache/` explains cache response behavior. The project also has disabled Hyperdrive DB cache infrastructure documented in `PROJECT_STATE.md:1880–1889`; **DB connection cache != HTTP edge cache**. `SCAFFOLD_PLAN.md` guards localized canonical route cache semantics.
5. **Present finding:** No current exact-build path confirmed for A's private server response replay to B (strong request isolation, no Worker cache policy enabled in checked code). The lack of explicit private/no-store for route-produced personalized SSR is a *conditional caching-policy concern*, not a demonstrated current Stage defect or owner-agreed requirement. If future Worker Cache explicitly enabled or HTTP front-end altered, do a separate audit then. **No automatic fix justified pre-release**.
6. **Unverified external/runtime boundary:** unknown actual deployed CDN/edge configuration outside `wrangler.jsonc` and whether it runs this exact SHA; no Worker-HTTP capture for browser/ETag/Cache-Control; cannot verify browser back/forward cache after logout, intermediary user isolation, or future cache.enabled deployment. Do not claim real network vulnerability or successful live cache isolation test. No additional findings E1/N1/D1; E2/E3 remain unconfirmed.
   
**STOP** after this slice. Original first audit still open due historically missing early stages 1–8 evidence and not-executed real browser/Worker endpoints. The separate `AUD-20261022` manifest progress is completely separate and cannot be credited as done. Next owner `...` should pick another *truly unreviewed* current Stage boundary or reconcile feasible end-gates, never repeat Stage10 unread/notifications or promote hypothetical future caching.


---

## Первый аудит — серверные ошибки, логи и диагностическая приватность (2026-10-22)

**BOUND STEP COMPLETE; FIRST ORIGINAL FORUM AUDIT REMAINS OPEN.** Baseline GitHub `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, current full `AGENTS.md` re-read. Scope only unexpected exceptions and server/app/Worker diagnostic-output privacy, not a repeat of route business rules/previous empty/error view checks. Separate `AUD-20261022` unaffected. No source, team shared channel or other agent personal file changed. Current code/test/docs and authoritative upstream docs read; no fresh browser, Worker live invocation, observability dashboard inspection or Vitest execution.

### Source trace and differentiated error paths

1. **Safe SSR stream (already present):** `app/entry.server.tsx:1–46` uses `renderToReadableStream` `onError`, calling `reportSsrStreamError` only when `shellRendered` is true; `app/server-logging.ts:1–30` never serializes exception message/stack/request headers, only allowlisted `event=ssr_stream_error`, `phase=after-shell`, `errorKind` in six fixed categories. `app/server-logging.test.ts:4–48` asserts OAuth `code/state`, bearer/session cookie and URL in error object do not get logged, including thrown non-Error string. **Test inspected only, not freshly run.**
2. **React Router's independent caught loader/action/initial-shell logging:** `app/entry.server.tsx` exports handleRequest and stream onError but **NO named `handleError` export**, confirmed complete 47-line file and repository search. Official React Router Framework `entry.server.tsx` documentation (https://reactrouter.com/api/framework-conventions/entry.server.tsx) explicitly says **by default framework logs encountered server-side errors to console** unless exported handleError replaces that behavior; exception data includes the original raw Error (message/stack), rather than passing via the bespoke SSR post-shell allowlist logger. `app/routes/topic.tsx:93–130`, `app/forum/mutations.server.ts:137–147` and `app/routes/authorization-admin.tsx:15–44` intentionally rethrow unexpected programming/schema/authz errors. Those *reach this default error reporting path*. `docs/auth/AUTHORIZATION.md:184–206` requires unexpected errors remain observable and are NOT silently masked as unavailable 503; this does **not** authorize leaking exception content to client. Route errors `app/forum/ui.tsx:401–433` safely render generic, localized HTTP error copy, and `app/forum/route-error.test.tsx:60–83` verifies internal messages absent from DOM. **Client-safe rendering and log-safe telemetry are two different boundaries.**
3. **Before RR handler / uncaught Worker exceptions:** `workers/app.ts:29–51` resolves DB bindings, initializes Better Auth session and dependencies **before** entering `requestHandler`, without app-level catching/safe reporter. An unexpected error here skips both exported route ErrorBoundary and the SSR stream reporter. `wrangler.jsonc:6–10` enables Worker observability at `head_sampling_rate=1` with `redact_query_string=true`. Official Cloudflare Workers Logs docs (https://developers.cloudflare.com/workers/observability/logs/workers-logs/) confirm invocation logs/custom logs/errors/uncaught exceptions are collected; 2026-08-24 change (https://developers.cloudflare.com/changelog/post/2026-08-24-preserve-exception-info/) says error objects passed to console can include exception message and stack. `redact_query_string` (https://developers.cloudflare.com/api/typescript/resources/workers/subresources/beta/subresources/workers/methods/edit/) specifically removes query components of logged **request URLs**, NOT text of arbitrary Error.message/stack.
4. **Known safer warning reporters:** `db/hyperdrive-registry.ts:21–27,52–62` logs only `locale_registry_degraded` and finite `RegistryDegradedReason` enum (from `app/localization/persistent-registry.ts`); `db/hyperdrive-ui-translations.ts:23,38–42,60–80,144–161` logs fixed degraded reason (`unavailable|schema-mismatch|timeout|invalid-bundle`), never raw DB cause; `app/localization/persistent-sources.ts:40–75,360–368` logs origin and aggregate skippedRows/reason counts, not raw translation payload. No new leak established in these three collectors.
5. **Client-facing classified error surfaces:** `app/forum/mutations.server.ts:93–118` returns opaque error codes and statuses 400/403/404/409/429/503 (including unknown writer failures transformed to 503, the preexisting E3 source behavior) rather than raw details; `app/routes/attachment-download.ts:11–15,73–88` safe blank 4xx/5xx, no underlying bucket key. `app/forum/ui.tsx:401–433` strips unexpected `Error.message` from rendered content. No new client-side error-message leakage confirmed.

### Classification / demonstrated vs conditional

- **New L1: source+official framework confirmed diagnostic logging boundary gap in current server paths.** Post-shell SSR only is allowlist-sanitized; initial-shell/loader/action errors use React Router default console logging, while pre-router Worker failures pass as uncaught runtime exceptions with observability enabled. Thus **exception messages and stacks are not universally sanitized before diagnostics**. This is a real current-runtime behavior and a **current Stage confidentiality concern / potential defect**, not merely an unrelated Stage 6 idea. The prior safe `reportSsrStreamError` test does not test these paths. Do not propose simply swallowing unexpected exceptions or converting all to 503, which violates `docs/auth/AUTHORIZATION.md` unexpected error semantics and loses diagnostics.
- **No observed exfiltration of concrete secrets, personal messages, OAuth codes or cookies** established: whether any thrown present-day real dependency message actually contains those fields, external Cloudflare dashboard permissions, logging pipeline settings and deployed version are **NOT_VERIFIED**. Do not label actual user-data leak or public disclosure. Need targeted test of loader/action exception with planted sensitive marker asserting emitted safe log **and** unchanged ErrorBoundary UX, plus pre-router exception handling/Cloudflare Worker runtime test if seeking executable proof. No tests newly run.
- Real Cloudflare invocation telemetry, worker exception stack capture and framework's default logger precise output not executed against exact built app; their behavior is supported by official 2026 docs, not independently measured. External production deploy/settings strictly out of audit authorization.
- Prior findings first-audit E1 (409 edit-rebase freshness), N1 (unexpected action ErrorBoundary unmounts unsaved editor), D1 (outdated 0043 document vs migration 0044) unchanged; E2/E3 unconfirmed. **No formal publication to team.**

**STOP after this bounded log/exception/privacy slice; FIRST audit remains OPEN, separate `AUD-20261022` scope unchanged.** Next user continuation may focus on another genuinely unreviewed current Stage boundary or closure-evidence planning, not duplicate error view or raw auth flows.


---

## Первый аудит — logout и межвкладочная смена учётной записи (2026-10-22)

**Одна ограниченная подзадача выполнена; ПЕРВЫЙ АУДИТ В ЦЕЛОМ ОТКРЫТ.** Текущий `main` `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`, актуальный `AGENTS.md` перечитан полностью. Первый независимый source/test audit, НЕ `AUD-20261022` (437-file second manifest). No source edits / shared service channel / other agents files. Existing test *source* read, not freshly executed; two-tab Chromium/real auth Worker/PG not run.

### Current requirements and positive isolation findings

- `docs/EDITOR.md:159–169,308–314,351–368`: author text/history only in mounted form, no text storage or reload recovery; four editor *preferences* are locally retained keyed to stable account ID, survive signout and must not be applied across account switch; opaque attachment operation per form/account/context and owner check on server, no cross-user inheritance. `docs/EDITOR.md:271` requires in-form error retention, not necessarily survival on explicit logout.
- `app/forum/markdown-editor.tsx:109–157,159–208,251–258` derives `accountId=useHeaderAuthUser()?.id`, `localStorage["vico:editor:mode:"+accountId]` and spell-check key, with fallbacks; useEffect on JSON.stringify([accountId, editorContextKey, editorLocale]) resets entire `value` and `historyRef` when scope genuinely changes. `app/forum/markdown.tsx:189–225` code-wrap and line number settings likewise per-user, reset to defaults for guest or different account. Global theme key intentionally site-wide, does not contain authoring content; no production localStorage text draft paths (legacy-only localStorage key in test `public-read.test.tsx:2426–2475` ignored).
- `app/forum/editor-attachments.tsx:132–167` changes owner/context → fresh generation ID+entries; ongoing XHR's `identityRef` invalidates callbacks and cleanup aborts requests; attachment view URL/selection tied to owner/context ID; `app/forum/attachment-operation.test.tsx:157–163` asserts stale ACK under old account cannot repopulate selection. `markdown-editor.test.tsx:807–835,837–879` preferences differ across separately mounted A→B→A; `:1391–1437` changing post context resets text/history and changes operation; **no integrated A→B same-mounted active-tab identity switch test** found.
- Same-tab logout `app/auth/auth-controls.tsx:61–90` calls Better Auth signOut, on success `auth?.setUser(null)` and `await revalidator.revalidate()`; `HeaderAuthProvider:31–43` reconciles initialUser with fresh loader; `auth-controls.test.tsx:146–170` tests immediate signed-out header and loader revalidation guest. `app/routes/topic.tsx:81–130,187–199` recalculates canReply/editablePostIds from **server** session, `app/forum/views.tsx:2737,2814,3055` hides edit/reply controls when fresh permissions removed; true server-side checks `app/forum/mutations.server.ts:70–90` and action guards prevent unauthorized writes. If route revalidation fails, no guarantee of complete UI clearance; not automatically claimed without integrated test.

### NEW I1: cross-tab account replacement leaves stale SSR client identity on an OPEN topic tab

- Example: Tab T1 retains `HeaderAuthProvider.user.id=A`, open `MarkdownEditor` with account A preference and unsent body text. Tab T2 logs out of A and signs into B; HTTP cookies are scoped to browser origin/domain and subsequent same-origin requests from T1 use updated B session (MDN https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies). No `HeaderAuthProvider` subscription to a global Better Auth session-change signal or cross-tab login/logout event; it merely synchronizes with its `initialUser` when route loader is re-run (`auth-controls.tsx:31–43`). `AuthControls` signOut revalidates **only originating tab**.
- `app/forum/online-presence-heartbeat.tsx:11–45` is the only app-level implicit session reconciliation while an idle topic tab is open: for stale A header it POSTs `/:locale/presence` with cookies for B. When HTTP 401, forces revalidator; when **200/204 B is authenticated**, revalidates only if location.pathname === forumIndexPath(locale). On `/:locale/topics/:id`, 204 does NOTHING to reload `initialUser`; interval repeats with stale A, no finite guaranteed repair (except independent navigation/action or window refresh). `online-presence-heartbeat.test.tsx:44–53` covers 401, `:31–41` checks 204 request but does NOT test changed account B on non-homepage; `auth-controls.test.tsx` only direct signout / explicit revalidation.
- Thus T1 may display A identity, A editor preferences, unsent A buffer/attachments, and stale presentation-level permissions while **server is acting as B**. `markdown-editor.tsx:191–208` only resets when *client* accountId changes, so this cross-tab path evades scope invalidation. This directly violates practical account preference separation `docs/EDITOR.md:310–313` when actual account switched but T1 stayed on topic.
- **High-impact continuation check:** `app/forum/actions.server.ts:503–515` accepts normal text-only reply when body present, `selectedAttachmentIds=[]` and `validatedDraftPublicationFence` is UUID. `runForumMutation` uses **current authoritative session B** as author. `db/hyperdrive-forum.ts:193–204` forwards B to repository; `db/forum-repository.ts:664–748,783–849` dedupe scope/receipt and attachment generation are keyed by *current* owner B and form's opaque UUID, with **no comparison to stale client account A** on text-only path; select-empty operation does not require preexisting A-owned attachment ref. Therefore tab T1 may submit A's unsent text as B after cross-tab account replacement, subject to B's actual write permission/cooldown. This is NOT an authorization bypass and backend stores author B consistently; it is a user-identity consistency / unintended attribution and stale personal buffer exposure fault.
- **Classification I1:** CURRENT Stage **source-level confirmed causal gap** for multi-tab signed-in A→signed-in B transition; browser actual two-tab reproduction and server integration **NOT_EXECUTED**, do not claim observed leaked data or completed unintended publication. Scope limited to already-open topic page and tab whose own route does not revalidate; no claim about same-tab signOut (that explicitly revalidates) or homepage (204 causes refresh). No trivial global storage clear or draft system justified; production patch is separate stage and must retain account preference persistence requirement, avoid unsafely publishing under mismatched identity.
- A→guest via another tab differs: heartbeat 401 triggers revalidation in a *visible* tab, and there can be a temporary stale window before it happens; eventual recovery exists as coded. A→B 204 lacks that guarantee. Hidden tabs make no heartbeat until visible; focus then triggers check but 204 stays stale. No route or storage listener for app-level auth transition found. If RR/BAuth library independently triggers navigation/revalidation on cross-tab session change, evidence for that pathway must be established in actual browser, not presumed; local `HeaderAuthProvider` does NOT consume Better Auth reactive session.
- No current-stage defect newly established in per-account storage keys, attachments on **observed** owner changes or same-tab logout behavior. No human UI/bfcache/Worker deployment experiments. User-facing safe server gates remain in effect, so no data-integrity bypass claimed.
   
Other first-audit findings E1, N1, D1, L1 as prior; E2/E3 remain unconfirmed. This is owner-chat/internal personal note ONLY, not a final team report; no general communication publication. **STOP at the end of this independent bounded subtask.** First audit remains OPEN due missing original stages 1–8 history, browser/Worker exact scenario evidence; `AUD-20261022` stays separate.


---

## Первый аудит — пользовательские Markdown-ссылки и внешние ресурсы (2026-10-22)

**BOUND STEP COMPLETE; ПЕРВЫЙ АУДИТ В ЦЕЛОМ ОТКРЫТ.** Это первый исходный независимый аудит, не `AUD-20261022` и не его 437-file manifest. GitHub remote `main` ещё раз сверен: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; `AGENTS.md` из main полностью получен и прочитан. Read-only review source + существующих тестовых assertions, плюс актуальные официальные правила react-markdown; **NO new Vitest execution, browser, Worker, deployed HTTP, network/resource-request inspection**. Implementation/shared-channel/other-agent files untouched.

### End-to-end source boundaries inspected
1. `app/forum/markdown.tsx:27–34,288–408`: all published prose segments, table cell Markdown и nested spoiler bodies render через ReactMarkdown с одинаковыми `markdownComponents` и `forumUrlTransform`. Custom URL exception applies **only to img.src matching exact `vico-attachment:<UUID>`**. Ordinary `href` passes to `react-markdown@10.1.0` `defaultUrlTransform`. Upstream docs: https://github.com/remarkjs/react-markdown/blob/main/readme.md — safe by default, allows http(s), irc(s), mailto, xmpp, relative; unsafe schemes return unusable destination. No `rehype-raw`; embedded raw HTML is not executable. `app/markdown-syntax.ts` custom plugins only add strikethrough and constrained `dir=ltr|rtl` metadata, not HTML generation from user strings.
2. Link presentation `markdown.tsx:306–309`: `<a href={href} title={title} target="_blank" rel="nofollow noopener noreferrer ugc">`; React attribute values are not interpolated as raw HTML. `rel=noreferrer` prevents request Referer from the parent page and `noopener` protects opener. URL trust remains ordinary authored outbound-link semantics; HTTPS/user-generated links are intentionally supported and may lead outside forum only on click.
3. `ForumInlineImage` (`markdown.tsx:36–48`) renders no `img` unless URL matches opaque UUID **and** provided `ForumInlineAttachmentProvider` contains matching ID and server-detected raster type png/jpeg/gif/webp. `views.tsx:2797–2806` builds same-origin `/api/attachments/file/<id>?post=<id>` URLs from server post attachment records; `app/routes/attachment-download.ts:22–84` reads current published attachment ref or owner-scoped temp operation; allows inline only for verified raster, text only as plain text explicit preview, sets `Content-Security-Policy: sandbox`, `nosniff`, `private, no-store`. External `![remote](https://...)` is omitted rather than auto-fetched.
4. `app/forum/technical-markdown.ts:109–232`: `:::spoiler` title rendered via escaped React text and body recursively by same Markdown; tables render cells through same URL transform; invalid or complex tables do not become raw HTML. `quote-markdown.ts` and `quote-presentation.tsx` wrap standard Markdown links, no separate HTML injection path. `visual-markdown-editor.tsx` displays external source image as protected/inert construct and delegates preview to same ForumMarkdown.
5. `app/forum/clipboard-markdown.ts:5–105`: HTML import explicitly rejects script/style/svg/iframe/object/embed/form/img and non-HTTP(S) anchors, while plain-text paste escapes Markdown syntax. Output remains subject to published renderer's URL filtering, not a direct HTML injection pathway.
6. `app/forum/markdown.test.tsx:152–211,218–225,263–287`, `clipboard-markdown.test.ts:5–34`: existing tests assert external image suppression, attachment-only raster images, forbidden raw HTML/javascript and link rel/target, including links in tables and pasted unsafe links. **Inspected test code only; no fresh execution**. Some assertions are deliberately shallow (unsafe-link check verifies href not starting `javascript:` rather than no anchor), but combined source/official defaultUrlTransform provides independent evidence; test-completeness belongs separate audit, not an invented source defect.

### Result/classification
**No NEW confirmed current-Stage defect in the inspected outbound Markdown links/remote resource execution path.** Ordinary user-authored external URLs remain clickable by design and cannot be categorized as a defect solely for being external; external-link destination reputation/anti-phishing moderation is a product-policy question, not a proven current code contract breach. No evidence of automatic third-party image fetch, unsafe `javascript:` href, executable raw HTML or SSR remote URL fetching from Markdown. No requirement to add new sanitizer dependency without a reproduced current unsafe behavior.

**NOT_EXECUTED:** exact rendered network/browser requests for adversarial URL encodings, click behavior in actual Chromium, end-to-end HTTP attachment response under local Worker, and new regression suite. No user data, external services, or production tested. The first audit's E1, N1, D1, L1, I1 remain as before, E2/E3 unconfirmed; no separate confirmation about historical initial stages1–8. Second `AUD-20261022` entirely untouched.

**STOP:** one bounded first-audit subtask completed, first overall audit remains open. Next distinct slice only on owner continuation; possible focus: redirect/path/URL boundary outside Markdown (auth entry, login return, profile fields), avoiding duplicating link-renderer analysis.


---

## Первый аудит — URL-переходы вне Markdown: credentials, locale и профили (2026-10-22)

**ОДНА BOUNDED ПОДЗАДАЧА ЗАВЕРШЕНА; ПЕРВЫЙ АУДИТ В ЦЕЛОМ ОТКРЫТ.** Это первый независимый source+existing-test audit, НЕ `AUD-20261022` manifest. GitHub remote `main` заново проверен — `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`; `AGENTS.md` из main полностью прочитан (106 строк). New Vitest/browser/Worker/real OAuth executions: NONE. No source, main, shared channel, second audit or other-agent file edits.

### Verified Stage contract
- `docs/UI_UX_PASS.md:26–35`: safe locale-scoped return path, query and message fragment kept; never put password in URL. `:235–247`: public profile URL with opaque encoded user identity; only owner can save same-origin POST; bio plain text, GitHub profile + optional HTTP(S) website.
- `docs/translation/LOCALES.md:334–385,555–561`: locale GET/HEAD canonical/fallback internal redirects only; any mutation requiring 307/308 fails closed.

### Source traces and existing test assertions
1. `app/auth/credential-path.ts:3–25`: `safeForumReturnPath` requires exact active locale root or active locale prefix. `credentialReturnPath` accepts slash-relative origin-local input only; rejects protocol-relative, absolute cross-origin, and cross-locale after WHATWG URL parsing; permits safe query/hash. `auth-controls.tsx:87–96,109–128` carries encoded `returnTo` from current route or validated entry route.
2. `app/routes/credential-sign-in.tsx:7–15` and `credential-sign-up.tsx:7–15` validate incoming returnTo via same helper *before* loader value or redirect for existing session. `credential-view.tsx:21–58,66–104` uses safe loader-provided value for email `navigate`, social callback parameter, and form-switch links. `auth-client.ts:4–42` uses Better Auth email/social operations; no alternative unsanitized redirect from form text. External provider/OAuth actual callback excluded/not tested.
3. `app/auth/credential-view.test.tsx:68–184`: existing tests cover encoded query, fragment `#post-post-42`, sign-in/up, unsafe absolute/protocol-relative/cross-locale returnTo, failed login, post-login header revalidation. `auth-controls.test.tsx:75–151` verifies both auth links preserve message anchor, same-tab logout and current-server-user revalidation. Assertions READ; not freshly RUN.
4. `app/localization/resolver.ts:28–73,119–135`, `app/routes/locale-negotiation.ts:8–17`, `app/routes/locale-boundary.tsx:35–60`: internal relative locale Locations, 307/308 only read methods, canonical mutation no implicit cross-locale replay, noncanonical mutations 404; root request-specific redirect no-store; degraded locale redirect no-store. `resolver.test.ts:31–112`, `locale-negotiation.test.ts:42–91`, `locale-boundary.test.ts:19–108` inspect outcomes; no fresh runtime. Server cannot know browser hash for a locale fallback; don't claim fragment preservation there.
5. `app/forum/profile.ts:15–52` validates HTTP(S) only, excludes raw controls/whitespace, URL credentials, excessive length; GitHub URL additionally requires exact github.com hostname, optional standard port, single username segment, no query/hash, canonical output HTTPS. Website HTTP(S) outbound permitted by product contract. `app/forum/profile-view.tsx:17–52` revalidates URLs on rendering, React-escapes plain bio, external links `rel=nofollow ugc noreferrer`. `app/forum/avatar.tsx:4–15` rejects unsafe image schemes and adds no-referrer. `app/routes/profile.tsx:18–67` only projects public data; owner/session/Origin checked before `validateProfileFields` and actor-bound updateProfile; redirect uses internally encoded `forumProfilePath` from `app/forum/paths.ts:8–10`.
6. `profile.test.ts:5–24`, `profile-view.test.tsx:18–60`, `routes/profile.test.ts:31–85`: existing tests include malicious link rejection, HTML escaping, no-referrer avatar and fallback, current-user-only POST, Origin rejection, return to relative own profile after save. Inspected only; not executed.

### Classification
**No NEW confirmed current-Stage defect in this bounded URL/auth-redirect/profile link slice.** No proven open redirect, unsafe scheme execution or unauthorized profile save through inspected code; ordinary user website outbound links and OAuth-source HTTPS avatar requests are approved behaviors, not automatic defects. This is not a blanket URL/security PASS. Unknown: actual Chromium navigation, exotic browser URL parsing, deployed Worker network behavior, full OAuth callback/provider or fresh runtime tests. `Информация не проверена` for those end-to-end claims. Prior first-audit E1/N1/D1/L1/I1 unchanged, E2/E3 unconfirmed. Separate AUD-20261022 unchanged.

**STOP.** First audit remains OPEN. Next distinct scope only after owner command; avoid duplicating already inspected editor/locale/profile cases. No implementation edits or formal team finding publication.


---

## Первый аудит — anti-framing/HTTP security response headers на SSR страницах (2026-10-22)

**ОДНА BOUNDED ПОДЗАДАЧА ЗАВЕРШЕНА; ПЕРВЫЙ АУДИТ В ЦЕЛОМ ОСТАЁТСЯ ОТКРЫТЫМ.** Это первый исходный независимый аудит, НЕ AUD-20261022 (437 files). GitHub main exact SHA повторно проверен: d72b27ca762dd930f0e7ad614e5b00832a07ec0c. AGENTS.md из main получен и полностью прочитан. Исследованы источник, конфигурация, существующие test assertions, актуальные официальные React Router/Cloudflare/Better Auth и MDN. **No fresh execution of tests, Worker HTTP, real browser iframe, installed runtime, production config or network.** No code/main/shared channel/other agent files/second audit changed.

### Проверенная цепочка
1. «Встроить Vico SSR HTML в сторонний iframe» ранее НЕ было отдельным проверенным аспектом первого аудита; предыдущие записи о CSP касались исключительно private attachment response. React Router официально позволяет ставить document headers из route export либо entry.server.tsx (https://reactrouter.com/how-to/headers), Cloudflare рекомендует их в Worker Response for SSR, а не в assets _headers (https://developers.cloudflare.com/workers/static-assets/headers/).
2. app/entry.server.tsx:12–45 добавляет только Content-Type=text/html к переданным responseHeaders; не устанавливает CSP, frame-ancestors, X-Frame-Options, Referrer-Policy, Permissions-Policy или nosniff. app/root.tsx:26–53 документ SSR включает theme bootstrap script/Meta/Links/Scripts, без anti-framing meta (к тому же meta frame-ancestors не поддерживается). workers/app.ts:25–53 возвращает requestHandler response через withAuthSessionCookies, не добавляя security headers. app/auth/session-context.ts:21–36 пробрасывает только Set-Cookie из getSession, не создаёт security headers. wrangler.jsonc — нет конфигурации header transform; GitHub code search по всему main на "frame-ancestors", "X-Frame-Options", "Referrer-Policy", "Cross-Origin-Opener-Policy", "Cross-Origin-Resource-Policy", "Access-Control-Allow-Origin" нет матчей; Content-Security-Policy только в attachment-download.ts и его тесте. Из исходников НЕ доказано, что конечные HTTP-ответы после внешних платформенных правил не имеют таких заголовков.
3. app/routes/attachment-download.ts:75–83 намеренно задаёт Content-Security-Policy:sandbox, X-Content-Type-Options:nosniff, Cache-Control:private,no-store для байтов вложения. app/routes/attachment-download.test.ts подтверждает test assertion CSP sandbox для text preview (test read only).
4. Better Auth app/auth/auth.server.ts:56–77 задаёт IP/rateLimit конфигурацию, НО не меняет advanced.defaultCookieAttributes.sameSite и не задаёт cross-subdomain cookies. Официальная Better Auth docs https://better-auth.com/docs/reference/security сообщает default session SameSite=Lax; MDN https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie объясняет, что Lax cookies не посылаются во вложенный cross-site iframe. Это значимый смягчающий фактор для authenticated clickjacking в обычном cross-site случае. Точные реально выдаваемые cookie attributes на build/deploy 1.7.4 в этом аудите НЕ прочитаны из браузерного Set-Cookie. Same-site but cross-origin (например, недоверенный субдомен того же site) может быть отличен, но существование такого контролируемого противником origin НЕ установлено. Отсутствие anti-framing нельзя автоматически назвать успешно эксплуатируемым clickjacking.
5. docs/UI_UX_PASS.md:37–56 / app/ui-preview/preview-app.tsx:914–923 упоминают iframe только для отдельного GitHub Pages representative mock visual preview, NOT реальный аутентифицированный Worker SSR. Не доказано действующего продуктового требования разрешать iframe embedding Worker страниц. MDN https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors подтверждает, что именно frame-ancestors или X-Frame-Options контролируют ancestor embedding, и директива frame-ancestors не наследуется от default-src.
6. No Access-Control-Allow-Origin в checked code — не означает insecure CORS: отсутствие разрешающего CORS заголовка обычно запрещает стороннему JS читать cross-origin response. Отсутствие CSP script-src не доказывает XSS, особенно с существующим text-safe React/Markdown pipeline. Browser default Referer-Policy and other mitigations still apply, though no site-specific header defined.

### Verdict / classification
**New H1 observational source-level gap:** В проверенной реализации HTML SSR отсутствует явная антифрейминговая политика (frame-ancestors/X-Frame-Options); отличается от отдельно защищённых attachment responses. **Не подтверждён current-Stage exploitable defect**: не проверены фактические end-to-end HTTP headers, iframe result в Chromium, authentication/cookie third-party behavior exact runtime, deployment-level header transforms, ни существование атакующего same-site origin. Это потенциальный defense-in-depth/security launch gate, а не доказанная пользовательская потеря данных или обязательный немедленный implementation change до pre-release. Не создавать фикс и не раздувать scope из-за отсутствия общего набора security headers. Если возникнет owner-requested deploy/browser gate, проверить настоящий GET /en route headers и две iframe ситуации (cross-site and same-site), без предположения об открытой дыре.
**No other new confirmed current-Stage defect in this bounded slice.** Prior first-audit E1,N1,D1,L1,I1 unchanged; E2/E3 unconfirmed; separate AUD-20261022 untouched. **STOP here** until next explicit owner command, original full first audit remains open.


---

## Первый аудит — детальный публичный Search GET → PostgreSQL → UI (2026-10-22)

**ONE BOUNDED STEP COMPLETE; FIRST AUDIT STILL OPEN.** Only original independent first audit, NOT separate AUD-20261022 manifest cycle. Source frozen remote main d72b27ca762dd930f0e7ad614e5b00832a07ec0c, verified GitHub branch endpoint; full main AGENTS.md read (106 lines). READ-ONLY code + existing tests, checked Drizzle official SQL template and PostgreSQL LIKE/ILIKE semantics. No new Vitest/PG integration/Chromium/Worker execution; no production data/access; implementation, main, common channel and other agents unchanged.

### Requirements
- PROJECT_STATE.md:1061–1064,1906–1910: global Search merged PR #171 as actual public locale-scoped feature over *current topic title/post revisions and topic tags*, without search index/migration. docs/UI_UX_PASS.md:159–181 requires useful global search; ROADMAP.md Stage standalone product-first vs later external deployment, all user input validated runtime. Separate Help similar-questions subsystem deliberately not conflated with this global Search.

### Source facts/evidence
1. app/routes/search.tsx:9–34 GET q query parameter from URL, Unicode NFKC, trim + collapse whitespace; if >200 UTF-16 code units sets queryTooLong and does not call repository; blank -> no request. Route uses ForumRouteError; locale from routed params. Current UI app/forum/views.tsx:440–518 uses GET Search Form, maxLength=200, normal text interpolation in React, labels/prompt/too-long/no-results and result links through forumTopicPath(locale, topic.id).
2. db/hyperdrive-forum.ts:71–115 request-local Client connects, invokes new DrizzleForumRepository.read.search via search: (query, limit) => read(...), wraps *classified* database availability failures into ForumStorageUnavailableError and rethrows unexpected. No search-specific protected operation; public search by design.
3. db/forum-repository.ts:1121–1206 search uses NFKC+trim/collapse; rejects blank, >200 and invalid limit, limit default 50, allowed 1–100. SQL placeholders from Drizzle sql template interpolation and query builder, literal ILIKE escape '!' paired escapeSearchPattern(value) at :3867–3869 (!→!!, %→!%, _→!_), wraps explicit '%' on both ends for intended substring matching. Matches current forumTopicTitleRevisions, current forumPostRevisions and forumTags; joins authors/sections/categories; aggregates with bool_or, count distinct posts and activity max. HAVING on title OR tag OR post match, ranks title=3/tag=2/post=1, deterministic activity desc and topic.id desc tie-break, LIMIT before supplemental readTagsForTopics. No dynamic raw SQL of user q in this path.
4. Existing tests **READ NOT RUN**: tests/database/stage4-core-e2e.test.ts:310–330 verifies title/tag/post search and literal %/_ produce empty match (fixture); :415–472 verifies rank title > tag > body, then activity/date and ID tie-break. app/forum/public-read.test.tsx:1971–2005 checks public loader render/link, empty-results state. Existing test matrix does not directly assert invalid >200 query stops before reader invocation, although source visibly does; this is missing targeted assertion, NOT by itself a proven current-Stage defect.
5. Official reference: https://orm.drizzle.team/docs/sql explains interpolated dynamic values become bind params (not sql.raw), and https://www.postgresql.org/docs/current/functions-matching.html documents ILIKE case-insensitive behavior and ESCAPE custom character. Verified documents at audit time (source links may update).

### Classification and limits
No NEW confirmed current-Stage functional/security/data-integrity defect identified in bounded global Search path. UI/DB input checks agree; matching only current revisions and deterministic ranks correct by source + test assertions. This is NOT evidence of production query latency under large datasets or full-text/fuzzy/index architecture acceptance; Stage 6/external performance, absent separate search index, and 50-result cap cannot automatically be treated as defects. Exact deployed route, query plan, all extreme Unicode, worker/runtime SQL performance and fresh test execution remain NOT_EXECUTED (Информация не проверена). Prior E1,N1,D1,L1,I1 unchanged, E2/E3 unconfirmed, H1 anti-framing observation not promoted to confirmed defect. First overall audit stays open; AUD-20261022 remains independent. STOP after bounded step until owner continues; no formal team findings publication.


---

## Первый аудит — @mention candidate privacy and published-notification lifecycle (2026-10-22)

**ONE BOUNDED STEP COMPLETE; FIRST AUDIT STILL OPEN.** Distinct from AUD-20261022 / 437-file manifest. GitHub remote main exact d72b27ca762dd930f0e7ad614e5b00832a07ec0c confirmed; AGENTS.md from main read fully. Scope: source and EXISTING test assertions inspected, not executed. No new Vitest, PostgreSQL 17, real Chromium, Worker HTTP, production data. No main, implementation, shared channel, other-agent file, or second-audit modifications.

### Current Stage contract
docs/EDITOR.md:246–260 section 7 requires authoring suggestions after @ fragment, immutable account/profile ID, multiple recipients and both authoring modes, notify ONLY after successful publish/edit, exclude quote/code, suppress duplicate reply+mention notifications, preserve per-post lifetime notified set across remove/readd edits. PROJECT_STATE.md:1973–1982 confirms implemented Editor 2.0 mention feature in current scope.

### Traced chain and evidence
1. app/routes/mentions.ts:7–31 loader rejects guests 401 BEFORE repository, trims q, max 64 chars, empty -> users [], classified DB failure -> typed 503, unexpected exception rethrows. All JSON responses private/no-store and nosniff. app/routes.ts defines /:locale/mentions under locale boundary; session is request-scoped server identity.
2. db/hyperdrive-forum.ts public ForumReader delegates to db/forum-repository.ts:464–473 searchMentionableUsers; Drizzle SELECT projects ONLY {id, name}, never email, password/account fields. ILIKE ESCAPE '!' with literal term character escaping (!) (%) (_); deterministic ascending name/id; SQL result LIMIT 8. No speculative role/post-history filtering requirement.
3. app/forum/mentions.ts:5–22 parses Unicode @word at caret length 1–32 only at start or eligible separator, escapes Markdown label syntax on selection. app/forum/markdown-editor.tsx:433–468 uses signed-in state, locale-scoped GET fetch credentials same-origin, 120ms debounce, AbortController cancels previous query, only array of entries with string id/name is accepted and clamped to eight, inserts forumProfilePath(locale,id) with encoded identity. app/forum/markdown-editor.test.tsx:158–197 tests actual Simple+Advanced source/FormData insertion behavior; inspected, NOT RUN.
4. app/forum/mentions.ts:25–48 parses Markdown AST links to strict relative /locale/users/encodedId, deduplicates identifiers, ignores bare @words, quoted/code/inlineCode/html/image nodes and invalid/external/query/fragment links. Unit tests app/forum/mentions.test.ts:1–58 include exclusions, unicode, escaping and locale independent deduplication.
5. db/forum-repository.ts:705–780 creates topic-author/parent reply notification first, then recordPublishedMentions in same post publication transaction; filters own user and nonexistent IDs, recipient+post uniqueness de-duplicates with reply notification. db/forum-repository.ts:3680–3744 posts edit notification only after actor, published revision CAS and successful update in same transaction. Removing link doesn't delete historical notification so removing/readding does not send a duplicate. These are intended product semantics.
6. EXISTING test source read not executed: app/routes/mentions.test.ts guest 401/no DB, trimmed lookup, only ID and name, private/no-store, empty/oversize, classified 503 vs unexpected rethrow; tests/database/forum-profiles.test.ts:50–71 wildcard escape, case insensitive, no email; tests/database/forum-attachment-publication.test.ts:195–277 published mention vs reply dedup, edit lifetime set, failed CAS no side effects.

### Conclusion
No NEW confirmed current-Stage defect in this bounded @mentions search/notification path. Real browser/session switch, deployed Worker response headers, Postgres test rerun and live upload/edit integration NOT EXECUTED. Does not constitute full first-audit clearance; authenticated lookup of public names alone not sufficient evidence of a new current-Stage anti-enumeration requirement. Previous first-audit E1,N1,D1,L1,I1 status unchanged; E2/E3 unconfirmed, H1 remains anti-framing observation. AUD-20261022 untouched. STOP until next explicit owner command, no implementation or team publication.


---

## Первый аудит — public tags index + tag page (2026-10-22)

**ONE BOUNDED SUBTASK COMPLETE; ORIGINAL FIRST AUDIT OPEN.** Separate AUD-20261022 unchanged. main exact SHA d72b27ca762dd930f0e7ad614e5b00832a07ec0c reconfirmed, AGENTS.md read entirely. Scope READ ONLY: app/routes/tags.tsx, app/routes/tag.tsx, app/forum/paths.ts, app/forum/views.tsx:522–615, db/forum-repository.ts:1051–1120, app/forum/public-read.test.tsx:2009–2023, tests/database/stage4-core-e2e.test.ts:189–201; current Stage tags scope PROJECT_STATE.md and UI_UX_PASS.md checked in preceding pass. No new test execution, PostgreSQL apply, browser/Worker runtime, production data or write to implementation.

Verified: public routes are locale-scoped and use request-bound forum reader; missing tag => 404; paths encode opaque tag key with encodeURIComponent; Drizzle parameterized equality on tag key; tag index count(distinct topicId), stable key/name order; tag page joins only persisted public topic data with CURRENT topic title revision; postCount distinct, ordered topic.createdAt DESC / ID DESC, includes supplemental topic tag list; views show empty states, escaped text and locale-aware links. Existing source assertions cover index and topic link, real PG tests source checks normalized/reused tag keys and exact tag lookup; all tests READ NOT RUN. No newly confirmed current-Stage defect. **Observation T1 (not proven defect):** readTag returns all matching topics, no pagination/SQL LIMIT; at current pre-release Stage, no proven functional failure/performance evidence or mandated pager. Do NOT assign change merely as future scalability concern. Runtime URL decoding/canonicalization, huge dataset plans, deployed browser and independent fresh tests NOT EXECUTED (Информация не проверена). E1/N1/D1/L1/I1 existing classifications unchanged; E2/E3 unconfirmed, H1 remains observation. No modification to common channel, main, implementation, other-agent files or separate AUD-20261022. STOP; await owner next command.


---

## Первый аудит — постоянные ссылки сообщений, Copy link, Reply/Quote, best answer (2026-10-22)

**Одна bounded-подзадача ЗАВЕРШЕНА; ПЕРВЫЙ АУДИТ НЕ ЗАКРЫТ.** Original first independent audit only, NOT separate AUD-20261022/437 manifest. Current remote main verified d72b27ca762dd930f0e7ad614e5b00832a07ec0c; complete AGENTS.md read from main. Read-only current source and actual EXISTING tests; no new Vitest/PostgreSQL/real browser/Worker/Clipboard executions. No change to main, implementation, shared communication, other agents, or separate second audit.

Current Stage contract: docs/UI_UX_PASS.md:217–228 and :553–565 and PROJECT_STATE.md:1055–1065 require per-message permanent anchor/ordinal and copy link, persisted direct reply parent, selective quote of concrete message and prioritized best answer rendering without renumbering; docs/EDITOR.md:144–160 requires source attribution/permalink.

Source and evidence:
1. db/forum-repository.ts:2574–2660 readTopicPage returns post.id and parentPostId in deterministic createdAt/id original sequence. app/forum/views.tsx:2118–2144 computes number map BEFORE promoting selected best answer; orderedPosts keeps question first, best second, rest linear without changing id/number. Each message li has id post-<id> at :2643–2691. Same #post-encodedId used by desktop/mobile number links, parent links, direct reply links, answer/solution links.
2. app/forum/views.tsx:2310–2328 copyMessageLink uses canonical same-origin absolute topic path from forumTopicPath(locale,topic.id) plus fragment, deliberately omits temporary query; navigator.clipboard.writeText result/failure has feedback and request counter to avoid stale callback overwrite. Desktop MessagePermalinkControl and mobile actions share handler. app/forum/public-read.test.tsx:2819–2853 assert encoded slash in topic ID, no ephemeral query, two message links, feedback latest-only and clipboard denial error. Tests inspected, not re-run.
3. app/forum/views.tsx:2338–2380 targetReply records selected post, writes hidden parentPostId in reply form :3018–3030, Quote builds attributedMarkdownQuote with stable post URL/source original ordinal and exact selected text (guards selection range inside same message body). app/forum/quote-markdown.ts preserves author permalink. app/forum/public-read.test.tsx:2740–2817 checks parent/child anchor href, reply hidden ID, selected quote, whole quote and invalid selection UI.
4. app/forum/actions.server.ts:500–516 checks permission+session, passes parentPostId to writer and redirects successful creation to topic #post-createdId. db/forum-repository.ts:675–713 validates parent exists IN SAME topic while holding topic transaction lock; drizzle/0022_forum_reply_relationships.sql enforces compound parent-topic FK and not-self CHECK. app/forum/write-actions.test.ts:586–600 route author+parent+redirect. tests/database/stage4-core-e2e.test.ts:192–250 persisted roundtrip and best answer independence. All test assertions READ; not executed.
5. app/routes/notifications.tsx:39–69 redirects authenticated mark-read to same #post anchor; app/routes/post-edit.ts:10–22 protected edit entrypoint redirects with editPost query and post fragment. app/forum/public-read.test.tsx:2860–2930 asserts solved-anchor and best-answer promotion preserving permanent numbers.

**Verdict:** no NEW confirmed current-Stage defect within this bounded source-level path. Stable IDs, separate original sequence and visual best order, canonical links and same-topic parent checks align with contract; BUT no direct actual browser hash scroll/SSR hydration, real clipboard permissions, deployed Worker HTTP/mobile acceptance tested (Информация не проверена). Prior E1,N1,D1,L1,I1 unchanged; E2/E3 unconfirmed; H1 anti-framing observation unchanged. First audit overall remains OPEN, separate AUD-20261022 untouched. STOP until next owner command, no implementation or formal team finding publication.


---

## Первый аудит — Popular period ranking, time window and UI (2026-10-22)

**ONE BOUNDED STEP COMPLETE; ORIGINAL FIRST AUDIT STILL OPEN.** Not the AUD-20261022 second audit. GitHub main d72b27ca762dd930f0e7ad614e5b00832a07ec0c checked anew; AGENTS.md read completely. Source read only; no new database tests, Chromium, Worker runtime, external deployment or changes to implementation/main/shared channel/other agent files.

### Current Stage contract
- docs/UI_UX_PASS.md:173–180: Popular three simultaneous columns 24h, 7d, 30d, ranked by activity within a bounded period, not all-time popularity.
- PROJECT_STATE.md:1038–1054 and 1895–1903: merged PR #168 implements actual existing-message activity ranked by message counts with latest-activity tiebreak, target owner accepted, Stage 6 deployment separate. No user-requested search-index, full-text or performance instrumentation work.

### Source chain and existing tests
1. app/routes/popular.tsx:9–35 has public locale-scoped loader calling forumReaderForRequest(context).readPopular(), exposing only per-period id,title,authorName,activityCount. app/routes.ts defines path /:locale/popular; ForumRouteError as error boundary. db/hyperdrive-forum.ts:62–87 creates one request-local Drizzle repo Client and translates known DB availability exceptions.
2. db/forum-repository.ts:945–1003 validates referenceTime as real Date and limitPerPeriod integer 1–20, default ten. Each cutoff is exact elapsed 24h / 7*24h / 30*24h before one referenceTime. One grouped SQL reads forum topics with matching CURRENT title revision and real author, joining real persisted forum posts createdAt >= cutoff30d; aggregate FILTER counts and max createdAt per 24h and 7d, 30d from filtered rows. Per-period discard zero-count, sort by activityCount desc, latestActivityAt desc, id desc for deterministic ties, then .slice(0,limitPerPeriod). Topic starter post counts as one existing forum message by product design. No fake counters/likes/views.
3. app/forum/views.tsx:127–185 renders periods together in localized ordered lists, numbers 1..n, localized exact message counts, relative forumTopicPath, separate empty state when no real activity. React interpolation renders plain text from public stored title/user name, no raw HTML.
4. tests/database/stage4-core-e2e.test.ts:245–299 source asserts controlled post createdAt dates: day/7d/30d distinct results and latest activity, topics with no recent posts excluded. app/forum/public-read.test.tsx:1946–1973 source asserts three columns, title links and localized count presentation with mock 3/5/8. **Tests inspected, NOT rerun.** No specific fake future timestamp / near-cutoff test exists in inspected slice.
5. **Observation P1 (source logic only; not a confirmed current-Stage defect):** Query filters createdAt >= cutoff30d but no createdAt <= referenceTime. If referenceTime is supplied as an earlier instant than persisted post.createdAt, future-to-reference events are included in all three windows. Yet normal route uses default new Date() and normal writer receives timestamp from forumWritePolicy.now() (db/forum-write-policy.ts); future event under default user flow unproven. Cross-worker clock skew, anomalous data, historic referenceTime callers, actual platform clocks and future-dated DB posts not demonstrated. Do not prescribe fix without current Stage symptom.
6. Scaling note, not current defect: 30d qualifying grouped topics are fetched into Worker and ranked in JS, then bounded to 10 (20 max) per period; no measured data volume or current acceptance threshold supports escalation.

### Verdict
**No NEW confirmed current-Stage defect in bounded public Popular read/rank/UI scenario.** Existing E1,N1,D1,L1,I1 and earlier unconfirmed E2/E3 remain separate; H1 anti-framing, T1 tag pagination, P1 upper-time omission are observations only, not actionable current Stage defects. Real DB test rerun, browser route, deployed Worker, performance/load tests and cross-clock future timestamp scenario NOT_EXECUTED (Информация не проверена). Second audit AUD-20261022 untouched. STOP after this step; wait for owner continuation.


---

## Первый аудит — public Unanswered selection, topic lifecycle and UI (2026-10-22)

**ONE BOUNDED SUBTASK COMPLETE. ORIGINAL FIRST AUDIT OPEN.** Separate AUD-20261022 not touched. Fresh main branch verified exact d72b27ca762dd930f0e7ad614e5b00832a07ec0c, AGENTS.md read fully. Source-only and EXISTING test assertions READ not executed. No local PG, Worker, browser, CI rerun, production check, implementation or other-agent/shared-channel change.

### Current Stage contract
PROJECT_STATE.md:1049–1055,1898–1903 confirms merged PR #169: public forum-wide list of unsolved topics with precisely one persisted initial post, no replies, author/category/section context, newest first. docs/UI_UX_PASS.md:169–176,225–230 approves Unanswered public discovery. Stage 6 deployed acceptance separate.

### Checked chain
1. app/routes/unanswered.tsx:7–33 public locale route invokes forumReaderForRequest(context).readUnanswered(), projects only id/title/authorName/section/category. No private user fields. app/forum/paths.ts forumUnansweredPath and forumTopicPath maintain locale-aware navigation. ErrorBoundary is ForumRouteError, shared request reader handles classified DB unavailable vs other exceptions.
2. db/forum-repository.ts:1007–1049 SELECT persisted forumTopics, matched CURRENT topic-title revision, matching actual user + section + category + forumPosts; condition isSolved=false, GROUP BY unique topic and joined fields, HAVING count(forumPosts.id)=1; order by forumTopics.createdAt DESC then id DESC. No duplicate fan-out joins to tags/revisions beyond exact current title; no unsolved topic with >=2 persisted posts can be returned. Query reads ordinary public forum data as intended. No pagination/LIMIT; this could be future performance consideration, not a demonstrated current-Stage defect without threshold or workload.
3. db/forum-repository.ts:569–663 creates topic and initial post in one DB transaction; createPost at :664–761 adds persisted replies. No deletion of an individual forumPost in inspected repository public write paths. Thus count=1 aligns with one initial post for normal writes; unnatural DB manual deletions or direct external writes not proven present.
4. app/forum/views.tsx:188–253 shows localized heading/status 'No replies yet', title (dir auto), author's public name, category and section, locale-relative forumTopicPath; separate empty state. Does not misleadingly show solution badge or invent reply count.
5. EXISTING tests READ only: tests/database/stage4-core-e2e.test.ts:174–310 persists solved topic with 2 posts and unsolved newer topic with 1 initial post, expects latter in readUnanswered; app/forum/public-read.test.tsx:2023–2050 tests public route data projection, locale-aware links, text and location. No fresh tests, no real Worker, browser. Test matrix not exhaustive of e.g. zero posts, solved one-post, multiple unsolved replies, time ties; SQL itself establishes required predicates, missing assertion alone NOT a defect.

### Verdict
**No newly confirmed current-Stage defect in Unanswered bounded scenario.** Prior E1/N1/D1/L1/I1 existing classifications preserved, E2/E3 unconfirmed, H1/T1/P1 observations not escalated. No proof of current unsolved scale limitation; unbounded query not grounds for present fix. Live acceptance/rerun NOT_EXECUTED (Информация не проверена). First audit remains open; do not announce comprehensive completion or publish findings to team. STOP and require owner next continue.


---

## Первый аудит — exact-main CI evidence and git-tree verification (2026-10-22)

**ONE BOUNDED SUBTASK COMPLETE; ORIGINAL FIRST AUDIT STILL OPEN.** Second AUD-20261022 untouched. Main freshly checked: d72b27ca762dd930f0e7ad614e5b00832a07ec0c. Read full current AGENTS.md. First selected focus notification read/mark paths was identified AS ALREADY COVERED by earlier own first-audit Stage10 (and other journal notes), so stopped duplication BEFORE retracing code. Switched to a genuinely distinct evidence question: what *actually executed* on exact source tree in CI. GitHub REST read only; no local tests executed, no changes to implementation/main/shared communication file or agent files.

### Verified provenance, not a fresh self-execution
1. GitHub PR #232 closed merged 2026-10-21T16:43:03Z as main squash commit d72b27ca762dd930f0e7ad614e5b00832a07ec0c; PR final head a528c6d2cfba8029072c1f18ae963946a0bbd744. REST GET /commits/{sha} for each independently returns EXACT IDENTICAL Git tree SHA 18e73a062eb06984fd0b28132f510a5b12b1cfe2. Thus all versioned files in current main and the checked PR head have exactly same content despite distinct commit identity/parents.
2. CI run https://github.com/iliya1947/vico-forum/actions/runs/39615502080 GET live GitHub REST /actions/runs/39615502080: event PR for head SHA a528c6d..., completed SUCCESS 2026-10-21. GET /jobs?per_page=100: both jobs checks SUCCESS and database SUCCESS. The steps Test, Typecheck, Build, Build UI preview, Verify Drizzle schema parity, Test clean PostgreSQL 17 migrations and constraints, production schema manifest parity, runtime privilege probes, build Workers smoke, Workers smoke with split local Hyperdrive overrides all report completed SUCCESS. GitHub's job conclusions are directly verified, counts from PR body ("979 app / 279 native PG") are PR author's reported counts, NOT independently verified from test log. Don't conflate the reported counts with local run by GPT-6.
3. Current main directly had GitHub Pages push run https://github.com/iliya1947/vico-forum/actions/runs/39637268492, main head SHA d72b27c, build SUCCESS and deploy SUCCESS. Jobs confirm pnpm ui-preview:build + GitHub Pages artifact upload/deploy only. The Pages workflow is visual mock preview, not actual deployed Worker/Postgres runtime.
4. Exact main d72b27c status API has no legacy statuses; /check-runs?per_page=100 has Pages build/deploy SUCCESS plus skipped non-code service bridge checks. No separate pull_request CI run on the squash commit identity itself, as .github/workflows/ci.yml triggers on pull_request, not push. **Do not falsely say CI "ran on main SHA"; it ran on bit-for-bit identical Git tree of last PR head.**
5. Read .github/workflows/ci.yml full 117 lines: checks uses pnpm test, lint, typecheck, build, ui-preview build, migration-history guards and drizzle parity. database job uses service postgres:17, pnpm db:test, schema and privilege guards, Workers smoke via vite preview and split local Hyperdrive connection overrides. Separate .github/workflows/ui-preview-pages.yml full 51 lines uses push(main)/preview branch + ui-preview build/deploy.
6. The prior first-audit focused source reviews truthfully noted "tests were inspected but not rerun by GPT-6"; newly verified remote CI execution on **same exact tree** strengthens evidence for routine unit/native PG pass but does NOT repair test gaps, prove actual browser UI flow, complete auth/session multi-tab runtime tests, deploy external infrastructure, or negate E1 and other source-led findings.

### Classification
**No newly discovered confirmed current Stage defect from CI provenance check.** No newly required implementation change. Existing first-audit E1/N1/D1/L1/I1 classifications unchanged; E2/E3 unconfirmed, H1/T1/P1 observations not escalated. Major open audit gates: historically incomplete evidence for original stages 1–8; live authenticated browser/Worker scenarios not executed in this independent audit; no falsely claimed full-audit completion. Exact-tree coverage is verified for repository CI, not for external deployment. No upload, code mutation or PR comments; private own note only. STOP until owner explicitly continues.


---

## Первый аудит — Stage4 forum write cooldown / concurrent topic+reply / replay (2026-10-22)

**ONE BOUNDED AUDIT STEP COMPLETE, first original audit remains OPEN.** Separate AUD-20261022 untouched. Fresh main SHA d72b27ca762dd930f0e7ad614e5b00832a07ec0c verified and AGENTS.md read fully. Independent code/test-source review only; no own PostgreSQL run, browser, external Cloudflare Worker, deployment or implementation changes. Prior journal already mentioned cooldown and test source but not this end-to-end race/receipt boundary.

### Accepted current Stage
ROADMAP.md:42,210 and PROJECT_STATE.md:1575–1579 require basic server-side rate limit/anti-spam for authenticated topic and reply creation. db/forum-write-policy.ts:1–18 default FORUM_WRITE_COOLDOWN_MS=5000. Not obligated to add speculative distributed limiter before pre-release.

### Traced enforcement
1. app/forum/actions.server.ts:146–175,503–519: topic and reply actions check same-origin authenticated browser + current write permission; actorId assigned from server session through runForumMutation, never caller ID. Drizzle-writer wrapper db/hyperdrive-forum.ts:167–210 forwards createTopic and createReply through ForumService to DrizzleForumRepository (new request client).
2. db/forum-repository.ts:569–645 (create topic/initial post) and :664–760 (create reply) start DB transaction, invoke enforceForumWriteCooldown before inserts. In a reply, row-lock existing topic and check active duplicate first. db/forum-repository.ts:3873–3887 locks existing Better Auth user row SELECT ... FOR UPDATE then separately SELECTs latest persisted forumPosts.createdAt for that author, compares with policy.now; checks BOTH new topics and replies against same post history per user, regardless of discussion thread. Waited concurrent request sees committed preceding post in subsequent fresh SELECT under usual PostgreSQL read committed semantics. No process-only timer. Author row nonexistent cannot yield success due FK. Different users have independent row locks and cooldowns.
3. db/forum-repository.ts:598–645 and :699–752 inserts to topics, posts, revisions, notifications and publication receipts under a transaction, with FK/rollback. On cooldown rejection entire transaction rolls back, cannot leave partial topic/reply. Help-signal uses separate cooldown state keyed to forumHelpSignals (same row lock but not shared timestamp, intentionally independent) :3889–3903. Existing per-author SQL-based functionality meets accepted current scope.
4. app/forum/mutations.server.ts:93–112 maps ForumWriteRateLimitError to HTTP 429 rateLimited + Retry-After ceil(ms/1000) minimum 1, does not expose exception message. app/forum/write-actions.test.ts:638–649 asserts 2100ms -> 3 seconds, status 429, opaque JSON.
5. db/forum-repository.ts:569–598 / :664–699 first acquires owner/context attachment-scope advisory lock if operation present, checks publicationReceipt BEFORE cooldown and other writes; same owner/context/UUID and fingerprint -> returns published IDs idempotently, no second message or 429. Mismatched fingerprint raises 409 (ForumStateConflictError). Receipt and actual transaction contents committed together. db/forum-repository.ts:783–818 and db/attachment-draft-generation.ts:16–24 implement identity scoping/advisory fencing. app/forum/actions.server.ts:38–43 reads editorOperationId. Externally submitted text-only without operation still must pass DB cooldown for each write.
6. EXISTING native test source READ NOT RUN: tests/database/migrations.test.ts:2506–2532 checks shared cooldown across topic→reply, rejected topic leaves no partial rows, independent second author, re-enabled after five seconds; :2534–2563 uses TWO distinct Hyperdrive writers/concurrent PostgreSQL clients under fixed time, expects exactly one success and one ForumWriteRateLimitError, one persisted topic/title/post/revision. tests/database/forum-attachment-publication.test.ts:280–297 lost ACK, same-operation replay same post ID, changed retry conflict. app/forum/write-actions.test.ts:638–649 assert typed 429 header. Earlier confirmed CI #39615502080 success on PR #232 exact Git TREE identical to current main, but current GPT-6 DID NOT run it; no claim of a fresh test.

### Finding classification and boundaries
**No NEW confirmed current-Stage defect in bounded topic/reply cooldown + concurrency + idempotency check.** Direct test for simultaneously submitted topic and reply by same author was not seen, but same per-user mutex code proves common serialization; test gap alone is not product defect. Data skew, unusual clock behavior or self-service post deletion bypass not observed as current user path; don't escalate speculative. E1/N1/D1/L1/I1 previous classifications unchanged; E2/E3 unconfirmed; H1/T1/P1 observations not promoted. AUD-20261022 not touched. STOP; next subtask only after explicit owner continue.


---

## Первый аудит — Workers split-boundary, secrets + Stage6 advisory-lock incompatibility (2026-10-22)

**ONE BOUNDED SUBTASK COMPLETE; ORIGINAL FIRST AUDIT OPEN.** Separate AUD-20261022 untouched. Current main exact SHA d72b27ca762dd930f0e7ad614e5b00832a07ec0c reconfirmed, full AGENTS.md read, as well as current PROJECT.md and checked PROJECT_STATE.md, ROADMAP.md, docs/database/HYPERDRIVE.md to EOF. The initially proposed locale-routing slice was ALREADY comprehensively covered by earlier first-audit logs; explicitly pivoted to genuinely distinct Worker split DB bindings and secret capability composition rather than count duplicate analysis. GitHub source/CI docs read and Cloudflare official docs checked on 2026-10-22. No code fixes/merge/deploy/live data or external infrastructure changes. No own Worker deploy or real-Hyperdrive query executed.

### Verified current implementation
1. package.json pinned runtime versions, vite.config.ts Cloudflare SSR React Router plugin, react-router.config.ts SSR true. workers/app.ts:25–53 initializes a fresh RouterContextProvider per request, resolves both required Hyperdrive binding connection strings at request start, initializes Better Auth from webConnectionString, uses webConnectionString for forum reader/writer/attachments/content presentation/authorization, localizationConnectionString ONLY for registry/UI translations; generated content action intentionally disabled. Request server env passed to createHyperdriveAuthRuntime. R2 binding optional and a separate auth-gated attachment route returns classified 503 when missing (PROJECT_STATE.md:803–804).
2. workers/database-bindings.ts:17–43 requires BOTH HYPERDRIVE and WEB_HYPERDRIVE connection strings be nonempty; no fallback or silent cross-capability substitution. Test workers/database-bindings.test.ts:1–75 specifically asserts split routing and unavailable fail-closed, plus source checks of wiring.
3. app/auth/auth.server.ts:19–23,63–81 uses BETTER_AUTH_SECRET/URL and GOOGLE_CLIENT_ID/SECRET only on server Auth runtime; app/ui-preview/main.tsx, preview-app.tsx and its Vite config use separate mock React entrypoint. Source-tree search of those variable names returned server auth, .env.example placeholders, dummy test fixtures, protected rollout workflow, and test scripts, no client TSX runtime uses. No direct production secret contents inspected and no compiled browser asset decompilation; phrase as source-level boundary, NOT a universal leakage proof. wrangler.jsonc has public Hyperdrive IDs, not authorization credentials.
4. Current docs/database/HYPERDRIVE.md:8–25 and :40–94 split localization role SELECT-only versus web role with forum/auth write privileges; PROJECT_STATE.md:1538–1557 and ROADMAP.md:300–342 say WEB_HYPERDRIVE actual production Worker binding/runtime **NOT DEPLOYED** and Stage6 gate paused. Local/CI Workers smoke uses local Hyperdrive overrides direct to disposable PostgreSQL, not actual production Hyperdrive; original first audit prior exact-main CI #39615502080 verified success on bit-for-bit tree match but cannot prove real service semantics.

### New compatibility finding, NOT a current Stage defect
- **S6-HY-LOCK source/docs mismatch (future Stage6 gate, high relevance when resumed, not a current deployed symptom):** db/attachment-draft-generation.ts:16–24 unconditionally sends SQL pg_advisory_xact_lock(hashtextextended(owner/context JSON,0)) to serialize upload-operation scope. db/forum-repository.ts:581,673,3691 invokes it during published draft operation scope; db/hyperdrive-forum.ts:166–177 and 195–205 always supplies publishedDraft object for ordinary create topic and reply, even when no file ID, so default forum writes traverse this advisory lock. db/forum-attachments.ts:100–190 also invokes for upload, cancellation; db/forum-attachment-cleanup.ts:33–70 invokes in cleanup. workers/app.ts maps these to WEB_HYPERDRIVE string. Documentation HYPERDRIVE.md:574–576 declares advisory locks unsupported in Cloudflare Hyperdrive; docs/translation/RESEARCH.md:87–88 also records they are not in intended Vico write protocol. Current first-party official Cloudflare table https://developers.cloudflare.com/hyperdrive/reference/supported-databases-and-features/ last updated Sep 30 2026 EXPLICITLY lists PostgreSQL Advisory locks in UNSUPPORTED features. Cloudflare docs also explain transaction pooling. This is a documented source-to-target incompatibility for planned Stage6 web runtime, not just a speculative scale improvement.
- **Boundary:** Current active local/CI Stage operates via direct PostgreSQL which DOES support those locks; future Stage6 deployment has NOT happened; no live Hyperdrive transaction attempted and no observed external route failure. Therefore must NOT classify as confirmed current-Stage defect or request immediate refactor, no solution imposed. Before authorization of Stage6 real rollout, this incompatibility requires fact-based investigation against target platform and official supported access path; a real fix must be made only when material to authorized Stage6. Existing passing local Postgres race/attachment tests and Pages success do not prove advisory locking through real Hyperdrive.
- No previous E1/N1/D1/L1/I1 classification changed. E2/E3 remain unconfirmed, H1/T1/P1 remain observations. No first-audit all-clear and no source-level contradiction publication to shared channel before owner instruction. STOP awaiting explicit owner command.


---

## Первый аудит — PostgreSQL client lifecycle across Worker request-local adapters (2026-10-22)

**ONE BOUNDED SUBTASK COMPLETE. ORIGINAL FIRST AUDIT REMAINS OPEN.** Distinct from the AUD-20261022 second audit. Rechecked main d72b27ca762dd930f0e7ad614e5b00832a07ec0c and fully read current AGENTS.md. Previously reviewed Worker split binding/secret composition was *not* repeated as new proof; this step focuses narrowly on per-operation pg-client ownership, cleanup, timeout and error lifetime. Source / existing test cases inspected, no own DB or workerd/browser smoke rerun, real Hyperdrive or external secrets not accessed, no implementation changes.

### Direct source observations
1. workers/app.ts:25–53 allocates fresh RouterContextProvider on each fetch, creates request-local factory closures for DB services, no connected pg Client or pg Pool at global scope (requestHandler global is only React Router handler factory). React Router session initializeAuthContext binds request session; no cross-request authorization caches in the inspected connection creation.
2. db/postgres-deadlines.ts:4–40 initial caller connection/query deadline values localization 1000/2000ms and web 3000/7000ms; createWebPool max=1. :45–86 recognizes typed/precise deadline errors by code+message/cause, bestEffortDiscardClient calls client.end() nonblocking and suppresses synchronous/async cleanup errors so it does not mask an original failure.
3. db/hyperdrive-forum.ts:62–78 opens new web client per forum read, best-effort end in finally; :119–132 opens new client per write and awaits end finally. :149–166 profile+presence use best-effort finally. db/hyperdrive-forum-attachments.ts:51–75 fresh client per method, classification and best-effort finally. db/hyperdrive-content-translations.ts:26–55 fresh client per batch, finally discard. db/hyperdrive-authorization.ts:20–81 creates pool **inside** requested operation/resolver lookup, ends in finally; resolver promise cache is request-local. app/auth/auth.server.ts:84–111 creates new web client for getSession or auth handler, end in finally, no module-shared socket.
4. db/hyperdrive-registry.ts:30–64 lazy one client on readAll, healthy read does NOT explicitly call end, known failure calls bestEffortDiscardClient and degrades. app/localization/persistent-registry.ts:119–136 caches one registry result Promise per request. db/hyperdrive-ui-translations.ts:44–135 lazy one client per request, shares it across namespace/bundle reads and memoizes; classified outage/timeout calls bestEffortDiscardClient and sets circuitOpen; **successful request does not call end**; some unknown errors propagate without explicit end. Existing db/hyperdrive-registry.test.ts and hyperdrive-ui-translations.test.ts test one client and one snapshot/read per request, and fail-path cleanup/timeout behavior; do NOT assert explicit end on success. db/postgres-deadlines.test.ts tests best-effort cleanup suppression and error classifier; own run NOT performed.
5. **Crucial external contract resolves initial suspicion:** Current official Cloudflare Hyperdrive connection lifecycle docs https://developers.cloudflare.com/hyperdrive/concepts/connection-lifecycle/ (last updated 2026-04-21; read during this step) explicitly state connections from normal Workers to Hyperdrive automatically garbage collected when request/invocation finishes; do NOT need client.end() / connection.end(); new clients created inside request handler are preferred, never global. Thus omission of end on success in two lazy request-local localization adapters, without other symptom, is NOT proof of a leaked Worker/Hyperdrive connection or a current-Stage defect. node-postgres official https://node-postgres.com/apis/client confirms client.end disconnects for ordinary Node context, which is NOT sufficient to override Cloudflare Worker request lifecycle rules. Existing local Hyperdrive overrides connect directly to disposable PG in workerd (docs/database/HYPERDRIVE.md:372–388), NOT proof of production service connection behavior.
6. No demonstrated cross-user socket sharing, unexpected lifetime extending beyond request, active Worker connection leakage, owner-specific data leakage or deadline failure. Real deployed Hyperdrive, external Worker and performance/stress metrics NOT VERIFIED. Successful remote CI on identical source tree confirmed in previous subtask but not re-executed here.

### Classification
**No NEW confirmed current-Stage defect in request-local pg client/Pool lifecycle and classified deadline handling.** Do not prescribe naive unconditional client.end() during same-request lazy localization multi-read since client reuse within request is intentional and cleanup is automatic at Worker invocation end. Stage6 Hyperdrive advisory lock mismatch in previous independent checkpoint stays FUTURE STAGE6 COMPATIBILITY GATE, not silently promoted/reclassified. Prior E1/N1/D1/L1/I1 statuses unchanged; E2/E3 unconfirmed; H1/T1/P1 observations remain non-actionable. Original first audit overall OPEN (historical 1–8 coverage uncertainties / independent live browser or Worker scenarios unfinished), second audit untouched. STOP and wait for explicit owner continuation.


---

## Первый аудит — HTTP HEAD, unsupported methods, resource/body and API route boundaries (2026-10-22)

**ONE BOUNDED SUBTASK COMPLETE; ORIGINAL FIRST AUDIT OPEN.** Main exact SHA d72b27ca762dd930f0e7ad614e5b00832a07ec0c rechecked, latest AGENTS.md fully read. Prior records already covered locale redirects GET/HEAD and unrelated attachment ownership; only NEW method+body boundary investigated here. No implementation, shared communication, other-agent or AUD-20261022 changes. Source + existing test assertions inspected, NO new local Worker/http/PG/browser run.

### Source and current contract
1. app/routes.ts whole 33 lines: /api/auth/*, /api/attachments, /api/attachments/file/:attachmentId and generic api/* are separate resource routes before public /:locale children; app/routes/api.ts:1–8 responds 404 both loader/action, so unknown API paths are not caught as locales. app/routes/auth-api.ts:1–15 delegates to Better Auth server handler (separate own auth method validation, not client-trusted route).
2. app/routes/attachment-upload.ts:127–158: loader accepts only GET for owner-authenticated operation status query, otherwise 405; action only POST upload and DELETE whole-operation cancel, all other methods 405; obsolete per-file DELETE 405 intentionally. Mutation must pass authenticated owner/session, same-origin and editor write authorization before storage access. app/routes/attachment-upload.test.ts:173–200 inspected 200 authorized GET, action(GET) 405, obsolete per-file DELETE 405, owner-scoped cancel; tests not rerun. status JSON no-store/nosniff. Presence app/routes/presence.ts:9–27 explicitly rejects non-POST 405 with Allow:POST and requires session/same-origin.
3. app/routes/attachment-download.ts:25–88 resource GET loader validates UUID/query xor published-post/draft-operation; private reads require current owner; reads only current verified DB attachment reference before private R2 key access, returns 200 stream as attachment/octet or strictly verified raster/text inline, CSP sandbox, Cache-Control private no-store, nosniff. Loader does not explicitly branch on request.method HEAD; no action export for body-changing methods. app/routes/attachment-download.test.ts:1–106 proves 200 bytes/headers, rejected other owner draft, revoked attachment refs 404, bucket unavailability 503; **no HEAD or unsupported-method network-level test**.
4. app/entry.server.tsx:14–21 explicitly returns a null-body Response with status and route headers for SSR HTML HEAD without React render; GET's successful document body gets Content-Type:text/html at :36–45. app/routes/locale-negotiation.test.ts:69–91 explicitly proves HEAD root locale temporary redirect, locale-boundary.test.ts:1–50 establishes mutation noncanonical path 404 before action; source-based locale outcome already audited previously and not separately re-counted. app/routes/not-found.ts returns 404.
5. Official React Router documentation https://reactrouter.com/how-to/resource-routes explains a no-default route's GET handled by loader, POST/PUT/PATCH/DELETE by action. Its current public server runtime source https://github.com/remix-run/react-router/blob/main/packages/react-router/lib/server-runtime/server.ts and search snippet expose a final check request.method === "HEAD" which returns new Response(null,{headers:response.headers,status:response.status,statusText:response.statusText}); this is generic server handler stripping external HEAD response body. **Exact installed version 8.3.1 source and real Worker request were NOT executed/independently fetched**, so avoid claiming complete version-specific wire verification from current-main upstream source. HEAD attachment download handler can still do DB/R2 retrieval on invocation *before* outer body suppression; not proof of leaked bytes or present product defect, HEAD download efficiency not accepted current Stage requirement. For /api/attachments status loader, direct HEAD method check would yield 405 if invoked with HEAD; only GET is documented as current operation API, so this is not proven user-visible regression.
6. app routes that do not export action do not implement a mutation handler; real RR response code for method-not-allowed is framework-owned, not hand-asserted in local direct function tests. Legacy GET upload/status or POST auth action method-specific checks are separated from first app routing; no invented network status for all methods. Current green exact-tree GitHub CI is previous evidence, NOT a substitute for network-level HEAD/OPTIONS/PATCH probes. docs/EDITOR.md/current PRODUCT contract does not require HEAD for attachment operations nor partial-byte HTTP Range support.

### Classification
**No newly confirmed current Stage defect** in this bounded resource/HEAD/method boundary. No evidence HEAD serves private bytes externally, unauthorized mutation, or unsupported method changing forum state. No speculative fix. A future network HEAD/OPTIONS matrix may be useful when actual Workers integrated runtime tested but not a present change request. Existing source-level findings E1/N1/D1/L1/I1 unaffected; E2/E3 still unconfirmed; Stage6 Hyperdrive advisory locks future incompatibility retains independent classification; H1/T1/P1 remain observations. Live deployed/local Worker headers and exact v8.3.1 method contract NOT VERIFIED. Original first audit OPEN, stop after this one scope.


---

## Первый аудит — Persisted topic pin/unpin, permission, races and category/section presentation (2026-10-22)

**ONE BOUNDED FIRST-AUDIT SUBTASK COMPLETE; FIRST AUDIT STILL OPEN.** Existing main d72b27ca762dd930f0e7ad614e5b00832a07ec0c checked again against GitHub branch API, full AGENTS.md read. Separate AUD-20261022 not touched. Prior checkpoint inspected before scope: earlier category reading/empty pinned blocks covered, but dedicated pin/unpin mutation-permission/race/DB/UI chain not yet logged. Read source/tests via connected GitHub only. No own runtime test or browser/real Cloudflare smoke, no source/implementation/shared service channel/other-agent file modifications.

### Current accepted contract
- PROJECT_STATE.md:1083–1091, docs/auth/AUTHORIZATION.md:71–75, app/authorization/catalog.ts:20–60: DB-backed topic pin one active row/topic, db-owned pinnedAt, cascade on topic deletion, RESTRICT actor FK; only effective permission forum.topic.pin, seeded moderator/admin NOT baseline user; author ownership no exception; server-side same-origin+session; bounded category pins ordered pinnedAt DESC, topicId DESC, per-section.

### Full traced path
1. app/routes/topic.tsx:84–128 reads current session and dynamic effective forum.topic.pin via permission resolver, exposes canManagePin and canUseAdminPanel on valid user; classified AuthorizationUnavailableError merely suppresses optional display, not mutation check. app/forum/views.tsx:2440–2452 shows Form POST intent pinTopic/unpinTopic based on topic.isPinned only if canManagePin.
2. app/forum/actions.server.ts:178–200 topicAction checks URL params, forumMutationGuard session+same Origin, validates form, then specifically requires forum.topic.pin. runForumMutation obtains actorId from current authoritative session, ignores forged client actorId; invokes writer pinTopic/unpinTopic and redirects locale-aware same topic. db/hyperdrive-forum.ts:241–247 forwards through ForumService; db/forum-service.ts:214–222 validates required topic/actor text. Reject guest 401, cross Origin 403, missing permission 403; writer not called. app/forum/write-actions.test.ts:263–310 actual assertions READ (not run) including forged actor ignored, redirects /ru and /he, 401 and 403.
3. db/forum-repository.ts:1419–1451 readTopicPinState sees persisted pin; pinTopic and unpinTopic both start a transaction, lock same existing topic row SELECT FOR UPDATE, 404 for missing topic. pin inserts forumTopicPins values actor + topic onConflictDoNothing keyed topicId, leaving DB timestamp intact on duplicate; unpin deletes by topicId, naturally idempotent. Same-row lock serializes opposite operations according to commit order; no CAS requirement or stale cross-tab optimistic error in product pin model.
4. db/schema.ts:737–750 and drizzle/0025_forum_topic_pins.sql full: primary key topic_id, topic FK ON DELETE CASCADE, pinned_by_user_id FK RESTRICT, pinned_at DEFAULT now() NOT NULL, order index. Pin actor is recorded by server; repository unpin accepts topicId only but this is okay because actor permitted at route and service validates input; no misleading requirement that actor must match original pinner.
5. db/forum-repository.ts:2343–2525 category source selects current title revision/user, partitions pins by section, row_number order pinnedAt DESC,id DESC, bounded 1..10 per section; category route app/routes/category.tsx:133–150 requests 10 and serializes date. "Latest" independently ordered by activity and may include pinned topics too (separate purpose, not duplicate-write defect). readSection :2527–2571 leftJoin pins to boolean isPinned, readTopicPage :2573–2596 same; app/forum/views.tsx:1881–1890 displays pinned badge in section, category pinned panel :804–865 uses bounded data and true empty non-link state. Topic view admin panel action derived from persisted isPinned.
6. tests/database/migrations.test.ts:1897–1990 read existing real PG tests for two concurrent pinTopic via two independent Pools and unique-row constraint, stable deterministic ties/bounds per section, stable actor metadata, repeat unpin, topic cascade and actor RESTRICT. app/forum/public-read.test.tsx:3068–3100 reads admin-panel default collapsed, manager pin button and no-privileged absence. No independent test run in this turn; successful historical exact-tree CI previously verified #39615502080 checks+database jobs.

### Finding classification
**No NEW confirmed defect CURRENT STAGE** in pin/unpin safety, permission, race or rendering. A stale UI click on pin/unpin is idempotent under DB state; do not invent current defect or force optimistic CAS. Global old findings E1/N1/D1/L1/I1 unchanged; E2/E3 unconfirmed; observations H1/T1/P1 unchanged and future Stage6 unsupported Hyperdrive advisory lock mismatch remains separate. Original first audit OPEN due historically incomplete 1–8 evidence / genuine runtime scenarios not independently run. No premature publication to common service channel. STOP until owner explicitly continues.


---

## Первый аудит — Stage1 reproducible toolchain, multi-document pnpm12 lockfile, local/CI quality commands (2026-10-22)

**ONE BOUNDED SUBTASK COMPLETE; ORIGINAL FIRST AUDIT REMAINS OPEN.** Current GitHub main d72b27ca762dd930f0e7ad614e5b00832a07ec0c freshly verified and AGENTS.md fully read. Earlier Stage10 unread monotonic marker was explicitly identified as ALREADY DONE in journal :561–566, :1455–1466; NO duplicate new audit claim. Instead bounded examination of an open early-stage Stage1 reproducible config slice. Second separate AUD-20261022 not touched. GitHub source/remote Actions evidence only; no own pnpm install, lint, TS, Vitest, build, Docker, database, local Worker or browser run. No implementation/shared service-channel/other-agent changes.

### Expected and observed baseline
1. Read full current SCAFFOLD_PLAN.md (Stage1 original contract, 2026-09-10). Exact packages versions package.json: engines.node=24.21.0, packageManager=pnpm@12.3.4, react-router and @react-router/dev=8.3.1, react/react-dom=19.3.0, vite=8.2.2, @cloudflare/vite-plugin=1.54.6, typescript=5.9.3, wrangler=4.130.0, etc. No ^ or ~ among all 35 runtime/dev direct specifiers. .node-version also exactly 24.21.0. pnpm-workspace.yaml allowBuilds permits esbuild and workerd ONLY as required; no uncontrolled extra approve-builds in CI.
2. pnpm-lock.yaml actual main source: 5409 lines with TWO YAML documents separated by --- (first 100 lines env doc contains pnpm package manager pin under packageManagerDependencies specifier/version=12.3.4; second document has main project importer, deps, packages, snapshots). Programmatic text cross-check of all 35 package.json dependencies + devDependencies against LAST document importer shows 35 specifiers and ZERO missing/mismatching exact versions. Official first-party pnpm docs https://github.com/pnpm/pnpm/blob/main/pnpm/docs/lockfile.md confirmed double YAML-document layout is NORMAL in pnpm12, first env lockfile; last project lockfile. DO NOT misclassify as corrupted lockfile or try single-document YAML parser; mention downstream SBOM scanners may need multi-document support only if actual scanner is used, no current project defect evidenced. GitHub repo search pnpm-lock.yaml finds no custom source reader; CI uses pnpm itself.
3. app stack: vite.config.ts Cloudflare SSR plugin + reactRouter; react-router.config.ts ssr true and intentional routeDiscovery initial workaround for RR8.3.1; tsconfig.json references separate node/cloudflare configs, strict/noEmit; vitest.config.ts jsdom app tests excludes DB; vitest.database.config.ts Node DB tests includes tests/database/** with timeout; package scripts pnpm test, db:test, lint, typecheck=wrangler types && react-router typegen && tsc -b, build, ui-preview:build. .gitignore excludes .env*, .dev.vars*, build/generated, and keeps blank .env.example placeholders, no secrets found in these manifests.
4. .github/workflows/ci.yml current source fully read: PR event; BOTH jobs use pnpm/action-setup v4 exact version 12.3.4, setup-node v6 from .node-version, pnpm install --frozen-lockfile; checks runs guards, pnpm lint/typecheck/test/build/ui-preview build, drizzle metadata+schema parity; DB job postgres:17 fresh service executes db:test, schema/privilege probes, local Workers smoke with distinct local Hyperdrive env overrides (both pointed to same disposable PG intentionally). .github/workflows/ui-preview-pages.yml push main builds/deploys static mock preview, not live SSR forum. Earlier first audit verified GitHub Actions #39615502080 successful checks+database on head a528c6d with SAME Git tree SHA as current squash main d72b27c; no own test execution and no broad claims about live cloud runtime.
5. .github/workflows/production-worker-rollout.yml authorizes manual only with exact main SHA and confirmation, separate; deployment itself outside current feature Stage and NOT triggered by main CI/push. Current PROJECT.md and ROADMAP.md explicitly local/CI-first; Stage6 external deployment paused.

### Classification
**No new confirmed current-Stage defect in this bounded Stage1 toolchain/dependencies/install/CI reproducibility review.** Not proof of ALL Stage1 acceptance: earlier locale and i18n checks exist in journal, but missing historical 1–8 evidence and independent local runtime execution remain OPEN. No artificial requirement to re-run whole CI for this bounded source-based test. Existing E1/N1/D1/L1/I1 unaffected, E2/E3 unconfirmed; prior H1/T1/P1 future observations unchanged and Stage6 advisory-lock mismatch remains a separate future external-integration gate. Stop until explicit owner continuation.


---

## Первый аудит — Better Auth rate limiting, Cloudflare IP trust, auth HTTP negative test evidence (2026-10-22)

**ONE BOUNDED FIRST AUDIT SUBTASK COMPLETE. FIRST ORIGINAL AUDIT STILL OPEN.** Confirmed current main exact SHA d72b27ca762dd930f0e7ad614e5b00832a07ec0c, read full actual main AGENTS.md, compared personal prior journal for this distinct detailed auth-rate-limit boundary (previous references only pointed to config and generic Stage10 checks). Source, relevant tests, current accepted Stage4 contract and first-party Better Auth/Cloudflare docs inspected; NO personal live auth attempts, PostgreSQL tests, stress/concurrent auth test, Worker/browser execution or deployment. Separate second AUD-20261022 untouched; shared communication file and implementation untouched.

### Exact implementation chain
1. app/auth/auth.server.ts:12–22 BetterAuthEnvironment server-only secrets; :24–30 email+password 8–128, sign-up names in before-hook trimmed and validated max100; :54–62 rateLimit.enabled=true, storage="database", modelName="rateLimit"; :61–69 trusted ipAddressHeaders=["cf-connecting-ip"] only; :71–86 drizzleAdapter schema and betterAuth config; :91–111 createHyperdriveAuthRuntime request-level getSession and auth.handler with dedicated web db client cleanup. No advanced.disableCSRFCheck/disableOriginCheck overrides. app/routes/auth-api.ts:1–15 pass-through registered early in app/routes.ts; workers/app.ts builds request-scoped auth capability using WEB_HYPERDRIVE before loader. Authoritative user session resolved in initializeAuthContext, forum authorization elsewhere remains independent.
2. db/schema.ts:602–607 Better Auth rate_limit with primary id, UNIQUE key, integer count, bigint last_request; drizzle/0003_gorgeous_donald_blake.sql:16–22 physical SQL; .github/scripts/runtime-privileges.mjs lists rate_limit SELECT,INSERT,UPDATE,DELETE in web role. App auth rate counters are database-backed, not per-process ephemeral.
3. app/auth/auth-client.ts:1–21 calls real BetterAuth client signUp.email/signIn.email and returns boolean success from {data,error}; app/auth/credential-view.tsx:24–57 shows generic sign-in/signup errors, does not dump raw auth errors, has pending guard and no user-visible account enumeration detail. Out-of-scope email sender/password reset deliberately deferred, PROJECT.md and PROJECT_STATE.md:229–266.
4. app/auth/auth.server.test.ts full 36 lines read: config equality and CSRF/Origin not disabled. tests/database/forum-email-registration.test.ts full 130 lines inspected: true BetterAuth HTTP via runtime.handle, signup 200 and hashed credential persisted, false emailVerified, generated session; invalid password rejected and valid accepted; invalid blank/101-char display name 400/no user, trims valid names. Uses caller-supplied cf-connecting-ip fixture. tests/database/auth-runtime.test.ts:63–170 verifies auth handler session cookies, sliding expiration, expired/revoked session; DOES NOT test exhaustion 429 or counter content. app/routes/auth-api.test.ts 26 lines passes request through and route ordering. No current test found simulating repeated sign-in attempts per same IP, 429, actual DB rate counter increment at threshold or simultaneous auth calls. These are **UNTESTED CONDITIONS**, not proof auth limiter bypass. Previously independent #39615502080 checks/database SUCCESS on EXACT matching main Git tree; own run NOT done.
5. Official Better Auth https://better-auth.com/docs/concepts/rate-limit, https://better-auth.com/docs/reference/options and https://better-auth.com/docs/reference/security confirm enabled and database storage accepted, rate-limiting uses trusted header, intended per-endpoint rules and that getSession via internal auth.api is not browser-rate-limited (normal), default CSRF/Origin checks apply unless explicitly disabled. **Note documentation continuously updated and might describe later versions than pinned BetterAuth 1.7.4; do not claim specific default sensitive-path max/window for exact pinned version without package execution/source inspection.** Official Cloudflare docs https://developers.cloudflare.com/fundamentals/reference/http-headers/ updated Oct 9, 2026 describe CF-Connecting-IP and normal edge behavior, but same-zone Worker subrequests can affect x-real-ip/CF header, and real service request path was not exercised. Treat trusted boundary as intended Worker edge config, NOT absolute against any hostile intermediate Worker or local self-supplied test header.
6. ROADMAP.md:196–223, PROJECT.md:26–37 and PROJECT_STATE.md:229–266 require **basic** server-side anti-abuse/rate limiting in current MVP, not bespoke password-spray incident analytics, distributed hardware defenses or live traffic hardening before Stage6. No rationale for hypothetical added device/client rate limiting. Also forum posting 5s cooldown separately checked in earlier first audit; do not conflate Better Auth rate_limit with forumPosts cooldown.

### Classification
**No new CONFIRMED CURRENT-STAGE DEFECT**. Source-level evidence of enabled DB-backed BetterAuth auth throttling and trusted header configuration; HTTP 429 rate-exhaustion, multiple simultaneous brute-force attempts, real Cloudflare sanitization and exact BetterAuth 1.7.4 rule defaults **NOT VERIFIED**. Test gap not automatically actionable unless owner requires exhaustive live anti-abuse proof at current Stage. E1/N1/D1/L1/I1 other historical findings unchanged; E2/E3 unconfirmed; H1/T1/P1 observations and separate future Stage6 advisory-lock mismatch unchanged. No first-audit overall completion; STOP for owner.


---

## Первый аудит — topic tag creation normalize/dedupe/persistence concurrency/search integration (2026-10-22)

**ONE BOUNDED FIRST AUDIT SUBTASK COMPLETE, ORIGINAL FIRST AUDIT REMAINS OPEN.** GitHub main freshly verified SHA d72b27ca762dd930f0e7ad614e5b00832a07ec0c; full latest AGENTS.md read. Personal first-audit journal searched for tags creation/normalization vs prior read-only tags index/tag detail reviews; dedicated writes/validation/races slice not previously independently closed. Second AUD-20261022 untouched. Repository/source/previous test assertions READ via GitHub; no own DB/Node/browser/Cloudflare deployment execution, no app/source mutation, no shared communication file/other agent file edit.

### Contract and complete relevant chain
1. Current PROJECT_STATE.md:1055–1063 describes accepted Stage4 technology tags: normalized reusable free-topic-level labels atomically written with topic, displayed at /:locale/tags and /:locale/tags/:tagKey and in section/topic views, migration 0021. External rollout stays future Stage6; no requirement to redesign tags or add arbitrary limits without evidence.
2. app/forum/actions.server.ts:93–114 Help question and :143–174 ordinary Section topic both get comma-separated text from form, trim/filter blank, require effective forum.topic.create and authoritative session actor; Help section hardcoded server-side. db/hyperdrive-forum.ts:168–189 maps raw names to {key:name,name} and calls ForumService.createTopicWithInitialPost. db/forum-service.ts:62–79 normalizes tags for createTopicWithInitialPost; :43–49 same normalization for direct createTopic.
3. db/forum-service.ts:364–380 normalizeForumTags: NFKC Unicode normalization, trim and collapse internal Unicode whitespace, discard empty, reject name.length>64 or name.includes('/'), key = name.toLocaleLowerCase('en-US'), stable dedupe Map by key retains first display case/first-appearance order. Ignores untrusted supplied tag.key by deriving from tag.name again. InvalidForumContentError typed maps to mutationFailure 400 in app/forum/mutations.server.ts. No dedicated per-topic maximum tags count found in current service/action. Large-input hardening is an observation only; current product contract doesn't specify bound. No tag-edit mutation found as an accepted current product need.
4. db/forum-repository.ts:569–645 (normal combined topic+initial-post) and :540–560 direct topic both perform inserts topic/title/post/revision AND forumTags (ON CONFLICT DO NOTHING on key) AND forumTopicTags mapping inside ONE PostgreSQL transaction. Unique tag key forumTags.key and composite primary key (topicId,tagKey) in db/schema.ts:708–734 and drizzle/0021_forum_tags.sql:1–20. Two concurrent distinct-topic insertions of same brand-new normalized key rely on standard PG unique insert wait+conflict suppression, then mapping references committed key; neither duplicate physical tag nor orphan mapping. If publication fails after tag insert, transaction rolls back entire data. First-published display label for duplicate normalized key persists; second user's case spelling does not overwrite existing display name, consistent with reuse.
5. db/forum-repository.ts:1051–1112 readTags indexes unique key and counts distinct topic IDs, readTag innerJoin current title revision/user/category/section and forumPosts; :1120–1203 search joins tags by tag-key with escaped ILIKE and aggregates per distinct topic, so no extra result per tag; relevant public route files app/routes/tags.tsx and tag.tsx localize URL but request authoritative key passed to readTag. Profile of tags on section/topic via readTagsForTopics :2670–2695 reviewed earlier as public-read, not duplicated.
6. Existing TEST SOURCES read: tests/database/stage4-core-e2e.test.ts:175–208 creates topic with "TypeScript, Cloudflare, typescript", verifies exactly two tags, dedup count=1 and tag detail + topic tags; app/forum/write-actions.test.ts:322–345, :566–584 proves Help/section action parses supplied form and ignores forged actor/section, db/hyperdrive-forum integration sends to service; tests/database/migrations.test.ts:125–145 checks Help initial-post tag record and provides multi-tag seeded usage. No direct test for two *concurrent distinct topics* inventing same tag discovered; implementation SQL and unique constraints cover conceptually, but do NOT claim firsthand executed race. No own test run this step; previous verified Github CI #39615502080 checks+database PASS on same Git tree as main, not standalone manual validation.

### Finding classification
**No NEW confirmed current Stage defect** in topic-tag normalization, reuse, transactional write and public retrieval. No tag-count hard cap; potential unusually large request resource risk remains theoretical, no supported current Stage failure/repro, do NOT request code change on that basis. Current historical E1/N1/D1/L1/I1 findings and E2/E3 uncertainty unaffected; H1/T1/P1 observations and distinct future Stage6 advisory-lock target-platform conflict unaffected. Original first audit OPEN due historical 1–8 audit evidence gaps and independent real browser/Worker runs not completed; no findings communicated to another agent/shared PR. STOP until developer command.


---

## Первый аудит — HTTP text/form input-size boundary across publish and edit routes (2026-10-22)

**ONE BOUNDED SUBTASK COMPLETE; ORIGINAL FIRST AUDIT OPEN.** Fresh main SHA d72b27ca762dd930f0e7ad614e5b00832a07ec0c verified via GitHub; latest AGENTS.md read in full. New distinct scope: bound on WHOLE incoming text/form bytes and title/body fields, not historical attachment or normalized tag validators. Second AUD-20261022 untouched; no changes to implementation, shared communication or other agent files. Only GitHub source and existing tests read, Cloudflare official docs checked; no own local/Cloudflare Worker/Node/PostgreSQL/browser/stress test execution.

1. app/routes.ts all 33 lines and workers/app.ts all 54 lines: no global text-form size middleware. app/forum/actions.server.ts:69–116 Help form and :158–174 normal topic form authenticate and dynamically authorize first, then await request.formData() parsing full body; :187–189 topic mutations parse same way, :483–517 published edit and reply consume body field. No early byte budget on actually read request stream, Content-Length guard, or per-field title/body maximum before parsing; errors parsing invalid forms become 400, not an intentional 413 app budget. UI uses standard HTML input, not authoritative server body-size cap.
2. db/hyperdrive-forum.ts:168–188 forwards raw title/body; db/forum-service.ts:62–79 calls normalizeRevision, which at :425–438 checks only nonblank trimmed content and canonical locale. Published edit delegates to repository; body character or byte ceiling not found in checked mutation path. PostgreSQL schema revision text columns no explicit length constraint. Similar Help Questions SEARCH action separately checks normalized search title length <=200; not a publication title limit.
3. Existing server-side tags max name 64 chars/slash, and attachment upload app/routes/attachment-upload.ts:176–221 has streaming file-specific cap and 413 for too-large; neither enforces text FORM overall cap. PROJECT_STATE.md:502–509 describes OLD 150000-byte historical server editor draft API, now removed by PR #232, and current app/routes.ts has NO such editor-draft route; cannot cite that historical guard as current publish protection.
4. Existing source tests app/forum/write-actions.test.ts, tests/database/stage4-core-e2e.test.ts and migrations.test.ts checked for oversize request/title/body handling; no relevant threshold/rejection coverage found among searched markers. No test run in this turn; previously verified exact main tree's PR #232 CI success is unrelated to real large-request fault. Specific runtime heap failure, crashed Worker, observed DoS or user data loss NOT reproduced.
5. Official Cloudflare Worker limits https://developers.cloudflare.com/workers/platform/limits/ (updated 2026-10-12): 128 MB memory per isolate, incoming HTTP body maximum 100MB Free/Pro, 200MB Business, as much as 5GB enterprise; independent of Workers plan. Cloudflare best practices https://developers.cloudflare.com/workers/best-practices/workers-best-practices/ recommends max-body before fully consuming/parsing because large bodies can exhaust Worker memory. No inference of exact deployment tier or live Worker behavior.

**Classification**: source-proven LACK OF APPLICATION-SPECIFIC text-form and body/title limit, with plausible Stage6 deployed Worker resource exposure. NOT verified as current Stage functional/security defect: no concrete observed or reproduced failure, no accepted max title/size contract established; do not push immediate speculative implementation. Future Stage6 external runtime/abuse gate observation only. Prior E1/N1/D1/L1/I1, E2/E3 uncertainty, H1/T1/P1, and earlier Stage6 Hyperdrive advisory-lock compatibility note all unchanged. First audit NOT COMPLETE. Stop until next owner command.


---

## Первый аудит — Profile owner-only edit, normalized Unicode/URLs, atomic upsert and concurrent save (2026-10-22)

**ONE BOUNDED FIRST-AUDIT SUBTASK COMPLETE; ORIGINAL FIRST AUDIT STILL OPEN.** Current GitHub main reverified d72b27ca762dd930f0e7ad614e5b00832a07ec0c, entire latest AGENTS.md read. Initially proposed authorization-admin last-manager race slice was found ALREADY checked in first-audit logs (earlier checkpoints around own diary lines 666, 870, 897, 946); pivoted to distinct dedicated profile edit mutation/validation and concurrent save behavior. Separate AUD-20261022 untouched. Source and existing tests READ only, no own unit/PG/browser/Worker tests run, no app implementation or shared communication/other agent file changes.

### Current Stage requirements
- docs/UI_UX_PASS.md:234–248 (profile is forum profile, not social network; public opaque-ID route; only owner may save short plain-text bio max500 Unicode code points, GitHub profile and optional HTTPS/HTTP website via authenticated same-origin POST; public loader excludes private email); PROJECT_STATE.md:977–983 merged profile MVP. No accepted profile version-conflict/merge semantics, no user-facing prohibition of last-writer-wins.

### Traced implementation
1. app/routes/profile.tsx full 73 lines: loader public read exact params.userId, 404 absent and classified 503 unavailable; explicitly selects public profile projection WITHOUT email/session private data. isOwner based on current server authSession user.id and profile.id, only owner sees edit=1 and saved banner. action only POST (405 Allow:POST otherwise), requires auth session (401), same-origin (403), identity exactly params.userId (403), locale and required form intent+three string fields (400), calls validateProfileFields then writer.updateProfile({actorId:session.user.id,fields}), redirects /:locale/users/<encoded-self>?saved=1. Forged client userId/role/name ignored. Recovery draft trimmed to max bio2000, URLs2048 for InvalidProfileError 400 and typed ForumStorageUnavailableError 503; unexpected errors rethrown. No independent form byte guard, already separately observed in immediately preceding whole-form-body audit; do not count duplicate.
2. app/forum/profile.ts full 53 lines: profile bio trim; Array.from(bio).length <=500 Unicode scalar code points; excludes ASCII C0 except HT/LF/CR and DEL. safeHttpUrl canonical WHATWG URL absolute http: or https: only, <=2048 no whitespace/control, no username/password, returns href. githubUrl restricted exact github.com hostname, no port/query/fragment, one username path segment 1..39 letters/digits/hyphens then canonical https://github.com/<username>; websiteUrl any safe HTTP(S) resource. Javascript:/data:/protocol-relative/credentials/whitespace rejected; UI app/forum/profile-view.tsx full 53 lines treats bio plain React text, revalidates safe URLs when rendering, uses rel=nofollow ugc noreferrer, no raw HTML or executable link.
3. db/hyperdrive-forum.ts:158–166 creates own PG web connection and forwards current actor; db/forum-repository.ts:504–525 readProfile joins user/optional profile/custom role and scalar post/best-answer counts, returns undefined missing; updateProfile revalidates fields, checks user exists (404), then single INSERT forumProfiles ON CONFLICT(userId) DO UPDATE fields+now() timestamp. DB schema db/schema.ts:483–492 and migration drizzle/0032_forum_profiles.sql entire 12 lines enforce userId PK, cascade user FK, bio PostgreSQL char_length<=500 and GitHub URL regexp/profile website basic constraints. App validation tighter than DB website scheme guard as intentional defense in depth. Concurrent same-account saves serialize via PK upsert but NO CAS/generation; last successfully committed save wins. Accepted current MVP contract doesn't prescribe optimistic conflict handling; not proven bug, no ungrounded patch.
4. EXISTING TEST SOURCES READ NOT RUN: app/forum/profile.test.ts full 25 lines verifies Unicode/emoji 500 codepoints, normalization and hostile URL rejection; app/routes/profile.test.ts full 86 lines verifies guest/cross-origin/other-account deny before storage, forged actor ignored, public serialization excludes email/permission, invalid input/error draft preservation, unexpected error propagation, 405; tests/database/forum-profiles.test.ts full 106 lines uses native PostgreSQL 17 disposable schema, persisted upsert clearing and FK cascade, max501 validation, direct invalid GitHub SQL constraint, counters and dynamic custom role fresh read. No own two-concurrent-POST profile test observed. app/forum/profile-view.tsx full 53 lines owner-edit conditional and inert plain-text rendering.
5. This is SOURCE+EXISTING TEST evidence and historical exact-tree green CI, NOT independent live runtime validation. No external Worker/profile traffic or real production SQL query. No current Stage defect confirmed in this bounded profile editing area; concurrent lost-update scenario is a product choice in current profile MVP absent accepted version policy, not elevate as bug. Historical E1/N1/D1/L1/I1 statuses unchanged; E2/E3 unconfirmed; prior H1/T1/P1 and separate future Stage6 advisory locks and text-body bound observations unchanged. First audit OPEN; stop after this one scope.


---

## Первый аудит — Help-signal per-user cooldown, concurrent submissions, duplicate pending (2026-10-22)

**ONE BOUNDED SUBTASK COMPLETE; ORIGINAL FIRST AUDIT OPEN.** Main d72b27ca762dd930f0e7ad614e5b00832a07ec0c rechecked, full AGENTS.md read. Distinct from prior broad Help-signal lifecycle and ordinary topic/reply cooldown audits. Only source and EXISTING TESTS READ via GitHub, no own PostgreSQL/runtime/browser/HTTP execution, no implementation or shared service edits. AUD-20261022 separate audit untouched.

Current contract: PROJECT_STATE.md:1270–1296 accepts per-user 5s Help signal cooldown, independent of normal authoring, any kind and prior terminal state; no lifetime limit on topic; topic lock(s) before author lock to prevent concurrent reply/signal deadlock; server-side dynamic permission forum.helpSignal.create.

Source evidence:
1. app/forum/actions.server.ts:275–298 accepts submitHelpSignal only for four known kinds, checks forum.helpSignal.create, resolves actorId from current server session, uses shared Origin/authenticated guard and passes to writer. db/forum-service.ts:278–320 validates signal type/target/explanation (max1000 for provided), current Help target and duplicate-specific proposed original constraints.
2. db/forum-repository.ts:2752–2909 creates signal in one transaction, locks topic rows FOR UPDATE in sorted topic ID order for duplicate kind, or one topic for other kind, then calls enforceHelpSignalWriteCooldown. At :3890–3912 cooldown acquires authoritative user row FOR UPDATE and reads latest submitted signal createdAt independently of signal status/topic/type; uses fixed 5000ms ForumWritePolicy in db/forum-write-policy.ts. A blocked request throws typed ForumWriteRateLimitError and entire transaction rolls back.
3. Within same transaction, pending same kind/topic/actor/target or proposed original is queried, duplicate rejected with 409; records creation at SQL statement_timestamp() to avoid timestamp inversion after lock waits. db/schema.ts:1119–1203 additionally protects each pending class with a partial unique index; DB shape and lifecycle CHECK constraints enforce target, resolution and timestamp correctness.
4. app/forum/mutations.server.ts:85–113 maps typed rate limited error to HTTP 429 plus Retry-After rounded seconds and conflict to 409. Route-level permissions also tested in app/forum/write-actions.test.ts:749–866.
5. EXISTING PG TEST SOURCES inspected but NOT independently RUN: tests/database/migrations.test.ts:1045–1190 withdrawal does not lift cooldown, different signal kind still throttled, at exactly 5000ms next submission accepted, two concurrent writer instances on distinct Pool connections for same actor different topics yield one success and one cooldown failure, and simultaneous reply+signal same topic both succeed without lock-order deadlock. :786–836 verifies pending dedupe, different actor allowed, terminal replacement; :958–1006 concurrent manager accept only one success; :1010–1025 invalid DB shape/lifecycle rejected. Prior matching-tree GitHub CI green only historical evidence, not own run.

**Classification: NO new confirmed current-Stage defect** in scoped signal cooldown, no unsupported assumption about deployed runtime or stress performance. Existing E1/N1/D1/L1/I1, E2/E3 uncertainty, H1/T1/P1, future Stage6 advisory-lock incompatibility and text-form resource observations not changed. Original first audit remains OPEN. STOP until developer explicitly continues.


---

## Первый аудит — E1 independent executed-409 proof feasibility and exact React Router contract (2026-10-22)

ONE BOUNDED SUBTASK COMPLETE; ORIGINAL FIRST AUDIT OPEN; separate AUD-20261022 untouched. Main SHA d72b27ca762dd930f0e7ad614e5b00832a07ec0c freshly verified and complete AGENTS.md read. This task was not another unrelated checklist subsystem review; selected highest residual evidence gap E1 executable post-save 409 failed-revalidation repro and determined whether available runtime could run it. No code implementation, deployment, changes to shared communication or other agents, PR merge or CI rerun.

Executable environment factual check performed with local read-only shell: /mnt/data empty and no project checkout or node_modules; node --version = v22.16.0 while project package.json / .node-version pin v24.21.0; pnpm command absent; curl to registry.npmjs.org/react-router/-/react-router-8.3.1.tgz -> could not resolve host; git ls-remote GitHub -> could not resolve host github.com. Thus an actual dependency-accurate local React Router test or workerd/PG reproduction cannot be run here; no substitution with imitation/mock of router semantics, no claim of an executed runtime test. GitHub connector provides read-only source access but not a checked-out runnable dependency tree. No permission to make an external paid Vercel sandbox or Cloudflare deployment for this audit; not attempted.

Current upstream first-party https://reactrouter.com/how-to/optimize-revalidation specifically states SSR Framework mode failed 4xx/5xx action submissions do NOT revalidate active loaders by default; https://reactrouter.com/how-to/form-validation says only 2xx automatically revalidates action; official changelog https://reactrouter.com/changelog dates v8.3.1 2026-08-27 and records earlier v7.11.0 fix to defaultShouldRevalidate after failed 4xx/5xx response. React Router docs current, installed v8.3.1 source itself NOT executed. This corroborates previous source-level E1 diagnosis, not browser proof.

Specific app verification: app/routes/topic.tsx exports action from app/forum/actions.server.ts; no shouldRevalidate override anywhere in route module, react-router.config.ts ssr:true. app/forum/actions.server.ts editPost delegates to writer with expectedRevisionId and runForumMutation; app/forum/mutations.server.ts returns typed 409 conflict on ForumStateConflictError. app/forum/views.tsx:2183–2246 tracks editBaseRevisionId/attempt, on navigation idle with forumWriteError simply clears editPublicationRef; no revalidator.revalidate() or reload. app/forum/views.tsx:2816–2855 disables Save until current post.body.id differs from expected and user clicks explicit rebase. Server after stale edit uses R2 but client's loaded post revision stays R1 in default 409 behavior. Existing public-read.test.tsx:2314–2385 checks rebase after explicit router.revalidate() call, not after action returned 409; :2621–2691 checks failed 400 preserves unsaved text, not current R2 read after 409.

Exact executable test case required to close this evidence boundary once a suitable runtime exists: mount topic with owner editing message revision R1, type unsaved edits, simulate separate update in DB/loader source to R2, submit stale expectedRevisionId R1, verify action reports 409 and that loader is re-fetched to surface R2 while typed edit stays intact and direct explicit rebase is available; contrast with current route default loader count and action response. Do NOT execute implementation or assume PASS. Test scenario is diagnostic, not a prescribed fix. Also check success action 302 controls and 400 typed errors to distinguish semantics. No current environment permitted for this test; no owner manual action assigned via agent bridge.

Classification: E1 remains SOURCE CONFIRMED current-Stage stale conflict self-recovery defect on router + app behavior, no independently executed real React Router/Worker/browser reproduction. Runtime evidence gap is explicitly BLOCKED by tooling/checkout and cannot be cleared by additional static mini-reviews; original full first audit STILL OPEN due historical 1–8 coverage and unexecuted integrated scenarios. E2/E3 unconfirmed, D1/N1/L1/I1 findings and H1/T1/P1/Stage6 advisory-lock + form size future observations unchanged. Stop and wait for explicit developer continuation.


---

## Первый аудит — E3 error-classification and observability causal chain (2026-10-22)

**ONE BOUNDED SUBTASK COMPLETE. ORIGINAL FIRST AUDIT OPEN.** Current GitHub main d72b27ca762dd930f0e7ad614e5b00832a07ec0c freshly verified and full AGENTS.md read. This targeted examination RESOLVES one previously conditional first-audit candidate E3, not a new feature/minor checklist; second AUD-20261022 untouched. Read main source, Project.md, Project_STATE and authz contract excerpts, historical H-006, existing tests, and current official React Router docs. No own executable tests on repo (checkout + pinned Node/pnpm unavailable as previous gate), real Worker, incident logs or DB fault injection; no implementation or shared channel edits.

### Exact source-to-consequence

1. app/forum/mutations.server.ts:91–113 runForumMutation catches all writer/runtime operation exceptions: known InvalidForumContentError→400, not-found→404, authorization→403, ForumStateConflictError→409, ForumWriteRateLimitError→429 Retry-After. **The catch-all unconditionally returns data({error:'unavailable'},{status:503}) for every other error**, with NO isinstance ForumStorageUnavailableError test and NO logging or rethrow. This includes unexpected TypeError, migration/schema SQL errors e.g. PostgreSQL 42P01, programming/configuration errors from service/renderer/database, and cleanup errors. Consequence is deterministic if such error occurs; existence of such real production failure has NOT been observed.
2. db/hyperdrive-forum.ts:119–142 ordinary createTopic/createReply/editPublishedPost and related write() wrapper creates a Client, connects, runs ForumService, awaits end in finally but does NOT wrap known PG transport/timeouts as ForumStorageUnavailableError. In contrast :62–78 read() wraps classified availability only and propagates unexpected; :143–165 writeCorrection()/profile/presence similarly classify recognized dependency failures. **Why broad handler exists matters**: naively narrowing route catch without first ensuring typed classified failures in ordinary write adapter would incorrectly surface legitimate temporary outages. No forced refactor prescribed.
3. app/forum/actions.server.ts:107–115, :171–175, :489–499, :513–518 call generic runForumMutation for current Stage authoring and published-edit. app/routes/notifications.tsx, app/routes/attention.tsx also route operational writes through shared helper. Distinct runSourceLocaleCorrection in same mutations.server.ts:119–142 catches only typed ForumStorageUnavailableError and other expected domain errors then rethrows unknown exceptions. requireForumPermission and solutionScope likewise narrowly classify AuthorizationUnavailableError and rethrow unexpected, as required by docs/auth/AUTHORIZATION.md:184–206.
4. Client effects: app/forum/views.tsx:2112,2559–2562 renders forumWriteError='unavailable' localized alert rather than ErrorBoundary's generic 500; app/forum/ui.tsx:402–428 does have safe generic 500 error presentation but is NOT reached from returned data 503. app/forum/route-error.test.tsx full 80 lines tests separate generic unexpected Error boundary renders 500. Official React Router https://reactrouter.com/how-to/resource-routes/ Error Handling explicitly says returned data() or Response() EVEN when 4xx/5xx does NOT trigger handleError: only unexpected thrown Errors trigger framework error reporting. https://reactrouter.com/api/framework-conventions/entry.server.tsx says default handleError logs unexpected action/loader errors unless overridden; so E3's unexpected writer exception is NOT sent into this default framework diagnostic path, and app helper doesn't log it either. Other external infrastructure logging not inspected; DO NOT say exception can never be logged anywhere.
5. Project history H-006 PROJECT_HISTORY.md:319–353 documents same cause/failure classification issue formerly in authorization: broad catch of arbitrary resolver errors as 503. PR #76 established typed AuthorizationUnavailableError and propagation of unexpected faults. Current accepted PROJECT_STATE.md:1449–1453 distinguishes controlled 503 vs unexpected failure 500 safe states for presentation; :1570–1590 specifically requires not hiding unexpected programming/schema/config errors under authorization availability. This exact authz contract must NOT be asserted verbatim for all forum writers; broader diagnostic/error semantics and comparison with same-app established path support finding. Product docs/EDITOR.md:288–299 require user's unsaved edit to remain when save fails; any fix must not naively throw and destroy editor state. Existing source-level N1 indicates such a risk.
6. Existing test evidence: db/hyperdrive-forum.test.ts:30–154 covers ONLY reader-side classified vs unexpected availability and cleanup; app/forum/write-actions.test.ts:1110–1178 explicitly tests corrected source-locale and authorization unexpected propagation, but NO ordinary createReply/createTopic/editPost arbitrary writer failure test spotted; test suite read NOT executed. No real logged fault, misdiagnosed deployment incident, db corruption or user data leak reproduced. This finding is about deterministic wrong HTTP classification and dropped normal React Router diagnostic path conditional on unexpected write errors.

### Finding decision and boundaries

**E3 RECLASSIFIED from 'source divergence, not yet current Stage defect' to CURRENT STAGE SOURCE-CONFIRMED defect: unexpected ordinary forum writer exception silently becomes controlled 503 rather than ordinary unexpected app error and is not sent into React Router handleError logging.** This defect exists in active Stage4/Editor2 mutation code; it is not a future rollout-only risk. Operational production impact and precise deployed infrastructure observability NOT VERIFIED. Do NOT prescribe only 'throw error' because Editor 2.0's active unsaved text must be preserved (previous N1) and normal PG outage should still be typed to 503. Resolve appropriately as later independent implementation task only after owner's explicit instruction; auditing agent must not edit implementation while reviewing.

Prior E1 current Stage source-confirmed stale 409 recovery, N1 unexpected action editor text, D1 doc mismatch, L1 framework diagnostic privacy concern, I1 account-switch integrity remain separate; E2 unconfirmed. Stage6 Hyperdrive advisory lock and form-body size observations remain future-risk categories. First audit still OPEN due historical 1–8 scope evidence and no fresh executable live runtime tests. No formal publication to team/common channel. STOP after this subtask pending owner continuation.
