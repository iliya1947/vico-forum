# stages/K5-CORRECTION/PLAN.md — bounded correction K5 final-assembly acceptance

## Цель

Закрыть единственный failed automated gate final assembly #388, не меняя принятую authentication/product implementation.

## Подтверждённая проблема

1. #388 и ранее успешный #395 используют один implementation SHA `615d93598daf78945a86fbdc4255bc778ae3403f`.
2. `tests/browser/sa04-attachments/check.py`, K5 workflow, `editor-attachments.tsx` и `markdown-editor.tsx` имеют идентичные blob SHA в успешном и failed runs.
3. K5 workflow не зависит от PR base для test behavior; он использует head SHA и тот же disposable PostgreSQL/local R2 path.
4. Product hook начинает `operationId` как `""` и присваивает UUID только в React `useEffect`; все последующие product assignments также UUID.
5. K5 после появления reply form немедленно читает hidden `editorOperationId` и требует длину 36, не синхронизируясь с окончанием этой initialization.
6. Поэтому тест содержит реальный synchronization defect, способный породить наблюдаемое падение до первого upload. Точный captured value failed run отсутствует, поэтому прошлый artifact сам по себе не доказывает, что именно этот race был фактической причиной обоих запусков; correction + rerun должны это подтвердить.

## Исполнитель

**Мира / GPT-5.6 Sol** по прямой команде владельца.

## Scope

1. Изменить только K5 test/evidence слой, необходимый для корректной синхронизации с существующим product initialization и полезной диагностики failure.
2. Product/runtime code, schema, dependencies, workflow semantics и accepted auth behavior не менять.
3. Тест должен ждать реально готового editor operation state перед assertion/upload, а не полагаться на timing после form visibility/networkidle.
4. При новом failure evidence должен сохранять достаточную фактическую информацию, чтобы отличить initialization race от product/runtime failure, без секретов.
5. Не ослаблять последующие K5 assertions и 33-case matrix.

## Проверка

1. Сначала targeted K5 execution на новом exact head. Если он не проходит — HOLD/STOP с evidence; не запускать blind retries.
2. Если targeted K5 PASS, зафиксировать новый exact head и убедиться, что diff к accepted final assembly ограничен test/evidence correction.
3. Затем выполнить предусмотренные final assembly exact-head `run:ci` и `run:acceptance` один раз на новом stable head. Это финальный автоматизированный gate assembled PR; не запускать повторно без причины.
4. При полном PASS записать RESULT; затем отдельной подзадачей Мира проводит final whole-feature coordinator review, не смешивая correction verification с review.
5. AUTH-07, independent review, merge и Stage-6 actions не начинать.

## Done

- product tree/behavior не изменены;
- K5 synchronization defect исправлен без ослабления matrix;
- targeted K5 PASS;
- final #388 CI + applicable acceptance PASS на новом exact head;
- AUTHOR PASS/HOLD записан честно;
- correction verification завершена отдельно от последующего final whole-feature coordinator review.
