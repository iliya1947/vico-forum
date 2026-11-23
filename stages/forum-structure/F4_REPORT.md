# F4 — согласованное чтение структуры и закрытые move reads

## Author gate

**PASS на exact head `86aadfe49dfe175b7f42baeaa6fa78883631ebeb`**, Draft [#382](https://github.com/iliya1947/vico-forum/pull/382).
Это авторская самопроверка, не independent review. Следующая — Мира для bounded F4 coordinator checkpoint; Лёва STOP до нового назначения.

Base: `feat/forum-structure-f3`, accepted exact `ecc15de9d7036bac13f4ecafcb6fc0776ce7ea78`. Стек не merge. F4 diff: 28 files / +691 −71, два commits; schema/migrations/dependencies/grants не менялись. Проверенный main baseline `a3dae5815e26d158c566a27c552127b4b1ab29aa`.

## Реализованный контракт

- Public `listCategories/readHomepage/readCategory`: persisted sort_position/id COLLATE C, Help first, прежнее исключение service section. Homepage/category/section используют локальный read-only REPEATABLE READ; section tag enrichment получает тот же transaction. Public topic snapshot/visibility contract сохранён. Setup/raw readHierarchy не стал public API.
- Admin category/section projections остаются single-statement coherent reads с прежними hidden predicates. SQL search/order/seek выполняются до LIMIT25+lookahead; matching total независим от cursor. StructureVersion читается в том же statement. Topic ID/activity order не меняется.
- Container cursors: closed format-v1 opaque JSON/base64url, kind/parent/literal filter/exact order tuple. Seek/order используют одинаковую C collation и bigint без Number coercion. Old bare IDs, malformed/oversize/noncanonical/cross-filter/cross-parent/cross-kind cursor дают controlled400. Existing IDs≤2048 UTF-8 bytes поддержаны; cursor bound16KiB, topic raw-ID bound2048 сохранён. Это live pagination, не snapshot на несколько HTTP requests.
- На Admin category/index 400 с after даёт локализованную First-ссылку через named routing и сохраняет валидный q. Другие private errors не отражают фильтр.
- Отдельный source-free move context: session/exact move gate до target/query; внутри coherent snapshot — active account, native AP-10 admin.forum, current raw RBAC/Owner. Hidden требует move+visibility; недоступный hidden и absent дают одинаковый neutral404. Help/необычная domain identity исключены.
- Контекст содержит только actorId/topicId/currentSection/category/locationVersion/structureVersion/isHidden. SQL не выбирает topic title/body/author/revisions/History/reason/assets. Public и ordinary Admin не получили includeHidden.
- Destination picker допускает structure или move capability, возвращает ordinary category/section metadata; literal name/ID search≤200 codepoints, optional parent filter, page25+lookahead и независимый total. Section order включает category order/id и section order/id.
- Typed storage/auth failures дают503; denied/invalid/inactive/missing —400/401/403/404. Unexpected invariant/programming failures не маскируются fake503. Private Forum document/.data/static aliases и framework/init failures получают private,no-store без raw exception.

## Узкие seams для F5

- `db/forum-structure-reader.ts`: `PostgresForumStructureReader(pool,authorization,ownerUserId?)`, отдельный `TopicMoveContextReader`.
- `readMoveContext(actorId,topicId)` → typed metadata или undefined; `listDestinations(actorId,{kind:"categories"|"sections",search,parent?,after?})` → items/total/next/structureVersion/actorId.
- `forumStructureReaderContext` / `createHyperdriveForumStructureReader` подключены в Worker через WEB_HYPERDRIVE и existing effective request authorization. Каждый snapshot заканчивается до SSR/browser.
- GET `/:locale/admin/forum/topics/:topicId/move` и GET `/:locale/admin/forum/destinations` — пока read-only resources. Named helpers: `routing.admin.topicMove(locale,id)` и `routing.admin.destinations(locale)`.
- Admin readers возвращают private structureVersion в listCategories/readCategory/readSection/readSectionTopics; category/section route loaders сохраняют его в data.
- F2/F3 writers не переписывались и здесь ещё не подключались к live mutations.

## Доказательства

| Область | Проверка |
|---|---|
| Новые private reads | 24 PG17 tests: move-only/visibility-only/dual/Owner/structure/history/author, current raw overrides, revoke обоих ключей, inactive/AP-10/Owner immunity, fake-capability denial, Help и hidden source-free/neutral404 |
| Order/page/filter | Более двух страниц, global/sibling order до LIMIT, exact matching totals, literal wildcards/Unicode/ID/category context, full-bigint seek/equal-position C ties, malformed/legacy/context-crossed cursor |
| Committed projections | Настоящие authoritative reparent/move обновляют homepage/category/section/topic/Admin counts, parent/breadcrumbs/location; first-three sections следуют persisted order |
| Snapshot races | Пять two-connection races: homepage×reparent; category count/latest×move; section breadcrumb/topics×reparent; private global/location/parent×reparent+move; picker labels/version×rename. Barrier после реально выполненного snapshot SELECT; writer завершён до следующего reader statement. Без mock rows/произвольного sleep |
| Least privilege | Exact existing web capability/max1 pool: visible/hidden context, picker, Admin versions и public hierarchy snapshots без дополнительных grants |
| Regression/unit | F2 commands36/F3 move48 PASS локально; final new24/Admin7/profile16 PASS. Targeted routes/cursors/named routing/private Worker headers159 + mounted error recovery7; TypeScript/lint PASS |

Первый полный [CI45260291770](https://github.com/iliya1947/vico-forum/actions/runs/45260291770) выявил ровно два test-integration несоответствия: exact route enumeration не содержала новые адреса; SA04-C2 profile fixture держала внешнюю transaction перед новым RR reader. Enumeration обновлена; fixture теперь фиксирует состояние между reads и восстанавливает account fields в finally. Production snapshot не получил обхода/nested-transaction fallback. Дополнительно закрыт First recovery; применён React checklist: обычная ссылка, стабильные hooks, без state/effects/data requests.

## Final exact-head checks

[CI45261384641](https://github.com/iliya1947/vico-forum/actions/runs/45261384641) — PASS:
- checks job137996739370: **237 files / 3070 unit tests**, lint/typecheck, production build/UI-preview build, migration guard0, metadata/Drizzle parity.
- database job137996738279: **118 files / 1815 PostgreSQL tests**, manifest75, exact runtime privileges/row-lock probes, split-authority provisioning, credential diagnostic/recovery/bootstrap и все built Worker HTTP smokes.
- Все **17 применимых acceptance workflows** на том же head — PASS с первой попытки этого head:

- [SA08 Overview and whole-program entry connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396991)
- [Topic Watch connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396402)
- [SA04-L3 connected authorization Owner Worker Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396798)
- [Topic Bookmarks connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396500)
- [SA04-M2 connected AP10 Worker Chromium AccountState acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396558)
- [AP-10 isolated browser acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396983)
- [Own topic title connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396823)
- [SA04-S complete AccountState connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396504)
- [SA-03 unified profile connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396470)
- [SA04-J12 connected AccountState Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396952)
- [SA05 whole Owner deactivation connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396518)
- [Personal Mute/Block connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396865)
- [SA06 native monitoring connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261397101)
- [SA04-N connected Complaints Worker Chromium AccountState acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396888)
- [SA-01 Super-admin connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396439)
- [SA04-K5 connected attachment Worker R2 Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396524)
- [SA07 Background Localization Files Data and Integrations connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45261396814)

Это existing connected regressions, не заявление о выполненном F6 whole-feature browser acceptance новых F5 forms.

## Передача и границы

F5 live structure forms/shared Move control/QuickActions/POST dispatch/editor lifetime/Owner History projection не реализованы; F6 final assembly и independent review не начаты. Picker не выдаётся за writer test. Новых mutable UI controls нет, приватный direct route пока resource.

Мира: проверить bounded F4 whole diff против S2.1/S3/S6/S7.1/S8/S9 PLAN на указанном stable head; при PASS отдельно определить F5. Лёва не проводит independent review собственной реализации; final independent reviewer — Марк при code independence.

Локальная disposable loopback vico_f4_test удалена; исходно stopped PostgreSQL container возвращён в stopped. Worktree clean; временная node_modules symlink удалена. #379/#380/#381/#382 Draft/unmerged; #342 никогда не merge. #300/Stage6/general UI/UX/deploy не активированы.
