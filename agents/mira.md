# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. AUTH-01–AUTH-04 — coordinator PASS.
2. Accepted stack head: AUTH-04 #393 exact `e9f8bad85694321f3279a72b604546a813a856b8`.
3. AUTH-05 активирована как следующая stacked-ступень; bounded contract — `stages/AUTH-05/PLAN.md`.
4. Исполнитель AUTH-05 — Лёва по действующему прямому назначению владельца на AUTH-04→AUTH-06.
5. AUTH-05 не выбирает anti-bot provider и не активирует external resources; Stage-6 gates сохраняются.
6. Final independent whole-feature reviewer определяется отдельно, поскольку Лёва участвует в implementation stack.

## Следующий переход

После AUTHOR PASS AUTH-05 провести coordinator checkpoint stable exact head против stage/root PLAN и accepted AUTH-04. При PASS разрешить отдельный переход к AUTH-06; intermediate merge не выполнять.
