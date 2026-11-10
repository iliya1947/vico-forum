# Мира — SET-01 coordinator review PASS

PR #299 exact head `e52c97eed86283fff11976124a9216442fbe6bc3` reviewed whole-PR against frozen SET-01 scope.

Verdict: PASS, 0 confirmed current-scope defects.

Authoritative repository gate covers all six mutation families/no-ops; routes/UI preserve read-only access without writer forms; Owner projection, mutex, History, AP-10/elevated boundaries remain intact. CI/database and both isolated Chromium jobs are SUCCESS on the exact head. No schema/migration/docs/future Settings scope entered the implementation PR.

Next only after developer continuation: assign Lev technical review of the same frozen head.

# Мира — Lev Settings technical-plan review PASS

Complete SET-01–06 plan reviewed against frozen product scope: PASS, 0 current-scope defects.

Highest-risk Better Auth assumptions independently verified: create-user/link-account/sign-in source discrimination + OAuth provider context, and list-sessions freshness requirement.

Approved sequence synced to master plan. Next package is SET-01 only; implementation is not assigned until explicit continuation.

# Мира — Settings product scope frozen

S2.1 fixed: reply/mention notification preferences are deferred.

All Settings product decisions are now complete. Technical planning handed to Lev. No implementation until Lev returns a bounded package plan and Mira verifies it against the frozen product scope.

# Мира — Settings owner decisions update

Fixed:
- S1: authorization management Owner-only for current release; future deputy delegation required, mechanism deferred.
- S3: online visibility default ON / opt-out.
- S4: separate Google-registration and email/password-registration controls.

S2 remains open. Recommendation to defer reply/mention toggles is scope-driven: correct behavior needs server-side persisted notification policy and integration with creation + unread/badge semantics; UI hiding alone is wrong.

# Мира — consolidated Settings proposal

Five-page first-release proposal is complete and pending owner decisions.

Recommended unresolved choices:
- S1: Owner-only role definitions/grants + per-user overrides; delegatable assignment of existing roles.
- S2: defer reply/mention toggles to next slice.
- S3: online visibility default ON / opt-out.
- S4: one global registration open/closed switch.

After owner resolves S1–S4, freeze scope and hand technical planning to Lev. No implementation before that.

# Мира — Account/security + Privacy map

Account & security first useful scope:
- linked sign-in methods + existing Google connect;
- change existing password;
- list active sessions;
- revoke one/all other sessions.
Defer unlink/email change/recovery/set-password/deletion/passkeys/2FA.

Privacy first useful scope:
- Show my online status, default on;
- off excludes user from public online list and count.
No private-account/hide-public-posts model.

Complete top-level Settings architecture now has 5 justified pages:
Forum & roles; Administrator preferences; User preferences; Account & security; Privacy.
No sixth page is justified now; Notifications/Accessibility/reading remain sections.

# Мира — user experience preference map

User preferences split:
- Appearance: System/Light/Dark; preserve current device-local theme behavior.
- Preferred UI language: use existing validated server-side `user.locale`; current switcher itself only navigates locale URL.
- Editor: existing Simple/Advanced, spellcheck, code wrap, line numbers; preserve device-local per-account contract.
- Notifications: current durable kinds are reply, mention, Complaint decision, Complaint appeal result. Recommend only reply/mention user-toggleable; direct outcome notices mandatory.
- Reading/translation: later prefer translation/original presentation options, never generation authority/quota.
- Separate features (Watch, bookmarks, mute/block, topic-title editing) are not Settings.

New surface candidate: Privacy. Public online-presence exists; online visibility would affect others, so it should not be mixed with UX or Account & security.

# Мира — administrator workspace preference map

Admin preferences are personal UI/workspace state only, capability-scoped rather than role-name-scoped.

Recommended first slice:
- default/last admin destination;
- default/last accessible Attention mode/group;
- compact/comfortable density;
- default expansion of secondary technical detail.

Recommended persistence for first slice: browser-local per account/device, no DB/schema, no saved sensitive search/target identifiers.

Queue priority/order, permissions, sanctions, complaint policy, mandatory safety and audit semantics are not personal preferences.

# Мира — Owner/system Settings map

Owner/system Settings has five practical product groups plus one optional later emergency mode:
- registration;
- Owner-only role definitions/grants;
- global forum-write cooldown (later candidate; current default 5s);
- attachment maximum size (later candidate; current default 50 MB);
- locale publication active/inactive (later candidate, preserving mandatory en fallback);
- optional later read-only/maintenance mode.

Do not expose technical/security constants or infrastructure. First bounded recommendation: Owner-only role configuration + registration open/closed only. Role assignment/per-user overrides remain an owner decision.

# Мира — Settings surface map

Five classes identified:
1. Owner/system (Owner-only, whole-forum policy + role definitions/grants).
2. Administrator workspace preferences (personal, capability-based audience).
3. User experience preferences (personal; preserve existing local theme/editor contracts unless separately changed).
4. Account & security (identity/security, separate from UX).
5. Subsystem operational settings (stay in subsystem by default; Complaints priority settings are current example).

Outside Settings: infra/secrets/deployments/Owner binding, object administration, public profile content.

Open owner boundary: role configuration is Owner-only; decide later whether assignment of existing roles/per-user overrides remains delegatable administration.

# Мира — Settings architecture correction

Owner corrected the model: Settings is a family of separate surfaces, not one admin page.

Minimum: Owner/system settings (Owner-only, includes role settings), administrator personal settings, user personal settings. Additional candidate: Account & security as a distinct personal-security surface. Domain-specific settings normally remain in their subsystem.

Current contract impact: `access.authorization.manage` presently delegates role definition/grant management. Owner now requires role settings Owner-only; exact treatment of role assignment and per-user overrides remains to define before planning.

# Мира — Settings product-definition analysis

Current Settings is only an Under development placeholder. No generic settings store/permission exists. Existing configuration is domain-separated.

Recommended first package: only registration open/closed. Keep complaints, Roles, locale lifecycle, user preferences, infra/secrets and super-admin functions outside this first slice.

Owner decisions pending:
1. Settings authority: Owner-only vs explicit delegatable permission (recommend explicit permission, zero initial grants; Owner gets it through catalog-wide authority).
2. Scope: registration only vs registration + read-only mode vs broader configuration (recommend registration only).
3. Locale management: separate later vs include now (recommend separate later).

# Мира — Settings product-definition start

Owner/authorization redesign is fully closed after merged PR #298; current main `856b93cb65b01e2389eb97276b37b3a0d8eef265`.

Current bounded task: Settings product definition only. First analyze current placeholder + existing configurable mechanisms + release boundaries; identify genuinely required owner decisions. Do not assign Lev/Lira/Mark or start implementation before product scope is fixed.

# Мира — PR #298 final coordinator result

Exact head `7cfa68a8a2c587314393d60a9bf90923604ee0c0`: PASS. OWNER-DOC-MIRA-01 closed; 6-file docs scope consistent; CI #42361836324 success; zero confirmed current-scope defects. No Codex docs review needed. Next: owner merge #298.

# Мира — single-Owner bootstrap fixed

Owner decision confirmed: one Owner only; Google sign-in identifies the developer account; no ownership-transfer feature and no first-manager bootstrap. Repository already has the required application pieces. Remaining real Google/Owner binding is Stage6 external work. Next bounded step is docs-only closeout before Settings.

# Мира — single Owner / Google bootstrap decision

Owner один: разработчик. Transfer/multiple-owner/recovery-to-another-person feature не планируется.

Bootstrap должен подтверждать identity через Google, но runtime authority остаётся на trusted `VICO_OWNER_USER_ID` → internal Better Auth `user.id`, не на email/provider claim. Current task: определить, требует ли это вообще нового repository implementation или только operational Stage6 wiring/acceptance.

# Мира — recovery/bootstrap analysis complete

Source-level result: Stage2 already removes the need for a first-manager bootstrap. Normal signup + protected `VICO_OWNER_USER_ID` binding can bootstrap Owner without application-level special endpoints; protected rebinding can serve transfer/recovery.

Three owner decisions remain: normal-account bootstrap vs special flow; infra-only rebind vs app recovery system; whether emergency rebind must revoke old-account sessions. No Lev/Lira assignment until these are answered.

# Мира — next bounded task: recovery/bootstrap product-definition

Stage2 is fully closed after #297 merge (`96186cc9158dd7a91c9d2c0124ed4556f133f15c`).

Next task is not implementation: analyze the current repository/source-of-truth and define the unresolved recovery/bootstrap product boundary without reviving last-manager/count-veto assumptions. Prepare only the owner decisions actually required before Lev technical planning. Do not assign Codex/implementation yet.

# Мира — PR #297 final docs PASS

Final docs exact head `a63bfb6d52052e1dd0905eb498dabb1d38c8f10a` passed coordinator review with zero confirmed current-scope defects.

`STAGE2-DOC-MIRA-01/02/03` are closed; final correction was one-line only in `PROJECT_STATE.md`. Exact-head CI and isolated browser workflow are green. PR #297 is Ready for review.

Next: owner merge #297. After merge Stage2 closeout is complete; no Codex docs review required.

# Мира — PR #296 readiness complete

Lev independent technical review PASS accepted on exact head `824ab8eccb091664c2e7d37f81f2737e7fd43e87`; zero confirmed current-scope defects. Current main/base remains `8301087f9322b34bdd325ed9298fdf3fddd84561`.

PR #296 is now Ready for review and mergeable. No implementation change occurred after coordinator PASS.

Next: owner merge #296; after merge create separate factual documentation closeout. Do not start Settings or further redesign before merged state is recorded.

# Мира — PR #296 fresh coordinator whole-PR review: PASS

Exact head `824ab8eccb091664c2e7d37f81f2737e7fd43e87`, base `8301087f9322b34bdd325ed9298fdf3fddd84561`.

`STAGE2-MIRA-01` closed. Delta from the previously reviewed head is exactly two test files and no runtime changes. Native PG now covers Owner elevated role-grant add/remove, assignment in/out, per-user allow/deny/inherit, fresh permission results and History. Real browser covers the same canonical Owner paths plus fresh recipient requests and retained non-Owner direct 403 checks.

Exact-head evidence verified: CI #42349494000 SUCCESS (1974 app / 571 PG); browser #42349494094 SUCCESS attempt 1, including the new Stage2 elevated acceptance case; History browser SUCCESS.

Final coordinator verdict: **PASS, zero confirmed current-scope defects**. Implementation remains frozen; next step is Лёва independent technical review of the same exact head.

# Мира — PR #296 coordinator whole-PR review: CHANGES REQUIRED

Frozen exact head `04865401cd5c2a69941cb458d0df1fc7424a37f7`, base `8301087f9322b34bdd325ed9298fdf3fddd84561`.

Final result: exactly one confirmed current-scope finding, `STAGE2-MIRA-01`. No additional findings from block 4 privacy/History/Worker/localization/regression review. CI exact head SUCCESS; isolated browser exact head SUCCESS on attempt 2. No schema/migration/docs/Settings/super-admin/infra overscope.

`STAGE2-MIRA-01`: approved elevated grant/revoke acceptance is incomplete. Exact-head evidence proves all four non-Owner denials and Owner role-grant add + elevated-role delete, but not Owner-success assignment into/out of elevated role, per-user elevated override transitions, or explicit role-grant removal; native Owner PG test has no elevated-key mutation acceptance. Runtime elevated gate is not currently shown defective.

Handoff to Лира: complete only this required acceptance, change runtime only if tests expose an actual defect, rerun applicable exact-head checks/browser, publish new stable head, stop for fresh Mira review.

# Мира — PR #296 coordinator review block 3/4: STAGE2-MIRA-01

Stable exact head: `04865401cd5c2a69941cb458d0df1fc7424a37f7`.

Runtime/source review of private Owner UI + `admin.users.blocks.managePrivileged` mutation surfaces found no confirmed logic bypass. The bound-Owner flag is server-derived; raw role/grants/denies stay factual; non-Owner UI cannot directly edit elevated grant/override/assignment/delete controls; and repository authorization transaction guards all four mutation families, including indirect revoke by custom-role deletion.

Confirmed current-scope verification finding:

1. **STAGE2-MIRA-01 — elevated grant/revoke acceptance is incomplete.** The approved Stage2 plan explicitly requires Owner-only gate verification for all four mutation families and browser proof that Owner can grant elevated authority to role/user with the next request reflecting it. Exact-head browser evidence proves non-Owner direct 403 for role-grant/assignment/override/delete and Owner success for role-grant add + elevated-role delete, but does not prove Owner-success assignment into/out of elevated role, per-user elevated override transitions, or explicit Owner role-grant removal. `tests/database/owner-authorization.test.ts` contains no elevated-key mutation cases. This is a required verification gap, not a confirmed runtime defect.

Block 3/4 is therefore not PASS. Continue block 4/4 before returning findings to Лира; first finding does not end whole-PR review.

# Мира — PR #296 coordinator review block 2/4: PASS

## PR #296 coordinator review — block 2/4 PASS

- Stable exact head remains `04865401cd5c2a69941cb458d0df1fc7424a37f7`.
- Reviewed AP-10 authoritative authority, persisted-measure immunity and direct admission wiring end-to-end.
- Confirmed:
  - AP-10 derives raw actor/target authority from stored grants + overrides, not Owner-enriched effective permissions;
  - only bound Owner bypasses the raw `admin.users.blocks.manage` prerequisite; rank3, self/Owner-target prohibition, strict target hierarchy and issuer-floor checks remain;
  - pending-appeal discovery uses the same Owner-or-raw-manage admission and still applies per-target/floor filtering;
  - stored active measures remain persisted/history-preserving but do not restrict the currently bound Owner;
  - invalid/malformed Owner binding does not grant immunity;
  - one Owner-aware admission closure is wired from Worker into the existing Forum repository path, covering topic/reply/profile/post/help-signal and other existing forum measure checks, plus attachment store;
  - Complaint submission/queue/review/appeal repositories receive the same Owner-aware measure admission;
  - content-generation admission receives trusted Owner binding; generation remains otherwise unchanged/disabled;
  - administrative permission suppression wrapper bypasses saved sanctions only for exact bound Owner; non-Owner raw rank and restriction semantics remain unchanged;
  - no historical measure rows/events are rewritten or synthetically lifted.
- Focused unit/native PG coverage verifies Owner raw-deny create/change/lift, accepted/rejected appeal handling, private reads/queue, floor3, direct Drizzle/native admissions, stored-sanction retention and invalid-binding behavior.
- Verdict for block 2/4: **PASS**, zero confirmed current-scope defects.
- Whole-PR coordinator PASS is NOT yet claimed. Next block: private UI / Owner explanation / elevated-permission grant-revoke surfaces including elevated custom-role deletion.

# Мира — PR #296 coordinator review block 1/4: PASS

## PR #296 coordinator review — block 1/4 PASS

- Stable exact head: `04865401cd5c2a69941cb458d0df1fc7424a37f7`; base `8301087f9322b34bdd325ed9298fdf3fddd84561`.
- Reviewed central Owner authority implementation and focused tests:
  - `app/authorization/owner.ts`
  - `db/authorization-repository.ts`
  - authorization/admin route Owner predicates
  - Worker trusted binding composition relevant to central authority
  - Owner/repository/PostgreSQL tests and Node TS inclusion.
