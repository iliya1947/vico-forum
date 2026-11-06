# Admin panel — communication

Служебный PR: #251. Оперативное состояние: [workflow.md](./workflow.md).

## Актуальный baseline и review

- AP-01–AP-10 merged and AP-10 documentation closeout merged; current `main`: `7b452edfc0a759b4b65cd1cc535f207bb9e615c7`, migration head 0058.
- AP-10 technical plan approved; AP10-PLAN-MIRA-01..06 закрыты.
- Implementation PR #290 merged 2026-11-06; reviewed exact head `ef313919f6613c54db6ddb50765c968744101306`, merge commit `03c505370f44fa2640a489b647fba3929219093f`.
- Coordinator whole-PR PASS на этом head завершён.
- **Repeated independent technical review Лёвы: PASS**, [отчёт #6685133377](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6685133377). Подтверждённых current-scope defects не осталось; AP10-LEV-01 закрыт.
- Exact-head CI #42218475676 и isolated browser #42218475943: SUCCESS; author CI отдельно от собственных review reruns.
- Documentation PR #291 merged 2026-11-06; exact docs head `cabdd7d034bdd26f00fa67446b236f42c1c9a7ef`, merge commit `7b452edfc0a759b4b65cd1cc535f207bb9e615c7`; exact-head CI #42222511348 SUCCESS.
- AP-10 implementation и documentation closeout merged; AP-10 closed. Current stage: AP-11 technical plan на coordinator review. Production/Stage 6/owner visual acceptance не выполнялись.

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

Общий контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).


## Owner decision — Settings sequencing and AP-11 handoff

- Владелец выбрал: **Settings откладывается в отдельную будущую фазу**.
- Последовательность зафиксирована: **AP-11 → owner/authorization redesign → отдельный Settings package**.
- AP-11 закрывает integration/factual closeout фактически delivered ordinary-admin scope **AP-01–AP-10**. Settings placeholder не является blocker или current-scope defect AP-11; AP-11 не проектирует Settings operations/storage/API.
- После AP-11 отдельно выполняется уже зафиксированная owner/authorization model redesign; Settings проектируется только после неё, чтобы его permissions и owner-only boundaries опирались на целевую hierarchy.

### AP-11 technical planning — Лёва

Задача: подготовить технический план **AP-11 / Package 8 — integration and factual closeout delivered AP-01–AP-10 scope** на актуальном `main` `7b452edfc0a759b4b65cd1cc535f207bb9e615c7`.

Требуемый результат:
- определить минимальный bounded implementation/verification scope AP-11;
- проверить, какие integration/acceptance gaps действительно остаются между уже merged AP-01–AP-10 mechanisms;
- отделить реальные current-scope gaps от уже закрытого evidence и будущих задач;
- определить конкретные files/modules/checks, которые AP-11 должен затронуть, если изменения вообще нужны;
- сформировать критерии готовности implementation PR и последующего review cycle.

Границы:
- Settings исключён из AP-11 и остаётся будущей фазой после owner/authorization redesign;
- owner/authorization redesign, Stage 6, production rollout и owner visual acceptance не входят;
- не предполагать заранее, что AP-11 обязательно требует code changes: сначала установить фактические integration gaps;
- реализацию не начинать; результат — только технический план и установленные gaps/отсутствие gaps.

Планирование выполнено; план/выводы опубликованы в #6686478629. Лёва остановился; текущий следующий шаг — coordinator review плана Мирой.

## AP-11 technical planning result — Лёва

