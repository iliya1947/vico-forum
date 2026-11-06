# Admin panel — communication

Служебный PR: #251.

## Актуальный baseline

- AP-01–AP-09 merged в main; current main/base для AP-10 — `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`, migration head 0057.
- AP-10 technical plan прошёл coordinator PASS; AP10-PLAN-MIRA-01..06 закрыты.
- Лира завершила author implementation/verification в Draft PR #290, stable exact head `503a5c6dc570e2c6c0f64f59e7fe5bf390a90b13`, base `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`, 92 changed files. PR open/draft/mergeable.
- Exact-head CI #42171734420 — SUCCESS на `503a5c6d...`.
- Isolated browser acceptance #42171734414 — SUCCESS на том же exact head; это author evidence, не independent review и не owner visual acceptance.
- Отдельный documentation Draft PR #291: exact head `e54f1b23ea8030df6171932cb640d1706867af6c`, base main `5cf80f38...`, 6 Markdown files; CI #42173496053 — SUCCESS. Он не считается implementation approval/merge.
- Coordinator whole-PR review AP-10 начат Мирой. Implementation/docs пока не merge; production/Stage 6 не трогать.

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

## Результат технического планирования

- Лёва подготовил common schema/domain/repository/service/route/UI/catalog/History points и dependencies; full text — comment #6667784146 и личный файл.
- Proposals для review: обычная blocks.manage, отдельная elevated capability без автоматического built-in grant, narrow trusted owner-ID binding для необходимой owner target boundary, отдельный raw authority snapshot и action-restriction policy.
- Enforcement охватывает direct APIs/child private reads/active sessions; publication receipts и committed retries проверяются до fresh-action restriction, Cancel/cleanup сохраняются.
- Минимальные persistence proposals: measures, child restrictions и exact-measure appeals; new forward migrations/manifest/runtime least privilege. Никакой implementation/прошедших AP-10 tests не заявлено.
- Accepted appeal поддерживает full lift или изменение restrictions/срока той же measure; remedy/reason/resolution/History атомарны через общий transition primitive. Reject меру не меняет.
- Own timeline — отдельная allowlist projection без actor/issuer/reviewer identity или raw private History context. Identity сохраняется во внутренней authorized History.

## AP-10 revision AP10-PLAN-MIRA-01..04

- Owner decision закрыл прежнюю §9 развилку: разные нарушения создают разные меры. Single-active модель не применяется; повторного owner вопроса нет.
- Отдельные measures имеют независимые identity/reason/restrictions/expiry/lift/version/issuer floor/history/quota. Enforcement — EXISTS действующей меры с нужным restriction key; снятие/истечение A не убирает effect B. Без aggregation store/precedence engine/current-head/UNIQUE active target.
- Последовательность appeals обеспечивается measure lock, unique ordinal и partial UNIQUE pending по measure ID. Replay не расходует слот; pending A не блокирует B; обычный edit не закрывает pending. Expired/lifted мера terminal; её продление или возобновление запрещено. Повторное наказание создаёт новую measure с новой identity/reason/lifecycle/quota.
- Accepted + change сохраняет identity/quota; accepted + lift не перезаписывается как moot. Fresh current version/authority, CAS, transactional History и rollback обязательны.
- Raw own document/.data/action/fetcher/errors проверяются на отсутствие admin identity; одного сокрытия в UI недостаточно.
- Delta для Миры: https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6670064497. Полный актуальный technical plan — личный файл Лёвы; unchanged scope исходного плана сохраняется.

## Следующий шаг

- **Мира:** coordinator whole-PR review stable exact implementation head PR #290 `503a5c6dc570e2c6c0f64f59e7fe5bf390a90b13` против approved AP-10 plan, current main и applicable source-of-truth.
- Пока coordinator review не завершён, Лёву на independent technical review не назначать и implementation head не менять.
- Documentation PR #291 проверяется как отдельный closeout artifact; его наличие не означает принятие implementation.
- Owner visual acceptance не инициировать без прямого запроса владельца.
- После coordinator PASS — Лёва проверяет тот же exact implementation head. При current-scope defects сначала один пакет Лире и новый coordinator cycle.
- Lasting docs/PROJECT_STATE остаются отдельным PR; общая last-manager cleanup — после завершения админ-панели.
- AP-11/Settings/Stage 6/production rollout не начинались; Марк не назначен.