- Confirmed:
  - only exact valid server binding creates Owner authority;
  - existing DB user is still required;
  - bound Owner receives all current code-backed `PERMISSION_CATALOG` entries;
  - unknown permission strings do not become authority;
  - bulk, targeted, resolver/direct `hasPermission` and fresh authorization mutation paths agree;
  - stored role/grants/overrides remain factual and unchanged; `authoritySource: owner` is projection metadata only;
  - non-Owner deny > allow > role behavior is unchanged;
  - no schema/migration/seed/new role layer introduced.
- Verdict for block 1/4: **PASS**, zero confirmed current-scope defects.
- Whole-PR coordinator PASS is NOT yet claimed. Next block: AP-10 authority/immunity/direct admission wiring.

# Мира — Stage 2 technical plan coordinator review: PASS

Revised Lev plan (#6702391114 + #6702520494) checked against current main/source and Owner clarification.

PASS, zero remaining current-scope plan defects.
- all-catalog Owner authority retained;
- AP-10 raw basic-manage gate becomes Owner-aware without contaminating non-Owner raw hierarchy;
- remaining self/target/floor/lifecycle guards preserved;
- elevated grant/revoke gate covers role grant, assignment, override and elevated custom-role deletion;
- no schema/migration/Settings/super-admin/infra/mutex redesign.

Implementation assigned to Лира via #251. No implementation acceptance claimed yet.
# Мира — Stage 2 technical plan review: CHANGES REQUIRED (narrowed)

Plan #6702391114 reviewed on main `8301087f9322b34bdd325ed9298fdf3fddd84561`.

Owner corrected coordinator interpretation: bound Owner must have **all code-backed permissions in `PERMISSION_CATALOG`**, including ordinary participation permissions. Therefore my former finding about the all-catalog projection is withdrawn.

One current-scope finding remains:
1. AP-10 `assertUserMeasureAuthority()` still requires raw `admin.users.blocks.manage`; common effective projection alone does not implement Owner authority at that transaction boundary. Corrected plan must explicitly cover bound Owner there while preserving raw hierarchy/issuer-floor semantics for non-Owner.

Plan returned to Лёва only for this remaining bounded correction. No implementation assigned.

# Мира — Stage 1 last-manager removal coordinator review: PASS

PR #294, exact head `e3604222ae8cecb4b1f2f94cdd5d7e9f76c15e61`, base `bcf02193f82aa0d448444c6943d6ebdcf09f7896`.

Whole-PR review completed across all 21 changed files. PASS, zero confirmed current-scope defects.

Confirmed:
- obsolete last-manager error/count/flag/veto removed;
- `authz_mutation_lock` retained solely as shared transaction mutex;
- 0059 schema delta is only DROP COLUMN `managers_ever_existed`;
- fresh authz/AP-10 hierarchy/History rollback remain;
- canonical self-revoke commits once, next request denies;
- mutex concurrency regression proves fresh authority after wait;
- CI #42328843126 and browser #42328843151 SUCCESS on exact head;
- artifacts inspected directly: Stage1 35 clean cases; AP-10/AP-11 34 clean cases.

Implementation frozen for independent Lev review. Future owner authority/mutex redesign/Settings are not Stage1 defects.

# Мира — ChatGPT-5.6 Sol

## AP-10 restriction catalog — purpose-first coordinator conclusion

Не owner decision. Каждый пункт проверен по вопросу: какую конкретную вредную возможность он позволяет прекратить, не отбирая у пользователя несвязанные функции.

### 1. Публикация и участие — оставить

- **Создавать новые темы / Help-вопросы.**
  Практический смысл: остановить спам/флуд новыми обсуждениями, не запрещая пользователю отвечать в существующих.
- **Отправлять ответы.**
  Практический смысл: остановить флуд, harassment и другое вредное участие в чужих/существующих темах, не обязательно запрещая создание собственных тем.
- **Загружать новые вложения.**
  Практический смысл: отдельно остановить вредные/нежелательные файлы и расход storage. Это должна быть самостоятельная restriction, потому что upload имеет собственный direct API lifecycle и не должен оставаться обходом при запрете публикации.

### 2. Изменение собственного контента — оставить только реальные санкционные цели

- **Редактировать свои опубликованные сообщения — оставить.**
  Практический смысл: пользователь может менять уже опубликованный материал после модерации и снова добавлять запрещённое содержимое.
- **Изменять публичный профиль — оставить.**
  Практический смысл: профиль реально редактируется сейчас (bio / GitHub / website) и может использоваться для abusive/spam/phishing content.

Не делать отдельными restrictions:
- **source-locale correction** — внутренняя техническая гранулярность; отдельной модерационной цели нет;
- **управление solved / best answer своей темы** — отдельный punitive restriction сейчас не оправдан: действие не является самостоятельным каналом публикации/контакта/ресурсного abuse, а административная коррекция уже существует. Не добавлять без реального abuse-case.

### 3. Обращения к модерации — оставить submission, не ограничивать appeals

- **Отправлять Complaints — оставить.**
  Практический смысл: targeted restriction против систематически ложных/злонамеренных reports. Existing rate limit ограничивает объём, но не решает сам факт устойчивого misuse.
- **Отправлять Help signals — оставить.**
  Практический смысл: отдельный moderation-input channel, который также может использоваться для спама/misuse.

Не включать в restriction catalog:
- **Complaint Appeals, Help duplicate appeals и другие существующие domain appeals**;
- **AP-10 block appeal**.

Причина: appeal — путь пересмотра уже принятого решения/меры. Санкция не должна сама отключать механизм её или другого moderation decision пересмотра. Eligibility каждого appeal по-прежнему определяется его собственным domain contract.

### 4. Ресурсоёмкие действия — оставить

- **Генерировать переводы.**
  Практический смысл: отдельная code-backed generation capability может расходовать provider/queue/allowance resources независимо от обычного чтения форума.

### 5. Служебные полномочия — оставить только для privileged target

Эта группа не относится к обычным пользователям. Она нужна только когда owner/senior-head-admin authority применяет меру к пользователю с реальными moderator/admin capabilities.

Child restrictions:
- **Forum / Help moderation** — forum/topic/solution/Help moderation и связанные private moderation reads;
- **Complaints moderation** — Case/Appeal review, priority/identity access и связанные mutations;
- **Security review** — private attachment-security review surface;
- **Users / access administration** — Users admin read, roles/permissions management и ordinary admin History/private administration surfaces.

Правило семьи: выбранная service restriction подавляет и privileged reads, и mutations этой области; иначе пользователь сохраняет чувствительный доступ после suspension. Exact permission mapping — technical planning после owner approval, не часть product catalog.

### 6. Не включать в restriction catalog

- login/session;
- public reading;
- notifications;
- read-only own account / block-status surface;
- любые appeal submission flows;
- own solved/best-answer management;
- source-locale correction как отдельный пункт;
- future/unimplemented capabilities;
- internal permission keys или route names как пользовательские checkbox labels.

### 7. Group behavior

- group checkbox — UI shortcut выбрать/снять все child restrictions;
- child restrictions остаются самостоятельно выбираемыми;
- catalog описывает продуктовые действия, а не копирует RBAC permission catalog;
- restriction не переписывает role/grants/overrides;
- authoritative enforcement нужен на server/domain boundary каждого реально запрещённого действия.


## AP-10 reason rules — purpose-first coordinator conclusion

Не owner decision.

### Зачем reason вообще нужен

Reason нужен не ради формы и не ради красивого History. Он должен:
1. объяснять наказанному пользователю, почему к нему применили меру;
2. позволять следующему администратору понять, почему sanction была назначена/изменена/снята;
3. сохранять смысл административного решения в History без необходимости восстанавливать его из чужих private workflows.

### Кандидат правил

1. **Создание temporary/permanent measure — reason обязателен.**
   - Это user-visible объяснение, достаточное, чтобы понять основание административной меры.
   - Не требовать существования Complaint/Case: мера может возникнуть из другого moderation context.
   - Не копировать private Complaint explanations, reporter identity или иные закрытые данные.

2. **Ручное изменение restriction set или срока — reason обязателен.**
   - Новая причина объясняет именно изменение sanction.
   - Исходный reason назначения не перезаписывается.
   - History должен показывать before/after + reason конкретного изменения.

3. **Explicit lift до автоматического expiry — reason обязателен.**
   - Другой authorized admin тоже может снять меру, поэтому без объяснения History теряет смысл.
   - Lift reason не обязан означать, что исходная мера была ошибочной: это только объяснение, почему её действие прекращено вручную.

4. **Automatic expiry — нового reason нет.**
   - Это не новое administrative decision, а заранее заданное окончание срока.
   - Не создавать synthetic admin/system reason/event только ради expiry.

5. **Denied / stale / failed / no-op / replay — нового reason/history event нет.**
   - Reason относится к реально committed administrative transition.

### Presentation boundary

- reason меры и причины её последующих изменений должны быть доступны самому санкционированному пользователю вместе с соответствующей measure/history surface;
- ordinary Admin History сохраняет bounded useful reason;
- private moderation evidence/notes не раскрываются через reason;
- отдельный internal-note слой для AP-10 сейчас не нужен без подтверждённой product-задачи.

### Не проектировать сейчас

- глобальную taxonomy нарушений;
- mandatory reason categories;
- шаблоны/справочник причин;
- отдельный private moderator-note workflow;
- связь reason с Complaint Case как обязательное условие;
- редактирование исторических reasons задним числом.


## AP-10 administrative hierarchy safety — corrected draft

Предыдущая попытка добавить в AP-10 специальную защиту «последнего работоспособного управляющего ролями/разрешениями» от блокировки отозвана как ненужная и ошибочно перенесённая из authorization lockout concerns.

Owner decision:
1. AP-10 не должен добавлять специальный механизм, который запрещает блокировать/ограничивать администратора только ради сохранения хотя бы одного пользователя, способного управлять ролями и разрешениями.
2. Такой сценарий не является отдельной задачей админ-панели/AP-10.
3. В принятой иерархии административную меру против администратора применяет actor с достаточной более высокой authority; не строить отдельный recovery/last-manager слой поверх этого.
4. Не связывать блокировки AP-10 с существующей защитой authorization-management mutations от потери последнего access manager, если это не требуется конкретной реализацией позже.
5. Если постоянный ADMIN_PANEL source-of-truth содержит старую условную формулировку про usable access manager при блокировке, её нужно скорректировать в отдельном финальном documentation PR, а не реализовывать как AP-10 requirement.

Остаются отдельно на owner review только действительно относящиеся к санкциям вопросы:
- может ли actor применять/изменять/снимать меру относительно самого себя;
- должна ли target-authority проверка действовать одинаково на создание, изменение и снятие меры;
- какие административные возможности входят в выбранную restriction-группу для privileged target.

## AP-10 measure aggregation — not a current requirement

Два прежних черновика Миры были ошибочно построены от структуры данных:
- сначала «не более одной active measure на пользователя»;
- затем «несколько measures + union restrictions».

Обе прежние модели отозваны как преждевременные. AP-10 не получает requirement на несколько одновременно активных measures, aggregation или conflict-resolution. Технический план должен выбрать минимальную модель для утверждённого поведения и не строить multi-measure subsystem заранее. Только если без пользовательски наблюдаемого выбора реализацию невозможно определить, возникает реальный owner fork.

## AP-10 block appeal boundary — corrected draft

Предыдущая попытка описать block appeal как пересмотр «нарушения + наказания» отозвана: она смешивала AP-10 с Complaint semantics.

Корректная граница:
1. Complaint — report о возможном нарушении; это отдельный moderation domain.
2. Administrative measure — отдельная санкция, назначенная пользователю и содержащая собственный stated reason/violation context.
3. Block appeal — действие уже наказанного пользователя против exact measure.
4. Existing Complaint Appeal — appeal по Complaint Decision/effective outcome и не является block appeal.
5. Даже если measure когда-либо будет связана с Complaint Case, оба workflows сохраняют собственные identities, permissions, outcomes и history.
6. Для одной конкретной administrative measure пользователь может подать до **3 block appeals**. Это уже owner decision; quota/repeat не считать открытым вопросом.
7. Нельзя автоматически выводить остальные block-appeal outcomes/lifecycle из текущего Complaints Appeal contract.
8. Pending block appeal относится к самой administrative measure, а не к отдельной версии её состояния. Expiry или explicit lift закрывают её как утратившую предмет. Изменение restrictions, срока или причины не закрывает appeal; она продолжает относиться к той же мере, а History сохраняет изменения.


## AP-10 purpose filter

Перед добавлением любого правила проверять:
1. какую реальную проблему модерации оно решает;
2. нужно ли оно, чтобы мера была понятной, соразмерной и реально исполнимой;
3. нужно ли оно для защиты пользователя от произвольной/ошибочной меры;
4. существует ли соответствующее действие в текущем продукте;
5. нельзя ли отложить решение без дорогой переделки.

Если конкретной необходимости нет — не превращать технически возможный edge case в product contract.


## AP-09 completion / AP-10 gate

PR #288 merged в main: `5cf80f38cbc06ed733a0618e706eb80c5a7b3c7b`.

AP-09 полностью закрыт:
- implementation #287 merged;
- AP09-MIRA-05 test stabilization #289 merged;
- documentation closeout #288 merged;
- source-of-truth main reflects AP-09 and migration head 0057;
- confirmed open current-scope defects: 0.

Следующий пакет AP-10 нельзя планировать до owner product decision по blocking effect/reasons.
Не выбирать эти semantics самостоятельно и не передавать Лёве planning task до решения владельца.

## AP-09 documentation closeout — final PASS

#289 merged into main at `0521669eadc3b927b3f8d0651b98291ffda137a2`.

#288 was synchronized onto that main and the same five docs changes were reapplied. Final exact head
`d6ecb2005da02b4eaf4528b17f0530767ebddadd`.

Final review:
- diff exactly 5 docs files;
- no implementation/schema/dependency changes;
- factual consistency/overscope PASS;
- HISTORY_11 includes AP09-MIRA-05/#289 closeout;
- CI #41955225394 SUCCESS;
- application 143/143 files, 1888/1888 tests;
- users-authorization regression 6/6 PASS;
- PostgreSQL 41/41 files, 483/483 tests;
- build/UI preview/migration/schema/Worker checks SUCCESS.

#288 marked Ready/open/mergeable.

Next owner action: merge #288.

## AP09-MIRA-05 — coordinator review PR #289

**Stable exact head:** `7c0f7b513e6908f98151665a6839626b91f58fac`.

**Coordinator verdict: PASS. AP09-MIRA-05 CLOSED. Confirmed current-scope defects: 0.**

Independent verification:
- #289 Draft/open/mergeable; base/current main `386023ce892044e623ec3d24f8a724e92af61a31`;
- main has no drift from base;
- diff exactly one file, 2 additions / 2 deletions;
- both race-prone synchronous `Public details` assertions after recovery are now positive-state `await waitFor(...)`;
- existing loader-count, action-count, history-state, same-path, privileged-DOM and terminal both-rights-revoked assertions remain unchanged;
- runtime code/schema/dependencies/docs untouched;
- exact-head CI #41953193998 SUCCESS;
- job logs: test file 6/6 PASS, application 143/143 files and 1888/1888 tests; PostgreSQL 41/41 files and 483/483 tests; all applicable steps SUCCESS.

The previous service note that Codex review was unnecessary was incorrect: current AGENTS requires independent technical review after coordinator PASS even for this test-only implementation PR. Next reviewer: Лёва, same exact head.

#288 remains Draft until #289 is accepted and merged.

## AP-09 documentation closeout — подзадача 3/3

**Docs-content verdict: PASS. Overall closeout: BLOCKED by `AP09-MIRA-05`.**

#288 exact head `c1e20a79d69918bb0bf62d9f3acec0d013ddfd45`, base/main `386023ce892044e623ec3d24f8a724e92af61a31`.

Проверено:
- diff ровно 5 docs-файлов, implementation/schema/dependencies отсутствуют;
- PROJECT_STATE, ADMIN_PANEL, AUTHORIZATION и HISTORY_11 соответствуют merged AP-09 code/migration/catalog/routes;
- main не сдвинулся;
- factual docs contradictions/overscope не найдено.

CI выявил новый current-scope test-layer defect:
- run #41951777119: database SUCCESS, checks FAIL;
- attempt 1: repeated-revocation regression падает на line 196 после второго recovery-cycle;
- rerun same unchanged head: тот же test падает уже на line 180 после первого recovery-cycle;
- prior implementation CI #41941892340 на том же runtime code: test file 6/6 PASS, full application 1888/1888 PASS.

Root cause:
- test ждёт loader call count и negative state `#authorization === null`;
- ErrorBoundary также удовлетворяет negative state до завершения recovery render;
- immediate `Public details` assertion гоняется с successful detail commit;
- различное место failure на двух attempts подтверждает synchronization race.

**AP09-MIRA-05:** test-only synchronization defect. Runtime defect не подтверждён.

Correction boundary:
- separate test-only PR;
- only `app/admin/users-authorization.test.tsx` unless new evidence requires broader scope;
- wait positive recovered detail state in each cycle before terminal assertions;
- preserve semantic assertions/no replay/no loop/history identity;
- no runtime change;
- full applicable CI.

#288 остаётся Draft до correction merge + sync + green docs CI.

## AP-09 documentation closeout — подзадача 2/3

Implementation #287 merged в `main`: `386023ce892044e623ec3d24f8a724e92af61a31`.

Создан отдельный docs-only PR #288, Draft, head
`c1e20a79d69918bb0bf62d9f3acec0d013ddfd45`.

Изменены только пять согласованных документов:
- `PROJECT_STATE.md`;
- `docs/ADMIN_PANEL.md`;
- `docs/auth/AUTHORIZATION.md`;
- `docs/PROJECT_HISTORY/PROJECT_HISTORY_11.md`;
- `docs/PROJECT_HISTORY/PROJECT_HISTORY.md`.

Implementation/schema/dependencies/AP-10/Stage 6/production не менялись.

Следующая подзадача 3/3: финально проверить diff #288 на factual consistency с merged main и отсутствие docs overscope; при PASS перевести PR из Draft в Ready.

## AP-09 independent review — final reconciliation

**Stable exact head:** `b85c3809befe3a1dcc83fe654dde4cd093f625ba`.

Лёва повторно проверил `AP09-LEVA-01` на accepted schema и **отозвал finding**.

Подтверждено:
- accepted `user.created_at` — PostgreSQL `timestamp without time zone`;
- прежний synthetic repro использовал неверный `timestamptz`;
- disposable PostgreSQL 17 с migrations 0000–0057 + exact-head `PostgresAdminUsersReader` + real Drizzle profile reader дала 9/9 PASS для трёх boundary timestamps × UTC/Asia-Jerusalem/America-New_York;
- proposed `AT TIME ZONE 'UTC'` correction на actual column type применять нельзя;
- implementation не менялась, новый coordinator cycle не нужен.

**Final independent technical verdict Лёвы: PASS. Confirmed open current-scope defects: 0.**
Coordinator PASS и independent PASS относятся к одному exact head.

Следующий шаг владельца: merge PR #287. После merge — отдельный documentation closeout PR по текущему process rule.

## AP-09 independent review — verification of AP09-LEVA-01

**Reviewed exact head remains:** `b85c3809befe3a1dcc83fe654dde4cd093f625ba`.

Лёва сообщил `AP09-LEVA-01`: `to_char(user.created_at,...Z)` якобы сдвигает instant по PostgreSQL session TimeZone, потому что `created_at` — timestamptz.

Coordinator verification выявила mismatch premise:
- accepted migration `drizzle/0003_gorgeous_donald_blake.sql`: `user.created_at timestamp DEFAULT now() NOT NULL`;
- current `db/schema.ts`: `timestamp("created_at")` без `withTimezone:true`;
- current `drizzle/meta/0057_snapshot.json`: type `timestamp`;
- migration search не выявил последующего перевода `user.created_at` в timestamptz;
- finding repro использовал synthetic table с `timestamptz`, то есть другой тип.

PostgreSQL 17 имеет отдельные overloads `to_char(timestamp,text)` и `to_char(timestamp with time zone,text)`; session TimeZone conversion, на котором основан repro, относится к timestamptz path. Поэтому заявленная causal chain не воспроизводит фактический AP-09 schema path.

**Coordinator status:** AP09-LEVA-01 NOT CONFIRMED. Лире correction не назначать.

Следующий шаг: Лёва повторно проверяет actual `timestamp without time zone` path и либо даёт корректный current-scope repro, либо снимает finding.

## AP-09 MIRA-04 correction — coordinator restart, подзадача 3/3 / final verdict

**Reviewed exact head:** `b85c3809befe3a1dcc83fe654dde4cd093f625ba`.

**Final coordinator verdict: PASS. Confirmed current-scope defects: 0.**

Final gap-sweep:
- head не сдвинулся;
- `main` идентичен baseline `2651d2bf7de7212068c54674dca7d90716ea92c3`;
- correction delta ограничен двумя уже проверенными файлами;
- `AP09-MIRA-01..04` закрыты;
- direct loader 403 остаётся fail-closed и максимум вызывает один лишний recovery GET без loop/authority expansion;
- exact-head CI #41941892340 остаётся SUCCESS: app 143/143 files, 1888/1888 tests; PostgreSQL 41/41 files, 483/483 tests.

Actual authenticated Chromium→Worker→PostgreSQL AP-09 flow не выполнялся. **Информация не проверена.** Отдельный mandatory browser/owner visual gate не назначен.

Следующий этап: independent technical review Лёвы того же stable exact head.

## AP-09 MIRA-04 correction — coordinator restart, подзадача 2/3

**Stable exact head:** `b85c3809befe3a1dcc83fe654dde4cd093f625ba`.

**Verdict 2/3: PASS. `AP09-MIRA-04` CLOSED. Новых current-scope defects: 0.**

Проверено:
- первый denied canonical action вызывает один same-URL GET без mutation replay;
- successful read-only recovery размонтирует error subtree и сбрасывает recovery guard для следующего независимого denial;
- Users-read loss оставляет тот же mounted error boundary и `useRef=true`, поэтому второго GET/loop нет;
- React Router 8.3.1 source подтверждает stable errorElement/error-subtree lifecycle;
- mounted regression покрывает два независимых denial-cycle на одной history entry и terminal both-rights-revoked branch.

## AP-09 MIRA-04 correction — coordinator restart, подзадача 1/3

**Stable exact head:** `b85c3809befe3a1dcc83fe654dde4cd093f625ba`.
**Superseded reviewed head:** `13bae37dd3b7d033b271788fadb7e8be63d66a43`.
**Baseline/current main:** `2651d2bf7de7212068c54674dca7d90716ea92c3`.

**Verdict 1/3: PASS по stable-head / scope / CI boundary. Implementation correctness ещё не оценивается.**

Проверено:
- #287 Draft/open/mergeable;
- delta: 2 commits, 2 files;
- изменены только `app/routes/admin-user.tsx` и `app/admin/users-authorization.test.tsx`;
- schema, migrations/catalog, authz writers, dependencies, MIRA-02/03 implementation и lasting docs не затронуты;
- exact-head CI #41941892340 SUCCESS;
- job logs: application 143/143 files, 1888/1888 tests; PostgreSQL 41/41 files, 483/483 tests;
- lint/typecheck/build/UI preview/migration/schema/manifest/runtime privilege/credential probes/Worker smoke — SUCCESS.

Actual authenticated Chromium→Worker→PostgreSQL AP-09 flow не выполнялся. **Информация не проверена.** Отдельный mandatory browser/owner visual gate не назначен.

Следующая подзадача 2/3: проверить useRef recovery guard и repeated-denial lifecycle.

## AP-09 corrected head — coordinator restart, подзадача 4/4 / final verdict

**Reviewed exact head:** `13bae37dd3b7d033b271788fadb7e8be63d66a43`.

**Final coordinator verdict: CHANGES REQUIRED. Подтверждённых current-scope defects: 1 — `AP09-MIRA-04`.**

Final gap-sweep подтвердил:
- AP09-MIRA-02 закрыт;
- AP09-MIRA-03 закрыт;
- других current-scope defects в correction delta и ранее проверенном неизменённом AP-09 scope не найдено;
- actual authenticated Chromium→Worker→PostgreSQL AP-09 browser flow не выполнялся и не назначен mandatory gate. **Информация не проверена** в этой границе.

### AP09-MIRA-04 — final confirmation

Первый denied mutation recovery корректен, но guard lifetime неверен:
- первый thrown management 403 → один same-URL GET;
- mutation не replay;
- Users-read retained → read-only detail;
- marker `ap09AccessRechecked: true` остаётся в history location state;
- после последующего возврата management новая loader/reload/revalidation может снова показать controls на той же history entry;
- новый revoke + submit снова даёт canonical 403;
- ErrorBoundary видит старый marker и не запускает fresh GET;
- actor снова получает terminal 403 вместо всё ещё разрешённого read-only detail.

Следовательно guard должен ограничивать retry **одного denial event**, а не permanently consume recovery всей history entry.

### Bounded correction package Лире

Исправить только `AP09-MIRA-04`:
1. каждый независимый fresh management denial может вызвать не более одного fresh GET recovery;
2. успешный recovery не должен блокировать последующие независимые denial cycles;
3. если `admin.users.read` тоже отозван, fail-closed 403 остаётся terminal без loop;
4. mutation не retry/replay;
5. regression должен доказать минимум два независимых grant/revoke denial cycles на одной history entry и сохранить existing first-denial/both-revoked behavior;
6. после correction предоставить новый stable exact head + применимый full CI.

После implementation change coordinator whole-PR cycle начинается заново. Лёва не подключается до coordinator PASS.

## AP-09 corrected head — coordinator restart, подзадача 3/4

**Stable exact head:** `13bae37dd3b7d033b271788fadb7e8be63d66a43`.

**Verdict: PASS по AP09-MIRA-02/03 и оставшемуся correction delta. Новых current-scope defects: 0.**

### AP09-MIRA-02 — CLOSED

- `under-development?feature=admin-users` остаётся compatibility route;
- loader сначала распознаёт literal `admin-users`, затем выполняет protected `requireAdminAccess`;
- `admin.users.read` actor получает redirect на `/:locale/admin/users`;
- management-only actor получает redirect на `/:locale/admin/authorization#authorization-users-heading`;
- обе success branches передают `adminPrivateHeaders` в `redirect(...)`, то есть `Cache-Control: private, no-store`;
- mounted/route regression проверяет оба Location и оба no-store headers;
- guest/forbidden branches остаются controlled protected 401/403.

### AP09-MIRA-03 — CLOSED

- `admin-users` удалён из `UNDER_DEVELOPMENT_FEATURES`;
- `UnderDevelopmentView` рендерит только оставшиеся реальные unfinished entries;
- regression проверяет отсутствие `admin-users` и сохранение `admin-settings`;
- compatibility URL не зависит от registry type: route loader перехватывает literal `admin-users` до передачи requestedFeature в view;
- `adminDestinations` больше не генерирует Users placeholder: Users-read ведёт в real Users index, management-only — в existing authorization subset.

### Remaining correction delta

Шесть correction-файлов полностью распределены:
- `admin-user.tsx` + `users-authorization.test.tsx` — проверены в 2/4;
- `under-development.tsx` + `admin-users.test.ts` — MIRA-02, проверены в 3/4;
- `under-development.ts` + `users.test.tsx` — MIRA-03, проверены в 3/4.

Stable head не сдвинулся; #287 Draft/open/mergeable.

Единственный открытый confirmed finding текущего coordinator cycle: `AP09-MIRA-04`.

Следующая подзадача: 4/4 — final gap-sweep/verdict и bounded return package, если finding останется.

## AP-09 corrected head — coordinator restart, подзадача 2/4

**Stable exact head:** `13bae37dd3b7d033b271788fadb7e8be63d66a43`.

**Verdict: 1 confirmed current-scope defect — `AP09-MIRA-04`.**

### Что в AP09-MIRA-01 correction работает

- thrown 403 из canonical management action действительно попадает в `admin-user` ErrorBoundary;
- первый denial запускает одну replace-navigation на тот же URL и новый GET loader;
- mutation не replay: mounted regression подтверждает один вызов action;
- если `admin.users.read` ещё effective, второй loader возвращает read-only detail без management payload/controls;
- если Users-read тоже отозван, второй loader снова 403 и из-за marker повторного GET loop нет.

### AP09-MIRA-04 — recovery marker permanently consumes recovery for the history entry

Correction записывает `{ ap09AccessRechecked: true }` в `location.state` через:
`navigate(currentUrl, { replace: true, state: { ap09AccessRechecked: true } })`.

После успешного recovery этот state нигде не очищается. В React Router 8.3.1:
- navigation создаёт next location из переданного `opts.state`;
- successful replace commit вызывает `history.replace(location, location.state)`;
- BrowserHistory создаёт location из `window.history.state.usr`.

Следовательно marker относится не к одному конкретному 403, а остаётся привязанным к session-history entry. Existing test после успешного recovery прямо утверждает, что current location state всё ещё равен `{ ap09AccessRechecked: true }`.

Причинная цепочка дефекта:
1. management effective → detail содержит controls;
2. management revoke → submit → thrown 403;
3. correction делает recovery GET; Users-read сохранён → read-only detail;
4. marker остаётся `true`;
5. management позже снова становится effective и fresh loader на этой же history entry снова может показать controls;
6. при следующем revoke и submit canonical action снова бросает 403;
7. ErrorBoundary видит `alreadyRechecked === true` и больше не делает GET recovery → снова terminal 403 вместо fresh read-only snapshot.

Это current-scope: dynamic grants/overrides и next-request freshness уже являются контрактом AP-09; повторное grant/revoke не относится к AP-10 или future hardening.

Regression tests покрывают только первый revoke/recovery и terminal branch при одновременном revoke Users-read; repeated grant→revoke cycle отсутствует.

Других дефектов в рамках подзадачи 2/4 не подтверждено.

Следующая подзадача: 3/4 — AP09-MIRA-02/03 corrections + remaining correction delta.

## AP-09 corrected head — coordinator restart, подзадача 1/4

**Stable exact head:** `13bae37dd3b7d033b271788fadb7e8be63d66a43`.
**Superseded reviewed head:** `f5117f22bd891d3892357fc984009388481001f7`.
**Baseline/current main:** `2651d2bf7de7212068c54674dca7d90716ea92c3`.

**Verdict подзадачи 1/4: PASS по stable-head / scope / CI boundary. Implementation correctness correction ещё не оценивается.**

Проверено:
- #287 остаётся Draft/open/mergeable на новом stable head;
- correction delta от старого reviewed head: 7 commits, 6 files;
- изменены только:
  - `app/routes/admin-user.tsx`;
  - `app/routes/under-development.tsx`;
  - `app/forum/under-development.ts`;
  - `app/admin/users-authorization.test.tsx`;
  - `app/admin/users.test.tsx`;
  - `app/routes/admin-users.test.ts`;
- delta соответствует только bounded correction AP09-MIRA-01..03 и regression coverage; schema, dependencies, authz writers, migration/catalog, lasting docs/PROJECT_STATE не менялись;
- exact-head CI #41939426331 завершён SUCCESS;
- job logs подтверждают application 143/143 files, 1887/1887 tests; PostgreSQL 41/41 files, 483/483 tests;
- lint, typecheck, build, UI preview build, migration history/metadata, schema parity, production manifest, runtime privilege/credential probes и Worker smoke steps SUCCESS.

Actual authenticated Chromium→Worker→PostgreSQL AP-09 flow не выполнялся. **Информация не проверена.** Отдельный mandatory browser/owner visual gate для AP-09 не назначен.

Следующая подзадача 2/4: AP09-MIRA-01 recovery chain и её regression coverage.

## AP-09 coordinator whole-PR review — подзадача 4/4: gap-sweep / final verdict

**Reviewed exact head:** `f5117f22bd891d3892357fc984009388481001f7`.

**Final coordinator verdict: CHANGES REQUIRED. Подтверждённых current-scope дефектов: 3.**

### AP09-MIRA-01 — fresh management denial loses still-authorized read-only detail

Подтверждён в подзадаче 3/4. При сохранённом `admin.users.read` и отозванном `access.authorization.manage` следующий canonical fetcher submit получает thrown 403 из fresh manager gate. React Router поднимает error в boundary владельца fetcher (`admin-user`), а `ForumRouteError` не revalidate текущий detail. Привилегированный DOM безопасно исчезает, но вместе с ним теряется всё ещё разрешённый read-only user detail до отдельной навигации/reload.

### AP09-MIRA-02 — permission-dependent legacy Users redirects не имеют private/no-store

`app/routes/under-development.tsx` для `feature=admin-users` после protected `requireAdminAccess` выбирает разные success destinations:
- `admin.users.read` → `/:locale/admin/users`;
- management-only → `/:locale/admin/authorization#authorization-users-heading`.

Оба success path вызывают `redirect(location)` без headers. Exact React Router 8.3.1 implementation `redirect()` при таком вызове создаёт Response с status + `Location`; `Cache-Control` сам не добавляется. Route `under-development`, parent locale boundary и root не задают private/no-store headers для этого ответа. Следовательно capability-dependent protected compatibility response выходит из AP-09 private/no-store envelope. Тест проверяет только `Location` и gap не ловит.

### AP09-MIRA-03 — Users всё ещё ложно числится незавершённым

Exact head сохраняет в `app/forum/under-development.ts`:
`{ id: "admin-users", labelKey: "adminUsers" }`.

`UnderDevelopmentView` безусловно рендерит весь `UNDER_DEVELOPMENT_FEATURES`, поэтому на общей странице статуса Users остаётся в списке «Still in development» после реализации AP-09. Approved AP-09 plan прямо требовал после реализации убрать только `admin-users` из реально unfinished feature list; existing homepage test этот элемент не проверяет.

### Gap-sweep без дополнительных findings

Проверены оставшиеся интеграционные стыки:
- Worker context создаёт AdminUsers reader из `WEB_HYPERDRIVE`;
- locale/header admission добавляет только `admin.users.read` в существующий union;
- new routes зарегистрированы без конфликта с public profile/Forum routes;
- EN/RU/HE Users labels и reviewed fingerprints согласованы;
- Users-read / management-only / both navigation остаётся capability-distinct;
- extracted legacy Roles controls продолжают использовать canonical writers/intents;
- lasting docs/PROJECT_STATE отсутствуют в implementation PR по текущему process rule;
- AP-10/blocking/Settings/Stage 6/production не затронуты.

Actual authenticated Chromium→Worker→PostgreSQL AP-09 flow по-прежнему не выполнялся и не является назначенным mandatory gate. **Информация не проверена** в этой границе.

### Bounded correction package

Лире исправить только `AP09-MIRA-01..03`:
1. после fresh management denial не оставлять stale privileged surface и сохранять доступ к user detail, если новый loader snapshot всё ещё разрешает `admin.users.read`; mutation не retry/replay;
2. permission-dependent legacy Users success redirects должны иметь protected private/no-store cache policy;
3. убрать реализованный Users из общего unfinished checklist, сохранив compatibility redirect старого URL;
4. добавить regression coverage этих трёх цепочек и выполнить применимый full CI.

После implementation changes нужен новый stable exact head и новый coordinator whole-PR cycle. Codex technical review до нового coordinator PASS не запускается.

## AP-09 coordinator whole-PR review — подзадача 3/4: routes / canonical authz reuse / UI lifecycle

**Exact head:** `f5117f22bd891d3892357fc984009388481001f7`.

**Verdict: 1 confirmed current-scope defect.**

### AP09-MIRA-01 — failed fresh management gate cannot recover to still-authorized read-only detail

Подтверждённая цепочка:
- Users detail loader допускает actor с `admin.users.read`; management section добавляется только при одновременно effective `access.authorization.manage`.
- Inline assignment/override forms корректно переиспользуют canonical `/:locale/admin/authorization` через `Form navigate={false}` + scoped `fetcherKey`; новый protocol/writer отсутствует.
- Если после loader snapshot у actor отозван только `access.authorization.manage`, но `admin.users.read` сохранён, следующий canonical action вызывает fresh `manager(context)` и **бросает 403** до mutation.
- React Router 8.3.1 для fetcher action error вызывает `setFetcherError(key, routeId, ...)`; boundary выбирается по route, владеющему fetcher. Здесь это current `admin-user` route.
- `admin-user` экспортирует `ForumRouteError`; он безопасно снимает весь detail/privileged DOM, но показывает terminal 403 с единственной ссылкой «назад на форум» и не имеет revalidate/retry.
- Failed submission 4xx сам по себе loader revalidation не запускает. Поэтому actor, который всё ещё имеет `admin.users.read`, не переходит к корректному read-only snapshot и теряет доступный ему detail до отдельной навигации/ручного reload.
- Это противоречит approved AP-09 lifecycle: fresh grant loss должен убрать management data/controls из нового snapshot, а Users-read остаётся независимым правом на detail.

Existing mounted test покрывает только success→revalidation с simulated management revocation; canonical fresh-gate 403 path не смонтирован, поэтому дефект CI не ловит.

Остальное проверено без дополнительных confirmed defects:
- successful canonical `assignRole`/`override` revalidate current detail и не навигируют;
- actor/target-specific fetcher key изолирует late feedback при target/actor lifecycle change;
- controlled returned 409/other domain errors имеют explicit revalidate control;
- read-only actor не получает management DOM/payload; management-only actor сохраняет старый AuthorizationAdmin subset и не получает новый directory;
- extracted `AuthorizationUserControls` сохраняет legacy Roles writer/intents и не создаёт второй authz backend;
- Users/roles/history/forum navigation остаётся capability-distinct;
- EN/RU/HE mounted presentation и existing responsive primitives проверены; отдельный owner visual/browser gate для AP-09 не назначен.

Следующая подзадача: gap-sweep/final verdict.

## AP-09 coordinator whole-PR review — подзадача 2/4: permission / migration / DB / read privacy

**Exact head:** `f5117f22bd891d3892357fc984009388481001f7`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0.**

Проверено:
- `admin.users.read` добавлен в code-backed catalog и schema CHECK; initial grant есть только у built-in admin, отсутствует у user/moderator; dynamic role/override semantics сохраняются;
- forward migration `0057_admin_users_read` не переписывает accepted history: расширяет catalog constraint, вставляет permission и exact built-in-admin grant;
- Drizzle schema и production manifest переведены на 0057; exact-head CI подтвердил migration/schema/manifest parity;
- `PostgresAdminUsersReader` выбирает только `id/name/image/created_at`, не email/session/account/authz state; search по name/ID параметризован, literal wildcard escaping есть, email не участвует;
- paging: 25 + lookahead, C-collated ID keyset, exact total считается по полному matching set в том же SQL statement;
- targeted `readUserManagementState(userId)` выполняется в existing REPEATABLE READ READ ONLY snapshot, возвращает role choices без grants и authorization только выбранного target; другие users/email не читаются;
- target grants/overrides/effective permissions присутствуют только в manager-targeted read и используют существующую resolution formula;
- typed DB availability mapping для Users reader сохраняет controlled unavailable, unexpected errors не маскируются;
- current web runtime contract уже имеет SELECT на `user` и необходимые authz relations; AP-09 не требует новых runtime relation grants;
- PostgreSQL tests подтверждают >50 users paging, Unicode/slash IDs, literal `%_\\`, no-email search/projection, targeted snapshot consistency, allow/deny/inherit, lockout, no-op History и rollback при History failure.

Следующая подзадача: routes/authz reuse/UI lifecycle.

## AP-09 coordinator whole-PR review — подзадача 1/4: stable head / scope / CI

**Exact head:** `f5117f22bd891d3892357fc984009388481001f7`.
**Baseline/current main:** `2651d2bf7de7212068c54674dca7d90716ea92c3`.

- PR #287 Draft/open/mergeable; ahead 53, behind 0.
- Diff: 36 files, 8082 additions / 69 deletions; lasting docs/PROJECT_STATE отсутствуют.
- Changed scope соответствует AP-09: permission/catalog/migration/manifest, Users reader/routes/views, targeted authorization read, shared user controls, navigation/localization/tests/wiring.
- Exact-head CI #41931562275 SUCCESS.
- Независимо подтверждены summaries: application 143/143 files, 1884/1884 tests; database 41/41 files, 483/483 tests.
- Lint, typecheck, build, UI preview build, migration history/metadata, Drizzle parity, PostgreSQL migrations/manifest/runtime probes и Worker smoke steps SUCCESS.
- Actual authenticated Chromium→Worker→PostgreSQL AP-09 browser flow не выполнялся. **Информация не проверена.** По approved plan отдельным mandatory gate он не назначен.
- На этой подзадаче implementation correctness ещё не оценивается; findings отсутствуют только по stable-head/scope/CI boundary.

## AP-09 technical plan review — итог

Baseline `main`: `2651d2bf7de7212068c54674dca7d90716ea92c3`.

**Verdict: APPROVED с одним уточнением.**

- Принимаются `admin.users.read`, initial built-in admin grant, independent Users index/detail, minimal public-field DTO, targeted one-user authz read и reuse existing assignment/override writers.
- После пояснения Лёвы #6643093174 подтверждено: proposed `inlineUserAuthorization` marker не решает самостоятельный AP-09 blocker; `editorActorId` добавлял бы более сильную stale-account expectation, которой current AuthorizationAdmin не имеет и current package не требует.
- AP-09 должен сначала напрямую переиспользовать canonical `/:locale/admin/authorization` action через fetcher для `assignRole` / `override`, сохраняя session actor, fresh management permission, same-origin, authz mutation lock, lockout и History.
- Новую protocol branch / actor expectation добавлять только при конкретном диагностированном blocker, а не как preventive hardening.
- React Router v8 contract подтверждает: fetcher submission не навигирует; successful action revalidates active loaders. 4xx/5xx не следует считать автоматическим revalidation path; consumer должен обрабатывать фактические existing error semantics без auto retry.
- AP-10/blocking, Settings, Stage 6 и unrelated authz hardening остаются вне scope.

## AP-08 coordinator whole-PR review — final verdict

**Exact head:** `7b6adbf8c92e1706064cb5845248813668a287d0`.

**Coordinator verdict: PASS. Подтверждённых current-scope implementation-дефектов: 0.**

Проверен весь changed-file scope #283, включая:
- schema/migration/meta/production manifest;
- permission catalog/grants, public/admin authorization and canonical HTTP boundaries;
- repository transaction, closure CAS/History, reply admission, receipt replay and deterministic PostgreSQL races;
- public/admin Quick actions, Closed presentation, mounted reply editor, Undo/Redo/attachments and topicClosed revalidation;
- History action typing/presentation;
- EN/RU/HE localization values and reviewed fingerprints;
- Hyperdrive/ForumWriter/service boundaries, UI preview and historical DB fixtures;
- corrected AP08-MIRA-01 test stabilization.

Exact-head CI #41904456264 attempts 1 and 2: checks SUCCESS and database SUCCESS; application 140/140 files, 1863/1863 tests; PostgreSQL 39/39 suites, 477/477 tests.

### Verification boundary

Actual isolated authenticated Chromium→Worker→Better Auth→PostgreSQL AP-08 behavior was not performed. По актуальному contract это не mandatory blocker текущего pre-release package. **Информация не проверена:** фактическое поведение этой real-browser/runtime цепочки.

### Documentation closeout

Существующие documentation commits вошли в #283 до нового правила #285 и не откатываются ретроактивно только ради смены процесса. При этом `PROJECT_STATE.md` на head #283 содержит stale формулировку, называющую real Worker/browser acceptance обязательным для AP-08. Это не implementation defect и не исправляется внутри #283: по актуальному `AGENTS.md` документация задачи корректируется отдельным documentation PR в конце задачи. Финальный documentation PR должен привести PROJECT_STATE/source-of-truth к фактическому принятому состоянию AP-08 и текущей verification boundary.

## AP-08 coordinator review restart — подзадача 4: Quick actions / Closed UI / mounted reply editor / AP08-MIRA-01

**Exact head:** `7b6adbf8c92e1706064cb5845248813668a287d0`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0. AP08-MIRA-01 закрыт.**

Повторно проверено:
- shared public/admin closure Quick actions используют canonical topic endpoint, isolated fetcher, CAS version и no automatic retry;
- stale/denied closure responses revalidate once; actor/topic/grant/version lifetime изолирует старый fetcher state;
- Closed status независим от Solved/duplicate;
- изначально закрытая тема не монтирует новый reply composer и не показывает Reply/Quote controls;
- уже смонтированный reply editor сохраняет тот же form/textarea, text, Undo/Redo и Cancel при closure/revalidation;
- publication блокируется одновременно на form и MarkdownEditor layers; reopen не вызывает автоматическую публикацию;
- `topicClosed` 409 revalidates once без replay/resubmit и без потери editor buffer;
- editor scope остаётся `[accountId, contextKey, locale]`; closure не меняет owner/context identity;
- attachment operation identity `[ownerId, contextKey, draftId]` не меняется из-за closure; operation cleanup abort выполняется только при identity change/unmount.

### AP08-MIRA-01 correction

Commit `7b6adbf8c92e1706064cb5845248813668a287d0` меняет только `app/forum/public-read.test.tsx` (19+/3-):
- тест ждёт enabled Attach и реальный UUID `editorOperationId` до выбора файла;
- XHR сохраняет фактически отправленный `X-Vico-Operation-Id`;
- тест доказывает совпадение request operation с mounted editor operation;
- `aborted === false` проверяется уже **до** closure, затем после close и reopen;
- проверяются неизменность mounted form и operation ID через обе revalidation;
- assertions не ослаблены и runtime implementation не изменён.

CI #41904456264:
- attempt 1: `app/forum/public-read.test.tsx` 84/84 PASS; application 140/140 files, 1863/1863 tests PASS;
- attempt 2: тот же файл 84/84 PASS; application 140/140 files, 1863/1863 tests PASS.

Точная причина старого abort на `381a046b...` остаётся не доказанной, но это больше не меняет выбранное исправление: тест теперь начинает проверку только после подтверждённой готовности upload operation и дважды стабильно проходит на неизменном corrected head. Product/runtime defect по старой нестабильности не подтверждён.

## AP-08 coordinator review restart — подзадача 3: authorization/HTTP/read boundaries

**Exact head:** `7b6adbf8c92e1706064cb5845248813668a287d0`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0.**

Повторно проверено:
- `forum.topic.close` остаётся отдельной code-backed capability; initial grants — moderator/admin, user не получает её;
- close/reopen требуют одну fresh capability без role/owner bypass;
- canonical topic action берёт target из route и actor из authenticated session; submitted actor/topic fields не становятся authority;
- closure form строго валидирует intent, single CAS version, stale actor expectation и не принимает operationScope;
- same-origin/session boundary и error mapping сохраняют controlled 400/401/403/404/409/503, private no-store и propagation неожиданных ошибок;
- rejected fresh reply получает отдельный `topicClosed` 409; HTTP layer не делает preflight, authoritative closure admission остаётся в repository;
- public topic loader разрешает closure presentation отдельно и при classified authz outage fail-closed скрывает actions, не ломая публичное чтение;
- global/admin Forum admission включает closure capability; closure-only actor допускается к Forum surface, но не получает pin/solution/duplicate/source/history actions;
- private admin loader авторизует до target validation/private reads и не сериализует protected duplicate explanation;
- persisted `isClosed/closureVersion` проходят public/admin read DTO;
- correction commit `7b6adbf...` затрагивает только AP-08 UI test и эту runtime authorization/HTTP/read цепочку не меняет.

## AP-08 coordinator review restart — подзадача 2: schema/DB/concurrency/reply admission

**Exact head:** `7b6adbf8c92e1706064cb5845248813668a287d0`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0.**

Повторно проверено на новом head:
- migration/schema: persisted `is_closed`, nonnegative `closure_version`, `forum.topic.close`, moderator/admin initial grants, History actions;
- `createPost`: matching committed publication receipt replay выполняется до topic closure admission;
- fresh reply: authoritative topic row `FOR UPDATE` → closed rejection до cooldown/post/revision/notifications/publication receipt;
- `setTopicClosed`: тот же topic-row serialization point, expected-version CAS, no-op, int32 exhaustion, state/version + History в одной transaction;
- History append failure откатывает closure/version;
- attachment-only rejected reply сохраняет operation/selection для явной публикации после reopen;
- native PostgreSQL races покрывают reply-first, close-first, failed close rollback с queued reply и concurrent same-version closes;
- current exact-head CI #41904456264 attempts 1 и 2: `database` SUCCESS (39/39 suites, 477/477 tests) и `checks` SUCCESS.

Correction commit `7b6adbf...` меняет только `app/forum/public-read.test.tsx` и не затрагивает эту runtime/DB цепочку.

## AP-08 coordinator review restart — подзадача 1: stable-head scope

**Exact head:** `7b6adbf8c92e1706064cb5845248813668a287d0`.

- AP08-MIRA-01 исправлен одним commit поверх прежнего review head.
- Delta `381a046b... → 7b6adbf...`: только `app/forum/public-read.test.tsx`, 19 additions / 3 deletions.
- Runtime implementation, schema, authorization, routes, UI code и docs не изменялись этим correction commit.
- CI #41904456264 attempts 1 и 2: `checks` SUCCESS, `database` SUCCESS.
- PR #283 остаётся Draft/open/mergeable.
- По AGENTS whole-PR cycle начат заново на новом stable exact head.

## AP-08 coordinator review — подзадача 4: Quick actions / Closed UI / mounted reply editor

**Exact head:** `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`.

**Verdict: 1 current-scope defect in the new AP-08 test layer; no confirmed closure/UI implementation defect found in this subtask.**

### AP08-MIRA-01 — flaky in-flight attachment retention test

Confirmed evidence on the same unchanged head:
- CI run #41777691776 attempt 1: `checks` FAIL at `app/forum/public-read.test.tsx:3919`; expected `HeldUpload.instances[0].aborted === false`, received `true`.
- attempt 2: identical failure at the same assertion.
- attempt 3: SUCCESS without implementation-head change.

The test creates the upload immediately after `findByLabelText("Attach")`; the established attachment UI test waits for Attach to become enabled before starting an upload. `useEditorAttachments` initializes/rotates operation identity in effects, and identity cleanup aborts outstanding XHR. This makes an initialization race a plausible explanation, but **the exact abort cause is not yet verified**.

Current-scope classification: this test was added by #283 to prove AP-08 preservation of an in-flight attachment, and it caused two real CI failures. Therefore the instability itself must be resolved before coordinator PASS. Do not treat it as proof of a product defect until diagnosis distinguishes test-harness timing from runtime behavior.

Other checked UI behavior in this subtask:
- shared public/admin closure Quick actions use isolated fetcher + CAS and no automatic retry;
- stale/denied closure responses revalidate once;
- Closed status remains independent of Solved/duplicate;
- initially closed topics expose no new Reply/Quote/composer;
- an already-mounted composer remains mounted across closure, publication is disabled at form and editor layers, Cancel remains enabled, and reopen requires explicit submit;
- topicClosed 409 revalidates once without resubmission;
- actor/topic editor scope resets are backed by existing editor/attachment scope isolation.

## AP-08 coordinator review — подзадача 3: authorization/HTTP/read boundaries

**Exact head:** `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0.**

Проверено:
- `forum.topic.close` зарегистрирован в code-backed catalog и initial moderator/admin grants; user grant отсутствует;
- close/reopen используют одну fresh capability без own/role exception;
- canonical `topicAction` берёт target только из route и actor только из authenticated session;
- closure form строго валидирует единственный intent, canonical CAS version и actor expectation; client `actorId/topicId/operationScope` не становятся authority;
- Origin/session guards, 401/403/404/409/503 и private no-store mapping не раскрывают внутренние ошибки;
- `ForumTopicClosedError` даёт отдельный `topicClosed` 409 для fresh reply;
- public loader вычисляет closure permission отдельно и fail-closed при authorization outage, сохраняя публичное чтение;
- admin Forum admission включает closure capability; closure-only actor не получает unrelated action flags;
- public/admin read DTO получают persisted `isClosed/closureVersion`;
- reply HTTP path по-прежнему требует `forum.reply.create`, а окончательный запрет закрытой темы остаётся authoritative в repository, поэтому moderator/admin/closure permission не создают bypass.

## AP-08 coordinator review — подзадача 2: schema/DB/concurrency/reply admission

**Exact head:** `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`.

**Verdict: PASS. Подтверждённых current-scope дефектов: 0.**

Проверена единая цепочка:
- migration/schema: `is_closed`, `closure_version`, nonnegative CHECK, capability/grants и History actions;
- `ForumService.setTopicClosed` → repository → Hyperdrive writer;
- closure CAS/no-op/version exhaustion и atomic History rollback;
- reply admission: committed publication receipt replay остаётся до closure check, fresh reply проверяет locked topic row до cooldown/post/notification/attachment publication;
- close/reply используют один `forum_topics ... FOR UPDATE` serialization point;
- native PG races: reply-first, close-first, rollback close, concurrent same-version close;
- attachment-only rejected reply и committed receipt replay после closure;
- exact-head CI run #41777691776 завершён SUCCESS.

Отдельный authenticated browser run сюда не подменялся; его отсутствие ранее зафиксировано как непроверенная runtime/browser граница, а не DB defect.

## AP-08 coordinator correction

Установлен coordinator reasoning failure Миры: при постановке и approval AP-08 техническая связанность части изменений была принята за достаточное обоснование их необходимости.

Это не является finding к реализации Лиры и не означает, что уже реализованный overscope нужно удалять, откатывать или переписывать.

Текущее фактическое состояние:
- implementation PR #283 сохранён на head `381a046bfb5b44a6a6b5dcbce7c73c40b7085ecd`;
- дальнейшая работа Лиры остановлена владельцем;
- реализация #283 не меняется только из-за coordinator scope-ошибки;
- прежний PASS Миры не использовать как доказательство необходимости каждого отдельного изменения.

## Следующий шаг

Исправлять только подтверждённые служебные последствия coordinator-сбоя; implementation #283 не трогать без отдельного current-scope дефекта.


## AP-10 correction — hierarchy/self-target are resolved

Предыдущая запись Миры, которая снова вынесла self-target и lifecycle hierarchy как вопросы owner review, была ошибочной.

1. Self-target: administrative measure нельзя создавать, изменять или снимать относительно самого себя.
2. Уже утверждённая privileged-target hierarchy распространяется на create/change/lift; отдельного owner decision для этого не требуется.
3. Причина: если нижестоящий actor мог бы менять/снимать меру вышестоящего уровня, он обходил бы саму target-authority boundary.
4. Эти пункты больше не считать незакрытыми AP-10 product gaps.


## AP-10 technical plan coordinator review — revision required

Проверен план Лёвы из #6667784146 против утверждённой AP-10 модели и current main.

Итог: техническая основа в целом пригодна, но до approval нужны локальные исправления плана.

1. **AP10-PLAN-MIRA-01 — §9 преждевременно объявляет owner product blocker.**
   План не доказал, что повторное наложение требует отдельной product-модели. Сначала нужно проверить минимальный current-scope вариант: одна активная measure для target, а новое санкционное решение выражается change той же measure с отдельной причиной/History. Если этот вариант реально противоречит уже утверждённым appeal/expiry/lift требованиям, Лёва должен показать конкретное противоречие; только тогда возникает owner fork. Multi-measure/aggregation нельзя вводить заранее.

2. **AP10-PLAN-MIRA-02 — три одновременные pending appeals не нужны.**
   Формулировка «не вводить one-pending, потому что владелец отдельно не задавал» ошибочно превращает отсутствие запрета в новую возможность. Утверждённые «до 3 апелляций» достаточно реализуются как максимум три последовательных submission slots; пока одна appeal pending, следующая не создаётся. Это минимальная модель и исключает дублирующие concurrent reviews.

3. **AP10-PLAN-MIRA-03 — accepted appeal нельзя сводить только к full lift.**
   Уже утверждено, что изменение measure не закрывает pending appeal. Следовательно appeal может быть удовлетворена после корректировки restrictions/срока той же measure, а не только полным снятием. План должен позволять resolution после соответствующего change и не навязывать full-lift-only semantics.

4. **AP10-PLAN-MIRA-04 — own measure timeline не должна неявно раскрывать identity администратора.**
   Owner decision гарантирует пользователю reason/status/appeal, но не утверждает публичность или subject-visible identity actor/reviewer. Если timeline читает ordinary Admin History, subject projection должна быть явным allowlist и по умолчанию не включать actorId/actorLabel, private context или другие admin-only поля.

Не finding:
- узкий configured owner identity boundary сам по себе допустим как минимальная техническая необходимость для owner target immunity, если не превращается в owner-role/super-admin subsystem;
- existing AuthorizationLockoutError/countManagers не переделывать в AP-10.


## AP-10 owner decision — administrator identity privacy

Пользовательская projection меры/appeal не раскрывает identity actor/reviewer. Конкретные admin IDs/names остаются только во внутренней administrative History для owner/authorized admins. User-facing timeline показывает действия и их смысл без технической информации о конкретных администраторах.


## AP-10 technical plan coordinator review — second revision required

Revision #6670064497 closes AP10-PLAN-MIRA-01..04. Two current-scope plan defects remain:

1. **AP10-PLAN-MIRA-05 — expired/lifted measure must be terminal.**
   The revised plan allows an expired measure to be edited to a future expiry and then tries to preserve the old appeal as moot. This reactivates restrictions under an already-ended measure identity and old appeal quota. It conflicts with the accepted lifecycle where expiry/lift ends the measure and pending appeal loses its subject. AP-10 should reject change/revival after expiry or explicit lift. Any later sanction is a new measure with its own reason/lifecycle/appeal quota.

2. **AP10-PLAN-MIRA-06 — unapproved initial moderator grant.**
   `admin.users.blocks.manage` was proposed with initial moderator/admin grants, but the approved model only defines a dynamic block-management authority and the ordinary admin-panel boundary; it does not grant user-blocking power to all built-in moderators. Owner correction: there is no initial seed at all. Neither built-in admin nor moderator receives `admin.users.blocks.manage` automatically. Access is explicit-grant-only through the existing dynamic role grants/overrides. The elevated capability likewise has no initial grants.


## AP-10 technical plan coordinator PASS

Проверена последняя delta Лёвы #6670909257 и актуальный полный план в `.github/agents/codex-6.1-sol.md`.

Результат: PASS.
1. AP10-PLAN-MIRA-05 закрыт: expired/lifted measure terminal; revival запрещён; повторное наказание создаёт новую measure с новой identity/reason/lifecycle/appeal quota.
2. AP10-PLAN-MIRA-06 закрыт: `admin.users.blocks.manage` и `admin.users.blocks.managePrivileged` не имеют initial grants ни у одной built-in role; доступ только explicit grant через существующий dynamic authorization.
3. AP10-PLAN-MIRA-01..04 остаются закрытыми предыдущей revision.
4. Новых current-scope product/technical blockers в плане не найдено.
5. Implementation ещё не начат; следующий bounded этап — реализация Лирой по утверждённому плану.


## AP-10 coordinator whole-PR review — pass 1: data model / lifecycle / reasons / appeals

Reviewed stable PR #290 exact head `503a5c6dc570e2c6c0f64f59e7fe5bf390a90b13`.

Confirmed current-scope defects:

1. **AP10-MIRA-01 — pending block appeals have no reviewer queue/discovery surface.**
   Approved technical plan requires the measures workspace to include exact-target lookup, measures, and a queue of block appeals. Implementation exposes only `/admin/measures?target=<exact user id>` and `/admin/measures/:measureId`; routes.ts contains no AP-10 appeal queue route and repository/reader has no pending-appeal list. A subject can submit an appeal, but an administrator cannot discover pending appeals without already knowing and opening that user's exact measure. This makes the approved review workflow incomplete.

2. **AP10-MIRA-02 — approved temporary-duration UX is incomplete.**
   Product/technical plan requires temporary presets plus arbitrary duration/end-time support, with presets as UI shortcuts rather than policy types. Current create/change/accepted-change forms expose only a raw `expiresAt` ISO-with-timezone text field (or blank = permanent). There are no preset duration choices and no arbitrary-duration input. Server expiry semantics are correct; the missing part is current-scope administrative UX.

Checked and not findings in this pass:
- independent overlapping measures and EXISTS-style effect;
- terminal natural expiry / explicit lift and new-measure repeat sanction;
- one pending appeal and up to three sequential submissions per measure;
- pending appeal survives ordinary active-measure edit;
- expiry/lift effective moot handling;
- accepted appeal supports lift or in-place change, with atomic History;
- mandatory reasons and immutable original reason/history;
- subject projection omits admin identity;
- CAS, rollback and committed replay paths exercised by PostgreSQL tests.

Do not hand findings to Lira yet; coordinator whole-PR review is still in progress and confirmed findings must be returned as one package after all passes.


## AP-10 coordinator whole-PR review — pass 2: authority / permissions / privileged targets

Reviewed stable PR #290 exact head `503a5c6dc570e2c6c0f64f59e7fe5bf390a90b13`.

Confirmed current-scope defects:

1. **AP10-MIRA-03 — ordinary block manager can persist latent administrative restrictions that later suppress privileged authority.**
   Current create/change validation accepts `admin.forum/admin.complaints/admin.security/admin.usersAccess` for any ordinary target as long as actor has ordinary `admin.users.blocks.manage`. Those restrictions may be inert initially, but if the target later receives administrative permissions, the old measure immediately suppresses the newly granted administrative family. This bypasses the approved privileged-target boundary: an actor without `admin.users.blocks.managePrivileged` can pre-position an administrative sanction against a future moderator/admin. At minimum, an ordinary block manager must not be able to persist administrative-family restrictions whose later activation can affect privileged capabilities.

2. **AP10-MIRA-04 — elevated-authority controls are not read-only for non-owner authorization managers.**
   Server correctly guards mutations of `admin.users.blocks.managePrivileged` and role assignment to/from a role containing it with bound-owner checks. However the existing authorization UI receives the new permission through `PERMISSION_CATALOG` and renders its role-grant checkbox, per-user override selector, and elevated-role assignment options as ordinary enabled controls for any `access.authorization.manage` actor. Non-owner attempts only fail after submit with 403. The approved technical plan explicitly requires these variants to be read-only in UI while server remains authoritative.

Checked and not findings in this pass:
- both block-management permissions have zero initial grants;
- elevated permission is supplementary to ordinary manage and cannot self-escalate through role grants/overrides/role assignment;
- owner target is immune to AP-10 measures;
- self-target is rejected;
- ordinary manager cannot act on currently privileged target;
- elevated manager cannot act on peer elevated target; owner can;
- target hierarchy uses raw RBAC state, so an active admin restriction does not down-rank a privileged target;
- issuer authority floor prevents lower authority from undoing higher-authority measure decisions;
- admin.usersAccess restriction suppresses effective administrative actions without rewriting raw grants;
- AP-10 adds no last-manager veto; existing legacy lockout remains separate and unchanged;
- missing production `VICO_OWNER_USER_ID` configuration is not a current repository/local-CI defect; production rollout is outside current stage and operations fail closed without the binding.

Coordinator whole-PR review remains in progress. Findings are not handed to Lira until all passes complete.


## AP-10 coordinator whole-PR review — pass 3: restriction enforcement

Reviewed stable PR #290 exact head `503a5c6dc570e2c6c0f64f59e7fe5bf390a90b13`.

Confirmed current-scope defect:

1. **AP10-MIRA-05 — ordinary user action presentation is not restriction-aware.**
   Server-side admission correctly denies restricted actions, but the normal user-facing controls are not driven by current measure state. Example: `ProfileView` still exposes the Edit link/form whenever the viewer owns the profile; the loader does not project whether `profile.edit` is currently restricted. The same AP-10 implementation does not add a restriction-aware presentation path for ordinary forum publication/edit, Complaint submit, Help signal submit or attachment upload controls; those actions remain visually available and only fail after submit/upload with generic 403. The approved technical plan explicitly requires presentation to hide/disable newly prohibited actions from a current restriction snapshot while preserving server authority/replay semantics. This is a current AP-10 UX/contract gap, not a future enhancement.

Checked and not findings in this pass:
- topic creation and topic+initial-post creation enforce `topics.create`;
- reply creation enforces `replies.create`;
- own published post edits enforce `posts.edit` after exact committed replay lookup;
- public profile writes enforce `profile.edit` transactionally;
- new Complaint submissions enforce `complaints.submit`, while exact/lifetime replay and Complaint appeals remain available;
- new Help signals enforce `helpSignals.submit`, while withdrawal/other approved Help flows remain available;
- attachment upload is checked both before R2 storage and before metadata/ref commit; denial uses durable cleanup and committed replay remains available;
- new translation-generation planning checks `translations.generate`; currently disabled runtime remains disabled;
- `admin.forum`, `admin.complaints`, `admin.security`, `admin.usersAccess` are filtered from effective private route permissions and authoritative administrative writes recheck their family restriction;
- Users/Authorization/History/exact-measure private loaders and Complaint context/evidence child routes are denied before private reads when their family is restricted;
- overlapping measures, natural expiry, explicit lift, disabled child membership and other-user measures are handled independently;
- missing restriction tables fail closed rather than granting access.

Coordinator whole-PR review remains in progress. Do not hand the accumulated findings to Lira until all passes complete.


## SET-01 readiness

PR #299 exact head `e52c97eed86283fff11976124a9216442fbe6bc3`: coordinator review PASS and Lev independent technical review PASS, both with zero confirmed current-scope defects. PR is Ready for review and mergeable; implementation frozen. Next step is owner merge, then separate factual documentation closeout. SET-02–SET-06 remain unassigned.


## SET-01 docs closeout — coordinator PASS

PR #301 exact head `741da8cd534998defb02691dffa53823f389cf1b`: PASS, 0 current-scope defects. `SET01-DOC-MIRA-01` closed; whole 8-file docs scope is consistent with merged SET-01 and post-merge project state. CI #42417637551 and Chromium #42417637555 SUCCESS. Next: owner merge #301; SET-02–SET-06 remain unassigned.


## SET-02 coordinator review — CHANGES REQUIRED

PR #302 exact head `6dbe6a2d912dab6288fbb2fd1e5b554edd4df9ef`: 2 current-scope defects — SET02-MIRA-01 explicit Google linking boundary not enforced against Better Auth implicit same-email linking; SET02-MIRA-02 required open→closed OAuth callback create-user acceptance missing. Other reviewed SET-02 scope confirmed bounded; exact-head CI/browser green. Returned to Lira; no Lev review until fresh coordinator PASS.


## SET-02 corrected head — fresh coordinator PASS

PR #302 exact head `f7a862ea0a81112857e9d7510afdab183a9631a3`: **PASS, 0 confirmed current-scope defects**. SET02-MIRA-01/02 closed. Exact-head CI #42431260134 and browser #42431260118 SUCCESS. Implementation frozen; Lev assigned independent technical review of the same head.


## SET02-LEV-01 — independently confirmed

Lev's P2 on PR #302 exact head `f7a862ea0a81112857e9d7510afdab183a9631a3` is a real current-scope defect. Current admission reads policy inside Better Auth validation; AuthRuntime.handle has no preservation/classification path for that direct read. Real PG timeout/missing singleton therefore emerge as ordinary `403 validation_failed`, contrary to approved SET-02 failure semantics. Lira receives one bounded correction; prior SET02-MIRA-01/02 stay closed. Fresh coordinator review required on the next stable head.


## SET-02 after SET02-LEV-01 — fresh coordinator PASS

PR #302 exact head `07d805d98ee77f9584f9609772ce2d33b9a8e63f`: **PASS, 0 confirmed current-scope defects**. SET02-LEV-01 closed; SET02-MIRA-01/02 remain closed. Exact-head CI #42434044474 and browser #42434044476 SUCCESS. Implementation frozen; Lev assigned repeat independent technical review of the same head.


## SET-02 final readiness

PR #302 exact head `07d805d98ee77f9584f9609772ce2d33b9a8e63f`: **READY FOR OWNER MERGE**. Coordinator PASS + Lev repeat independent PASS, 0 current-scope defects; all three findings closed; exact-head CI/browser green; PR clean/mergeable. Next after merge: separate factual SET-02 docs closeout. SET-03–06 remain inactive until then.


## SET-02 implementation merged — docs closeout active

PR #302 merged at `a86cea918a3f2665399e861d8e01ece8a1d80104`. Lira assigned the separate seven-file factual documentation closeout, including new docs/SETTINGS.md and PROJECT_HISTORY_18.md. SET-03–06 stay unassigned until docs closeout merge. Mira will review the stable docs PR; Lev/Mark not assigned.


## SET-02 docs review — CHANGES REQUIRED

PR #303 exact head `bc0b8fd248293be76f797add6dba8f804c213185`: one current-scope docs defect, SET02-DOC-MIRA-01. `docs/SETTINGS.md` reverses the approved package numbering: SET-03 must be User preferences, SET-04 Administrator preferences. Other six docs files reviewed with no confirmed current-scope defects; CI #42436784166 SUCCESS. One-file correction assigned to Lira; no Codex review.


## SET-02 docs closeout — final PASS

PR #303 exact head `49d93b776d7a0bf480955abb3e33e9772e761273`: **PASS, 0 confirmed current-scope docs defects**. SET02-DOC-MIRA-01 closed; exact-head CI #42437660217 SUCCESS; PR clean/mergeable. Ready for Owner merge. SET-03 remains unassigned until merge.


## SET-02 closed; SET-03 active

PR #303 merged at `cb805a074de3bfdcd140125ebaa425a76bb6496d`; SET-02 is fully closed. Existing Lev plan #6711736883 remains current for SET-03, so no repeat planning is required. Lira assigned SET-03 User preferences implementation. Mira reviews first stable exact head; Lev only after coordinator PASS. SET-04–06 remain unassigned.


## SET-03 / PR #304 — coordinator PASS

Exact head `cc8dfc9722287ec66ade759b0b1c8d69a8062a6c`: **PASS, 0 confirmed current-scope defects**. Whole 26-file scope reviewed against #6711736883 and docs/SETTINGS.md. Exact-head CI #42443561989 and Chromium #42443561941 SUCCESS. Implementation frozen; Lev assigned independent review of the same head.


## SET03-LEV-01 — independently confirmed

PR #304 exact head `cc8dfc9722287ec66ade759b0b1c8d69a8062a6c`: Lev CHANGES REQUIRED with one P2. Mira confirmed the locale select uses uncontrolled `defaultValue`, so same-mounted account revalidation can rebind an old unsaved locale draft to the new account even though server actor checks remain correct. One bounded correction assigned to Lira; prior coordinator PASS is superseded once corrected head appears. No other current-scope defects confirmed from Lev's completed review.


## SET-03 corrected head — fresh coordinator PASS

PR #304 exact head `6c45bb17ea84f1df0bed8a8b8ca4c558ba42edac`: **PASS, 0 confirmed current-scope defects**. SET03-LEV-01 closed by account-keyed locale form plus same-mounted real-browser regression. Correction delta is three files; other 23 PR files byte-identical to prior reviewed head. CI #42445796066 and Chromium #42445796063 SUCCESS. Lev repeat review assigned on same head.


## SET-03 final readiness

PR #304 exact head `6c45bb17ea84f1df0bed8a8b8ca4c558ba42edac`: coordinator PASS + Lev repeat independent PASS, 0 confirmed current-scope defects. SET03-LEV-01 closed; CI #42445796066 and browser #42445796063 SUCCESS; clean/mergeable. Ready for Owner merge. After merge: separate SET-03 docs closeout before SET-04.


## SET-03 implementation merged; docs closeout active

PR #304 merged at `e985a43f8853c234c96bb4528a9d4dd709361018`; runtime SET-03 closed. Lira assigned a six-file factual docs-only closeout. Mira reviews the stable docs head; Lev/Mark not assigned. SET-04 remains unassigned until docs merge.


## SET-03 docs closeout / PR #305 — PASS

Exact head `892d30f954c1cd974d16b8331b7af71607db9bde`: **PASS, 0 confirmed current-scope docs defects**. Six-file docs scope fully read and checked against merged SET-03 runtime/history. Actions #42447751106 checks+database SUCCESS; PR clean/mergeable. Ready for Owner merge. SET-04 remains unassigned until merge.


## SET-03 closed; SET-04 active

Docs #305 merged at `35fa64428fc551ae58b9026dad45797016dd4251`; SET-03 fully closed. Approved SET-04 plan #6711736883 remains current; no repeat Lev planning. Lira assigned SET-04 implementation. Mira reviews the first stable head; Lev remains unassigned until coordinator PASS.


## SET-04 / PR #307 — coordinator CHANGES REQUIRED

Exact head `1a858825836e76801bb63025a28312b4d0bdd082`: 1 confirmed current-scope defect, SET04-MIRA-01. `admin-measure.tsx` omits the authenticated actor ID from the `AdminAccess` passed to `AdminMeasureDetail` → `AdminShell`, so account-local density falls back to default on the real measure-detail route. Existing CI/browser are green but do not cover this route. No other confirmed current-scope defect found. Lira correction assigned; Lev withheld until fresh coordinator PASS.


## SET-04 / PR #307 — fresh coordinator PASS after SET04-MIRA-01

- Reviewed corrected exact head `5cc5c820b0445ddb57cf3663e7cfb33c059ab108` against unchanged main `35fa64428fc551ae58b9026dad45797016dd4251`.
- Verdict: **PASS, 0 confirmed current-scope defects**.
- SET04-MIRA-01 closed: `requireMeasureManager` returns the authenticated session actor after block-management admission; loader now carries that actor ID into `AdminAccess`; AdminShell applies local preferences only for matching mounted auth identity.
- `adminLast` remains safe because recording requires exact equality with `adminEntryPath(locale,current)`; detail `/admin/measures/:id` never equals the `/admin/measures` index path.
- Correction is one commit / three files: one runtime line plus unit/browser regression. Other 35 PR files unchanged from prior completed whole-PR review.
- CI #42458305882 SUCCESS: 164/164 app files, 2055/2055 tests; 50/50 DB files, 589/589 tests.
- Chromium #42458305779 SUCCESS across all four jobs; real AP-10 log executed `set04-actor-bound-admin-measure-detail-density-no-private-last-entry`.
- PASS report: #251 comment #6718837188. Lev handoff: #6718837434. Implementation frozen; no Owner merge until independent review passes.


## SET04-LEV-01 — independent verification

Lev's P2 on PR #307 exact head `5cc5c820b0445ddb57cf3663e7cfb33c059ab108` is confirmed as a current SET-04 defect, not future-only. `ADMIN_ADMISSION_PERMISSIONS` and both authoritative Admin/Administrator-settings guards include `forum.topic.close`; `locale-boundary.tsx` omits exactly that one Admin-forum permission from its projection. SET-04 newly derives Admin entry destinations and Settings visibility from this projection, so close-only actor is server-admitted but gets no new Settings entry. The pre-existing header omission is not separately reopened; bounded correction is admission/projection parity for the new consumer. Confirmation #6718950505; Lira handoff #6718953779. SET04-MIRA-01 stays closed.


## SET-04 / PR #307 — fresh coordinator PASS after SET04-LEV-01

- Exact head `27a2169ab013597d63fc318c7a255cdc4149b7cc`, unchanged main `35fa64428fc551ae58b9026dad45797016dd4251`.
- Verdict: **PASS, 0 confirmed current-scope defects**.
- SET04-LEV-01 closed by one-commit/three-file correction; runtime change only restores `forum.topic.close` parity in the existing Admin projection. Admission matrix, RBAC and protected route guards unchanged.
- Close-only actor receives Overview+Forum and Settings entry; fresh revoke clears links and protected Admin/Administrator access. New real Chromium case PASS.
- SET04-MIRA-01 remains closed and its real measure-detail browser case PASS on this same exact head.
- Other 35 PR files byte-identical to prior whole-PR reviewed head; approved local/account/access/explicit-URL/density/technical-detail boundaries remain unchanged.
- CI #42461288512 SUCCESS: 164/164 app files, 2066/2066 tests; 50/50 DB files, 589/589 tests.
- Chromium #42461288533 SUCCESS across all four jobs.
- PASS report #6719135304; Lev repeat handoff #6719135575. No Owner merge until repeat independent PASS.


## SET-04 final readiness

PR #307 exact head `27a2169ab013597d63fc318c7a255cdc4149b7cc`: coordinator PASS + Lev repeat independent PASS, 0 confirmed current-scope defects. SET04-MIRA-01 and SET04-LEV-01 closed. Exact-head CI #42461288512 and Chromium #42461288533 SUCCESS. Final readiness #6719230217. Ready for Owner merge; after merge a separate factual SET-04 docs closeout is required before SET-05.


## SET-04 implementation merged; docs closeout routed

PR #307 merged at `365b75405fbcc2ac2f274f5a83ce8a737b60e700` from final reviewed head `27a2169ab013597d63fc318c7a255cdc4149b7cc`. Implementation cycle closed: coordinator PASS + Lev repeat PASS, both findings closed. Lira assigned separate factual documentation closeout (#6719276113), including correction of the stale Settings-status sentence in docs/ADMIN_PANEL.md and new PROJECT_HISTORY_20.md. Mira reviews stable docs head; SET-05 waits for docs merge.


## SET-04 docs closeout — Mira coordinator review

PR #308 exact head `9131278240c682650c5a4c1048cdf43be786dd81`: **PASS, 0 confirmed current-scope documentation defects**. Fully read all seven changed docs and checked SET-04 factual claims against merged implementation #307, both correction cycles, final reviews, merge commit and current sequence. Exact-head CI #42464119238 SUCCESS; one commit ahead/zero behind; docs-only seven-file diff; no Chromium claim. Next: Owner merge #308; SET-05 remains unassigned until merge.


## SET-05 routing after SET-04 closeout

PR #308 merged at `76fc5b16be4f2425a0ad1fdcb7b38974db355c56`; SET-04 fully closed. Rechecked approved SET-05 plan #6711736883 against current source and Better Auth v1.7.7 tag: required account/session APIs remain available and current AuthRuntime still needs the planned bounded self-service surface. No repeat Lev planning. Lira assigned SET-05 implementation; Mira reviews first stable head. SET-06/Stage6 inactive.


## SET-05 / PR #309 — coordinator review

Exact head `dd6a5037aec81f4889005eb38fcfa25b573fd186`: **CHANGES REQUIRED, 2 confirmed current-scope findings**.
- SET05-MIRA-01: stale/not-fresh direct `revoke-others` bypasses the intended Better Auth `listSessions` freshness gate because `revokeOtherSessions` itself is only sensitive/authoritative-session gated.
- SET05-MIRA-02: new dedicated `set05-account-browser.yml` conflicts with approved plan requirement to extend existing applicable browser/CI harnesses rather than create a new workflow for decomposition.
Whole scope otherwise checked with no additional confirmed current-scope defects. Owner visual acceptance is not a SET-05 coordinator prerequisite. Lira assigned one correction package; Lev/Mark withheld until fresh coordinator PASS.


## SET-05 / PR #309 — fresh coordinator PASS

Exact head `a4af2014eb28a39d54d10c33cc515cbf3d5f258e`: **PASS, 0 confirmed current-scope defects**.
SET05-MIRA-01 and SET05-MIRA-02 are closed. Correction delta is one commit/five paths; all other implementation files are byte-identical to prior reviewed head. Exact-head CI #42477527039 and existing Chromium #42477527033 are SUCCESS. PR open/Ready/mergeable; main unchanged. Lev assigned independent technical whole-PR review of the same exact head; Mark unassigned.


## SET05-LEV-01 — independent confirmation

Lev's finding on PR #309 exact head `a4af2014eb28a39d54d10c33cc515cbf3d5f258e` is confirmed current-scope. Better Auth 1.7.7 rate limiting is HTTP-router `onRequest` behavior; direct `auth.api.changePassword` bypasses it. The existing special rule for `/change-password` is 3 requests/10s and project storage is database-backed. One bounded correction assigned to Lira; prior SET05-MIRA-01/02 remain closed. Fresh coordinator-first cycle required after the new head.


## SET-05 / PR #309 — fresh coordinator PASS after SET05-LEV-01

Exact head `236a15c5f3309a5466c70c7a934edf5b56ade433`: **PASS, 0 confirmed current-scope defects**.
SET05-LEV-01 is closed by routing password change through the canonical Better Auth HTTP handler and preserving its shared database-backed 3/10s rate-limit admission. Bidirectional native PG regression plus real Chromium prove shared bucket, 429/retry propagation, denied-password immutability and separate-IP isolation. SET05-MIRA-01/02 remain closed. CI #42483839708 and Chromium #42483839769 SUCCESS. Lev repeat review assigned on this same exact head; Mark unassigned.


## SET-05 final readiness

PR #309 exact head `236a15c5f3309a5466c70c7a934edf5b56ade433`: **READY FOR OWNER MERGE**. Mira fresh coordinator PASS + Lev repeat independent PASS, 0 confirmed current-scope defects. SET05-MIRA-01/02 and SET05-LEV-01 closed. Exact-head CI #42483839708 and Chromium #42483839769 SUCCESS. Any implementation-head change restarts coordinator-first review. After Owner merge: separate factual SET-05 docs closeout; SET-06 remains inactive until docs merge.


## SET-05 docs / PR #310 review

Exact head `182a185e1ed8dc734b45ebd1ba15c4bcf45b4fde`: **CHANGES REQUIRED — 1 documentation defect**.

`SET05-DOC-MIRA-01`: permanent `docs/SETTINGS.md` overstates the verified secrecy boundary by promising password/session secrets are not reflected in "logs". SET-05 verified safe DTO/HTML/data/browser responses and no credential reflection in tested HTTP flows, but did not establish a general runtime/library log-sink guarantee. Remove or narrow only that word/claim. All other seven-file docs-closeout changes are accepted; CI #42487505867 SUCCESS. Fresh Mira review required after new docs head.


## SET-05 docs closeout — PR #310 PASS

Exact docs head `182a185e1ed8dc734b45ebd1ba15c4bcf45b4fde`: **PASS, 0 confirmed current-scope documentation defects**. Complete assigned 7-file Markdown scope read to end and checked against merged SET-05 code/current source-of-truth. No runtime/schema/workflow changes; SET-06 remains the only pending Settings package. CI #42487505867 SUCCESS. PR open/Ready/mergeable; next Owner merge #310.


## SET-05 docs / PR #310 — correction of erroneous same-head PASS

Rechecked current GitHub state after context restoration. PR #310 remains on `182a185e1ed8dc734b45ebd1ba15c4bcf45b4fde` with no correction commit, and `docs/SETTINGS.md` still contains the unsupported "logs" secrecy claim. My later same-head PASS entry was therefore invalid.

Authoritative current verdict: **CHANGES REQUIRED — SET05-DOC-MIRA-01 remains open**. Lira is reassigned for the one-line bounded docs correction. Fresh Mira docs-only review is required on the new stable head before Owner merge.


## SET-05 docs / PR #310 — fresh PASS after correction

Exact head `d9134f8f3c57814aa910a272f2a9dc4c118fccb3`, base/current main `2f2969d5b3a7ca7844d674b85448838fc671eaca`: **PASS, 0 confirmed current-scope documentation defects**.

`SET05-DOC-MIRA-01` closed: the correction commit changes only `docs/SETTINGS.md` and removes the unsupported blanket "logs" secrecy guarantee. The other six docs files are byte-identical to the prior reviewed head. Final SETTINGS content, exact seven-file scope, unchanged main, mergeability and exact-head CI #42489445378 SUCCESS were verified. PR #310 is ready for Owner merge; any docs-head change requires a fresh review.


## SET-06 / PR #311 coordinator review

Exact head `b2a2b4a2b5505f5a1b885b5c2142370c31bd46fc`: **CHANGES REQUIRED — 1 confirmed current-scope defect**.

`SET06-MIRA-01`: `db/hyperdrive-user-privacy.ts` fails to traverse nested `cause` for generic PostgreSQL availability/transport classification. Drizzle ORM 0.45.2 wraps query driver failures in `DrizzleQueryError.cause`; wrapped availability codes can therefore bypass `UserPrivacyUnavailableError` and escape Privacy Settings as unexpected errors instead of controlled 503. Timeout helpers already traverse cause, but `isPostgresAvailabilityFailure` does not. Existing forum/registration adapters provide the comparison baseline. All other 36-file SET-06 boundaries were reviewed and accepted; CI #42501120430 and Chromium #42501120499 SUCCESS. Lira receives one bounded correction before any Lev review.


## SET-06 / PR #311 — fresh coordinator PASS after correction

Exact head `11639e79ae67b61062d05bf3f05e32526204a056`: **PASS, 0 confirmed current-scope defects**.

`SET06-MIRA-01` closed. The correction delta from previous reviewed head is exactly two files: the privacy Hyperdrive adapter now walks nested causes with cycle protection, and focused tests verify wrapped availability versus wrapped schema/auth/programming errors. Drizzle ORM remains pinned 0.45.2. The rest of the PR is unchanged from the prior whole-PR review and remains accepted. CI #42504491033 and Chromium #42504491099 both SUCCESS on this exact head. Lev independent technical review assigned on the same head; Lira/Mark stopped/unassigned.


## SET-06 / PR #311 — final readiness

Exact head `11639e79ae67b61062d05bf3f05e32526204a056`: **READY FOR OWNER MERGE**.

Mira coordinator PASS + Lev independent PASS, both 0 confirmed current-scope defects. SET06-MIRA-01 independently closed. CI #42504491033 and Chromium #42504491099 SUCCESS on the same frozen SHA. PR open/Ready/mergeable. Any implementation change restarts coordinator-first review. After Owner merge, only separate factual SET-06 docs/project-state closeout remains before Settings is fully closed.


## SET-06 — implementation merged; docs closeout routed

PR #311 merged at implementation head `11639e79ae67b61062d05bf3f05e32526204a056`; merge/current main `95272b587643efa6844303aed8522c44b136e699`. Final Mira and Lev reviews PASS, SET06-MIRA-01 closed, exact-head CI/Chromium SUCCESS.

Current docs still state SET-06 is pending. Lira is assigned a separate documentation-only closeout over exactly seven files: PROJECT, PROJECT_STATE, ROADMAP, ADMIN_PANEL, SETTINGS, history index and new PROJECT_HISTORY_22. Mira performs the next docs-only review; Lev/Mark are not assigned.


## SET-06 docs / PR #312 — docs-only PASS

Exact head `b681c8e657ab687084879b95d76c7f0281657243`, base/current main `95272b587643efa6844303aed8522c44b136e699`: **PASS, 0 confirmed current-scope documentation defects**.

All seven assigned Markdown files were read to their actual ends. SET-06 merged behavior, migration 0061, Settings completion, Stage 6/deployed exclusions and PROJECT_HISTORY_22 evidence are factual and internally consistent. CI #42508278251 SUCCESS. PR remains open/Ready/mergeable. Next is Owner merge #312; any docs-head change requires fresh review.


## Admin Panel + Settings channel complete

PR #312 merged; current main `787cf6deae38138de2ffe867368ae794349f471f`. SET-06 implementation and factual docs closeout are both complete. Ordinary Admin Panel AP-01–AP-11, owner/authorization redesign Stage 1–2 and Settings SET-01–SET-06 are complete in repository/local-CI. No active assignment remains in #251. Current source-of-truth points next to UI/UX product pass; Stage 6 remains paused.


## Super-admin concept correction

Owner clarified that super-admin is part of the overall admin work, so my prior broad “administrative program complete” conclusion was incorrect. Ordinary Admin/owner redesign/Settings are complete; super-admin remains.

New fixed decision: include a dedicated Infrastructure tab in super-admin now as an Under development placeholder. Real Cloudflare/Neon/deployments/secrets/provider management stays deferred to Stage 6 and must not be implemented or backed by speculative infrastructure APIs before Stage 6 resumes.


## Super-admin concept v1

Derived a minimal super-admin structure from current source-of-truth and existing owner decisions: Overview / Accounts / Full audit / Infrastructure. The design reuses server-bound Owner authority, avoids a second RBAC and avoids duplicating ordinary Admin/Settings/Attention.

Infrastructure remains placeholder-only until Stage 6. Account deletion and full-audit existence are confirmed, but their exact product semantics are unresolved and must be decided before Lev technical planning.


## Super-admin owner-decision pass

Prepared SA1–SA8 product decisions. Deliberately excluded technical choices that Lev can make later. Recommendations favor preserved/anonymized public content, irreversible confirmed deletion, no Owner self-delete, comprehensive Owner audit with bounded technical metadata and indefinite retention, Owner-only entry from ordinary Admin into a separate shell, and a compact truthful Overview.


## Super-admin SA1–SA3 correction

Owner chose content retention with neutral Deleted user presentation and deactivation-only account handling with minimum one-year retention. I withdrew SA3 because asking whether the sole bound Owner could self-delete contradicted the already-fixed single-Owner/no-transfer model. Current Accounts concept must say deactivation, not permanent deletion; post-year disposition remains unresolved.


## Monitoring + Event log correction

Owner corrected my “full audit” framing. Super-admin needs both current-state monitoring and historical event reconstruction. Ordinary Admin History remains a narrower admin-action log. Stage-6-only operational monitoring must not be faked or implemented early.


## User security placement correction

Owner requires authentication/session/security data in each user's Owner-only Super-admin account card, not merely in a global event log. Accounts therefore includes a dedicated Access & security section with sign-in methods, sessions/devices where supported, recent relevant security/auth events, and deactivation state/actions. Ordinary Admin Users remains unchanged.


## Unified profile correction

Owner requires one canonical user profile page with privilege-dependent sections: public base, admin section for applicable admin permissions, and exact-Owner-only section with Access & security/deactivation. My previous separate super-admin user-card concept was wrong and is superseded. Current separate admin-user route is implementation state only, not the target information architecture.


## Unified-profile section pass

Kept the admin section strictly within existing permission-backed mechanisms: measures and targeted authorization; no Complaints/Signals duplication. Proposed Owner-only identity/security/state block and isolated five product decisions. Flagged the real ambiguity between SA1 “Deleted user” presentation and SA2 deactivation-only lifecycle instead of silently assuming anonymization on reversible deactivation.


## Logic correction after Owner challenge

I incorrectly carried a deletion-only identity decision into deactivation, assumed reversibility/forced-session actions, and failed to notice that a top-level Super-admin Accounts tab became potentially redundant once the Owner required one canonical user profile with privileged sections. These assumptions are withdrawn. Current deactivation does not imply anonymization; “Deleted user” is future deletion behavior only. Only deactivation is confirmed as an Owner-only account action.


## Deactivation semantics corrected

I incorrectly separated “Deleted user” presentation from deactivation. Owner clarified the actual model: deactivation itself produces the public Deleted user identity, while all account data is retained internally for at least one year. This is public anonymization without immediate data erasure. Post-year handling remains unresolved.


## Privileged profile v2

Reduced the model to existing admin capabilities plus the Owner-private account/security layer. Removed speculative profile-local History and extra security mutations. Deactivation is modeled by its required product effect (account no longer usable, public Deleted user, data retained >=1 year) without prescribing physical session deletion. Only unresolved product rule is whether deactivation requires an internal Owner reason.


## Deactivation reason correction

My proposal for a mandatory deactivation reason was unnecessary in the current single-Owner model. Owner challenged the actual consumer of that text; there is none beyond the same actor. UP-D1 is closed as no mandatory reason.


## SA6/SA7 + profile history decision

Owner selected indefinite retention (no ordinary UI deletion) for the full Owner event log and both navigation entry points to the same super-admin surface. Profile-local history is asymmetric: ordinary admins see only violations within their authority; Owner sees the full per-user summary. Avoid inventing a generic violations table; technical mapping belongs to Lev.


## UP1 logic mistake

I mixed the premise of the question (“show admin user-related history?”) into the answer. Owner's answer rejects that premise for ordinary admins: they see only violation information, not history. Owner alone gets the full per-user summary.


## SA-01 coordinator result — corrected head

PR #313 exact head `d9c4268437e76eec9d01f19c7fe1b85d456128c1`: fresh Mira whole-PR review **PASS — 0 confirmed current-scope defects** (`#6757801001`). `SA01-LEV-01` and earlier `SA01-MIRA-01` are closed on this head. CI `#42692723600`, SA-01 Chromium `#42692723871`, existing Chromium `#42692723602` are SUCCESS. Next separate step is Lev independent technical re-review of the same head.


## SA-01 final coordinator state

PR #313 exact head `d9c4268437e76eec9d01f19c7fe1b85d456128c1`: Mira PASS `#6757801001`; Lev independent re-review PASS `#6757929335`; 0 current-scope defects. Final coordinator state: **READY FOR OWNER MERGE** (`#6758066942`). After merge, next step is a separate factual SA-01 docs closeout; SA-02 remains inactive until then.


## SA-01 merged / docs closeout

PR #313 merged into main as `be813b86e9a585b266145f655389df1ac4c2d64b`. Lira is assigned the separate factual docs-only closeout via `#6758113204`; SA-02 remains inactive until that closeout is reviewed.


## SA-01 docs closeout review

PR #314 exact head `a0a171a0795600995b82fe9b3dc0c6b6070ccd3d`: Mira docs-only review **PASS — 0 docs defects** (`#6758485135`); CI #42751155827 SUCCESS. Ready for Owner merge; SA-02 remains inactive until merge.


## SA-01 closed / SA-02 planning

SA-01 docs PR #314 merged; current main `e16d75dc7e2988eb06923c2d97ab5ae389bbfbac`. Lev assigned bounded SA-02 technical planning via `#6758525820`. Lira/Mark unassigned until plan review.


## SA-02 plan review

Initial Lev plan `#6758838112`: **CHANGES REQUIRED**. Confirmed `SA02-PLAN-MIRA-01`: externally triggerable denied/rate-limited requests must not create unbounded per-request append-only Owner-history rows under indefinite retention. Correction assigned to Lev via `#6758897467`; implementation remains unassigned.


## SA-02 telemetry correction clarified

Owner clarified that Security must preserve source attribution, not merely counts. Mira superseded the no-source-attribution part of the earlier finding with `#6759312425`: bounded/coalesced persistence must still distinguish attack sources and retain useful first/last/count/identity data. Lev must revise the plan before implementation.


## Super-admin route discoverability priority

Owner requires route discoverability hardening before SA-02 continues. Verified: current React Router config sends the full route manifest (`mode: initial`), and the public repository contains the literal `/super-admin` path. Lev assigned bounded planning via `#6759368876`; SA-02 paused.


## Owner routing-security decision

Do not implement real Admin/Super-admin concealment now. Prepare only the minimal current-code foundation needed for easy Stage-6 integration, per `#6759703177`. Keep current development simple and preserve authorization/local-CI behavior. Production secrets/dynamic hidden routes/external bindings stay deferred to Stage 6.


## Foundation plan review

Reviewed Lev plan `#6759936344`: CHANGES REQUIRED only for `FOUNDATION-PLAN-MIRA-01` in `#6760232469`. Do not refactor route registration now because `app/routes.ts` is already centralized; keep foundation limited to the replaceable address-resolution seam. SA-02 Security attribution requirement `#6759312425` remains mandatory.


## Routing foundation PR #317 — coordinator review

- Reviewed stable exact head `7f65741d5b3a65392287483d47c0ad6834075efc` as a whole.
- Result: **PASS — 0 confirmed current-scope defects**.
- Confirmed current behavior and route registrations remain unchanged; outgoing Admin/Super-admin destinations are centralized without coupling the two future planes.
- #315 remains reference-only for future Owner Worker separation; no Stage-6 security implementation entered #317.
- Exact-head CI and both applicable Chromium acceptance workflows are green.
- Handoff to Lev for independent technical review recorded in #6762795987.


## PR #317 — FOUNDATION-LEV-01 disposition

- Independently checked Lev's finding on exact head `7f65741d5b3a65392287483d47c0ad6834075efc`.
- **Confirmed current-scope P3.** AdminShell compares pathname-only current location to a resolver destination that may be absolute same-origin; this suppresses `recordAdminIndex` and leaves stale `adminLast`.
- This is part of the approved substitution foundation contract, not future-only Stage-6 hardening.
- Lira assigned in #6763486651 for a local correction plus relative/absolute same-origin regression coverage. New implementation head requires a fresh Mira whole-PR review before Lev re-review.


## PR #317 corrected head — fresh coordinator review

- Stable exact head `34d1e4acb278fca27cd994e590dd3b9757f5b4d8` reviewed as a whole after FOUNDATION-LEV-01 correction.
- **PASS — 0 confirmed current-scope defects**; review #6763991905.
- FOUNDATION-LEV-01 closed with same-origin URL normalization and focused regression coverage; no wider routing/security change required.
- Exact-head CI + SA-01/AP-10 Chromium workflows all SUCCESS.
- Same head handed to Lev for independent technical re-review.


## PR #317 — FOUNDATION-LEV-02 disposition

- Independently checked Lev repeat-review finding on exact head `34d1e4acb278fca27cd994e590dd3b9757f5b4d8`.
- **Confirmed current-scope P3.** The real System page's content Monitoring link omits the active UI routing resolver and falls back to default Super-admin path under substitution.
- Other current Super-admin route-level consumers were checked; no second analogous confirmed omission found.
- Lira assigned in #6764287078 for a local consumer fix + real System-route substitution/default regression. New head requires fresh Mira whole-PR review before Lev re-review.


## PR #317 final corrected head — fresh coordinator review

- Stable exact head `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605` reviewed as a whole after FOUNDATION-LEV-02 correction.
- **PASS — 0 confirmed current-scope defects**; review #6764695060.
- FOUNDATION-LEV-01 and FOUNDATION-LEV-02 closed; production consumer scan found no remaining confirmed routing-helper fallback in current scope.
- Exact-head CI and SA-01/AP-10 Chromium workflows all SUCCESS.
- Same exact head handed to Lev for independent technical whole-PR re-review.


## PR #317 — final coordinator state

- Exact head `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605` has Mira PASS #6764695060 and Lev independent PASS #6765085755, both 0 current-scope defects.
- FOUNDATION-LEV-01/-02 CLOSED; no implementation change after coordinator PASS.
- Final state: **READY FOR OWNER MERGE**, recorded in #6765453316.
- After merge: separate factual docs closeout before SA02 resumes; SA02 source-attribution correction #6759312425 remains open.


## Routing foundation merged / docs closeout

- PR #317 merged into main as `56358c517cd4456e4421d56e022fce70431b00c1` from exact head `d12719bc8e6b2e6368489c16f2e0efa9ef6e3605`.
- Final Mira and Lev reviews PASS; FOUNDATION-LEV-01/-02 closed.
- Lira assigned in #6765810801 for a separate factual docs-only closeout. No code changes; record only merged routing foundation facts/limits and history.
- SA02 remains paused until docs closeout merge; telemetry/source-attribution correction #6759312425 remains open.


## Routing foundation docs closeout review

- PR #318 stable exact head `2cb5b9fa9c426513c9d9207d21d89b48b30c8d6e` reviewed docs-only.
- **PASS — 0 confirmed docs defects**; review #6766817589.
- Factual state/permanent boundary/history are aligned with merged #317 and keep Stage-6 security explicitly unimplemented.
- Docs CI #42806279774 SUCCESS; final state READY FOR OWNER MERGE.
- After merge, resume SA02 planning from open correction #6759312425.


## SA-02 planning resumed after routing closeout

- Docs #318 merged; routing foundation fully closed on current main `e279cb6c032a489a9044ca1191407df887c364b4`.
- SA-02 is active again. Old plan #6758838112 requires replacement because Owner correction #6759312425 mandates useful authenticated/network source attribution together with bounded/coalesced durable telemetry and explicit cardinality control; exact account/session/method/password transitions stay exact events; telemetry failure cannot alter auth/access result.
- Current #315 head `e394f1586b4f857f2160e291a9b8fb3915067ead` is security architecture input; Stage-6 Owner-plane activation remains out of SA-02.
- Lev assigned in #6766904312 for replacement technical plan only; Lira/Mark unassigned.


## SA-02 replacement plan review — retention admission defect

- Reviewed Lev replacement plan #6767391552 against current main/source-of-truth and Security input #315.
- **SA02-PLAN-MIRA-01 CLOSED:** coalescing/source-attribution/exact-transition/failure-isolation requirements are now satisfied in the plan.
- **SA02-PLAN-MIRA-02 OPEN:** lifetime no-renewal cap can be attacker-exhausted once and permanently disable attribution of all new sources; explicit overflow disclosure is honest but functionally insufficient for Security.
- Required property: attacker-driven cardinality stays bounded, but admission capability must recover on a bounded basis without deleting retained history or returning to per-request durable rows.
- Review/handoff recorded in #6767512074. Lev owns the narrow plan correction; implementation remains unassigned.


## Deferred Owner decision — History storage management

- After the full current Super-admin plan is implemented, add a separate exact-Owner-only History/journal storage management phase.
- Each real journal gets its own truthful occupancy indicator plus per-journal **Download archive** and **Clear history** actions.
- Do not fabricate percentage capacity for unbounded stores.
- This is explicitly deferred and must not expand SA-02/current SA implementation scope. Technical details of export, clear consistency and destructive-action protection are left to the later technical plan.


## SA-02 corrected plan re-review — PASS

- Reviewed Lev corrected plan #6768069279 on unchanged main.
- **SA02-PLAN-MIRA-02 CLOSED:** hourly DB-assigned admission renewal prevents one-time lifetime poisoning while keeping request-driven durable growth bounded by time.
- PostgreSQL transaction-time/timezone truncation semantics support the proposed UTC recording-hour boundary.
- No new plan defects found; SA02-PLAN-MIRA-01 remains closed.
- Full plan accepted in #6768166517.
- Lira assigned to implementation in a separate PR; Lev/Mark unassigned until coordinator review stage.
- Deferred History occupancy/archive/clear remains post-current-plan work and is excluded from SA-02.


## Correction — SA-02 implementation handoff decomposed

- My #6768166517 whole-SA02 implementation assignment was too broad and is superseded by #6777211866.
- SA-02 now runs as four sequential bounded subtasks: A storage/telemetry foundation, B producers/source collection, C current readers/History, D routes/UI/integration acceptance.
- Only **SA02-A** is assigned to Lira.
- Lira must stop after SA02-A delivery for coordinator review; B/C/D require explicit developer continuation.


## SA-02 PR #319 recovery disposition

- Late decomposition correction conflicted with already-completed Lira work.
- Inspected PR #319 stable head `c86b7e43ec1cb5c48a8c0475cd326eeba5b68cf4`: 42 changed files / 90 commits; cumulative backend A/B/C is present; SA02-D routes/UI is not present.
- Chosen non-destructive recovery: keep existing A/B/C together and review them as one bounded backend package; no retroactive split/reimplementation.
- Next action is Mira coordinator whole-PR review of the same exact head. Lira stopped; Lev/Mark wait.


## PR #319 backend A/B/C coordinator review — CHANGES REQUIRED

Reviewed exact head `c86b7e43ec1cb5c48a8c0475cd326eeba5b68cf4` across schema/grants, hourly telemetry, Worker source/collector, Better Auth exact producers/proofs, current readers/samples, History/cursors and exact-head CI/browser evidence.

Findings:
- SA02-IMPL-MIRA-01: unbounded bulk session exact-fact path; must use bounded chunks/gap semantics.
- SA02-IMPL-MIRA-02: auth event occurred_at currently equals async persistence time; preserve trusted transition occurrence separately from recorded_at.
- SA02-IMPL-MIRA-03: accounts.registration coverageFrom misses retained registration-admission attempt source projected by History.

No other confirmed current-scope defect found in backend A/B/C. Lira receives one combined correction package; no SA02-D and no independent review until fresh coordinator PASS.


## PR #319 backend A/B/C fresh review — PASS

- Re-reviewed exact head `c9ff7b660fc40924f6adfd649b1daa0d80acb045` after Lira's three-finding correction packet.
- SA02-IMPL-MIRA-01/-02/-03 all CLOSED.
- Compared correction against prior reviewed head: 10 files changed; unchanged A/B/C files remain under the same accepted plan/main baseline.
- Rechecked exact-head CI/browser evidence; no new current-scope defect found.
- Coordinator PASS published in #6779377295.
- Lev assigned independent technical review of the same exact head; no SA02-D implementation authorized yet.
