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

Рабочая implementation branch `feat/auth-02a-lifecycle-foundation` создана строго от AUTH-01 `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`. Промежуточный head `8a03e9d442780cf055dbf5393039257ce35ee45b`. GitHub compare: 7 commits, 6 файлов, behind=0. Implementation PR пока не открыт: ступень не завершена.

1. Написаны `app/auth/lifecycle-transaction.server.ts` (request-local explicit owner, nested join, rollback-only, PG17 transaction deadlines, commit/rollback uncertainty, bounded post-commit evidence staging) и 8 unit tests.
2. `session-write-guard.ts` и `betterAuthOptions` принимают explicit lifecycle owner на том же Client; внутри него guard не открывает собственные BEGIN/COMMIT, сохраняет все target/AccountState проверки и standalone behavior вне scope. В tsconfig.node добавлен server module. Добавлены 4 native PG/Better Auth test cases в sa04-session-atomic для opt-in composition (atomic signup, rollback session-insert failure, user lock through outer commit, caught inactive denial).
3. Это незавершённая реализация, не PASS: новый owner пока не передан production createAuth/useAuth. Следующий шаг — canonical request-local integration и staging существующих facts/creation/deletion proof, включая suppress uncertain evidence/response, затем lifecycle state/constraints и budgets. Existing auth flows пока остаются прежними; AUTH-02b не начат.
4. Проверены exact-version upstream sources v1.7.7 (API signup, adapter factory, transaction context и Drizzle adapter); native BA runWithTransaction передаёт callback adapter и выполняет queued hooks только после успешного transaction return. Для текущего PG driver можно владеть BEGIN/COMMIT через тот же guarded adapter; private imports не нужны. Cloudflare compatibility date 2026-09-09 поддерживает node:async_hooks (официальные docs); PG17 поддерживает transaction_timeout. Выбранные начальные transaction-local deadlines 1.5s lock, 5s statement, 15s transaction; statement ниже existing 7s client query deadline.
5. Ограничение среды: container без GitHub DNS/checkout, Node 22.16.0 вместо pinned 24.21.0, pnpm не доступен. GitHub connector edits подтверждены; unit/native/Worker checks не запускались. Не считать 12 новых test cases выполненными. После завершения coherent AUTH-02a выполнить применимые exact-head CI; никаких внешних auth calls. Не менять нижнюю ступень.
