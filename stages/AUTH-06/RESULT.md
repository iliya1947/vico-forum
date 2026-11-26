# AUTH-06 — whole-lifecycle/security acceptance

## Авторская проверка

PR #395; base AUTH-05 #394 `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`; stable head `2eb3f9c303ad1b67d5348664267eca665f079cf7`.

**AUTHOR PASS. Confirmed current-scope blockers: 0. STOP для coordinator whole-feature review Миры. AUTH-07 не начат.**

## Новые исполняемые проверки

- `tests/database/auth-whole-lifecycle.test.ts`: 62 native PostgreSQL 17 / Better Auth checks: 24 Owner-deactivation races (12 operations × оба порядка); 11 critical-statement rollback faults; 4 applied-COMMIT/ACK-loss cases; 4 observation failures; 4 real lock deadlines; 4 real 5s statement deadlines; 4 actual PG backend terminations; 6 credential mutation × HTTP unlink races; 1 email reuse identity case.
- `tests/browser/auth-02b/check.py`: продолжение actual Worker/Chromium lifecycle до keyboard SET-05 password change (existing sessions сохраняются), revoke-one/revoke-others, EN/RU/HE responsive LTR/RTL и явного повторного входа; navigation refresh/back не расходует proof.
- 20 existing acceptance workflow path filters включают whole-lifecycle test; прежние selectors/assertions сохранены.

## Обязательная matrix root PLAN §9

| Группа | Исполняемый evidence |
|---|---|
| 1. Pending/verified signup, independent Google, explicit link, no same-email claim, duplicate/return injection | `registration-auth-admission`, `forum-email-registration`, `auth-link-identity`, `auth-account-uniqueness`, `auth-runtime`, `auth-registration-challenge`; credential-path/view + route tests; AUTH-02b/AUTH-05 connected |
| 2. Missing/inactive/unverified/verified, no pending session, all registration flags, closure/unavailable | `auth-lifecycle-state`, `registration-auth-admission`, `auth-runtime`, `auth-registration-challenge`, `auth-whole-lifecycle`; AUTH-02b/AUTH-05, AP-10 SET-02 |
| 3. Expiry/replay/purpose/phase/tamper/latest generation, old proof after changes, reused email | `credential-lifecycle-proof`, `auth-lifecycle-state`, new native reused-address case; AUTH-02b connected resend/replay/read-only GET/navigation |
| 4. Reset/create/change proof, SET-05 current password/session policy, foreign/stale/fresh sessions and revocation | `auth-lifecycle-state`, `account-security`, `sa04-session-atomic`, `sa02-auth-password-change/session-deletion`; new native faults/races; expanded AUTH-02b and AP-10 Settings |
| 5. Two-phase email, occupied race, mail failure/restart/account switch, unchanged Google identity | `auth-lifecycle-state` AUTH-04 cases (all mail outcomes/both phases, occupied-address race, real distinct own session); `auth-whole-lifecycle` digest/account-ID snapshot; AUTH-02b connected |
| 6. Last usable method/empty hash/concurrent deletion and set/reset/change | `auth-lifecycle-state` native adapter delete race + HTTP/direct unlink; `sa04-session-atomic`; new six two-client credential × HTTP-unlink races |
| 7. Deactivation vs issuance/consume/verify/reset/link/unlink/email commit, both orders; inactive own sign-out/no reactivation | new 24 actual Owner-command vs native-auth races; `sa04-session-atomic`, `auth-runtime`, `sa05-owner-account-lifecycle`; SA04/SA05 connected and CI Worker smoke |
| 8. Critical SQL/commit faults, real deadlines/connection loss, uncertain mail/observer failure | new 31 native fault/deadline/backend/observer cases; `lifecycle-transaction`, `auth-lifecycle-state`, `sa02-auth-oauth-rollback/creations/observer`; mail transport/outcome suites |
| 9. HTTP/direct/Settings budgets, burst/spoof/unknown-source, privacy/challenge negatives | `auth-lifecycle-budget`, `auth-registration-challenge`, `auth-rate-limit-concurrency`, `account-security`, registration-challenge units; AUTH-05 and AUTH-02b actual 429/expiry/explicit retry; AP-10 |
| 10. Exact Owner/RBAC/SET-02/05, retained state/tombstone, History/filter/paging, inert Integration GET | auth/Owner/History database and route suites; AP-10, SA01/03/04/05/06/07/08 connected; complete forum/notification/attachment baseline |

All file names above refer to committed `*.test.ts[x]` suites in `app/` or `tests/database/`, or committed browser scripts. Все перечисленные группы фактически выполнены на указанном stable exact head; завершённые run IDs ниже.

## Локальное исполнение

- Targeted native suite: **62/62 PASS**, PostgreSQL 17, disposable loopback DB, genuine migrations, separate real clients and PG wait-event evidence. Test barriers hold queries, without faking SQL results. Password hashing finishes before starting Owner's short lock-wait window.
- Connected Worker/Chromium complete flow: **PASS**, disposable private mailbox, no observed browser egress/page errors. Google-only browser account provisioned as a method fixture; Google native sign-in/link exercised with synthetic provider only in PG suites.
- Targeted ESLint, TypeScript build, Python syntax and diff checks: **PASS**.
- Built client scan: **143 files**, no private runtime config value/canary, mailbox table or test server factory/database binding entry point. The SDK's literal `BETTER_AUTH_SECRET` environment getter name is present; its presence is not a secret value. This scan covers known fixture values/markers, not arbitrary secret detection.

