# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. Full auth plan: PASS; delivery mode stacked AUTH-01→AUTH-06, AUTH-07 final gate.
2. AUTH-01: PR #388 / head `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`, coordinator checkpoint PASS.
3. AUTH-02a активирован и по прямому решению владельца назначен Лене / GPT-6.2; предыдущее назначение Лиры снято до implementation.
4. AUTH-02a implementation PR/head пока отсутствует.
5. Лёва реализовал AUTH-01, Лена реализует AUTH-02a; final independent reviewer всей feature должен быть агентом, не участвовавшим в реализации проверяемой сборки.

## Следующее назначение

После завершения Леной AUTH-02a провести coordinator checkpoint stable exact head. Проверять bounded scope AUTH-02a, взаимодействие с принятым AUTH-01 и реальные current-stage regressions. Следующую ступень разрешать только после PASS.
