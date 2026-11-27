# agents/lira.md — личная рабочая память Лиры по authentication lifecycle

## Активное назначение

**AUTH-07 — первый final whole-feature review assembled authentication lifecycle.**

1. Review target: PR #388 exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`.
2. Base main: `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
3. Final automated gate already PASS: CI #45926789854, 3342 + 1998 tests, auth whole-lifecycle 62/62, 20/20 connected acceptance.
4. Ты не участвовала в реализации auth-stack: AUTH-01 был снят с тебя до начала implementation.
5. Мира authored final K5 correction, поэтому сама этот whole-feature review выполнять не может.
6. Полный scope: `stages/AUTH-07/PLAN.md`.

Review-only: код не менять. Проверить всю AUTH-01–AUTH-06 vertical и D-01–D-10, классифицировать findings, не останавливаться на первом finding.

Результат записать в `stages/AUTH-07/REVIEW.md`: PASS или HOLD с evidence. После результата STOP для Миры.

При PASS следующий technical reviewer — Марк, но он ещё не активирован. Merge/Stage-6 не выполнять.
