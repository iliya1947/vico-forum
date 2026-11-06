# Лёва — AP-11 independent technical review: PASS

Текущее назначение выполнено: PR #292 exact head `3f608ce9a042fd7c78401d330f5865af4f3dee5c`, independent PASS. [Отчёт](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6689555134). Реализацию не менял; следующий шаг — Мира: отдельный factual documentation closeout; merge выполняет владелец.

Лёва — independent technical review AP-11 / PR #292: **PASS**.

Exact head: `3f608ce9a042fd7c78401d330f5865af4f3dee5c`; base/main `7b452edfc0a759b4b65cd1cc535f207bb9e615c7`. Review выполнен самостоятельно, без запуска других агентов и без изменения implementation.

Проверены все **4 changed files**, полный diff к main и применимые связи с approved AP-11 plan #6686478629, current contract/Stage и existing Editor/authorization/History behavior. Coordinator PASS не использован как доказательство.

### Вывод по реализации и verification scope

- **Reply denial/revalidation:** intent фиксируется в submit handler до возможного fast 403; fresh-denial guard блокирует publication уже на render отказа, отдельный state удерживает блокировку до завершения explicit loader refresh. Обновление идемпотентно относительно actionData; automatic POST replay отсутствует. Revalidation не заменяет server guard.
- Исходный completion effect очищает publication ref после отказа, но не снимает новый refresh latch. Publish/native form submit и keyboard publication используют актуальный publicationDisabled; новый Attach временно запрещён. Editor text/operation остаются mounted, Cancel доступен. allowNewUploads меняет возможность добавления/retry, но не abort уже выполняющихся uploads: abort связан с identity/unmount/reset.
- **Users layout:** добавление существующего profile-identity-copy локально использует flex/min-width/word wrapping; не меняет projection/permission/authorization protocol.
- **Connected Users:** same-session read-only → canonical explicit grant → inline assignRole/override → DB/History → canonical revoke → stale POST 403/read-only recovery/no state write → canonical restore. Тестируемый permission lifecycle больше не заменён SQL. SQL используется для synthetic setup/inspection.
- **Closure × measures:** реально исполняются open+measure, closed+measure, reopened+measure, closed+lifted и open+lifted. Снятие одного запрета не снимает другой; denial не создаёт posts/History, closure CAS/History независимы.
- **Privacy/evidence:** protected document/direct denial helper проверяет обе cache directives private и no-store; public topic GET остаётся отдельным. Existing own measure identity allowlist/AP-10 cases сохранены. Новые Users detail/admin topic проверены EN/RU/HE × 320/768/1280.
- Нет schema/migration/permission/grant/dependency/owner-policy changes. Локальные app edits обоснованы выявленным connected runtime behavior. Last-manager принцип не распространён; его legacy code не менялся.

Подтверждённых current-scope defects в полном AP-11 scope не найдено. AP11-MIRA-01..04 по собственной проверке закрыты.

### Собственное evidence на exact head

- Node 24.21.0 / pnpm 12.3.4.
- **128/128 DOM/route/UI tests**, 6 файлов, включая regression с намеренно pending revalidation после 403: form/operation retained, Publish и Attach disabled, Cancel enabled, repeat submit не выполняется; свежий snapshot завершает recovery.
- Собственная build PASS.
- Одноразовая loopback PostgreSQL **17**, полные migrations **0000–0058**, built Worker, настоящие Better Auth sessions, установленный Chromium.
- Заново исполнен repository browser acceptance с environment-only adapter вне implementation tree: **34 case groups PASS**, 0 layout failures, 0 page errors, 0 external browser requests; results.json содержит точный implementationHead.
- Browser assertions проверяют реальные UI/canonical POST, PostgreSQL state/versions/History и no-write; closures/grants/measures не mock. Existing 19 AP-10 groups сохранены.
- Exact-head GitHub **CI #42245766359 SUCCESS** и **isolated Chromium #42245766263 SUCCESS** подтверждены отдельно; author CI не выдан за собственный прогон.

Локальные logs/JSON/screenshots: `/workspace/work/ap11-review-evidence/` (application.log, build.log, worker.log, browser.log, browser/results.json и screenshots). Новых exhaustive native race/receipt tests не добавлял: db/server semantics не менялись, их existing full CI остаётся отдельным evidence. Связанный scope достаточен для approved bounded AP-11; это не полный новый UI/UX audit или production acceptance.

