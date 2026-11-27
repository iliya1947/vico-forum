# agents/lena.md — личная рабочая память Лены

## Текущее назначение

**AUTH-07 bounded correction — исполнитель по прямой команде владельца.**

1. Основание: собственный first whole-feature review Лены на #388 exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601` завершён HOLD с тремя confirmed current-scope findings.
2. Мира независимо подтвердила все три findings; technical-plan correction не требуется.
3. Рабочий маршрут: `WORKFLOW.md` → `stages/AUTH-07-CORRECTION/PLAN.md` → при необходимости `stages/AUTH-07/REVIEW.md`.
4. Correction выполняется в assembled PR #388; новый implementation PR не создавать.
5. Scope ограничен F-B1-01, F-B2-01, F-B2-02 и необходимыми regressions. K5 accepted без нового основания не менять.
6. После реализации: author self-check всего correction diff, только применимые exact-head CI/acceptance, записать `stages/AUTH-07-CORRECTION/RESULT.md` и STOP.
7. Поскольку Лена участвует в correction implementation, она **не проверяет corrected head как reviewer**. Следующий whole-feature review выполняет Мира; independent final technical review Марка — только после PASS Миры.
8. Merge, docs closeout и Stage-6 не активировать.

## Correction progress

Local decomposition: C1 — both coupled UI findings and connected regressions; C2 — authoritative locale and regressions (including all relevant mail issuance paths and validated callback/fallback); C3 — full correction diff author self-check and applicable exact-head CI/acceptance; C4 — RESULT/handoff to Mira. No intermediate merge, no reviewer role. This decomposition does not change the approved correction scope.

C1 implemented at #388 commit `2db17d5f7704e46159014b189ef1298f119b2d7f` (tree 863131a7fec68332471c531f6de657dff933115e), parent `71cdb70d...`. Actual compare confirms 5 files only: credential-creation-view.tsx, credential-recovery-client.ts, settings-account.tsx, forum/ui.tsx, tests/browser/auth-02b/check.py. Read main AGENTS, local RULES, TASK, WORKFLOW, assigned correction PLAN; fully read main PROJECT, PROJECT_STATE, ROADMAP, docs/SETTINGS and docs/auth/AUTHORIZATION before edits. Existing main auth deferral is superseded by accepted #320 target; docs closeout separate.

- F-B1-01: use existing Router revalidator after successful raw create-password; do not optimistically invent methods/sessions. Success notice persists when eligible flag becomes false on refreshed loader. Session-keyed component preserves current identity scope; no reissue of terminal POST.
- F-B2-02: capture new fragment on hashchange, scrub via existing helper, keep proof only in ref, explicit user submit. After failure can capture replacement; success or disabled state clears proof. Found related collision: takeCredentialProof("email-change") previously accepted missing purpose and could steal password-create fragment on mounted Settings. Require explicit email-change discriminator (all generated email-change links already carry it); leave password links' original no-purpose shape. Preserve guest/error/stale-account scrub by explicitly discarding both types. No backend identity/proof changes.
- Connected regression: original create flow now provisions actual second own session before Google-only fixture conversion; asserts both methods and current-password control, only current session after create without document reload (JS marker), other session denied. Independent HE verified fixture at end exercises first real issued proof expired via disposable DB (not budget/session), terminal 400, explicit reissue, native same-document hash navigation with new token, no automatic POST, scrub and final success same document/session. Distinct synthetic ingress and separate own budget keep existing email/unlink flow's explicit rate-limit behavior. No provider activation and no K5 changes.
- C1 source diff inspected; tests added but NOT executed, no author PASS. Potential runtime timing/fixture issues still require final CI. Existing user locale for these browser fixtures currently not explicitly set; when implementing C2 preserve English UI scenario by explicitly setting saved en on UI fixtures if necessary; test mismatched saved/route separately, avoid unintentionally changing existing test purpose. C2 should read root PLAN §3 and translation contracts fully where applicable and inspect IssuedLifecycleProof/subject, issuance flows and auth-mail destination helpers; ensure existing-user vs guest semantics, validated callback remains pre-mutation; no raw saved locale from client. Explicitly assess saved null/invalid/inactive fallback, avoid double-read race, mail post-commit. Update existing test asserting callback locales [en,ru] based on corrected contract. No CI until full bounded package committed; then all applicable exact-head runs per PLAN.


