# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. AUTH-01–AUTH-05 — coordinator PASS.
2. Accepted stack head: AUTH-05 #394 exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`.
3. AUTH-05 проверена против stage/root PLAN и accepted AUTH-04: fresh-only email/Google challenge admission, public Better Auth 1.7.7 OAuth serverContext/create-user transaction seam, fail-closed config/verifier behavior, raw-proof privacy, budget parity/atomicity/DB-clock/native isolation, trusted/unknown network, observability/schema и отсутствие external activation.
4. Exact-head CI #45825184525 и 20/20 applicable connected acceptance PASS являются supporting evidence. K5 attempt 1 имел старый timing failure `len(operation)==36`; attempt 2 прошёл на том же head без изменения кода/assertion.
5. Подтверждённых current-scope blocking defects AUTH-05 не установлено.
6. AUTH-06 ещё не активирована; external Stage-6 activation остаётся заблокированной.
7. Final independent whole-feature reviewer определяется отдельно, поскольку Лёва участвует в implementation stack.

## Следующий переход

Отдельно активировать AUTH-06 whole-lifecycle/security acceptance поверх accepted AUTH-05 branch `feat/auth-05-anti-abuse` / exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`. До этой активации implementation не начинать.
