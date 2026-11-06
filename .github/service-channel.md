# Admin panel — communication

Служебный PR: #251. Оперативное состояние: [workflow.md](./workflow.md).

## Актуальный baseline и review

- AP-01–AP-09 merged; current main / AP-10 base: `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`, migration head main 0057.
- AP-10 approved technical plan, coordinator PASS #6671217104; AP10-PLAN-MIRA-01..06 закрыты. Актуальный полный план сохранён в личном файле Лёвы; новые owner вопросы не открыты.
- Implementation PR #290, Draft/open/unmerged; reviewed exact head `9fecd925a256062e9892235f4ba02ed3147de1e3`, implementation migration 0058. Head проверен перед публикацией review.
- Coordinator whole-PR PASS на этом head завершён; AP10-MIRA-01..11 закрыты координатором.
- **Independent technical review Лёвы завершён: NOT PASS, единственный подтверждённый current-scope defect AP10-LEV-01 [P3].** [Отчёт и evidence](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6684522908).
- Exact-head CI #42213405436 и isolated browser #42213405385: SUCCESS. Это author CI, отдельно от собственного review evidence.
- Documentation PR #291 остаётся отдельным closeout artifact; этот implementation review не выдаёт ему approval.
- Implementation/docs не merged; production/Stage 6/owner visual acceptance не выполнялись.

## Решения владельца, обязательные для AP-10

- Мера — configurable child restriction set. Логические group checkboxes выбирают дочерние пункты; duration temporary/permanent независим от состава. Presets — только UI shortcuts.
- Catalog: create topics/Help, replies, new uploads, own published edits, public profile edits, Complaint reports, Help signals, translation generation. Для privileged target — соответствующие Forum/Help, Complaints, Security, Users/access administrative families с private reads и mutations.
- Public reading/login/session/notifications/own status и любые domain appeal submissions не входят в restriction catalog. Own solved/best answer и source-locale correction не выделяются отдельными punitive restrictions.
- Mandatory user-visible private reason: create, manual change restrictions/срока, explicit lift. Original reason не затирается; automatic expiry не создаёт synthetic reason/admin event.
- Self-target create/change/lift запрещён. Privileged moderator/admin target требует elevated authority; owner — верхняя authority и не target subordinate. Target/issuer hierarchy действует на create/change/lift, не hard-coded role names.
- Block appeal — отдельный domain exact measure, не Complaint/Complaint Appeal. До 3 последовательных submissions на measure, одновременно только одна pending. Право не отключается restrictions; own status/reason/appeal surface всегда доступна.
- Edit measure не меняет её identity/quota и не закрывает pending appeal; expiry/lift делают pending appeal утратившей предмет.
- Expiry/lift не изменяют role grants/overrides и возвращают только возможности, разрешённые актуальным RBAC/resource state.

## Последний управляющий — решение владельца

- Принцип сохранения хотя бы одного доступного access manager не применяется при дальнейших planning/review/enforcement админ-панели. В AP-10 нет manager-count veto, специального recovery/lockout слоя или требования сохранить доступного управляющего.
- Existing `AuthorizationLockoutError` / `managers_ever_existed` / counts до завершения админ-панели не переделывать. Затем отдельная очистка кода/схемы/тестов/контрактов и owner-role design.
- Старые условные формулировки source-of-truth не становятся AP-10 requirement вопреки прямому решению владельца.
- Не смешивать block appeal с Complaint-подобным пересмотром violation или отдельным owner recovery subsystem.


## Остальные обязательные owner decisions AP-10

- Разные нарушения создают разные measures с независимыми identity/reason/restrictions/lifecycle/History/quota. Одновременно активные меры допустимы; действие запрещено при наличии применимой активной restriction (EXISTS). Lift/expiry A не снимает effect B.
- До 3 последовательных appeals на exact measure, одновременно не более одной pending. Accepted appeal может снять либо изменить restrictions/срок той же active measure, сохраняя identity/quota и атомарный History/outcome.
- Expired/lifted measure terminal: продление/возобновление запрещены; повторное наказание — новая measure.
- User-facing measure/appeal/status/timeline не раскрывают concrete actor/issuer/reviewer ID/name или private internal History context. Identity остаётся в authorized internal History.
- Обе block-management capabilities имеют zero initial grants у всех built-in roles, включая admin/moderator. Права только explicit dynamic grants/overrides. Owner binding сам по себе права не выдаёт.

## AP10-LEV-01 [P3] — единый correction finding

