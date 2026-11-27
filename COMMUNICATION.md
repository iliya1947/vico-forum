# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Final assembly

#388 содержит accepted AUTH-01–AUTH-06 и остаётся unmerged. Сборка не меняла product tree; intermediate PRs superseded. Final substantive author review — PASS. CI — PASS; connected acceptance — 19/20.

## K5 finding

Failed K5 #45912884312 не подтверждает product regression. Мира сверила успешный #395 K5 и failed #388: один head SHA, идентичные K5 workflow/test/product blobs. K5 не имеет base-dependent execution path. Product `operationId` начинает `""` и становится UUID в React effect; test читает hidden value сразу после появления формы. Это подтверждённый synchronization defect теста, который способен дать observed assertion failure. Старый artifact не записал actual value, поэтому точная причинность конкретных двух failures окончательно подтверждается corrective rerun.

## Активный route

Ада выполняет bounded **K5-CORRECTION** только test/evidence слоя по `stages/K5-CORRECTION/PLAN.md`. Product/runtime/schema не менять. Сначала targeted K5; если PASS — final exact-head CI + applicable acceptance assembled #388; затем STOP для Миры.

Лёва и Ада не могут быть independent final reviewer. AUTH-07 и Stage-6 заблокированы.
