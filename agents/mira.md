# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. AUTH-01, AUTH-02a и AUTH-02b прошли coordinator checkpoints.
2. Accepted stack head: AUTH-02b #391 exact `a668fd6d3b0df99056d517a3b2d2a4fe7cef0180`.
3. AUTH-03 активирован; исполнитель по прямому решению владельца — Лёва / Codex-6.1 Sol.
4. Scope AUTH-03: neutral recovery/reset existing verified credential + authenticated fresh-session password creation for Google-only через shared credential service.
5. Email change/unlink остаются AUTH-04; external Stage-6 activation заблокирована.
6. Лёва участвует в implementation stack; final independent reviewer будет другим агентом.

## Следующий переход

После handoff Лёвы провести coordinator checkpoint stable exact head AUTH-03: проверить recovery neutrality, reset atomicity/session revocation, Google-only creation proof/freshness, SET-05 regression, common budgets, observability и отсутствие AUTH-04 scope expansion.
