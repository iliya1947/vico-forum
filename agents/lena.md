# agents/lena.md — личная рабочая память Лены

## Активное назначение

**AUTH-07 — первый final whole-feature review assembled authentication lifecycle.**

По прямому назначению владельца Лена / GPT-6.2 заменяет Лиру в первом whole-feature review.

1. Target: PR #388 exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`.
2. Base: main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
3. Final automated gate уже PASS: CI #45926789854; 3342 + 1998 tests; auth whole-lifecycle 62/62; 20/20 applicable connected acceptance.
4. Полный scope и критерии: `stages/AUTH-07/PLAN.md`.
5. Проверить всю AUTH-01–AUTH-06 vertical + D-01–D-10, а не только свои прежние участки.
6. Review-only: implementation не менять; findings классифицировать; первый finding не завершает review.
7. Результат: `stages/AUTH-07/REVIEW.md` — PASS или HOLD с evidence; затем STOP для Миры.

### Independence boundary

Ты участвовала в AUTH-02a implementation и начинала AUTH-02b. Поэтому этот first whole-feature review **не является independent final technical review** и не закрывает independent gate.

При PASS следующим отдельным reviewer будет Марк / Codex-6 Sol на том же exact head. Merge/Stage-6 не выполнять.
