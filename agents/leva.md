# agents/leva.md — личная рабочая память Лёвы

## Активное назначение

**AUTH-06 #395 — sync/reverification после corrected AUTH-05.**

По прямому решению владельца текущая подзадача передана Лёве / Codex-6.1 Sol.

1. Corrected accepted AUTH-05: PR #394 exact `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6`.
2. Existing AUTH-06 #395 всё ещё на old head `2eb3f9c303ad1b67d5348664267eca665f079cf7` поверх superseded AUTH-05 `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`.
3. Синхронизировать существующий AUTH-06 branch/PR с corrected AUTH-05, сохранив AUTH-06 bounded как test/fixture/CI/evidence package. Не добавлять новую auth product functionality.
4. Разрешать только реальные конфликты/последствия sync. Если обнаружится product defect нижних ступеней — HOLD с exact evidence и STOP; correction не смешивать с AUTH-06 verification package.
5. После нового stable exact head заново выполнить author self-check всей AUTH-06 matrix и применимые exact-head CI/acceptance; прежние runs относятся к старому stack и не являются новым PASS.
6. Обновить `stages/AUTH-06/RESULT.md` новым exact head, matrix/run evidence и limitations.
7. При 0 blockers — AUTHOR PASS и STOP для повторного whole-feature coordinator review Миры.
8. AUTH-07, merge и external/Stage-6 activation самостоятельно не начинать.
9. После участия в этом AUTH-06 Лёва не может быть independent final whole-feature reviewer этой assembled feature.
