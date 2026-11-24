# Task6 — corrective author report after Lena HOLD

## Scope и provenance

Final Draft [#379](https://github.com/iliya1947/vico-forum/pull/379), exact `28064dfe51c2c62811dd5674387825a5f0289fd0`, base main `a3dae5815e26d158c566a27c552127b4b1ab29aa`. Parent/reviewed baseline `f601e91dcab19ee1992012564e9a0b557c2ea596`. Один correction commit; delta21 files/+505−60. Whole-feature diff118 files/+16094−424.

Назначение — шесть current-Task6 items из WORKFLOW после независимого Lena R0–R5 HOLD и Mira reconciliation. **Author gate PASS на новом stable exact.** Это author self-check/acceptance, не независимый review и не закрытие HOLD решением автора. Canonical scope: stages/forum-structure/PLAN.md. Первичная evidence/вердикт: LENA_REVIEW.md. Полная baseline S9/post-visibility/assembly matrix сохранена в F6_REPORT.md; этот отчёт дополняет её актуальным corrective delta.

## Corrections и проверяемые основания

| Finding | Причина → локальное исправление | Regression/effect |
|---|---|---|
| R2a-01 | db/topic-move.ts объединял reserved destination и non-movable source с отсутствием объекта. Ordinary source eligibility остаётся neutral404 до CAS; для admitted ordinary topic reserved/Help destination даёт StructureConflictError после fresh actor/AP-10/permission checks → existing controlled409 mapper. | topic-move PG: ordinary→Help/forged Help parent409, missing/protected/hidden-without-dual/Help-source404, включая stale Help source; no state/event. Real Worker HTTP409/404 без effects. Исправление следует narrow topic assignment Миры; blanket замены protected404 нет. |
| R3b-01 | Inspector проверял только topic/hidden/grant. Existing private inspect SQL теперь одним statement join'ит section и возвращает isOrdinary boolean по stable domain IDs; loader допускает Move только ordinary hidden topic с dual authority. | Private queue PG: ordinary true, actual service и forged Help parent false, no source/location fields. Route regression проверяет no link при обоих grants. Browser реально создаёт Help вопрос через category action, Hide через canonical action, инспектирует: no Move; private context/POST/public404. |
| R4a-01 | Общая StructureChangeForm игнорировала truthy operation:structure failures. Принимает ранние typed errors вместе со specific operation; existing recovery сохраняет draft/selection. Submit handler блокирует попытку обойти disabled state. | Все6 operations × generic401/403/503/400; name/destination и form node сохранены, ошибки видимы, no automatic retry; explicit recovery. Browser: revoke structure grant после открытия → real generic403 → draft и соседний destination сохранены → восстановление grant + Refresh без POST. |
| R4a-02 | CategoryPicker делал direct fetcher.load, поэтому controlled errors достигали route ErrorBoundary; UI принимал query вне server bound. Переиспользуется existing inlineMove/readId typed read contract. Closed error mapping локален, items/selection/query сохранены; явный reload. Input ограничен200 Unicode code points, maxLength400 допускает200 astral code points. | Real MemoryRouter400/503 остаются локальными, selection/form/query сохраняются; ASCII/astral201 ограничиваются200 до GET. Actual destinations loader regression для category inline400/503/private no-store, без raw SQL. |
| R4a-03 | Каждый новый context object после фоновой revalidation сбрасывал attempt/fence. Узкий useMoveContext применяет snapshot один раз на deliberate readId; unrelated successful revalidation с тем же ID не заменяет context. Свежий denial по-прежнему инвалидирует private data. Inline и direct entry используют один hook и общий Form. Matching receipt обновляет страницу и запрашивает новый context; explicit Refresh делает новый guarded read. | Lost204 и stale409 × inline/direct: unrelated Watch-shaped submission/router.revalidate не заменяет frozen version, retained selection/form node и disabled state; explicit Refresh обновляет version без POST replay. Real Chromium: actual committed Move→lost204→настоящий Watch POST и реальный private context revalidation→fence/draft/expectations сохранены→explicit Refresh; Move POST count1. |
| R4b-01 | Ordinary History не имела structural ChangeDetails. Новый небольшой renderer отображает только типизированные сохранённые before/after name/category/section/position/version/neighbor; primary target navigation через AdministrativeRouting. Никаких live source/current-name reconstruction/произвольного JSON. | Все8 actions × EN/RU/HE × full/recent component views; exact bigint strings, creation None, parents/neighbor, alternate resolver paths, unknown context excluded. Browser traverses actual ordinary full History всех8 original producers, проверяет bounded details/links/no source и recent Overview. |

Schema/migration/dependencies/grants/public readers/production config не изменены. Strong private HiddenInspection topic DTO получил только ordinary discriminator; четыре существующих typed visibility fixtures выровнены с ним. Existing writer lock order сохранён; новых mutex/permissions/DB infrastructure нет.

## Author regression/self-check

Причинные цепочки проверены самостоятельно по code/PLAN, а не приняты только по чужому verdict.

На исходном f601e91 воспроизводимо упали12 целевых regressions:
- 6 UI/History/inspector checks: generic403, lost Move through unrelated revalidation, Help eligibility, EN/RU/HE full/recent structural details;
- 4 CategoryPicker cases: controlled400/503 и ASCII/astral query bounds;
- 2 PostgreSQL cases: reserved destination classification и coherent ordinary discriminator.

Для диагностики временно возвращались только соответствующие source files; затем fixed bytes восстановлены в finally. Baseline failures не включаются в positive acceptance. На исправленном коде **169 related unit** (14 files) и **63 PG** (2 files) PASS; lint/typecheck/Worker build PASS. React checklist применён к effect dependencies/state preservation, stable component lifetimes, labels/keyboard/RTL, closed types и отсутствию новых browser dependencies.

Полный local Worker/Better Auth/PG17/Chromium/local-R2 прогон:18groups, pageErrors=[],external=[]. Первое расширение теста ошибочно потребовало private для публичного404; после сверки existing public no-store contract assertion исправлен на404/no-store/no-source, product code не менялся. После этого весь18-group прогон PASS. Local screenshots hidden Help/ordinary History просмотрены. Это scoped feature verification, не general UI/UX или owner visual sign-off.

WF-01/F6-01 и existing Editor DOM/undo/in-flight upload, receipts, original Owner History, hidden authority/privacy и retained bytes assertions проходят в том же whole-feature harness. Новых POST retries, optimistic mutation или external service calls нет.

## Exact-head connected artifact

[Whole-feature run45392540116](https://github.com/iliya1947/vico-forum/actions/runs/45392540116), job138439735327, artifact **14919557003 / forum-structure-whole-feature-connected**.

ZIP скачан; SHA256 совпал с GitHub digest `c806260da768253ff08837412cf80ac236f7a744a123f4c2b02b4287d5b6237a`; ZIP integrity/path checks PASS. Прочитан results.json:
- implementationSha = checkoutSha = 28064dfe51c2c62811dd5674387825a5f0289fd0;
- fullFeature=true,18groups;
- pageErrors=[],external=[].

Проверяемые effects выполняются production Worker через established CI-only wrapper, настоящие Better Auth sessions/PG17/local Miniflare R2 и Chromium. SQL задаёт fixtures/grants и наблюдает committed data; реальные Move/Watch/Help publication/Hide/403/History effects не подменены SQL. Remote R2/external DB/providers не используются.

## Exact-head CI и applicable acceptance

[CI45392525193](https://github.com/iliya1947/vico-forum/actions/runs/45392525193) SUCCESS:
- Checks:245 files/**3195 unit**, lint/typecheck/build/UI-preview, migration guard1 new0072/accepted history unchanged; Drizzle No schema changes.
- Successful checks first job138439683234; latest attempt metadata job138442424941 success. Source не менялся между attempts.
- Database latest job138442421103:118 files/**1833PG**, schema manifest75, runtime privilege/provisioning, credential diagnostic/recovery/bootstrap и все built Worker HTTP smokes PASS.
- Все18 applicable acceptance SUCCESS на том же exact, включая18-group whole-feature artifact:

- [SA05 whole Owner deactivation connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392539968)
- [Topic Bookmarks connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392540109)
- [Personal Mute/Block connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392539761)
- [SA06 native monitoring connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392540148)
- [SA07 Background Localization Files Data and Integrations connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392540232)
- [Forum structure whole-feature connected Chromium and local R2](https://github.com/iliya1947/vico-forum/actions/runs/45392540116)
- [SA-03 unified profile connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392540186)
- [SA-01 Super-admin connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392540291)
- [SA08 Overview and whole-program entry connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392539985)
- [AP-10 isolated browser acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392539867)
- [SA04-L3 connected authorization Owner Worker Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392540022)
- [SA04-J12 connected AccountState Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392540166)
- [Topic Watch connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392539986)
- [Own topic title connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392539719)
- [SA04-M2 connected AP10 Worker Chromium AccountState acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392539907)
- [SA04-S complete AccountState connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392539940)
- [SA04-N connected Complaints Worker Chromium AccountState acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392540106)
- [SA04-K5 connected attachment Worker R2 Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45392540085)

### Прозрачность retry evidence

Два старых harnesses потребовали по одному точечному повтору на неизменном exact:
1. SA04-K5 run45392540085: первый job138439734377 упал на check.py393, immediate len(editorOperationId)==36 до client useEffect initialization. Совпадает с уже установленной baseline f601e91 нестабильностью. Source пути не менялся в correction. Только failed job повторён; job138441852962 SUCCESS.
2. CI database: первый job138439682661 —1832/1833 PASS, один failed rollback-fails test в tests/database/sa05-owner-account-lifecycle.test.ts369/availableLocks71. Primary failure/no-commit checks прошли; немедленный FOR NO KEY UPDATE NOWAIT встретил55P03 после client.release(discard), до завершения socket/backend cleanup. Source Owner lifecycle/test не затронут пакетом; fixture использует isolated schema. Повторён только database job на том же head; job138442421103 SUCCESS,1833/1833 и последующие runtime checks PASS.

Ни source changes, ни sleeps, ни изменения timeout/assertions этих harnesses не вносились; successful current-task regressions не заменялись retry. Их нестабильность не выдаётся за исправленную этим пакетом. Остальные workflows успешны с первой попытки.

## Final self-check и передача

Final #379 exact28064df Draft/open/unmerged, base maina3dae58. GitHub metadata повторно проверена: intermediate #380/#381/#382/#383/#386 closed/superseded/merged=false; actual origin/main=a3dae5815e26d158c566a27c552127b4b1ab29aa. Никакого merge/force/deploy не выполнено.

Local preview остановлен; temporary wrangler config восстановлен byte-for-byte; synthetic vars/build vars, node_modules symlink и Python cache удалены. Disposable vico_f6_browser_test и vico_task6_corrective_test удалены; originally stopped PostgreSQL container снова stopped; own worktree clean.

**Лёва author STOP → Мира whole-feature coordinator review main→28064df (все118 files)** против canonical PLAN/S9/post-visibility и six-item correction. Предыдущий Lena HOLD не объявляется закрытым автором. После Mira PASS — **Lena independent re-review того же stable exact**, затем owner merge только после PASS. F7 separate docs после фактического merge. #342 only service/never merge; #300/#320/Stage6/general UI/UX/deploy inactive.
