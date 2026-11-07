# Admin panel — communication

Служебный PR: #251. Оперативное состояние: [workflow.md](./workflow.md).

## Актуальный baseline и Stage1 review

- Current main/base: `bcf02193f82aa0d448444c6943d6ebdcf09f7896`, migrations main0000–0058.
- Ordinary Admin Panel AP-01–AP-11 fully closed; Settings deferred.
- Owner/authorization redesign Stage1 implementation PR #294 Draft/open/unmerged.
- Reviewed exact head: `e3604222ae8cecb4b1f2f94cdd5d7e9f76c15e61`; implementation migration0059.
- Approved technical plan: #6700603167. Coordinator whole-PR PASS + **independent technical PASS** на одном exact head.
- [Independent report #6701647394](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6701647394); confirmed current-Stage1 defects не осталось.
- Exact-head CI #42328843126 и browser #42328843151 SUCCESS; author CI отдельно от собственных reruns.
- Implementation не merged; отдельный factual docs closeout ещё не принят. Stage1 целиком пока не closed.
- Production/Stage6 и owner visual acceptance не выполнялись.

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
- Админ-панель завершена; owner явно назначил Stage1 удаления `AuthorizationLockoutError` / `managers_ever_existed` / counts. Прежнее ожидание окончания админ-панели выполнено. Mutex сохраняется; owner authority implementation остаётся отдельным этапом.
- Старые условные формулировки source-of-truth не становятся AP-10 requirement вопреки прямому решению владельца.
- Не смешивать block appeal с Complaint-подобным пересмотром violation или отдельным owner recovery subsystem.


## Остальные обязательные owner decisions AP-10

- Разные нарушения создают разные measures с независимыми identity/reason/restrictions/lifecycle/History/quota. Одновременно активные меры допустимы; действие запрещено при наличии применимой активной restriction (EXISTS). Lift/expiry A не снимает effect B.
- До 3 последовательных appeals на exact measure, одновременно не более одной pending. Accepted appeal может снять либо изменить restrictions/срок той же active measure, сохраняя identity/quota и атомарный History/outcome.
- Expired/lifted measure terminal: продление/возобновление запрещены; повторное наказание — новая measure.
- User-facing measure/appeal/status/timeline не раскрывают concrete actor/issuer/reviewer ID/name или private internal History context. Identity остаётся в authorized internal History.
- Обе block-management capabilities имеют zero initial grants у всех built-in roles, включая admin/moderator. Права только explicit dynamic grants/overrides. Owner binding сам по себе права не выдаёт.



## Owner decision — Settings sequencing and AP-11 handoff

- Владелец выбрал: **Settings откладывается в отдельную будущую фазу**.
- Последовательность зафиксирована: **AP-11 → owner/authorization redesign → отдельный Settings package**.
- AP-11 закрывает integration/factual closeout фактически delivered ordinary-admin scope **AP-01–AP-10**. Settings placeholder не является blocker или current-scope defect AP-11; AP-11 не проектирует Settings operations/storage/API.
- После AP-11 отдельно выполняется уже зафиксированная owner/authorization model redesign; Settings проектируется только после неё, чтобы его permissions и owner-only boundaries опирались на целевую hierarchy.



## Owner decision — current Stage1 boundaries

- Удаляется только obsolete last-manager: AuthorizationLockoutError/countManagers/managers_ever_existed/dedicated veto checks/tests.
- authz_mutation_lock как shared mutex сохраняется: singleton row/id=1, table/PK/CHECK, FOR UPDATE, SELECT+UPDATE runtime privilege и lock probe.
- Fresh authorization/AP-10 authority/elevated-key/issuer-floor guards и atomic History сохраняются.
- Owner authority implementation, mutex redesign/removal, Settings и super-admin UI не входят в Stage1.
- Изменения уже реализованы и проверены в PR #294; current main до merge остаётся прежним.

## Подтверждённый independent result

- Whole21-file diff проверен. Active runtime/count/error/flag veto удалены без замены другим manager-preservation mechanism.
- Допустимые self-revoke/role/grant changes committed с обычной History; следующий fresh request actor denied. Failed History всё ещё rollback.
- 0059 drops только managers_ever_existed; snapshot/manifest/schema/journal согласованы, accepted0000–0058 unchanged.
- Route assigned-role409 и EN/RU/HE copy/fingerprint сохранены без ложного lockout текста.
- Browser self-revoke выполняется в конце History flow; AP-10/AP-11 regression и изолированные DB fixtures сохранены.
- Current docs clauses обновляются отдельным closeout, historical artifacts не переписываются.

## Собственное evidence Лёвы

- Node24.21.0/pnpm12.3.4, disposable loopback PostgreSQL17.
- 23/23 unit/route/UI + 112/112 native PostgreSQL tests PASS; build и 3 metadata script suites PASS.
- Real controlled mutex wait/fresh authority и History rollback подтверждены PostgreSQL.
- Independently written upgrade-probe поверх полной populated0058 schema для false/true: payload9 relations и mutex row/PK/CHECK preserved.
- Actual Chromium→Worker→Better Auth→PG: History35 cases и AP-10/AP-11 34 cases PASS; нет page errors/external requests/layout failures в применимой матрице.
- Local evidence: `/workspace/work/stage1-review-evidence/`; History JSON не пишет SHA, привязка подтверждена exact checkout/build/command/report. AP-10 JSON пишет implementationHead.
- Implementation не менялся; tracked checkout чист. Worker остановлен, disposable DB/container и dummy vars удалены.

## Следующий шаг

- **Мира:** принять independent PASS #6701647394; readiness и отдельный factual documentation closeout Stage1. Implementation/docs merge выполняет владелец.
- Active last-manager source-of-truth clauses синхронизировать с принятым owner decision, не возвращать отменённый принцип и не добавлять owner authority в этот пакет.
- Stage1 целиком закрывается после implementation/docs acceptance/merge; дальнейшие owner/mutex/Settings stages отдельно.
- Лёва review завершил и остановился; изменение implementation head требует coordinator-first cycle. Марк не назначен.
- Stage6/production и owner visual acceptance вне scope.

Общий контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).
