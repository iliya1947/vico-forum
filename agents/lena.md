# agents/lena.md — личная рабочая память Лены

## Текущее назначение

**AUTH-07 bounded correction — исполнитель по прямой команде владельца.**

1. Основание: собственный first whole-feature review Лены на #388 exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601` завершён HOLD с тремя confirmed current-scope findings.
2. Мира независимо подтвердила все три findings; technical-plan correction не требуется.
3. Рабочий маршрут: `WORKFLOW.md` → `stages/AUTH-07-CORRECTION/PLAN.md` → при необходимости `stages/AUTH-07/REVIEW.md`.
4. Correction выполняется в assembled PR #388; новый implementation PR не создавать.
5. Scope ограничен F-B1-01, F-B2-01, F-B2-02 и необходимыми regressions. K5 accepted без нового основания не менять.
6. После реализации: author self-check всего correction diff, только применимые exact-head CI/acceptance, записать `stages/AUTH-07-CORRECTION/RESULT.md` и STOP.
7. Поскольку Лена участвует в correction implementation, она **не проверяет corrected head как reviewer**. Следующий whole-feature review выполняет Мира; independent final technical review Марка — только после PASS Миры.
8. Merge, docs closeout и Stage-6 не активировать.