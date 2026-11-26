# AUTH-04 — реализация и author verification

Stacked implementation PR [#393](https://github.com/iliya1947/vico-forum/pull/393), branch `feat/auth-04-account-security`, base accepted AUTH-03 #392 `39c07e539a47b8a317b3a274132337a6dc61cfdf`.

Stable exact head `c9035dce425333d14fdf12d2418f4a8a009edabf`.

## Реализация

Safe own-account DTO содержит email, verification status, native Google row ID и pending email-change phase/expiry. Canonical HTTP/direct endpoints требуют authoritative fresh own session и точное ожидание user/session.

Email change использует существующий lifecycle state и transaction owner. Подписанные proofs связаны с purpose, generation и phase, initiating session хранится в state. Подтверждение старого адреса выдаёт письмо новому, final POST атомарно обновляет verified email, инвалидирует pending verification/reset/create/change и отзывает остальные сессии. Инициирующая сессия сохраняется. Occupied-address conflict даёт controlled 409 с rollback. Independent own/mail budgets списываются для фактического получателя каждого этапа.

Google unlink и guarded native adapter delete/deleteMany перечитывают методы под AccountState lock. После удаления остаётся usable verified password либо настроенный Google. Empty/hashless/unknown methods не удовлетворяют invariant. Unlink сохраняет сессии, provider identity и RBAC не изменяются.

Settings содержит EN/RU/HE формы и безопасную pending/status presentation. Proof хранится в памяти после удаления fragment из URL. Hashchange обрабатывает второе подтверждение при уже открытых Settings. POST transport, fresh-session/identity guards и locale-local callback действуют для обоих этапов.

Добавлены committed emailChanged/methodUnlinked facts, actual session-delete receipts, email-change/unlink attempts и mail outcomes обоих email purposes. Forward migration 0077, snapshot и production schema manifest согласованы с PG17.

## Проверка

Author self-check охватил весь bounded contract и взаимодействие с принятым AUTH-03. Подтверждённых блокирующих дефектов текущего scope не осталось.

PostgreSQL regressions проверили оба подтверждения, replay/restart/stale-session, own identity expectation, hashless unlink, native adapter last-method protection, rollback при revoke failure, occupied-address race и concurrent deletes двух usable methods. В последней гонке один commit и один controlled conflict сохраняют метод входа и сессии. HTTP/direct regression также проверяет RU locale второго письма.

Connected Worker/Chromium проверил Settings old-confirm → new-verify → email commit, сохранение initiating session и Google unlink после добавления password. Доставка использует synthetic transport и локальную тестовую БД. Реальная доставляемость внешних mail providers этой проверкой не устанавливается.

Локально прошли typecheck, выбранные unit/component/PostgreSQL проверки, полный Worker/Chromium AUTH-02b/03/04 и SET-05. В существующем Complaint race test исправлен поздний rejection handler, который мог дать unhandled rejection до ожидаемого assertion. Исходный promise, тип ошибки и lock/state assertions сохранены. AP-10 selector Connect Google уточнён до exact match рядом с Disconnect Google.

## Exact-head CI и acceptance

**AUTHOR PASS** на `c9035dce425333d14fdf12d2418f4a8a009edabf`, 2026-11-26.

[CI #45744054677](https://github.com/iliya1947/vico-forum/actions/runs/45744054677) — PASS, jobs checks/database. Все **16/16 применимых acceptance workflows — PASS** на том же exact head.

- [SA04-M2 connected AP10 Worker Chromium AccountState acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061031) — PASS.
- [SA05 whole Owner deactivation connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061021) — PASS.
- [Own topic title connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061037) — PASS.
- [SA-03 unified profile connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061114) — PASS.
- [SA-01 Super-admin connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061059) — PASS.
- [Topic Watch connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061282) — PASS.
- [Topic Bookmarks connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744060995) — PASS.
- [SA04-S complete AccountState connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061357) — PASS.
- [AUTH-02b connected email verification Worker Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061039) — PASS.
- [SA04-J12 connected AccountState Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061151) — PASS.
- [SA06 native monitoring connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061189) — PASS.
- [Personal Mute/Block connected acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061254) — PASS.
- [SA07 Background Localization Files Data and Integrations connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061011) — PASS.
- [Forum structure whole-feature connected Chromium and local R2](https://github.com/iliya1947/vico-forum/actions/runs/45744061340) — PASS.
- [AP-10 isolated browser acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061238) — PASS.
- [SA08 Overview and whole-program entry connected Chromium acceptance](https://github.com/iliya1947/vico-forum/actions/runs/45744061259) — PASS.

Skipped label-trigger runs и Manual PR test controls в 16/16 не включены.

## Передача Мире

Назначение — coordinator checkpoint всего bounded AUTH-04 против `stages/AUTH-04/PLAN.md` и принятого AUTH-03, на stable exact head выше. Проверить двухфазный email flow, state/session/uniqueness atomicity, last-usable-method invariant во всех entrypoints, observability и Settings integration.

Implementation PR остаётся draft intermediate stack. Coordinator PASS разрешает следующий AUTH-05, independent intermediate review и merge в main здесь не выполняются. Лёва остановился и AUTH-05 не начинал. Реальные mail/anti-bot/Google resources и Stage-6 activation остаются заблокированными до отдельной команды владельца.


## Параллельная проверка Миры

**PASS** на stable exact head `c9035dce425333d14fdf12d2418f4a8a009edabf`.

Проверен весь bounded AUTH-04 diff против stage/root plan и принятого AUTH-03, а не только author report/green CI. Отдельно проверены:

1. two-phase email change: old-address proof → new-address proof → terminal email commit;
2. current user/session/freshness binding, replay/stale generation и account-switch rejection;
3. atomic email update + lifecycle invalidation + other-session revocation и rollback при conflict/failure;
4. occupied-address race и отсутствие partial durable effects;
5. Google unlink и last-usable-method invariant в custom endpoint и guarded native adapter delete/deleteMany;
6. сериализация account-method writes с AccountState/deactivation через общий user lock;
7. observability/facts/attempt closed values, migration 0077, History/Integrations projections и private DTO;
8. Settings proof capture/hash removal, revalidation и сохранение initiating session;
9. exact-head CI #45744054677 и 16/16 applicable connected acceptance как supporting evidence.

Изменение `tests/database/sa04-complaints-n1.test.ts` проверено как узкая test-harness correction: rejection handler добавлен без изменения исходного promise, ожидаемого типа ошибки или lock/state assertions.

Подтверждённых дефектов текущего AUTH-04 scope не установлено. Реальная внешняя mail/Google/Stage-6 acceptance не утверждается и остаётся вне этой ступени.

По прямому решению владельца отдельная независимая bounded-проверка AUTH-04 остаётся назначенной Лене; AUTH-05 до её результата не активируется.

## Независимая bounded-проверка Лены — HOLD

Exact head `c9035dce425333d14fdf12d2418f4a8a009edabf`, base `39c07e539a47b8a317b3a274132337a6dc61cfdf`. R1–R4: contract/source review всех 43 изменённых файлов и существенных зависимостей, actual workflow evidence. Новый runtime/fault-injection прогон Леной не выполнялся. Ниже source-confirmed дефекты, не утверждение об успешном воспроизведении в Chromium/PG. Реализация #393 не изменена.

### Подтверждённые findings текущего scope

1. **F01 — ошибочная классификация отказа session storage (blocker).** `app/auth/account-security-endpoints.server.ts` actor(): clears cached session, calls getSessionFromCtx with strict read-only lookup, treats null as unauthorized. Better Auth **1.7.7** [session.ts](https://github.com/better-auth/better-auth/blob/v1.7.7/packages/better-auth/src/api/routes/session.ts) catches the adapter error in getSession, converts it to FAILED_TO_GET_SESSION, then getSessionFromCtx catches and returns null. New own endpoints return 401 for otherwise valid session under persistent classified lookup outage instead of 503. `auth.server.ts` HTTP handle uses preserveDatabaseError=false; guarded read does not record onAccountStateError. Direct observation is also classified invalid rather than unavailable. Fails root PLAN §2/§7 availability contract. Fail-closed preserved; no unauthorized mutation alleged. Regression: actual canonical HTTP/direct with valid cookie and injected classified session-read outage vs genuine missing session; verify status/classification and no durable effects.
2. **F02 — proof transferred into navigation/query/DTO on guest/error landing (blocker).** New `auth-mail-urls.server.ts` builds /:locale/settings/account#token=…&purpose=email-change. Guest `settings-account.tsx` identity throws 401 before `AccountLifecycleView` captures/scrubs fragment. ForumRouteError → ForumShell → AuthControls → safeForumReturnPath includes location.hash → credentialPagePath serializes it in sign-in/sign-up returnTo query. Following link sends proof to server in query; credential-sign-in loader uses credentialReturnPath and serializes it in returnTo; Google sign-in may propagate in callback/error callback. Violates root PLAN §6/§8 privacy, not an assertion of exact-session bypass. Regression on guest/expired/other-session and error landings: no proof in rendered link, subsequent URL/query/loader DTO/provider callbacks; no terminal mutation or session switch. Preserve explicit restart and exact initiating-session requirement.
3. **F03 — pending/mail/history presentation asserts unproven outcome.** `account-security-view.tsx` renders authAccountOldPending/authAccountNewPending irrespective of mail transport outcome. EN/RU/HE catalog text says link was sent even on disabled/rejected/unavailable/uncertain; request ack correctly neutral, state only proves issuance. Integration/History reuse that user instruction as purpose label and label committed auth.emailChanged as “Request email change”. Distinguish pending vs transport accepted vs delivery and committed event vs request. Current-scope correctness defect, not identity/atomicity failure.
4. **F04 — duplicate field rejection absent (explicit contract mismatch).** Root PLAN §6 requires duplicate rejection. `account-security-endpoints.server.ts` uses strict object schemas, but actual pinned `better-call@1.4.0` [router.ts](https://github.com/better-auth/better-call/blob/v1.4.0/packages/better-call/src/router.ts) calls getBody before endpoint validation; [utils.ts](https://github.com/better-auth/better-call/blob/v1.4.0/packages/better-call/src/utils.ts) uses request.json() (duplicate JSON object key overwritten), formData.forEach assignment (duplicates overwritten for urlencoded/multipart). strict Zod receives one field, not duplicate. Actual wire request with two same-name allowed fields, correct origin/identity and otherwise valid operation is not rejected on duplication. No authority bypass claimed. Regression: duplicate supported body fields rejected before mutation; ordinary valid HTTP/direct behavior unchanged.

Additional confirmed observation, not independently elevated to blocking defect: `session-context.ts` new own paths skip pre-routing actor lookup, so RequestAttemptCollector receives null; endpoint-resolved authoritative actor is not forwarded even after successful identity resolution. Known own-operation failures lose authenticated attribution and per-person History visibility. Root PLAN §8 requires safe target filters; main SUPER_ADMIN.md allows actor when available, not unconditional attribution of every attempt. Assess/fix truthful available-actor propagation within current scope without trusting expected user ID or enabling session refresh. Actual success facts retain correct actor.

### Acceptance matrix — source vs executed evidence

| Stage acceptance | Result/evidence |
|---|---|
| 1 Safe DTO/account switch | DTO excludes token/provider secrets, view key/session/header guard inspected; F02 guest/error navigation violates privacy. New account-switch/guest proof case not evidenced. |
| 2 Two phases, GET read-only | PG service tests + connected browser both phases, original email preserved before commit, initiating ID preserved. Landing no domain terminal mutation; F02 remains. |
| 3 Replay/stale/wrong phase/session/switch/freshness | Native replay/restart and wrong-session test (wrong foreign-owned session fixture); state/generation/fresh lock source checks. Explicit new HTTP stale/freshness/wrong-phase/account-switch denial matrix not evidenced. |
| 4 Interrupt/restart/mail failure | Restart tested in native service, shared issuance-after-commit transport and no auto-retry source checked, connected fake only accepted. Both-phase mail failure UI/state/restart evidence missing; F03. |
| 5 Occupied race | Actual two PG clients, one fulfilled, one AccountMethodConflictError, exactly one email and one pending row; PASS. |
| 6 Invalidation + session policy | Source checks all four purpose invalidations (incl native reset), PG test asserts other own session revoked and initiating remains; connected confirms same session. No AUTH-04-specific pre-existing verification/reset/create proof fixture redeemed after commit; source-only for that combination. |
| 7 Google / Owner / RBAC unchanged | SQL updates only email/email_verified/updated_at, immutable user/provider IDs retained, established exact-owner binding and regression workflows PASS. New post-change Google login/Owner scenario not separately evidenced. |
| 8 Google-only protection | PG service rejects hashless Google+empty credential; browser adds password then unlinks; pure Google-only HTTP denial not evidenced separately. Source invariant correct. |
| 9 Password+Google and empty hash | PG service and canonical HTTP/direct cases + real browser successful unlink; PASS. |
| 10 Concurrent HTTP/direct/persistence unlink and credential operations | Two native adapter deletes tested; existing SA04 lock/deactivation ordering and AUTH-03 credential races pass. Shared-lock source reasoning supports invariant, but actual cross-entrypoint unlink × create/change/reset races not evidenced. Do not call this criterion fully runtime-verified. |
| 11 SET-05/session/Google linking/unrelated regressions | Existing applicable suites/CI/acceptance pass; no additional confirmed source defect in shared locking or regression changes. |
| 12 Applicable exact-head checks | CI #45744054677 checks/database PASS (logs: 251 files/3326 tests; 121 PG17 files/1894 tests); 16/16 applicable connected workflow successes verified, including #45744061039 actual old/new email + unlink steps. PG auth-lifecycle-state 32 tests incl 7 new AUTH-04 cases, SA04-session-atomic 32. F01–F04 not covered by demonstrated passing paths; green CI does not waive acceptance. |
| 13 No external activation | Source scope and synthetic transport boundary checked; connected script asserts no external requests and no page errors. No production-provider acceptance asserted. |

New runtime evidence not run by reviewer. These evidence gaps relate to explicit bounded AUTH-04 acceptance, not a demand to pull the entire AUTH-06 whole-vertical matrix forward. Require focused regressions for confirmed findings and sufficient evidence for current bounded criteria on corrected exact head. No additional confirmed race defect from missing test evidence alone. No new cookie-cache functional defect established: DB-backed configuration has no enabled cookie cache; current session remains valid and user email is loaded from DB. Root PLAN wording about setting cookie after commit should be reconciled if necessary, not independently classified as blocker.

Checked test-only Complaint change: added early observer on original promise while keeping awaited exact rejection/success and lock/state assertions. AP10 exact button selector disambiguates Connect/Disconnect. No evidence of weakening production assertions. Schema snapshot delta only new CHECK and snapshot lineage, parity passed.

**HOLD.** Prior AUTHOR/PARALLEL REVIEW PASS recorded as historical claims on this head, not superseding current findings. Мира — принять HOLD, вернуть bounded correction Лёве, then re-review on corrected exact head. AUTH-05, merge and external activation remain blocked. Лена STOP.


## Coordinator disposition после HOLD Лены

Мира независимо перепроверила F01–F04 на исходном exact head `c9035dce425333d14fdf12d2418f4a8a009edabf`.

**Disposition: HOLD подтверждён; F01–F04 являются реальными дефектами текущего AUTH-04 scope.** Прежний PARALLEL REVIEW PASS Миры отозван.

Проверенные основания:

1. F01 подтверждён pinned Better Auth 1.7.7: `getSessionFromCtx` поглощает ошибку `getSession` и возвращает null, поэтому текущий actor path теряет различие между отсутствующей session и classified storage failure.
2. F02 подтверждён цепочкой текущего UI: guest/error landing не успевает scrub fragment, а `AuthControls → safeForumReturnPath → credentialPagePath` переносит hash с proof в `returnTo` query.
3. F03 подтверждён текущими EN/RU/HE строками и их повторным использованием в History/Integrations: presentation утверждает отправку/тип события сильнее, чем доказанный transport/domain fact.
4. F04 подтверждён root PLAN §6 и pinned better-call 1.4.0: wire body разбирается до strict endpoint schema, duplicate JSON/form fields схлопываются до validation и не отвергаются как duplicates.

Лёва назначен на bounded correction F01–F04. После исправления нужен новый stable exact head, author self-check и применимые focused/CI/acceptance evidence; затем повторный checkpoint Миры. AUTH-05 заблокирована.