**Следующий шаг — Мира:** принять independent PASS и перейти к отдельному factual documentation closeout AP-11 по плану; implementation merge выполняет владелец. После завершения AP-11 отдельные следующие задачи: owner/authorization redesign → Settings. Settings, redesign, Stage 6/production и owner visual acceptance этим review не выполнялись и не одобрены.

Лёва назначенную проверку завершил и останавливается. Implementation frozen; изменение head требует нового coordinator-first cycle.

Head/main перепроверены перед публикацией. Просмотрены собственные narrow screenshots Users detail EN и admin topic EN/HE. Локальный Worker остановлен, одноразовая БД и dummy .dev.vars удалены; tracked checkout чист.


---

## Утверждённый технический план и предыдущий контекст

Статусы ожидания plan review ниже исторические; план утверждён, implementation review завершён PASS на head выше.

# Лёва — AP-11 technical planning

Текущее назначение выполнено: [план AP-11](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6686478629) на main `7b452edfc0a759b4b65cd1cc535f207bb9e615c7`. Требуется coordinator review Миры; implementation не начинался.

Лёва — AP-11 technical plan для coordinator review.

Baseline: current main `7b452edfc0a759b4b65cd1cc535f207bb9e615c7`, migrations 0000–0058. AP-10 implementation #290 и docs #291 merged. Результат этого шага — план, не реализация и не новая acceptance. Implementation PR AP-11 не создавался.

## 1. Вывод и bounded scope

Подтверждённого product/code defect по выполненной planning inspection не установлено. AP-11 не требует новой domain functionality, permissions, schema/migrations, runtime grants или product UI.

Выявлен **один verification gap**: нет repository-owned связанного actual-browser сценария, который проходит AP-07/08 protected topic/closure и AP-09 Users inline management вместе с уже проверенными AP-10 restriction/revalidation/History paths на одном current runtime. Это ограничение покрытия, не доказательство неисправности и не основание объявить прежние пакеты непринятыми.

Предлагаемый AP-11: небольшой **test/verification-only implementation PR**, затем отдельный factual docs closeout. Не создавать пустой application-code PR ради номера этапа. Если при исполнении обнаружится реальный дефект — сначала подтвердить полную цепочку, затем согласовать локальное исправление; заранее app/db файлы в change list не включать.

Scope по решению владельца — только delivered AP-01–AP-10. **Settings отложен; последовательность AP-11 → owner/authorization redesign → отдельный Settings package.** Settings placeholder не defect/blocker AP-11. Last-manager правило не применяется как новое требование; legacy code/tests и redesign сейчас не менять.

## 2. Что уже покрыто и почему не нужно проверять всё заново с нуля

| Delivered boundary | Проверенное наличие evidence в current repo | Остаток AP-11 |
| --- | --- | --- |
| AP-02/03/04 shell, Overview, Roles, History | tests/browser/admin-overview, admin-history; app/admin/overview/history и authorization route tests; native admin-overview/admin-history/authorization-snapshot | Существующие suites сохраняются; новый связанный сценарий использует тот же shell/History, без нового Overview или RBAC |
| AP-05/06/07 Quick actions и Forum hierarchy | tests/browser/quick-actions и admin-forum; app/routes/admin-topic.test.ts, app/admin/message-quick-actions.test.tsx, native admin-forum/forum-admin-history | В новом flow пройти hierarchy до protected topic и вызвать существующий canonical action из admin context |
| AP-08 closure/CAS/replay/editor | native topic-closure.test.ts и topic-closure-races.test.ts; app/admin/topic-closure-ui.test.tsx и public-read.test.tsx | Actual browser: admin close/reopen → уже открытый public reply editor → AP-10 reply restriction; отсутствует в имеющихся browser scripts |
| AP-09 Users / inline authorization | app/routes/admin-users*.test.ts, app/admin/users-authorization.test.tsx; native admin-users/admin-users-authorization | Actual browser: Users lookup/detail → inline canonical assignment/override → fresh revoke/read-only recovery; отсутствует в имеющихся browser scripts |
| AP-10 measures/appeals/enforcement/privacy | tests/browser/user-measures/check.py; 5 native AP-10 files и route/DOM tests; собственный PASS #6685133377 | Сохранить действующие 19 case groups; добавить только межпакетные связи из §3 |

