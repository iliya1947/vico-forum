# stages/FINAL-ASSEMBLY/RESULT.md — assembled authentication lifecycle #388

## Сборка

- Accepted final AUTH-06 #395: `615d93598daf78945a86fbdc4255bc778ae3403f`, tree `9cd50834cd1d86aae2a1192bd8ff9fd27aebebbd`, исходный main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
- До assembly сверены все семь implementation PR, actual main ref и accepted AUTH-06 REVIEW/RESULT. Compare old #388 head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a` → accepted final head: ahead 143, behind 0; main → accepted head: ahead 146, behind 0, merge base = main.
- Первый PR #388 / feat/auth-01-mail-foundation обновлён non-forced fast-forward с expected old SHA непосредственно на accepted final head. Не replay/cherry-pick, не squash, не новый product commit. Actual branch ref, commit tree и PR base после переноса проверены. Current main не менялся.
- Полные recursive Git trees main и accepted head (not truncated): 1195 → 1260 non-tree entries; 200 changed paths = 65 added, 135 modified, 0 deleted. Ни service files, ни docs closeout, ни dependency/lockfile/wrangler config changes в diff не обнаружены. В stack уже входят approved forward migrations 0073–0078; assembly не добавила schema changes. Final PR merge-ref commit `9094b1f94a7878dcaf8771d6e4160080bfa299f9` tree = accepted head tree; parents main и final head.
- GitHub автоматически распознал inclusion intermediate #389/#391/#392/#393/#394/#395 в first feature branch, изменил их base на feat/auth-01-mail-foundation и состояние closed/merged=true. Все шесть проверены, descriptions отмечены superseded by #388 с сохранением исторического evidence. Это side effect fast-forward, а не шесть merge операций в main: main ref unchanged; #388 open, unmerged. Branches не удалялись. Название/описание #388 обновлены под всю вертикаль.

## Final substantive author self-check — AUTHOR PASS

Авторская проверка проведена независимо от состояния/результата новых CI/acceptance. Сверены TASK, decisions D-01–D-10, актуальные source-of-truth и accepted whole-feature review/matrix на неизменном exact SHA. Структурно проверен весь 200-file diff, дополнительно прослежены критические source-level paths всей вертикали и assertions связанных tests. Это final author check assembled state, не независимый security gate, не полный построчный аудит всех файлов и не новый local execution. Идентичность принятого tree позволяет использовать предыдущие same-head substantive/runtime evidence без утверждения, что прежние CI заменяют новые #388 runs.

| Root PLAN §9 / граница | Содержательная проверка |
|---|---|
| 1–2. Identity, registration, Google, mandatory verification, SET-02 | auth.server options requireEmailVerification, autoSignIn false, disableImplicitLinking; signup evidence и actual create gate; registration-admission independent flags; canonical guest signup duplicate/closure behavior и отсутствие session; F01 challenge preflight до native existence lookup. AUTH-05 и AUTH-06 accepted evidence на том же code slice. |
| 3. Immutable proof binding / replay | lifecycle-state withSubject, deterministic purpose/user state, token digest, generation/phase/current email/session/DB expiry, conditional consume. Email verification GET inspect vs explicit POST; password-create/reset/email-change purposes. Test source old proofs after email reuse, invalidation and replay. |
| 4. Reset/create/change password, SET-05 and sessions | credential-lifecycle resolve native hashed reset, atomic consume/change/invalidate/revoke; fresh session/verified email and Google-only creation; direct pathless setPassword denied in common hook; credential-auth-endpoints lock/re-read password and session; Settings expectation fields and separate relogin. Tests cover missing proof, revocation and old passwords. |
| 5. Email change | account-security-lifecycle signed two-phase proof, initiating actor/session, locked CAS update, unique conflict, invalidation and revocation; browser proof refresh/back and distinct account/session assertions. Google identity is not rewritten. |
| 6–7. Last usable method and AccountState races | same user lock for lifecycle and guarded native adapter, method check before Google unlink, explicit existing AccountState and session delete boundaries. Reviewed auth-whole-lifecycle actual Owner deactivation in both orders for 12 operations, six credential/unlink races and existing test evidence. No parallel identity store or physical deletion introduced. |
| 8. Fault / uncertainty | lifecycle-transaction owns same client, bounded deadlines, rollback/drain, no facts before acknowledged COMMIT, uncertain commit no replay; issuance delivers after commit. auth-whole-lifecycle fault assertions include consume/mutate/revoke, actual lock/statement/connection faults and observation failure. |
| 9. Abuse and challenge | same server-owned HMAC buckets with DB clock, bounded cleanup, native rate_limit isolation, direct and HTTP parity, 429 headers; SET-02-aware F01 differential email denial, provider-neutral Google receipt in native trusted state, required/no verifier fail closed. No provider selected. |
| 10. Privacy, Owner/RBAC, monitoring and UI | guest session isolation, private/no-store/no-referrer, no token serialized in loader, scrub URL/fragment, explicit POST and no auto replay. Own actions bound to current signed session and expectations. Existing Owner projection keeps canonical IP with quality under SA-02, anonymous challenge actor null, closed safe mail outcomes, no monitoring provider probe; source identities remain existing. EN/RU/HE browser scenario includes explicit verification, recovery, own change/unlink/revoke, keyboard/back/refresh and relogin. |
| Mail / deployment / schema | request-local mail runtime hard fence outside local/test and mandatory injected provider transport, bounded responses/timeouts, fixed URLs and no failover. Production Worker has no test verifier or mail fixture. .env.example disabled/blank credentials. 0073 locks/preflights uniqueness, 0074 HMAC budget schema/expiry, 0075–0078 closed telemetry migrations, journal 79 entries; web-only budget runtime privilege. No new dependencies or external action. |