C2 implemented in #388 commit `5b29469fe51e716b483d4e610dd90705f5409029` (tree d0a50336d407a92229966bf1956ee38f6ea10f4f), parent `2db17d5f...`; actual compare verified six files: lifecycle-state.server.ts, auth-mail-contract.server.ts, auth-mail.server.ts, auth-mail.test.ts, auth-lifecycle-state.test.ts, auth-02b/check.py. Main unchanged, no schema/config/provider changes, no K5 changes. Root PLAN §3 saved preference and validated callback preservation, correction PLAN explicit own vs guest distinction, existing translation registry/SET03 contracts govern correction.

- Read server issuance flow for all four lifecycle purposes, both own endpoint families, mail rendering/validation and actual guest verification/reset endpoints. Guest signup/resend/reset actions retain their validated action locale (guest flow is defined by operation, not an ambient session); own password-create and both email-change mail phases use authoritative saved preference of locked subject. This is the bounded F-B2-01 scope; no change in guest issuance/admission or identity policy.
- Snapshot user.locale during own proof persist while existing active account lock is held (including second phase); no new persisted proof field, no session claim/client authority or separate post-commit lookup; nullable preference exists since 0003. Delivery remains outside the committed transaction. Bootstrap for null, existing authMailLocale registry resolution/fallback for inactive/unknown/malformed values. No hardcoded language universe.
- Private AuthMailInput adds optional actionLocale: existing input.locale renders message; validateAuthMailActionURL uses separately validated action locale when supplied. Own call passes actionLocale from existing callback destination, not saved locale. Same trusted origin, purpose, path-only return, query/fragment strictness, fallback and post-commit transport outcomes. Guest/default call contract unchanged.
- Unit regressions: five saved locale cases (RU, HE, inactive ka, unknown, empty), HE action path and same-locale return destination independent of rendering; rejects altered action locale, foreign origin and cross-locale return; fake drain and existing fetch prohibition retained. PG existing canonical direct create and mixed HTTP/direct two-phase tests assert saved/action separately, change preference to null between email phases and verify fallback independent of RU action; no removal of prior binding/session/fact assertions. Connected Chromium fixture sets RU preference with EN route; validates actual rendered RU create and old-address mail, HE RTL new-address after preference change; inactive ka replacement fixture falls back to EN; links remain EN. No changes to guest scenarios.
- C2 source diff inspected and test definitions checked, not executed. No AUTHOR PASS. C3 must inspect FULL combined correction diff and all affected callers/tests, ensure C1 browser budget/session timing and revalidation/status/same-document semantics, check no weakening of proof capture, then launch exact-head CI and applicable connected acceptance on stable final head. Do not claim green from old head. C4 handoff only after actual gates. No fresh runtime evidence yet.