Метод: прочитаны current PROJECT.md/PROJECT_STATE.md, профильный AP-10 contract/docs delta #291, service owner decisions, реализация Users controls и existing harness/test cases. Поиск closeTopic/reopenTopic и /admin/users в repository browser harnesses не нашёл соответствующего connected positive flow. user-measures browser проверяет 403/последующий GET Users/Forum и standalone measures/History; он **не** выполняет Users inline submit или topic close/reopen. PROJECT_STATE прямо не заявляет отдельный AP-08/AP-09 package browser flow. Route/DOM/native evidence остаётся действительным; browser отсутствие не выдаётся за отсутствие всей проверки.

Это bounded integration verification текущего AP-11, не новый обязательный browser/owner-visual gate для каждого пакета и не полный UI/UX/release audit.

## 3. Минимальные добавленные connected cases

### A. Users → canonical authorization → History → свежая session presentation

1. На synthetic user с только Users-read открыть через shell Users index/search и выбранный detail. Public identity доступна; email/full authorization state/management forms отсутствуют. Прямой canonical management POST запрещён.
2. Уже authorized fixture manager выдаёт этому reviewer `access.authorization.manage` через существующий management UI/canonical writer. На следующем read **той же Better Auth session**, без login, detail показывает targeted controls.
3. Выполнить из inline detail реальный assignRole/override для другого synthetic target. Проверить сохранение URL/detail, актуальный result, DB assignment/override и ровно соответствующий History delta. Не трогать elevated key/role switch с ним: AP-11 не проектирует новые owner powers.
4. Открыть inline form, другой authorized actor отзывает management grant, сохранив Users-read. Fresh stale submit → 403, однократное GET/revalidation → read-only detail, без автоматического повторного POST и без лишних History/state changes. Затем отдельно revoke Users-read → fail-closed direct detail.
5. Проверить blocks-only admission: нет broad Users/authorization directory, exact measures lookup сохраняет собственный gate. Это не создание новой комбинации прав, а проверка существующего разделения.

### B. Forum hierarchy / Quick action → closure × measure admission

1. Через Forum category → section → protected topic открыть существующую ordinary topic fixture. Public actor заранее открывает reply editor и вводит buffer. Использовать существующие topic Quick actions, не новый admin writer.
2. Close из admin topic: public revalidation показывает Closed, тот же mounted reply buffer/operation сохраняется, Publish/keyboard запрещены, Cancel доступен; crafted fresh reply получает controlled topicClosed 409.
3. Сочетание с независимой AP-10 replies restriction проверить по простой матрице: open+measure → forbidden; closed+measure → fresh reply запрещён; lift measure при closed **не** разрешает reply; reopen при оставшейся measure **не** разрешает reply; open без measure разрешает новый explicit reply.
4. Для двух порядков снятия можно использовать две small topic fixtures либо последовательный reset через реальные actions. Не менять frozen policy/CAS semantics. Не требовать конкретный приоритет error code при одновременно действующих двух запретах; важен no-write и соответствующий ответ после снятия одного из них.
5. PostgreSQL и protected History подтверждают реальные closure/measure transitions: существующие versions/reasons/target IDs; failed/stale/replay не создают новых effects. Ранее принятые receipt replay/close races/attachment cleanup проверяются существующими native suites, не дублируются новой системой race simulation в browser.
6. Accepted appeal/lift, own identity-safe projection и независимость нескольких measures остаются действующими AP-10 cases. Новых appeal rules, moderation actions или user UI не добавлять.

### C. Общая оболочка, privacy и locale

- У связанного flow правильные locale links, одна shell/main, current destination и защищённые document/data responses private/no-store.
- На Users detail и admin topic, которых нет в нынешней AP-10 reflow matrix, проверить EN/RU/HE × 320/768/1280: читабельность, отсутствие horizontal overflow, доступность основных controls/keyboard. Не перезапускать визуальный аудит всех ранее принятых страниц.
- На read-only Users serialized loader/.data не должно появляться management/email snapshot; own measures по-прежнему не содержат actor/reviewer identity. У authorization-manager email из прежней authorized subset не объявлять новой утечкой: проверять именно Users-read-only projection.
- Любая новая UI проблема сначала диагностируется; никаких профилактических CSS/refactoring changes.

## 4. Конкретный change list и runtime

Основной выбор — расширить **существующий** `tests/browser/user-measures/check.py` секциями §3, reuse его signup/sql/document/post/fixtures/assertions. Сохранить 19 AP-10 groups; не копировать весь runner в новый framework. Небольшой локальный helper допустим только для читаемости повторяющихся browser interactions.

