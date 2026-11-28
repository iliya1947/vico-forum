# AUTH-07 — first final whole-feature review Лены

**HOLD — 3 confirmed current-scope defects. Independent gate не закрыт.**

## Основание и границы

PR #388, exact head `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`, base/main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`, tree `6f154a2489913165c088dfa25a20818b62c13662`. Повторно подтверждены open/unmerged и неизменность head/base/main перед handoff. Проверка по TASK, DECISIONS, root PLAN, AUTH-07 PLAN, релевантным source-of-truth contracts, actual source/diff, exact-version Better Auth и primary CI evidence. Лена участвовала в AUTH-02a и начале AUTH-02b, поэтому это first review по owner assignment, а не независимый technical gate.

## Findings — единый correction package

Все три относятся к текущему repository/local-CI scope AUTH-01–AUTH-06, не к будущей внешней активации. Доказательства — статический dataflow и фактические assertions; нового Chromium reproduction не выполнялось. Не заявляется обнаружение account takeover или иной доказанной security exploitation.

### F-B1-01 — stale Account & security после password creation

- Требование: D-04, AUTH-03, root PLAN §9 группы 4/6: own password creation, актуальные methods и session management.
- [credential-creation-view.tsx:24–46](https://github.com/iliya1947/vico-forum/blob/71cdb70d9a5a8b0d0efc3df724d62b736dff7601/app/auth/credential-creation-view.tsx#L24-L46) выполняет raw fetch через credential-recovery-client.ts, меняет локальные created/result/canSubmit, но не revalidates loader. [settings-account.tsx:152–235](https://github.com/iliya1947/vico-forum/blob/71cdb70d9a5a8b0d0efc3df724d62b736dff7601/app/routes/settings-account.tsx#L152-L235) отображает прежние linkedMethods/hasPassword/sessions. Root/HeaderAuthProvider/SettingsShell не обновляют loader по результату этого fetch; heartbeat не revalidates успешный Settings ping. В отличие от этого AccountLifecycleView revalidates on success.
- Следствие: новый password method и change-password controls не появляются сразу после успеха; список иных отозванных сессий остаётся устаревшим при наличии таких сессий. Backend commit сам по себе корректность экрана не доказывает.
- [Connected test:311–347](https://github.com/iliya1947/vico-forum/blob/71cdb70d9a5a8b0d0efc3df724d62b736dff7601/tests/browser/auth-02b/check.py#L311-L347) проверяет success text, DB methods, initiating session, затем заново открывает Settings; не проверяет актуальный экран без reload.
- Done: successful create в mounted Settings сразу показывает оба фактически имеющихся метода, доступное изменение пароля, только действующие сессии; initiating session сохранена. Connected regression без ручного reload и с другой сессией до создания. Сохранить безопасное подтверждение результата и отсутствие повторного terminal POST.

### F-B2-01 — saved account locale игнорируется при собственных auth-письмах

- Root PLAN §3: «Guest locale проверяется из действия; existing user — saved locale/fallback». Сохранённый user.locale — независимая настройка (db/schema.ts, settings-user.tsx, db/hyperdrive-user-locale.ts).
- [credential-lifecycle-endpoints.server.ts:135–136](https://github.com/iliya1947/vico-forum/blob/71cdb70d9a5a8b0d0efc3df724d62b736dff7601/app/auth/credential-lifecycle-endpoints.server.ts#L135-L136), [account-security-endpoints.server.ts:67–78](https://github.com/iliya1947/vico-forum/blob/71cdb70d9a5a8b0d0efc3df724d62b736dff7601/app/auth/account-security-endpoints.server.ts#L67-L78) получают destination.locale из redirectTo/callbackURL; UI передаёт активный route locale. deliverLifecycleMail (auth-mail.server.ts:123–135) использует именно его для URL и template. Сохранённый язык не участвует. Пример: saved RU, EN Settings → EN own mail, хотя требуется RU. Минимальный подтверждённый scope: password-create и обе фазы email-change.
- [PG test:1043–1085](https://github.com/iliya1947/vico-forum/blob/71cdb70d9a5a8b0d0efc3df724d62b736dff7601/tests/database/auth-lifecycle-state.test.ts#L1043-L1085) даже ожидает mailLocales [en,ru] вслед за callback choices, без saved locale fixture. Это discrepancy плана, реализации и теста. Разрешённого supersede в проверенных AUTH-01/03/04 материалах нет.
- Done: собственные auth-письма учитывают authoritative saved locale и approved fallback; проверить несовпадающие saved/route locales и недоступный saved locale. Согласовать template language, locale-local return semantics и guest/existing-user distinction по действующему плану; не расширять redirect trust. Если план требует уточнения, Мира направляет его Лёве, а не молча меняет требование.

### F-B2-02 — password-create replacement link в том же документе не принимается

- AUTH-03 explicit retry/in-memory capture/address-bar scrub, AUTH-06 back/refresh/interruption.
- [credential-creation-view.tsx:16–39](https://github.com/iliya1947/vico-forum/blob/71cdb70d9a5a8b0d0efc3df724d62b736dff7601/app/auth/credential-creation-view.tsx#L16-L39) захватывает proof только когда ref undefined, effect зависит только от enabled, hashchange listener отсутствует. Terminal attempt очищает ref до null. После неудачной попытки можно запросить новое письмо. [auth-mail-urls.server.ts:109–113](https://github.com/iliya1947/vico-forum/blob/71cdb70d9a5a8b0d0efc3df724d62b736dff7601/app/auth/auth-mail-urls.server.ts#L109-L113) формирует новый fragment при неизменном pathname/query. Если открыть новый link в том же документе после scrub первого, меняется только fragment; компонент не получает и не удаляет новый token, password form не появляется. Полная навигация/new tab может работать; не утверждается универсальное падение. AccountLifecycleView уже обрабатывает hashchange для двухфазного email flow.
- Connected script проверяет один успешный create после полной загрузки; отсутствует сценарий повторного proof на mounted page после failed/expired terminal attempt. 
- Done: новый valid proof принимается и scrubbed в том же eligible документе после явного повторного запроса, без автоматического consume/replay, с сохранением exact user/session binding. Regression именно для same-document replacement link после неуспешного proof. Проверить связанные error landing/scrub semantics, не считать неподтверждённую утечку установленной.

## D-01–D-10 / cross-stage evidence

| Решение | Результат рассмотрения |
|---|---|
| D-01 | Canonical pending signup, no session, verification POST, separate credential sign-in; actual PG/Chromium evidence. Дополнительный blocker не установлен. |
| D-02–03 | Better Auth 1.7.7, native Google, no implicit linking, immutable subject. Signed-state callback policy A→A при ambient B существовала в main и покрыта auth-link-identity; не новая регрессия. Local synthetic OAuth не real provider acceptance. |
| D-04 | HOLD по F-B1-01 и F-B2-02, locale discrepancy F-B2-01; backend two-phase email, own expectations/freshness, method and session guards исследованы. |
| D-05 | AccountState/retention сохранены, actual Owner deactivation ×12 operations ×2 ordering PG evidence; purge не добавлен. |
| D-06 | 2FA/passkeys отсутствуют в текущем diff. |
| D-07 | Unified mail boundary, selected Resend/Brevo transport, no fallback, outcomes/escaping/URL constraints. HOLD по saved locale contract F-B2-01. |
| D-08 | Default Worker wiring, hard mail execution fence, no production fake verifier, no new external config/dependency; source-level absence of hidden activation. |
| D-09 | All ten matrix groups considered; actual fault, contention, budget, privacy and history evidence. HOLD: missing regressions for findings and verification limits below. |
| D-10 | Service #320 used; implementation PR #388 unchanged during review. |

Matrix §9: evidence sources — forum-email-registration, auth-runtime, auth-link-identity, registration-auth-admission (1/2); auth-lifecycle-state, credential-lifecycle-proof, whole-lifecycle (3/4/5/6); actual 24 Owner races, sa04-session-atomic, sa02-auth-oauth-rollback (7); 31 fault cases plus native transaction suites (8); auth-lifecycle-budget, auth-rate-limit-concurrency, auth-registration-challenge including F01 and connected AUTH05 (9); owner-auth-facts, owner-user-history, sa07-integration-monitoring, existing Owner/SET suites and guards (10). Complete whole-lifecycle source and both auth browser scripts examined, plus relevant test assertions and regression diff. 0073–0078 SQL/schema/snapshots/journal/manifest/privilege contracts aligned by structural review; DB log confirms manifest 76 tables, positive/negative runtime and split-authority probes. Facts/projections preserve source IDs and distinct mail outcomes; no additional confirmed telemetry/schema blocker.

Primary exact-head evidence:
- [CI #45926789854](https://github.com/iliya1947/vico-forum/actions/runs/45926789854): checks job 140269856248 (3342/3342), database job 140269855936 (1998/1998, auth-whole-lifecycle 62/62 = 31 faults +24 deactivation +7 contention/address reuse). CI merge-ref d28248dbdd915c748ce86b37e28c38f99ba116cb tree equals exact head.
- 20/20 applicable acceptance workflows successful; no relevant failed/cancelled/in-progress. [AUTH02b #45926792730](https://github.com/iliya1947/vico-forum/actions/runs/45926792730) job 140269866326, [AUTH05 #45926792698](https://github.com/iliya1947/vico-forum/actions/runs/45926792698) job 140269866339: logs verify exact checkout and executed scenarios.
- Baseline tree comparison: 200 changed paths (65 added, 135 modified, none deleted); no dependency/lockfile/wrangler/product docs changes. Targeted semantic review of relevant regression replacement assertions and fixture guards: verified fixtures restricted to disposable loopback *_test DB with actual pending signup and separate real login; auth02b/05 tests do not use fixture verification or budget resets for their actual verification/abuse flow.

## K5 correction — accepted

Actual assembly baseline 615d93598daf78945a86fbdc4255bc778ae3403f → exact head: one commit, one file tests/browser/sa04-attachments/check.py +59/-6. Six initial input_value reads now await exact v4 UUID (bounded 25s), then retain downstream assertions; safe diagnostics only. Editor operation is initialized in React effect. [Targeted #45922622929](https://github.com/iliya1947/vico-forum/actions/runs/45922622929) and [final #45926792504](https://github.com/iliya1947/vico-forum/actions/runs/45926792504) both actually completed 33 cases, six readiness checks; checkout trees match. In successful runs initial snapshots already had ready values; original historical failing value/root cause remains unverified. No weakening or product defect established by K5 delta.

## Limitations and future-only

Все группы scope рассмотрены; это не утверждение, что каждый изменённый test file прочитан построчно или что каждая критическая runtime permutation независимо воспроизведена Леной. Новые CI/browser runs не выполнялись. Findings подтверждены source dataflow; runtime reproduction и regression verification остаются в correction cycle. Full connected Worker-level outbound network spy and complete exact-head client secret canary scan independently not established (browser routing guard is not Worker egress trace; prior author evidence and unit global-fetch spy do not substitute for it). Информация не проверена в этой части. Не присваивать PASS на основании зелёных тестов. Existing OAuth callback and native session freshness policy are not new confirmed blockers. Real provider delivery/OAuth/challenge, DNS, keys, deployed binding and edge rules remain explicitly deferred Stage 6, not current-scope defects.

Detailed review trace: [agents/lena.md at review evidence checkpoint](https://github.com/iliya1947/vico-forum/blob/cad1a9029fcc620e0f904b1f9cb5806f832dfe67/agents/lena.md).

## Handoff — STOP

Лена возвращает HOLD Мире. Мира определяет единый bounded correction route по трём findings, разрешает discrepancy с планом при необходимости, назначает исполнителя. Исполнитель самостоятельно проверяет причины и реализует корректный минимальный результат с regressions и self-check. Не считать прежний exact-head CI доказательством исправления. Новый stable head проходит предусмотренный whole-feature review cycle; обязательный independent review Марка только после first review PASS. Код, main, merge, docs closeout и внешняя активация не изменены. Марк не активирован.