Conclusion: no confirmed current-scope product defect from substantive review, accepted head/tree unchanged; **AUTHOR PASS**. AUTH-07/independent reviewer gate and real provider/deployed acceptance remain outside this result.

## New #388 exact-head automated checks (separate gate)

Triggered once via run:ci and run:acceptance. New runs filtered by PR number 388, head branch, exact SHA and base. Earlier #395 runs on the same SHA are not counted; skipped label-event duplicates/control workflow excluded.

| Workflow | Run | Observed status |
|---|---|---|
| AP-10 isolated browser acceptance | [45912884300](https://github.com/iliya1947/vico-forum/actions/runs/45912884300) | IN_PROGRESS |
| AUTH-02b connected email verification Worker Chromium acceptance | [45912884327](https://github.com/iliya1947/vico-forum/actions/runs/45912884327) | SUCCESS |
| AUTH-05 connected anti-abuse Worker Chromium acceptance | [45912884205](https://github.com/iliya1947/vico-forum/actions/runs/45912884205) | SUCCESS |
| CI | [45912881134](https://github.com/iliya1947/vico-forum/actions/runs/45912881134) | IN_PROGRESS |
| Forum structure whole-feature connected Chromium and local R2 | [45912884129](https://github.com/iliya1947/vico-forum/actions/runs/45912884129) | SUCCESS |
| Own topic title connected acceptance | [45912884262](https://github.com/iliya1947/vico-forum/actions/runs/45912884262) | SUCCESS |
| Personal Mute/Block connected acceptance | [45912884158](https://github.com/iliya1947/vico-forum/actions/runs/45912884158) | SUCCESS |
| SA-01 Super-admin connected Chromium acceptance | [45912884330](https://github.com/iliya1947/vico-forum/actions/runs/45912884330) | SUCCESS |
| SA-03 unified profile connected Chromium acceptance | [45912884175](https://github.com/iliya1947/vico-forum/actions/runs/45912884175) | SUCCESS |
| SA04-J12 connected AccountState Chromium acceptance | [45912884290](https://github.com/iliya1947/vico-forum/actions/runs/45912884290) | SUCCESS |
| SA04-K5 connected attachment Worker R2 Chromium acceptance | [45912884312](https://github.com/iliya1947/vico-forum/actions/runs/45912884312) | IN_PROGRESS (attempt 2) |
| SA04-L3 connected authorization Owner Worker Chromium acceptance | [45912884310](https://github.com/iliya1947/vico-forum/actions/runs/45912884310) | SUCCESS |
| SA04-M2 connected AP10 Worker Chromium AccountState acceptance | [45912884335](https://github.com/iliya1947/vico-forum/actions/runs/45912884335) | SUCCESS |
| SA04-N connected Complaints Worker Chromium AccountState acceptance | [45912884181](https://github.com/iliya1947/vico-forum/actions/runs/45912884181) | SUCCESS |
| SA04-S complete AccountState connected acceptance | [45912884154](https://github.com/iliya1947/vico-forum/actions/runs/45912884154) | SUCCESS |
| SA05 whole Owner deactivation connected acceptance | [45912884243](https://github.com/iliya1947/vico-forum/actions/runs/45912884243) | SUCCESS |
| SA06 native monitoring connected Chromium acceptance | [45912884276](https://github.com/iliya1947/vico-forum/actions/runs/45912884276) | SUCCESS |
| SA07 Background Localization Files Data and Integrations connected Chromium acceptance | [45912884208](https://github.com/iliya1947/vico-forum/actions/runs/45912884208) | IN_PROGRESS |
| SA08 Overview and whole-program entry connected Chromium acceptance | [45912884295](https://github.com/iliya1947/vico-forum/actions/runs/45912884295) | IN_PROGRESS |
| Topic Bookmarks connected acceptance | [45912884211](https://github.com/iliya1947/vico-forum/actions/runs/45912884211) | SUCCESS |
| Topic Watch connected acceptance | [45912884249](https://github.com/iliya1947/vico-forum/actions/runs/45912884249) | SUCCESS |

CI: IN_PROGRESS. Acceptance: 16/20 success, 4 pending, 0 completed non-success. Snapshot only, not a final CI verdict. 

K5 [run 45912884312](https://github.com/iliya1947/vico-forum/actions/runs/45912884312), first failed job 140225165150: log confirms real Worker + Better Auth twelve-session fixture completed, then `tests/browser/sa04-attachments/check.py:396 assert len(operation) == 36` before the first attachment upload. Test reads editorOperationId immediately following form count and optional resume; actual returned value not recorded. Identical test blob `ca37511a35452f515b41b150919ac3d30d45551a` on previous AUTH-05 head with same prior assertion symptom (#45825205521 attempt 2 success). Previous #395 K5 #45897171830 passed attempt 1 on identical current SHA. No confirmed product defect from this symptom; possible initialization timing, not proven cause. Re-run only failed job #45912884312 accepted, attempt 2; no changes to product, assertion, or test. Preserve first failure in evidence and qualify retry, do not assume success.

## Next

Check actual #388 runs/jobs; if all applicable checks pass on exact head/base, record evidence and STOP for Mira's final whole-feature coordinator review. If any product defect or changed tree/base confirmed, HOLD/evidence/STOP without implementing a fix in assembly. No AUTH-07, main merge, independent final review by Ada or external activation.