- [План #6686478629](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6686478629) опубликован на main `7b452edfc0a759b4b65cd1cc535f207bb9e615c7`; полный текст в личном файле Лёвы.
- Confirmed functional/product/code defects по planning inspection не установлены. Не назначены новые app/domain/schema/permissions/grants changes.
- Один установленный verification gap: repository browser harnesses не проходят linked AP-07/08 protected topic/closure и AP-09 Users inline management совместно с AP-10 restrictions/revalidation/History. Route/DOM/PostgreSQL coverage этих пакетов уже существует; её отсутствие не заявляется.
- Предложение: bounded test/verification-only PR, расширение existing `tests/browser/user-measures/check.py` и reuse `.github/workflows/ap10-browser.yml`, без нового test framework/параллельного дублирующего full job.
- Connected cases: Users read-only → explicit authz grant → inline canonical assignment/override → fresh revoke/read-only recovery/History; admin Forum hierarchy/closure × independent reply measure with editor retention, no-write and independent restore boundaries. Existing AP-10 cases сохраняются.
- EN/RU/HE/reflow checks ограничены newly connected Users detail/admin topic; нет нового owner visual/deployed gate или exhaustive cross-product.
- После implementation/checks/stable-head coordinator+independent reviews — отдельный factual docs PR: delivered AP-01–10 closeout, Settings deferred, next owner/authorization redesign → Settings. Старый last-manager code/schema/tests не трогать до отдельной задачи.
- Планирование read-only: implementation PR AP-11/runtime/DB changes и новая acceptance не выполнялись. Полный документационный аудит не заявлен.
- **Следующий шаг — Мира:** review необходимости/достаточности выбранных linked cases и границ; после approval назначить Лиру. Новых owner product questions нет.


## AP-11 coordinator plan approval and implementation handoff

- Мира проверила technical plan Лёвы на current `main` `7b452edfc0a759b4b65cd1cc535f207bb9e615c7`.
- План **APPROVED**. Подтверждённый scope AP-11 — bounded integration verification delivered AP-01–AP-10 без новой domain functionality.
- Проверено против repository browser harnesses:
  - ни один current browser harness не выполняет `closeTopic/reopenTopic`;
  - нет browser-level Users inline `assignRole/override` + fresh revoke/read-only recovery;
  - текущий AP-10 responsive matrix покрывает measure pages, а admin-forum — category/section, но не Users detail/admin topic.
  Поэтому proposed connected cases не являются дублированием существующего actual-browser evidence.
- Existing route/DOM/native tests остаются valid evidence своих boundaries; AP-11 не переоткрывает AP-08/AP-09/AP-10 acceptance и не требует exhaustive cross-product.
- Settings исключён owner decision; owner/authorization redesign, Stage 6, production и owner visual acceptance вне scope.
- По умолчанию implementation PR должен быть **test/verification-only**: расширение существующего `tests/browser/user-measures/check.py` и при необходимости bounded workflow/path/evidence updates. Application/DB/schema/grants/public-contract edits заранее не назначены.
- Если новый connected runtime scenario воспроизводимо выявит current-scope defect, Лира сначала подтверждает полную причинную цепочку и локальную применимость, затем исправляет только необходимое до stable head. Future groundwork не исправляется.

### AP-11 implementation — Лира

Требуемый результат:
1. Реализовать approved connected browser coverage:
   - Users → inline canonical authorization → History → fresh same-session presentation/revoke recovery;
   - Forum hierarchy/admin topic → close/reopen → mounted reply editor × AP-10 replies restriction;
   - bounded EN/RU/HE × 320/768/1280 checks для Users detail/admin topic и применимых privacy/no-store boundaries.
2. Переиспользовать существующий AP-10 disposable PostgreSQL 17 + built Worker + Better Auth + Chromium harness, не создавать второй параллельный framework/job без необходимости.
3. Все проверяемые операции выполнять через настоящий UI/canonical HTTP; SQL допустим только для fixture/setup/inspection.
4. Сохранить существующие 19 AP-10 case groups и добавить только approved cross-package cases.
5. Не менять Settings, owner/authorization model, Stage 6/production, schema/grants/dependencies или public contracts без подтверждённого current-scope defect.
6. На stable head выполнить applicable full CI и exact-head integration browser evidence; зафиксировать PR/head/results в #251 и остановиться.

Критерии готовности:
- новый implementation PR создан отдельно от #251 и документации;
- connected cases реально исполняются, не skipped/mocked;
- no-write/History/revalidation/privacy assertions проверяют фактическое runtime поведение;
- exact implementation SHA присутствует в evidence;
- нет подтверждённых current-scope defects на stable head;
- после завершения Лиры следующий шаг — coordinator whole-PR review Миры; Лёву повторно не подключать до coordinator PASS.


## AP-11 coordinator whole-PR review — CHANGES REQUIRED

Review target: PR #292, stable exact head `079b98e29646db2024546fb52be4076186567ece`, base/main `7b452edfc0a759b4b65cd1cc535f207bb9e615c7`.

Evidence checked:
- whole 4-file delta reviewed: `app/admin/users.tsx`, `app/forum/views.tsx`, `app/forum/public-read.test.tsx`, `tests/browser/user-measures/check.py`;
- exact-head CI #42238141456 SUCCESS;
- exact-head isolated Chromium #42238141445 SUCCESS;
- downloaded artifact #13512338818 verified: `implementationHead=079b98e...`, 30 recorded case groups, zero layout failures, zero page errors, zero external requests;
- responsive screenshots for Users detail/Admin Topic inspected;
- current main source-of-truth and approved AP-11 technical plan rechecked.
- First finding did not stop review.

### AP11-MIRA-01 [P2] — denied-reply manual revalidation does not block repeat submit during the revalidation window

Confirmed current-scope runtime defect.

Causal chain:
1. A stale reply POST receives 403. React Router Framework Mode does not automatically revalidate failed 4xx/5xx submissions, so AP-11 correctly starts explicit `revalidator.revalidate()`.
2. React Router tracks explicit revalidation in separate `revalidator.state`; it is not the same as `useNavigation().state`.
3. Current `TopicView` computes `isReplySubmitting` only from `navigation.state` and computes `replyPublicationAllowed` from the stale loader's `canParticipate` plus closure state.
4. The later existing completion effect clears `replyPublicationRef` when it sees the 403. While explicit revalidation is still loading, `navigation.state` is idle, stale `canParticipate` can still be true, retained editor content keeps `replyReady` true, and `publicationDisabled` remains false.
5. Therefore Publish can re-enable temporarily between the 403 response and completion of the fresh loader. The same stale window can also expose stale upload availability until the fresh restriction projection arrives.
6. Server authorization still denies the repeated write, so this is not a privilege bypass or unauthorized state write. It is a stale-presentation/repeated-submit defect in the exact AP-11 restriction/revalidation scope.
7. Current DOM/browser regressions wait for the final post-revalidation disabled state; they do not hold revalidation open and therefore do not detect this window.

Required result:
- from the moment the denied submitted reply is known until its explicit revalidation completes, new reply publication/repeated submit remains blocked;
- mounted text/operation/selected or in-flight attachments and Cancel remain retained;
- no automatic POST replay;
- after fresh loader state arrives, normal current permission/restriction state controls availability;
- add a focused regression with deliberately pending revalidation that proves the submit cannot repeat during that window.

### AP11-MIRA-02 [P3] — approved closure × measure composition matrix is not actually exercised

Confirmed current-scope verification gap.

The approved AP-11 plan required a small connected matrix proving independence of AP-08 closure and AP-10 `replies.create` restrictions:
- open + measure → denied;
- closed + measure → denied;
- removing/lifting the measure while still closed does not restore replies;
- reopening while a reply measure remains active does not restore replies;
- only open + no applicable measure restores explicit reply.

#292 currently verifies closure first and reopens the topic **before** creating the two AP-10 measures. The measures are then tested only while the topic is open. Artifact case list contains no state where `topic.isClosed=true` and an active reply measure coexist.

Required result:
- extend the existing connected browser scenario to exercise both constraints simultaneously and prove that removing either one does not incorrectly remove the other;
- use existing canonical close/reopen and measure/lift actions; no new product policy;
- no application change unless this scenario reproduces a real defect.

### AP11-MIRA-03 [P3] — Users grant/revoke lifecycle bypasses the canonical authorization writer

Confirmed current-scope verification gap.

Approved AP-11 plan intentionally connected authorization mutation → History/state → next-request same-session Users presentation. The implementation uses direct SQL to change the manager's `access.authorization.manage` deny/allow state before the stale inline submit and later regrant. SQL is permitted for fixture/setup/inspection, but these grant/revoke transitions are themselves part of the connected scenario being verified.

The inline assignment/override of the target user correctly uses canonical UI/HTTP and History, but the manager permission lifecycle that causes the fresh 403/recovery bypasses the canonical writer, its transaction/History path and normal request boundary.

Required result:
- use an already available authorized synthetic actor/session to perform the relevant grant/revoke through the existing authorization UI/canonical action; do not add a fourth signup;
- retain same-session reviewer recovery and no replay assertions;
- account for the real History deltas and restore fixture state through canonical operations where the scenario is testing those operations.

### AP11-MIRA-04 [P3] — browser privacy evidence asserts `no-store` but not `private`

Confirmed current-scope evidence gap.

AP-11 claims actual protected Users/Admin Topic responses are `private, no-store`, but the shared browser `document()` helper and the new direct-denial checks assert only that `Cache-Control` contains `no-store`. A response such as bare `no-store` would pass this acceptance despite not proving the required private cache boundary.

Required result:
- for protected account/admin document responses in this harness, assert both `private` and `no-store`;
- keep public topic GET outside that protected helper, as already done;
- do not broaden into unrelated cache-policy changes unless the stronger assertion exposes a real current-scope defect.

### Non-findings / scope guard

- The final Users responsive fix reusing `profile-identity-copy` is local and confirmed by actual 320/768/1280 EN/RU/HE evidence; no defect found.
- The 403 server boundary still prevents unauthorized writes; AP11-MIRA-01 is presentation/revalidation, not auth bypass.
- No schema/migration/grant/dependency/public-contract defect found.
- Workflow display name/path-trigger expansion is not a current AP-11 defect: the approved plan made that maintenance adjustment optional, and exact-head AP-11 browser evidence exists. Do not expand this correction into a workflow redesign.
- Settings, owner/authorization redesign, Stage 6, production and owner visual acceptance remain out of scope.

### Bounded correction — Лира

Correct only AP11-MIRA-01..04 in PR #292. Keep scope minimal. After corrections:
- run applicable full CI and exact-head isolated Chromium acceptance;
- artifact must identify the new implementation SHA and show the corrected connected cases;
- record new stable head/evidence in #251 and stop;
- any discovered product defect must be independently diagnosed before widening app changes;
- after handoff, Мира restarts coordinator whole-PR review on the new exact head. Лёва is not assigned until coordinator PASS.


## AP-11 corrected-head coordinator PASS and independent review handoff

Review target: PR #292 exact head `3f608ce9a042fd7c78401d330f5865af4f3dee5c`, base/main `7b452edfc0a759b4b65cd1cc535f207bb9e615c7`.

Coordinator result:
- AP11-MIRA-01..04 verified closed by actual code/evidence, not commit labels alone.
- AP11-MIRA-01: denied stale reply is blocked immediately on the 403 render and throughout explicit revalidation; Publish/new Attach remain unavailable until fresh loader completion; mounted text/operation/Cancel and existing attachment state remain mounted; no POST replay. Focused DOM test holds the refresh pending and proves one action only.
- AP11-MIRA-02: browser scenario now exercises open+measure, closed+measure, reopened+measure, closed+lifted and finally open+lifted; denied attempts create no posts/History and AP-08 closure CAS/History remains independent.
- AP11-MIRA-03: manager `access.authorization.manage` deny/allow lifecycle now goes through an already-authenticated builtin-admin actor's canonical authorization UI/action and records four `user.overrideChanged` History events; stale same-session inline POST still yields 403/read-only recovery/no replay.
- AP11-MIRA-04: protected document helper and direct denial checks require both `private` and `no-store`; public topic GET remains outside the protected helper.
- Correction from old reviewed head `079b98e29646db2024546fb52be4076186567ece` to current head is 7 commits / 3 files; full PR remains exactly 4 files and contains no schema/migration/permission/grant/dependency/public-contract changes.
- Verified `allowNewUploads=false` only blocks new attachment additions; existing/in-flight requests are not aborted by that flag. Request abort remains tied to editor identity change/unmount/reset.
- Exact-head CI #42245766359 — SUCCESS: checks + database.
- Exact-head isolated Chromium #42245766263 — SUCCESS.
- Downloaded artifact #13517504953 belongs to exact head and records 34 case groups, `implementationHead=3f608ce9...`, zero layout failures, zero page errors and zero external requests.
- PR #292 remains Draft/open/mergeable and implementation head remained unchanged through review.
- No additional confirmed current-scope defects found in the full AP-11 scope.
- **Coordinator verdict: PASS** on exact head `3f608ce9a042fd7c78401d330f5865af4f3dee5c`.
- Owner visual acceptance was not requested. Settings, owner/authorization redesign, Stage 6 and production remain outside AP-11.

### AP-11 independent technical review — Лёва

Review target: PR #292, exact head `3f608ce9a042fd7c78401d330f5865af4f3dee5c`.

Требуемый результат:
- независимо проверить весь AP-11 implementation/verification scope против актуальных source-of-truth и approved AP-11 technical plan;
- проверить не только status CI, но и runtime fixes, connected browser cases, no-write/History/revalidation/privacy/locale-responsive boundaries и их достаточность для Package 8;
- любой finding доказать по полной причинной цепочке и отдельно классифицировать как current-scope defect либо future groundwork;
- не использовать coordinator PASS как доказательство;
- implementation не изменять во время review;
- verdict и evidence зафиксировать в #251 и остановиться.

Границы:
- review только exact head `3f608ce9a042fd7c78401d330f5865af4f3dee5c`; изменение implementation head прекращает review и возвращает cycle Мире;
- Settings, owner/authorization redesign, Stage 6/production и owner visual acceptance не входят;
- Марк не назначается без отдельной необходимости.
