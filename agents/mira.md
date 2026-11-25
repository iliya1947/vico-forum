# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. AUTH-01: PR #388 / head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`, coordinator PASS.
2. AUTH-02a: PR #389 / head `06656fef2d85e03c62b7ab69b03fa96ecfc68653`, author PASS + coordinator PASS.
3. AUTH-02b активирован и по прямому решению владельца переназначен Лене / GPT-6.2; прежнее назначение Лёвы снято до появления сохранённой реализации.
4. Base AUTH-02b — `feat/auth-02a-lifecycle-foundation` exact `06656fef2d85e03c62b7ab69b03fa96ecfc68653`.
5. AUTH-02b ограничен mandatory verification/resend/UI; AUTH-03 recovery/password creation не активирован.
6. Лёва реализовал AUTH-01; Лена реализовала AUTH-02a и теперь AUTH-02b. Final independent reviewer всей сборки определяется отдельно.

## Следующий переход

После завершения Лёвой AUTH-02b провести coordinator checkpoint stable exact head. Проверять фактическую mandatory-verification модель, signup/session contract, verification terminal semantics, resend/privacy, SET-02 interaction, Google isolation и отсутствие AUTH-03 scope expansion. Green CI использовать только как evidence после самостоятельной проверки.