Оперативное состояние: [workflow.md](./workflow.md).
Контракт: [ADMIN_PANEL_IMPLEMENTATION_PLAN.md](../ADMIN_PANEL_IMPLEMENTATION_PLAN.md).


## AP-10 owner decision — distinct violations, sequential appeals, flexible remedy

1. Два разных нарушения = две разные administrative measures.
2. Каждая measure имеет собственные reason/restrictions/expiry/lift/history и собственный лимит до 3 appeals.
3. Для одной measure одновременно может быть только одна pending appeal; до 3 appeals рассматриваются последовательно.
4. Удовлетворение appeal может привести как к full lift, так и к смягчению/изменению restrictions или срока той же measure.
5. Такое изменение не создаёт новую measure identity; appeal/history остаются связаны с исходной measure.


## AP-10 owner decision — admin identity is internal-only

1. Наказанный пользователь не должен видеть, какой конкретно администратор/модератор назначил, изменил или снял меру либо рассмотрел appeal.
2. User-facing measure timeline содержит только саму меру, reason, restrictions, сроки, изменения и результаты appeal.
3. Actor/reviewer identity и другая служебная информация доступны только владельцу и администраторам с соответствующим доступом во внутренней administrative History.


## AP-10 owner decision — no default block-management grants

1. AP-10 block-management capability не выдаётся автоматически ни одной built-in role.
2. Built-in admin и moderator по умолчанию не получают право создавать/изменять/снимать measures или review block appeals.
3. Доступ выдаётся только явным grant через существующую dynamic authorization model.
4. Privileged-target elevated capability также без initial grants.
5. Expired/lifted measure terminal; повторное наказание = новая measure.

## AP-10 revision AP10-PLAN-MIRA-05..06