C3 — source self-check and exact-head test launch checkpoint (2026-11-27).
- Main AGENTS and service rules/assignment reread. #388 remains open, exact `5b29469fe51e716b483d4e610dd90705f5409029`, base/main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`. Full combined correction patch reviewed against HOLD head: 2 commits, 10 paths, no K5, schema, deps, config or scope change. Checked all affected references in the full #388 diff (all 200 paths, six snapshot patches unavailable and unrelated to correction). Read UI capture/send and revalidation paths, actual mail URL/template/render contract, locked subject state, guest/own dispatch, request registry wiring, fixture locale/migration, relevant mock expectations, fault/Owner race injection and browser acceptance flow. No new confirmed defect from the inspected correction delta. No local dependency/Chromium run executed. Do not claim independent review or final AUTHOR PASS yet.
- F-B1-01 author inspection: revalidation reads server-authoritative methods/session state, success retained when enabled flips, explicit submit and keyed session retained. Connected test creates two genuine sessions before synthetic Google method conversion, asserts reloaded data on unchanged document, revoked session null and current preserved.
- F-B2-02: password/no-purpose vs email-change/explicit-purpose captures separated; reset and guest/error scrub paths examined. New proof accepted on native hashchange and removed from URL, no automatic POST. Test uses expired issued proof, a separate verified account, 4 own attempts <=5/60s, 2 target mails <=3/600s, distinct qualified ingress matching existing connected fixture practice; prior sign-in counts considered against 3/10s native limit. Runtime behavior still needs connected evidence.
- F-B2-01: same locked subject preference for own issuance incl second phase; no raw user-controlled preference, no proof persistence change. Mail template locale and validated URL locale separate; unchanged guest flows. Nullable DB preference already exists, registry fallback and strict URL validation unchanged. Unit five-case regression, PG canonical own methods, connected RU/HE/inactive fallback checks; original acceptance assertions preserved. Fault injections match SQL semantics not positional query count.
- Triggered run:ci and run:acceptance on stable exact head. CI [45936962209](https://github.com/iliya1947/vico-forum/actions/runs/45936962209), jobs checks 140302269642/database 140302269390. Acceptance event 03:55:46Z, 20 applicable runs:
  - 45936965056: AUTH-02b connected email verification Worker Chromium acceptance
  - 45936964985: SA07 Background Localization Files Data and Integrations connected Chromium acceptance
  - 45936964825: SA04-L3 connected authorization Owner Worker Chromium acceptance
  - 45936965095: SA04-K5 connected attachment Worker R2 Chromium acceptance
  - 45936965189: SA04-N connected Complaints Worker Chromium AccountState acceptance
  - 45936965150: AUTH-05 connected anti-abuse Worker Chromium acceptance
  - 45936964887: SA04-S complete AccountState connected acceptance
  - 45936965045: SA06 native monitoring connected Chromium acceptance
  - 45936964838: Topic Bookmarks connected acceptance
  - 45936964981: SA05 whole Owner deactivation connected acceptance
  - 45936965122: Forum structure whole-feature connected Chromium and local R2
  - 45936964826: Personal Mute/Block connected acceptance
  - 45936964861: Own topic title connected acceptance
  - 45936964849: SA04-J12 connected AccountState Chromium acceptance
  - 45936964836: SA04-M2 connected AP10 Worker Chromium AccountState acceptance
  - 45936965130: SA-01 Super-admin connected Chromium acceptance
  - 45936965075: Topic Watch connected acceptance
  - 45936965038: SA08 Overview and whole-program entry connected Chromium acceptance
  - 45936964993: SA-03 unified profile connected Chromium acceptance
  - 45936964848: AP-10 isolated browser acceptance
- Latest status snapshot: CI in_progress/pending; acceptance {"in_progress":15,"queued":5}. First run:ci event duplicate skipped acceptance is not proof; verify actual second-event jobs. No more source edits during checks unless confirmed defect. Next action: query exact-head actual run/jobs, primary logs, compare merge-ref tree if needed; verify all applicable gates and new AUTH07 Chromium assertions actually reached. If a real failure, diagnose fully before changing anything; don't rerun blindly. Then write RESULT and handoff ONLY on proven author PASS. C3 pending, no Mira/Mark activation.


C3 runtime evidence checkpoint:
- #388 still open/unmerged, head/base/main unchanged; merge-ref `6782df04968d4fe85b461ca7ce945e1a46096d55` has exact correction tree `d0a50336d407a92229966bf1956ee38f6ea10f4f` and parents base/head.
- AUTH-02b run 45936965056 job 140302278214 SUCCESS; primary logs confirm checkout exact 5b29469 and all three new AUTH07 markers, including final replacement-after-expiry, plus prior email change, SET05 password change, session revocations, rate-limit explicit retry, RTL/responsive and relogin. Final script exits success after no external browser requests/page errors assertion. No real OAuth/mail provider.
- AUTH-05 run 45936965150 job 140302278686 SUCCESS; primary logs exact checkout, eight connected markers including F01 differential and 429 explicit retry. K5 run 45936965095 job 140302278384 SUCCESS, merge-ref verified above, six actual editor readiness records and CONNECTED_PASS 33.
- Last snapshot 17/20 applicable acceptance success, 3 in_progress (45936964848 AP10 isolated, 45936965189 SA04-N, 45936965038 SA08); CI 45936962209 in_progress, lint/typecheck and DB test/migration/privilege steps successful, full jobs not terminal. No failures in active applicable runs at snapshot. Final CI primary logs/counts and remaining acceptance still pending. AUTHOR PASS not assigned; no handoff yet. Continue C3 without rerunning successful jobs or modifying source absent confirmed defect.