## Честные границы

Только repository/local-CI evidence. No real mail/Google/challenge provider, production credentials, DNS, edge rules, deployed delivery, or Stage-6 activation. Browser Google-only provisioning is a fixture, not a live OAuth journey. Applied-COMMIT acknowledgement loss and post-statement transport failures are injected at the client query boundary after genuine SQL; actual backend termination and real timeouts are exercised separately. This author self-check does not replace coordinator/independent whole-feature review or AUTH-07 security gate.

## Exact-head GitHub evidence

[CI #45850580053](https://github.com/iliya1947/vico-forum/actions/runs/45850580053) — **PASS**. `checks` job **140015563495**: lint/typecheck, **3342 tests / 252 files**, build/UI preview, migration history/metadata и Drizzle parity. `database` job **140015563226**: **1992 tests / 123 files**, включая новые **62/62**, clean PostgreSQL 17 migrations, schema manifest, runtime/split-authority privilege/provisioning probes, built Worker smoke/AccountState/Owner checks.

`run:ci` и `run:acceptance` реально приняты label-trigger workflows. Skipped runs от другого label не считаются evidence. Все **20/20** acceptance workflows ниже — completed SUCCESS; AP-10 включает четыре completed SUCCESS jobs. Повторных запусков для этого head не потребовалось.

| Acceptance workflow | Завершённый PASS run |
|---|---|
| AP-10 isolated browser acceptance | [45850589810](https://github.com/iliya1947/vico-forum/actions/runs/45850589810) |
| AUTH-02b connected email verification Worker Chromium acceptance | [45850590111](https://github.com/iliya1947/vico-forum/actions/runs/45850590111) |
| AUTH-05 connected anti-abuse Worker Chromium acceptance | [45850589745](https://github.com/iliya1947/vico-forum/actions/runs/45850589745) |
| Forum structure whole-feature connected Chromium and local R2 | [45850590151](https://github.com/iliya1947/vico-forum/actions/runs/45850590151) |
| Own topic title connected acceptance | [45850589823](https://github.com/iliya1947/vico-forum/actions/runs/45850589823) |
| Personal Mute/Block connected acceptance | [45850590085](https://github.com/iliya1947/vico-forum/actions/runs/45850590085) |
| SA-01 Super-admin connected Chromium acceptance | [45850590152](https://github.com/iliya1947/vico-forum/actions/runs/45850590152) |
| SA-03 unified profile connected Chromium acceptance | [45850590076](https://github.com/iliya1947/vico-forum/actions/runs/45850590076) |
| SA04-J12 connected AccountState Chromium acceptance | [45850589616](https://github.com/iliya1947/vico-forum/actions/runs/45850589616) |
| SA04-K5 connected attachment Worker R2 Chromium acceptance | [45850589968](https://github.com/iliya1947/vico-forum/actions/runs/45850589968) |
| SA04-L3 connected authorization Owner Worker Chromium acceptance | [45850590278](https://github.com/iliya1947/vico-forum/actions/runs/45850590278) |
| SA04-M2 connected AP10 Worker Chromium AccountState acceptance | [45850589764](https://github.com/iliya1947/vico-forum/actions/runs/45850589764) |
| SA04-N connected Complaints Worker Chromium AccountState acceptance | [45850590172](https://github.com/iliya1947/vico-forum/actions/runs/45850590172) |
| SA04-S complete AccountState connected acceptance | [45850589838](https://github.com/iliya1947/vico-forum/actions/runs/45850589838) |
| SA05 whole Owner deactivation connected acceptance | [45850589976](https://github.com/iliya1947/vico-forum/actions/runs/45850589976) |
| SA06 native monitoring connected Chromium acceptance | [45850589818](https://github.com/iliya1947/vico-forum/actions/runs/45850589818) |
| SA07 Background Localization Files Data and Integrations connected Chromium acceptance | [45850590217](https://github.com/iliya1947/vico-forum/actions/runs/45850590217) |
| SA08 Overview and whole-program entry connected Chromium acceptance | [45850589912](https://github.com/iliya1947/vico-forum/actions/runs/45850589912) |
| Topic Bookmarks connected acceptance | [45850590065](https://github.com/iliya1947/vico-forum/actions/runs/45850590065) |
| Topic Watch connected acceptance | [45850590186](https://github.com/iliya1947/vico-forum/actions/runs/45850590186) |

## Передача

Мира: выполнить coordinator whole-feature review AUTH-01–AUTH-06 на stable head PR #395 `2eb3f9c303ad1b67d5348664267eca665f079cf7` против root PLAN и принятого основания AUTH-05. Вход: WORKFLOW → этот RESULT → root PLAN §9 и связанные suite sources; bounded diff PR #395, полная stack implementation видна от AUTH-01. AUTHOR PASS не является coordinator/independent PASS. AUTH-07, перенос stack в первый PR, merge, docs closeout и external activation самостоятельно не выполнялись; следующий переход определяет Мира по действующему плану. При product finding — HOLD с evidence и отдельный correction route.
