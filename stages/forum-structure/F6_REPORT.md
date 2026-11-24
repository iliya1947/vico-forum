# F6 — whole-feature author acceptance и final assembly

## Итог и reviewer route

Final whole-feature Draft [#379](https://github.com/iliya1947/vico-forum/pull/379), stable exact `f601e91dcab19ee1992012564e9a0b557c2ea596`, branch `feat/forum-structure-f1`, base main `a3dae5815e26d158c566a27c552127b4b1ab29aa`.

**Author gate PASS после bounded WF-01 correction.** Это авторская self-check/acceptance, не independent review и не закрытие Mira HOLD автором. Следующая — **Мира whole-feature coordinator re-review** нового exact head; после её PASS — независимый **Марк** при code independence, затем owner merge. F7 docs не активирован.

Полный diff main→final:108 files/+15638−413; одна forward migration0072. Исходный F6 delta к accepted F5:6 files/+344−19 (Move correction и acceptance). WF-01 delta к bf3e97d:3 files/+144−8, два commits: form+regression и test-only synchronization.

## Assembly: проверенная GitHub metadata

| PR | Исходный bounded head | Итог |
|---|---|---|
| #379 F1 | 8227db6003f5a23a369e11b645194da229315f7a | сохранён как final PR; head fast-forward до f601e91, base main, Draft/unmerged |
| #380 F2 | 11a2808f14a79efd69dbbb120f5b732bf2880d4f | closed/superseded, merged=false |
| #381 F3 | ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78 | closed/superseded, merged=false |
| #382 F4 | 18627a8c53a6db681a7f4f278b88fcdd55f579c1 | closed/superseded, merged=false |
| #383 F5 | b5efc4d4ea0db1563b5036057518f3ec2b54e656 | closed/superseded, merged=false |
| #386 F6 | bf3e97d6c52b224d1a77bd14f96597b446405472 | closed/superseded, merged=false |

Промежуточные PR закрыты и проверены **до** продвижения первой ветки. Git ancestry проверена для original F1 и main; выполнен обычный fast-forward push, без force/merge. Поэтому GitHub не получил случая automatic merged-into-base detection открытого intermediate PR. Изначальные commit heads сохранены в Git history/branches. В main не выполнялось merge.

## F6-01 — подтверждённая uncertain-response correction

Новый реальный Chromium scenario выполнил канонический Move через Worker до COMMIT, затем заменил только acknowledgement пустым204. До correction:
- DB location изменилась;
- Router автоматически revalidated ранее загруженный private context;
- TopicMoveForm получил новый object snapshot, сбросил attempt/unknown и включил Confirm с новыми expectations без осознанного refresh;
- reply draft сохранился, но explicit-refresh contract S7/S9 нарушался.

Исправление минимальное: `defaultShouldRevalidate={false}` на **общей** moveFetcher.Form. Existing confirmed-receipt effect по-прежнему вызывает useRevalidator; explicit refresh по-прежнему читает guarded context. Отдельных route hooks/state layers/permission caches/POST replay не добавлено. API сверена по official React Router route-module revalidation docs и установленному8.3.1.

После correction full real-browser case проходит: actual commit, empty204, visible unconfirmed state/disabled submit, retained draft; явное Refresh читает committed current section/location version; число POST остаётся1. Общая форма применяется к public/Admin inline и private direct entry.

## WF-01 — Create Category после Mira whole-feature HOLD

Mira подтвердила один blocker на предыдущем final `bf3e97d`: create COMMIT + потерянный typed response позволяли Router автоматически обновить structureVersion, сохранив имя без uncertain fence. Duplicate display names разрешены, IDs серверные — повторный submit мог создать второй category.

Bounded correction в `7ee7d06`, только private CreateCategoryForm:
- attempted/unknown сохраняет неподтверждённую попытку даже при последующем независимом loader read;
- имя сохраняется, повторные click/submit блокируются до explicit Refresh structure;
- `defaultShouldRevalidate={false}` исключает тихую post-action revalidation;
- matching typed success очищает имя и явно revalidate'ит структуру; typed invalid/conflict/unavailable/unauthenticated/forbidden сохраняют прежнюю политику;
- automatic POST replay не добавлен; backend/schema/API/shared structural controls не менялись.

7 новых router/component regressions: commit+lost204, independent background revalidation не снимает fence, deliberate duplicate name только после verification, confirmed success, все5 typed error cases. Focused suite19 PASS; lint/typecheck PASS. Главный lost-ack regression на исходном коде воспроизводимо падает.

Новый реальный Chromium case использует production Create Category action через Worker/Better Auth/PG17. `route.fetch()` выполняет настоящий COMMIT; теряется только typed acknowledgement, подменённый204. SQL наблюдает ровно один category и original category.created event. Имя и старая expectation сохраняются, disabled click и submit event не отправляют второй POST. Explicit Refresh читает committed structureVersion; submit становится доступен, имя сохраняется, category/event/POST count остаются1. Listener наблюдает все POST до окончания explicit refresh независимо от interception.

Первый CI run45314433677 на superseded `7ee7d06` выявил race самого нового теста: transient uncertain UI наблюдался до окончания перехваченного POST, SQL ещё не видел row. Test-only `f601e91` добавляет ожидание фактического lost204 response перед committed-state assertions. Без sleeps, polling SQL или ослабления assertions. Product correction не менялась; новый exact-head whole-feature run45314830099 PASS.

## S9 — полная применимая matrix

Ссылки на код ниже относятся к final exact head; PG suites выполняются полностью final CI, а не объявляются проверенными по наличию файлов.

| S9 requirement | Доказательство |
|---|---|
| Clean/upgrade migrations, backfill, schema/catalog/runtime parity | forum-structure-foundation.test.ts: actual0071→0072/clean, legacy ordinary order, Help, bigint, catalog/default grants; CI migration/schema/manifest/runtime probes |
| Independent rights/revoke/Owner/raw role/AP10 | forum-structure-commands.test.ts + topic-move.test.ts + forum-structure-read.test.ts; connected same-session move revoke/AP10/visibility revoke |
| Guest/origin/account/duplicate/File/oversize/mixed fields | admin-structure-actions/admin-forum-create/topic-move-action/route tests; actual Worker guest/origin/mixed denial; late actor/read UI tests |
| Create/rename/Unicode/duplicates/empty/no-op/stale | F2 command PG + strict route/form unit; actual browser category/section forms and History |
| Global sibling reorder, search/page/tie/cursor, Help | F2 global-neighbor PG + F4 order/paging/bigint/query-bound cursor/first-three tests; narrow browser forms |
| Section reparent/empty category/forged destination | F2 PG commands; F4 snapshots/counts/locations; actual browser reparent preserves section ID |
| Topic move within/cross categories and retained domain state | F3 frozen populated-table preservation incl closed/solved/pin/inactive author; connected cross-category visible + within-category hidden Move |
| Real two-writer structure CAS/overflow/lock order | F2 PG acquired-lock barriers + pg_blocking_pids; global sibling/reparent/no-op/rollback |
| Same-topic moves/ABA/move×reparent | F3 PG acquired-lock cases, both orders; actual two-tab409/one History |
| Move×reply/Watch/closure/Hide/edit/planning/execution | F3 real topic locks, both orders, accepted translation publication retained |
| Structure×create-topic FK compatibility | F2 same-actor real lock/FK test; parent NO KEY UPDATE, no key-share inversion |
| Actor deactivation admission/no-op | F2/F3 real actor waits, both orders; next command denied |
| Atomic History rollback | F2 all seven commands and F3 Move forced INSERT failure; versions/effects/events rollback |
| Publish→move→original receipt | F3 replay/receipt×move concurrency; connected actual HTTP upload/create, move twice incl hidden, old-section publication form replay, same receipt/reference set, no move-back |
| Personal state/read/inbox and future notifications | F3 populated-table snapshot preservation; F6 PG bookmarks/mute/unread location projections; connected actual future reply delivers Watch and suppresses Mute after moves |
| Hidden/posts/assets/Complaint/accepted task retention | F3 PG source/evidence/attachments/task preservation; connected real published/draft/Complaint byte positives and public negatives, independent hidden post survives Restore, local cleanup retains bytes |
| Original Admin/Owner History global/scoped/kind/person/coverage | F5-D PG maps all8 actual producers to original ID across all views; localized renderer unit; exact Owner Chromium page shows original topic.moved ID without body/title |
| Real Worker/BetterAuth/PG/Chromium controls and error behavior | Full connected14 cases: actual forms/POST/DOM, old/new breadcrumbs, same-session revoke/AP10, two tabs stale409, uncertain Move и category create commit→empty204→explicit refresh/no replay |
| Editor buffers/undo/uploads/RTL/narrow/keyboard | Mounted title/reply/post Editor DOM identity/typed text/undo + in-flight XHR through actual Move; EN/RU/HE320/390, keyboard-open, measured no horizontal overflow; confirmed & uncertain flows retain draft |

Дополнительный F6 PG case проверяет Search/Unanswered/Tags/Unread/Bookmarks/Mute после actual Move и section reparent, Popular membership, Help/Similar exclusion и hidden neutral projections. Tags допускает прежнее neutral absent facet при отсутствии видимых topics.

## Post-visibility matrix

| Case | Доказательство |
|---|---|
| move-only / visibility-only / dual / Owner | F3/F4 PG и реальные HTTP context/POST; only applicable dual допускает hidden effect |
| Direct hidden URL/forged query/IDs/versions/private errors | strict route/action units + real private direct UI, ordinary Admin/public404, no source; document/.data/framework no-store suites |
| Hide/Restore/post visibility × Move | F3 acquired topic-lock orders; connected topic+post Hide→Move→topic Restore keeps individually hidden post→post Restore |
| Current hidden no-op/stale/denial | F3 PG matrix; connected Owner no-op и old frozen conflict without extra event |
| Revoke keys/AP10 between reads and writes | PG fresh raw admission; same real session GET→revoke/measure→frozen POST403/404, no effect; restore permits fresh valid effect |
| Hidden original topic.moved fact | neutral topic:id + bounded structural before/after only; PG original-source/Owner tests и connected event content checks |
| Receipt after move/Hide/Restore | F3 plain persisted-location replay lock graph; connected original-section canonical create replay retains R2 references and current hidden location |
| Inline control with mounted Editor | actual Chromium no navigation/remount across confirmed Move; unknown acknowledgement preserves draft and requires explicit read |

## Connected artifact provenance / visual scope

[Whole-feature Chromium/local-R2 run45314830099](https://github.com/iliya1947/vico-forum/actions/runs/45314830099), artifact **14885421479 / forum-structure-whole-feature-connected**.

Downloaded artifact results.json проверен отдельно:
- implementationSha = checkoutSha = f601e91dcab19ee1992012564e9a0b557c2ea596;
- fullFeature=true;14 case groups;pageErrors=[];external=[];
- реальные production Worker operations, Better Auth, PG17 и native local Miniflare ATTACHMENT_R2; CI-only K5 wrapper делегирует форум unchanged;
- SQL только для fixtures/grants/retained references и наблюдения committed state; verified effects выполняются реальными HTTP operations;
- R2 configuration временная, remote:false; production wrangler.jsonc не менялся.
- Новый wf01-category-unconfirmed.png просмотрен: имя и unconfirmed message видимы, Create category disabled, Refresh structure доступен. EN/RU/HE320/390 keyboard/layout assertions прошли. General UI/UX pass или owner visual sign-off не объявляется.

Baseline artifact14883765442/run45310913957 на bf3e97d (13 groups) сохраняет исходную F6 provenance; прежние en/he320/hidden screenshots были просмотрены до WF-01. Новая correction не меняет CSS/layout.

## Exact-head final gate

[CI45314820622](https://github.com/iliya1947/vico-forum/actions/runs/45314820622) — SUCCESS:
- checks138179002641: **243 files /3158 unit**, lint/typecheck, build/UI-preview; migration guard1 new0072, accepted history unchanged; Drizzle: No schema changes.
- database138179002849: **118 files /1831 PostgreSQL tests**, manifest75, runtime privilege probes, split-authority provisioning, credential diagnostic/recovery/bootstrap и built Worker HTTP smokes.
- Все **18 применимых acceptance workflows SUCCESS** на exact f601e91dcab19ee1992012564e9a0b557c2ea596:

- [SA04-L3 connected authorization Owner Worker Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314830039)
- [SA05 whole Owner deactivation connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314829886)
- [Topic Watch connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314829879)
- [Topic Bookmarks connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314829884)
- [SA04-S complete AccountState connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314830011)
- [Personal Mute/Block connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314829977)
- [Own topic title connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314830068)
- [SA04-M2 connected AP10 Worker Chromium AccountState acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314830063)
- [SA06 native monitoring connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314830098)
- [SA04-J12 connected AccountState Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314830158)
- [SA04-K5 connected attachment Worker R2 Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314830032)
- [SA-03 unified profile connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314829910)
- [SA-01 Super-admin connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314830123)
- [Forum structure whole-feature connected Chromium and local R2](https://github.com/iliya1947/vico-forum/actions/runs/45314830099)
- [SA04-N connected Complaints Worker Chromium AccountState acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314830130)
- [SA08 Overview and whole-program entry connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314829975)
- [AP-10 isolated browser acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314829999)
- [SA07 Background Localization Files Data and Integrations connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45314829863)

SA04-K5 run45314830032 прошёл на attempt2: первый job138179032105 упал до upload при немедленном чтении ещё пустого editorOperationId (check.py393). Существующий editor генерирует ID в client useEffect; test читает input без ожидания. Этот путь не менялся WF-01. Повторён только упавший job138180132303 на том же exact head, без source changes. Остальные current-head gates прошли с первой попытки. Отдельная correction старого K5 harness не входит в WF-01.

Предыдущая baseline CI45310905077 на bf3e97d:3151 unit/1831PG +18 acceptance PASS; она не подменяет current-head evidence. После запуска current exact checks source не менялся.

## Передача

**Мира: whole-feature re-review #379 main→f601e91**, все108 files против canonical stages/forum-structure/PLAN.md S0–S10/S9/post-visibility; отдельно перепроверить WF-01 receipt fence и regression. Координаторский HOLD предыдущего head ожидает её решения на новом. Лёва автор implementation/acceptance/assembly, после author gate **STOP**, независимый PASS не объявляет. Mark остаётся inactive до Mira PASS.

Локальная vico_f6_browser_test удалена; originally stopped vico-title-edit-pg снова stopped. Preview остановлен; original wrangler.jsonc восстановлен; synthetic vars, node_modules symlink и __pycache__ удалены; worktree clean. #379 Draft/open/unmerged; intermediate #380/#381/#382/#383/#386 closed/superseded/merged=false. Main unchanged. F7 docs только после owner merge; #342 never merge, #300/Stage6/deploy не активированы.
