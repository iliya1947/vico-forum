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

Рабочая branch `feat/auth-02a-lifecycle-foundation` от AUTH-01 `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`. Промежуточный head `b495910270ec03b8c60b81b2282fcd3c1a3372ac`; GitHub compare: 22 commits ahead, 0 behind, 11 изменённых файлов. Implementation PR ещё не создан; AUTH-02a не завершён.

1. Transaction/guard/runtime/evidence code написан. `lifecycle-transaction.server.ts` — explicit owner на том же PG Client, nested join, rollback-only, PostgreSQL 17 transaction-local deadlines (1.5s lock, 5s statement, 15s transaction), bounded staged proof, acknowledgement/uncertain state. `createAuth`/production `useAuth` используют этот owner; BA transaction callback adapter сохраняет AccountState/observer wrappers. Protected standalone writes используют тот же owner, чтобы не публиковать native proof до собственного COMMIT; legacy low-level guard без owner сохраняет старое standalone поведение.
2. `auth-creation-evidence.ts`, `session-deletion-evidence.ts` и existing auth hooks откладывают sanitized receipt/fact до доказанного commit. Rollback/uncertain отбрасывают staged evidence; uncertain connection не используется для flush, incomplete recording отмечается gap. `useAuth` восстанавливает control failure даже если BA преобразовал его в response; known storage failure — safe 503 without auth cookie, unexpected cause — AccountStateUnexpectedError. No new fact/attempt enums.
3. Добавлены/обновлены tests: 8 unit transaction tests; SA04 native atomic signup/rollback, outer lock and caught inactive denial; SA02 OAuth fixture теперь использует canonical owner, вместо старых production partial-commit expectations проверяется rollback; 2 production runtime PG scenarios (final session insert failure и lost acknowledgement после настоящего COMMIT), 2 PG deletion scenarios (single/bulk rollback followed by committed revocation). Эти tests **написаны, не исполнены**. Existing unrelated negative tests сохранены; два устаревших SA04 partial-signup expectations заменены atomic signup proofs без дублирования.
4. Проверена совместимость по tagged Better Auth v1.7.7 sources (signup, createOAuthUser, adapter/transaction context); Cloudflare official compatibility docs подтверждают node:async_hooks при текущем compatibility date. No private imports/dependency upgrade. PROJECT/PROJECT_STATE, SETTINGS, AUTHORIZATION, SUPER_ADMIN и stage plan прочитаны; scope текущей ступени сохраняется.
5. Следующая подзадача: canonical lifecycle service/plugin foundation + private verification state primitives. Затем forward uniqueness constraints и shared budgets/challenge seam, applicable checks. Пока отсутствуют lifecycle state, plugin seam, migration, budget/challenge primitives; не считать runtime integration acceptance PASS. Не открывать пользовательские verification/recovery endpoints, не менять current signup/session UX, не активировать providers.
6. Локальная среда перепроверена: Node 22.16.0, pnpm отсутствует, checkout не обнаружен, github.com DNS недоступен. Actual unit/native/Worker/CI checks не выполнялись. Запуск applicable exact-head CI после завершения coherent AUTH-02a; на этом промежуточном head PR/CI не запускались.
