# agents/lena.md — личная рабочая память Лены по authentication lifecycle

## Текущее назначение

По прямому решению владельца реализовать **AUTH-02a — transaction/plugin/state/limits/constraints foundation** по `PLAN.md` и `stages/AUTH-02a/PLAN.md`.

## Основание stack

1. AUTH-01 принят на PR #388 / head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`.
2. Новый implementation PR создаётся с base `feat/auth-01-mail-foundation`, не от main.
3. Показывать только bounded diff AUTH-02a.

## Критические границы

1. Не включать mandatory verification и не менять текущий signup/session UX.
2. Не реализовывать AUTH-02b/03/04 user flows.
3. Не выбирать anti-bot provider.
4. Не выполнять real provider calls/external activation.
5. Не расширять future observability enums без фактического producer текущей ступени.
6. Если Better Auth 1.7.7 public extension seam недостаточен и нужен private import/dependency upgrade либо существенное изменение полного плана — остановиться и вернуть finding Мире/Лёве, а не строить обход.
7. Сохранить принятые AUTH-01 boundaries и не менять нижнюю ступень без необходимости; если изменение AUTH-01 всё же потребуется, зафиксировать это до продолжения stack.

## Завершение

После implementation выполнить author self-check и применимые checks, зафиксировать PR/stable exact head/evidence в #320 и остановиться для coordinator checkpoint Миры. AUTH-02b самостоятельно не начинать.

Поскольку Лена участвует в implementation, независимую final whole-feature review этой сборки она не выполняет.

## Текущее продолжение AUTH-02a

Рабочая branch `feat/auth-02a-lifecycle-foundation` от AUTH-01 `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`. Промежуточный head `8d18ef4b830652a35eae24b322b65e0d9e4cda3c`; GitHub compare: 30 commits ahead, 0 behind, 14 изменённых файлов. Implementation PR ещё не создан; AUTH-02a не завершён.

1. Transaction/guard/runtime/evidence code написан. `lifecycle-transaction.server.ts` — explicit owner на том же PG Client, nested join, rollback-only, PostgreSQL 17 transaction-local deadlines (1.5s lock, 5s statement, 15s transaction), bounded staged proof, acknowledgement/uncertain state. `createAuth`/production `useAuth` используют этот owner; BA transaction callback adapter сохраняет AccountState/observer wrappers. Protected standalone writes используют тот же owner, чтобы не публиковать native proof до собственного COMMIT; legacy low-level guard без owner сохраняет старое standalone поведение.
2. `auth-creation-evidence.ts`, `session-deletion-evidence.ts` и existing auth hooks откладывают sanitized receipt/fact до доказанного commit. Rollback/uncertain отбрасывают staged evidence; uncertain connection не используется для flush, incomplete recording отмечается gap. `useAuth` восстанавливает control failure даже если BA преобразовал его в response; known storage failure — safe 503 without auth cookie, unexpected cause — AccountStateUnexpectedError. No new fact/attempt enums.
3. Добавлены/обновлены tests: 8 unit transaction tests; SA04 native atomic signup/rollback, outer lock and caught inactive denial; SA02 OAuth fixture теперь использует canonical owner, вместо старых production partial-commit expectations проверяется rollback; 2 production runtime PG scenarios (final session insert failure и lost acknowledgement после настоящего COMMIT), 2 PG deletion scenarios (single/bulk rollback followed by committed revocation). Эти tests **написаны, не исполнены**. Existing unrelated negative tests сохранены; два устаревших SA04 partial-signup expectations заменены atomic signup proofs без дублирования.
4. Проверена совместимость по tagged Better Auth v1.7.7 sources (signup, createOAuthUser, adapter/transaction context); Cloudflare official compatibility docs подтверждают node:async_hooks при текущем compatibility date. No private imports/dependency upgrade. PROJECT/PROJECT_STATE, SETTINGS, AUTHORIZATION, SUPER_ADMIN и stage plan прочитаны; scope текущей ступени сохраняется.
5. Private lifecycle state + plugin code написан: `app/auth/lifecycle-state.server.ts`, `lifecycle-plugin.server.ts`; один server-only `vico-auth-lifecycle` plugin зарегистрирован через canonical `betterAuthOptions`/`createAuth` на том же request-local PG Client и transaction owner, без новых endpoints, public schema или dependency changes. Public Better Auth 1.7.7 plugin init seam подтверждён tagged `packages/core/src/types/plugin.ts`, `packages/better-auth/src/context/helpers.ts` и root exports. State использует existing verification PK в namespace `vico-auth-lifecycle:v1:<purpose>:<sha256(userId)>`, JSON version/purpose/immutable subject/email snapshot/generation/phase/digest и session ID (не bearer) только для own flows. Purpose isolation, latest-generation replacement, DB clock TTL, CAS DELETE, AccountState lock, live own session expectation, two-phase email-change advance, scoped invalidation и rollback в общей transaction. Token factory получает locked email/recipient snapshot для local signing; raw token остаётся только в server return, mail не отправляется. Будущие endpoints должны получить subject/claims из verified signing/native-token resolution, enforce origin/freshness/eligibility/budgets и выполнять consume+identity/session effects внутри одного `withSubject`; эти product flows не реализованы. Написаны 8 native PostgreSQL cases `tests/database/auth-lifecycle-state.test.ts` (plugin/no endpoints, latest generation/purpose/tamper/replay, expiry/email snapshot, own session/phase, rollback, multi-client consume/issue, deactivation ordering, malformed state/escaped capability). Не исполнены. Следующая подзадача: forward uniqueness constraints (проверить fixtures, migration/schema/snapshot parity), затем shared budgets/challenge seam и applicable checks. Не считать acceptance PASS.
6. Локальная среда перепроверена: Node 22.16.0, pnpm отсутствует, checkout не обнаружен, github.com DNS недоступен. Actual unit/native/Worker/CI checks не выполнялись. Запуск applicable exact-head CI после завершения coherent AUTH-02a; на этом промежуточном head PR/CI не запускались.
