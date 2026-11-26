# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. AUTH-01–AUTH-05 — coordinator PASS.
2. Accepted stack head до AUTH-06: AUTH-05 #394 exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`.
3. AUTH-06 #395 exact `2eb3f9c303ad1b67d5348664267eca665f079cf7`: Лёва уже начал author verification и завершает только этот текущий handoff.
4. По прямому решению владельца **Ада / Business GPT-6.2 заменяет Лёву после его текущего AUTH-06 handoff**.
5. После AUTHOR PASS AUTH-06 я провожу whole-feature coordinator review всей assembled auth vertical на stable exact head.
6. После моего coordinator PASS дальнейший technical/final-review handoff идёт Аде, а не Лёве. Поскольку Ада не участвовала в implementation AUTH-01–AUTH-06, она пригодна для independent whole-feature review.
7. Если AUTH-06 выдаст HOLD, Лёва STOP; дальнейший correction route координирую уже с учётом назначения Ады.
8. External/deployed provider activation остаётся заблокированной.