- Terminal boundary применяется в общем transition primitive после measure lock; stale edit/review после expiry/lift не меняет меру/outcome/History. Expired→future и materialize-before-extension ветки удалены из актуального плана.
- Обе block-management capabilities исключаются из всех built-in initial grants, включая catalog-all seed admin; никакого migration backfill. Owner binding не выдаёт capability. Доступ только через explicit dynamic grant; тестовые actors получают явные grants.
- [Delta для Миры](https://github.com/iliya1947/vico-forum/pull/251#issuecomment-6670909257); implementation/DB/production не менялись.


## AP-10 technical plan — coordinator PASS

- Final delta #6670909257 проверена против owner decisions и актуального полного плана Лёвы.
- AP10-PLAN-MIRA-01..06 закрыты.
- Expired/lifted measure terminal; повторное наказание = новая measure.
- Block-management capabilities имеют zero initial grants across built-in roles и выдаются только explicit grant.
- Новых current-scope blockers не найдено.
- Technical plan AP-10 approved for implementation; implementation ещё не начат.


## AP-10 coordinator review — confirmed findings in progress

- Pass 1 (data model/lifecycle/reasons/appeals) complete on exact head `503a5c6dc570e2c6c0f64f59e7fe5bf390a90b13`.
- Confirmed current-scope: AP10-MIRA-01 missing pending block-appeal reviewer queue/discovery; AP10-MIRA-02 missing approved temporary preset/arbitrary-duration UI (only raw end-time ISO input exists).
- Whole-PR review is not complete. Do not start fixes or independent Codex review yet; Mira will return one consolidated package after all coordinator passes.

- Pass 2 (authority/permissions/privileged targets) complete on the same exact head.
- Confirmed current-scope: AP10-MIRA-03 ordinary manager can persist latent admin-family restrictions that later suppress newly granted privileged rights; AP10-MIRA-04 non-owner authorization UI exposes enabled elevated-authority controls although server rejects them.
- Server-side current-target hierarchy, owner immunity, self-target denial, issuer floor, zero default grants and raw-vs-suppressed authority boundaries passed this pass.

- Pass 3 (restriction enforcement) complete on the same exact head.
- Confirmed current-scope AP10-MIRA-05: ordinary user action presentation is not restriction-aware; controls remain available and fail only after server-side denial instead of being hidden/disabled from current measure state as approved.
- Server-side enforcement for publication/edit/profile/Complaints/Help/uploads/generation/admin families, plus replay/cleanup/expiry/overlap/private-read boundaries, passed this pass.

- Pass 4 (privacy/History/routes/UI state/revalidation/localization) complete on the same exact head.
- Confirmed current-scope AP10-MIRA-06: Admin History stores AP-10 before/after/outcome/remedy context, but `HistoryEvents` does not render any `measure.*` context; measure changes and appeal resolutions therefore do not show what changed or whether/remedy an appeal was accepted/rejected, contrary to the existing significant-History contract.
- Confirmed current-scope AP10-MIRA-07: own measure list/detail routes hard-code browser metadata as `My measures · Vico Forum`; RU/HE therefore receive an English page title instead of catalog-driven localized metadata.
- Subject allowlist projection, absence of issuer/actor/reviewer identity in own loader/action DTOs, internal History identity gating, private/no-store responses, 403/404/409 loader revalidation without POST replay, translated AP-10 body copy, RTL-safe direction handling and the existing 320/768/1280 browser evidence otherwise passed this pass.

- Pass 5 (tests/CI coverage, migration/runtime privileges, browser evidence and final gap sweep) complete on the same exact head.
- No additional current-scope defects confirmed. Migration 0058, Drizzle/schema manifest parity, PostgreSQL 17 constraints, zero initial grants, web-only SELECT/INSERT/UPDATE on measure tables, split database bindings, Worker composition and fail-closed owner binding are covered by exact-head CI and focused native tests.
- Exact-head browser run #42171734414 is valid author engineering evidence for the flows it actually exercises: guest private denial, two independent measures, own privacy/appeal, current-session server denials, accepted lift/restoration, stale 409/no replay, EN/RU/HE, RTL/LTR, 320/768/1280 overflow and keyboard refresh. It does not disprove the seven coordinator findings because the missing reviewer queue, duration UX, latent privileged restrictions, elevated-control presentation, regular-action restriction-aware UI, History context rendering and localized document title are outside or insufficiently asserted by that script.
- Final coordinator whole-PR review of PR #290 exact head `503a5c6dc570e2c6c0f64f59e7fe5bf390a90b13` is complete with seven confirmed current-scope defects AP10-MIRA-01..07. Coordinator status is NOT PASS. Do not start independent Codex review. Next workflow step is one consolidated correction package to Лира; after implementation head changes, rerun applicable CI/browser evidence and restart coordinator whole-PR review on the new stable exact head.


## AP-10 correction package — Лира

Исполнитель: **Лира**. Implementation PR: **#290**. Reviewed exact head: `503a5c6dc570e2c6c0f64f59e7fe5bf390a90b13`.

Цель: исправить одним согласованным пакетом все семь подтверждённых current-scope дефектов coordinator review, не расширяя AP-10 и не меняя отдельный documentation PR #291.

1. **AP10-MIRA-01 — pending block-appeal discovery.** Добавить нормальный административный способ обнаружить ожидающие рассмотрения block appeals и перейти к exact measure/appeal review. Это остаётся частью AP-10 measures workspace, не переносится в Complaint/Needs attention domain.
2. **AP10-MIRA-02 — temporary duration UX.** Реализовать утверждённую presentation-модель: permanent, типовые временные presets и произвольная duration/end date. Presets остаются только UI shortcuts; persistence/domain contract не получает preset identity.
3. **AP10-MIRA-03 — latent privileged restrictions.** Устранить возможность, при которой actor без достаточной authority сохраняет administrative-family restriction на текущем непривилегированном target, а та позже начинает подавлять вновь выданные privileged permissions. Ни текущая мера, ни последующее изменение grants не должны позволять actor фактически ограничить authority, которую он не имел права ограничивать.
4. **AP10-MIRA-04 — elevated authorization presentation.** UI authorization management не должен показывать non-owner actor как доступные операции над elevated block-management capability, которые authoritative server всё равно запрещает. Server-side запрет сохраняется.
5. **AP10-MIRA-05 — restriction-aware ordinary presentation.** First-party UI для fresh пользовательских действий должен учитывать актуальные active measure restrictions и скрывать/блокировать запрещённые действия до submit, сохраняя обязательные server-side guards. Own status/reason/appeal и разрешённые cleanup/cancel/read paths не блокировать.
6. **AP10-MIRA-06 — Admin History context.** Внутренняя authorized History должна показывать сохранённый минимально полезный AP-10 change context: что изменилось в measure state и, для appeal resolution, outcome/remedy. Не добавлять вторые события и не менять subject privacy projection.
7. **AP10-MIRA-07 — localized document metadata.** Own measures list/detail не должны иметь hard-coded English browser title в RU/HE; новый metadata text должен идти через существующий localization contract.

Критерии готовности:
- все AP10-MIRA-01..07 закрыты на одном новом stable exact head PR #290;
- исправления остаются в текущем AP-10 scope и не начинают AP-11, Settings, last-manager cleanup, owner-role redesign, Stage 6 или production;
- существующие privacy, appeal quota/lifecycle, terminal measure, zero-default-grants, replay, authority и server enforcement invariants не ослаблены;
- добавить/обновить достаточные focused tests для исправленных причин, включая regression coverage там, где текущий green CI не ловил finding;
- выполнить применимые обычные CI/checks и AP-10 isolated browser acceptance для нового head; owner visual acceptance не инициировать без прямого запроса владельца;
- после завершения записать в служебный PR новый exact implementation head и фактические результаты проверок, затем остановиться. Следующий этап — новый coordinator whole-PR review Миры; Лёву до coordinator PASS не подключать.


## AP-10 corrected-head coordinator review

- Лира завершила correction package AP10-MIRA-01..07 в PR #290.
- Новый stable implementation exact head: `52a1db67610357f514e8013b06f70af6bda629c6`; base/main остаётся `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`. Correction delta относительно предыдущего reviewed head `503a5c6d...`: 30 commits / 45 files.
- Exact-head CI #42191389984 — SUCCESS. Exact-head isolated browser acceptance #42191390039 — SUCCESS; это author engineering evidence, не independent review и не owner visual acceptance.
- Coordinator pass 1 нового цикла завершён: причинные цепочки всех AP10-MIRA-01..07 перепроверены на новом head. Все семь исходных дефектов закрыты по своей подтверждённой причине; новых current-scope findings в correction delta на этом проходе не подтверждено.
- В частности: pending appeal discovery существует в measures workspace; temporary duration имеет UI-only presets/custom/end-time; latent administrative-family restriction ограничен authority/floor boundary; non-owner elevated auth controls закрыты при сохранении server gate; first-party fresh-action presentation читает active restrictions без утечки measure details; Admin History отображает AP-10 before/after и appeal outcome/remedy; own list/detail metadata локализуется через locale snapshot.
- Кандидат про удаление custom role с elevated key не считается finding: approved plan owner-gates изменения именно elevated key через grants/override/assignment и прямо не расширяет эту границу в redesign остальных role operations; назначенную роль existing authorization всё равно не даёт удалить.
- Coordinator status пока не PASS: следующий проход — regression/final gap sweep всего исправленного exact head, включая correction interactions с ранее прошедшими authority/enforcement/privacy/revalidation boundaries и проверку exact-head CI/browser evidence. Лёву до coordinator PASS не подключать.