- Same-origin actual authenticated manager POST `/en/admin/measures` с valid create UUID/reason/restriction и urlencoded `targetId=invalid%00target` получает **500**. Correctly formed missing target даёт **404**. 0 новых measure/History и private/no-store в обоих случаях.
- Причина подтверждена отдельно domain→PG probe: create action использует только measureFormText, service identity() не запрещает NUL, lockTarget передаёт text parameter; PostgreSQL 22021 вместо typed invalid input.
- Lookup validator measureTargetId уже запрещает NUL/oversized target; write boundary с ним расходится.
- Scope исправления: локальная bounded target-ID validation на create HTTP/domain boundary; typed InvalidUserMeasureInputError → 400 до DB; focused malformed-input/no-state-no-History regression. Не маскировать произвольные SQL/programming failures и не расширять authz/schema.
- Привилегии не обходятся, данных не записывается; severity низкая. Других подтверждённых current-scope defects в whole-scope sweep нет.

## Независимое evidence Лёвы на exact head

- Detached checkout, Node 24.21.0 / pnpm 12.3.4, disposable loopback PostgreSQL 17.
- 78/78 native PostgreSQL tests (5 files), 288/288 application/route/UI/Worker tests (19 files), 3 metadata/runtime-privilege/migration-history scripts PASS; build PASS.
- Собственный actual Chromium→Worker→Better Auth→PostgreSQL rerun repository acceptance: 18 case groups PASS; EN/RU/HE × 320/768/1280, 0 layout/page errors/external browser requests. Environment adapter вне implementation tree.
- Дополнительные independently written HTTP/domain probes подтвердили AP10-LEV-01 несмотря на green штатных проверок.
- Локальные logs/reproducer/browser JSON/screenshots: `/workspace/work/ap10-review-evidence/`; полная воспроизводимая цепочка в linked report.
- Реализацию во время review не менял; tracked checkout чист. Локальный Worker остановлен, одноразовая БД удалена, dummy .dev.vars удалён.
- Deployed/production acceptance и owner visual acceptance из этих результатов не следуют.

## Следующий шаг

- **Мира:** принять один bounded finding AP10-LEV-01 и передать Лире correction PR #290 с полным контекстом linked report.
- После исправления/нового stable exact head и applicable checks — новый coordinator cycle, затем independent technical review того же head.
- Лёва review завершил и сам реализацию не исправляет; Марк не назначен.
- Documentation PR #291 — отдельный review/closeout; AP-11/Settings, owner-role/last-manager cleanup и production/Stage 6 не начинать в рамках этой correction.

Общий утверждённый контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).


## AP-10 bounded correction AP10-LEV-01 — Лира

Исполнитель: **Лира**. Implementation PR: **#290**. Reviewed exact head: `9fecd925a256062e9892235f4ba02ed3147de1e3`.

Независимый review Лёвы завершён NOT PASS с одним finding `AP10-LEV-01 [P3]`. Мира перепроверила причинную цепочку и current-scope применимость: finding подтверждён.

### AP10-LEV-01 — malformed create targetId должен давать controlled 400, а не PostgreSQL 500

Фактическая проблема:
- canonical POST `/:locale/admin/measures` принимает `targetId` из form data и передаёт его в AP-10 create path;
- lookup-boundary уже валидирует target ID и запрещает NUL/недопустимый размер, но create path использует более слабую identity validation;
- NUL-containing target ID проходит domain input validation и доходит до PostgreSQL text parameter, где возникает low-level database error вместо typed invalid-input result;
- наблюдаемый HTTP outcome — 500; корректно сформированный, но отсутствующий target остаётся 404;
- measure/History при этом не создаются.

Требуемый результат:
1. Malformed client-supplied target ID на create boundary, включая подтверждённый NUL case, отклоняется как typed invalid input до DB и даёт private/no-store HTTP 400.
2. Valid-but-missing target продолжает давать 404.
3. Неизвестные SQL/programming failures не маскируются общим 400.
4. Session actor authority, target hierarchy, measure lifecycle, History, schema/permissions и read boundaries не меняются.

Критерии готовности:
- локальное исправление в текущем AP-10 scope без новой архитектуры, schema/migration/dependency changes;
- focused regression воспроизводит malformed NUL target на create path и подтверждает 400 + отсутствие measure/History side effects;
- существующие valid create, missing target 404, authorization/issuer-floor/privacy/replay invariants не регрессируют;
- applicable exact-head CI/checks и AP-10 isolated browser acceptance выполняются на новом stable head;
- #291, AP-11/Settings, owner-role/last-manager cleanup, Stage 6 и production не трогать;
- после завершения Лира фиксирует новый stable implementation head и фактические результаты проверок в служебном PR и останавливается. Затем Мира начинает новый coordinator cycle; Лёва повторно проверяет только после coordinator PASS.
