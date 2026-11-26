# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. AUTH-01/AUTH-02a/AUTH-02b/AUTH-03 — coordinator PASS.
2. Accepted stack head: AUTH-03 #392 exact `39c07e539a47b8a317b3a274132337a6dc61cfdf`.
3. Повторный AUTH-03 checkpoint подтвердил закрытие change/reset invalidation, native opaque+hashed reset model и AUTH-03 observability findings; новых confirmed blockers не установлено.
4. CI #45730609055 и 16/16 applicable acceptance PASS — supporting evidence.
5. Следующая stacked-ступень — AUTH-04 own Account & security completion; исполнитель по прямому решению владельца Лёва, пока не активирована.
6. External Stage-6 activation остаётся заблокированной.
7. Final independent whole-feature reviewer определяется отдельно.

## Следующий переход

При следующем продолжении активировать AUTH-04 поверх accepted AUTH-03 head. Не merge intermediate PRs и не начинать final review.
