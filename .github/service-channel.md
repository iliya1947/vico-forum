# Admin panel — communication

Служебный PR: #251. Оперативное состояние: [workflow.md](./workflow.md).

## Актуальный baseline и review

- AP-01–AP-09 merged; current main / AP-10 base: `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`, migration head main 0057.
- AP-10 technical plan approved; AP10-PLAN-MIRA-01..06 закрыты.
- Implementation PR #290, Draft/open/unmerged; **reviewed exact head `ef313919f6613c54db6ddb50765c968744101306`**, migration 0058.
- Coordinator whole-PR PASS на этом head завершён.
- **Repeated independent technical review Лёвы: PASS**, [отчёт #6685133377](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6685133377). Подтверждённых current-scope defects не осталось; AP10-LEV-01 закрыт.
- Exact-head CI #42218475676 и isolated browser #42218475943: SUCCESS; author CI отдельно от собственных review reruns.
- Documentation PR #291 — отдельный Draft closeout artifact, не получает approval данным implementation verdict.
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


## Закрытие AP10-LEV-01

- Create HTTP и direct service валидируют target identity до repository/SQL: NUL и >2048 UTF-8 bytes → typed invalid input.
- Собственный original HTTP reproducer на новом Worker: NUL → private/no-store 400, valid missing target → 404, 0 measure/History writes.
- Собственный direct service probe: три malformed input → InvalidUserMeasureInputError, 0 repository calls; 2048-byte valid input проходит validation. Unknown SQL/programming failures не маскируются.
- Вся 5-file correction delta проверена; schema/permissions/authority/enforcement/privacy/lifecycle/History/replay/Editor boundaries не менялись.

## Независимое evidence на ef313919

- Node 24.21.0 / pnpm 12.3.4, одноразовый PostgreSQL 17 с migrations 0000–0058.
- 289/289 application/domain/route/UI/Worker tests (19 files) и 78/78 native PostgreSQL tests (5 AP-10 files); собственная build PASS.
- Actual Chromium→built Worker→Better Auth→PostgreSQL: 19 case groups PASS; malformed target/no writes, measures/appeals/admin families/overlap/stale revalidation, EN/RU/HE × 320/768/1280. 0 layout failures/page errors/external browser requests.
- Первый browser attempt получил штатный signup 429 из-за параллельной собственной регистрации; затем отдельный прогон на очищенном rate-limit state disposable fixture прошёл. Application limiter не менялся.
- Evidence: `/workspace/work/ap10-review2-evidence/`; original reproducer сохранён в `/workspace/work/ap10-review-evidence/`.
- Предыдущий полный собственный scope review #6684522908 использован как проверенная база; новая delta и все существенные AP-10 boundaries повторно оценены, основные domain/route/UI/native/browser checks исполнены на новом head. Coordinator verdict не использовался как доказательство.
- Реализацию не менял; tracked checkout чист. Worker остановлен, disposable DB и dummy .dev.vars удалены.

## Следующий шаг

- **Мира:** принять independent PASS #6685133377 и завершить readiness/отдельный documentation closeout #291 по рабочему процессу; merge выполняет владелец.
- Лёва назначенную проверку завершил и останавливается. Любое изменение implementation head требует нового coordinator-first review cycle.
- Documentation #291, owner visual acceptance и production/deployed acceptance не одобряются автоматически данным review.
- AP-11/Settings и post-admin owner-role/last-manager cleanup не начинались; Марк не назначен.

Общий контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).


## AP-10 implementation readiness after repeated independent PASS

- Repeated independent technical review Лёвы завершён **PASS** на неизменном implementation exact head `ef313919f6613c54db6ddb50765c968744101306`; подтверждённых current-scope defects не осталось.
- Coordinator PASS и independent PASS относятся к одному exact head. PR #290 остаётся Draft/open/mergeable; implementation после review не менялся.
- **Implementation #290 готов к owner merge.** Merge выполняет владелец.
- Documentation PR #291 отдельно проверен на readiness до merge implementation. Он создан раньше финального review cycle и содержит фактически устаревшее current-state wording: `PROJECT_STATE.md` и PR body всё ещё говорят, что AP-10 ожидает coordinator/independent review; history file фиксирует pre-review snapshot. Это не implementation defect #290.
- #291 не следует merge в текущем виде как финальный closeout. После фактического merge #290 Мира должна обновить documentation branch относительно нового `main`, зафиксировать AP-10 как merged repository state, сохранить значимую correction/review chain в PROJECT_HISTORY, проверить permanent contracts и выполнить applicable docs/CI review. Только после этого #291 готовится к owner merge.
- AP-11/Settings, post-admin owner-role/last-manager cleanup, Stage 6 и production не начинать.
