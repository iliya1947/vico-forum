# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. AUTH-01/AUTH-02a/AUTH-02b/AUTH-03 — coordinator PASS.
2. Accepted stack head: AUTH-03 #392 exact `39c07e539a47b8a317b3a274132337a6dc61cfdf`, branch `feat/auth-03-credential-recovery`.
3. AUTH-04 **активирована владельцем**; bounded contract создан в `stages/AUTH-04/PLAN.md`.
4. Исполнитель AUTH-04 — Лёва. Он должен создать следующую stacked implementation ступень от AUTH-03, выполнить bounded implementation + author self-check/checks и остановиться для моего coordinator checkpoint.
5. External Stage-6 activation остаётся заблокированной.
6. Final independent whole-feature reviewer определяется отдельно, поскольку Лёва участвует в implementation.

## Следующий переход

После AUTHOR PASS AUTH-04 провести coordinator checkpoint на stable exact head. При PASS разрешить отдельный переход к AUTH-05; intermediate PRs не merge.