`.github/workflows/ap10-browser.yml`: reuse существующего disposable PostgreSQL 17 + built Worker + synthetic Better Auth/owner binding + Chromium job и artifact. Допустимо уточнить display name как admin-panel integration и bounded paths для затронутых admin Users/topic/authorization consumers. Не создавать второй параллельный job с той же полной AP-10 матрицей или включать production/OAuth/provider resources. Сама filename AP-10 может остаться ради минимального diff.

Runtime: pinned Node 24.21.0/pnpm 12.3.4, full migrations through0058, только loopback *_test DB, три synthetic actors либо минимально необходимый дополнительный isolated actor. Fixture grants явные; обе block capabilities без default grants. Signup sequential; не запускать одновременно другие signup probes, чтобы штатный limiter не исчерпывался тестами. Не отключать limiter/permission enforcement. Initial identity/grants/data setup через fixture SQL допустим; **операции, которые проверяет сценарий, выполняются через настоящий UI/canonical HTTP**, не подменяются SQL updates.

Raw results/JSON/screenshots включают exact implementation SHA, executed cases и failures; fixture cleanup/остановка Worker/DB обязательны. Сравнение state/History привязывать к run IDs, а не требовать абсолютного глобального count, чувствительного к соседним fixture actions.

Application files `app/admin/users.tsx`, `app/routes/admin-user.tsx`, `app/routes/admin-topic.tsx`, `app/admin/quick-actions.tsx`, `db/forum-repository.ts`, `db/user-measure-policy.ts`, `db/authorization-repository.ts` — **verification targets, не заранее назначенные edits**. Схема, grants, dependencies, public contracts не меняются. Новые unit/native tests добавлять только если подтверждённый gap не проверяется связанным flow/существующими suites.

## 5. Checks, handoff и factual closeout

Implementation PR acceptance:
- test/verification diff ограничен §3/4; все новые assertions исполняются, не skipped/mocked;
- исходные AP-10 cases и новые cross-package cases проходят на одном stable exact head с actual session/Worker/DB; implementation SHA в evidence проверен;
- existing full CI: lint/typecheck/application/native PostgreSQL/build/UI preview/migration history/Drizzle parity/manifest/runtime privilege/provisioning/Worker smoke — green;
- connected behavior checked, Settings явно остаётся deferred, ни одного подтверждённого current-scope дефекта не остаётся;
- Лира фиксирует stable PR/head/evidence в #251 → Мира whole-PR review → Лёва independent review того же head → owner merge. Марк не назначен.

Не нужно rerun всех legacy opt-in browser harnesses/fault injections или полный exhaustive permissions×locale×actions cross-product: уже существующие meaningful tests покрывают эти boundaries; AP-11 закрывает конкретную связь. Проверки старого last-manager invariant могут оставаться в неизменённом legacy suite, но не становятся новым acceptance requirement AP-11.

Отдельный documentation PR **после принятой реализации**:
- `PROJECT_STATE.md`: AP-11 фактически завершён только после evidence/review; ближайший маршрут owner/authorization redesign → отдельный Settings package; не писать «все Settings реализованы» или «production ready»;
- `docs/ADMIN_PANEL.md`: delivered AP-01–AP-10 integration closeout и явная граница deferred Settings по owner decision;
- `ROADMAP.md`: согласовать ближайший ordinary-admin маршрут, не возобновлять Stage6;
- завершённый exact-head evidence snapshot в текущем `docs/PROJECT_HISTORY/PROJECT_HISTORY_12.md` либо следующем файле по принятому размеру, и индекс `docs/PROJECT_HISTORY/PROJECT_HISTORY.md`;
- `docs/auth/AUTHORIZATION.md` и code/schema counts сейчас не переписывать; эта очистка относится к следующей отдельной задаче.
Общие service files #251 обновляются как координация; это не project documentation PR и не merge в main.

## 6. Решение на review

Предлагается один bounded test/verification PR + отдельный docs closeout. Новых owner product decisions не требуется. **Мира:** проверить необходимость и достаточность именно этих connected cases и границы AP-11; после approval назначить Лиру. Если выбранные assertions уже доказуемо покрыты существующим connected runtime evidence, убрать дубль, а не наращивать матрицу.

Planning inspection не является полным аудитом документации, новым implementation PASS или выполненной AP-11 acceptance. Код/БД/runtime/production не менялись; реализацию не начинал.


## Предыдущий завершённый этап

AP-10 implementation #290 и docs #291 merged. Собственный repeated independent PASS на exact head ef313919: https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6685133377 . AP10-LEV-01 закрыт; planning AP-11 не переоткрывает принятые AP-10 requirements.
