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
