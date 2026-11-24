# agents/leva.md — личная рабочая память Лёвы по authentication lifecycle

## Текущее назначение

Подготовить **полный технический план всей authentication lifecycle задачи AUTH-01–AUTH-07 до начала реализации** против `main 9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.

## Контекст

1. Product scope прошёл независимую revalidation Лены: PASS; актуальные зависимости и существующие primitives находятся в `COMMUNICATION.md`.
2. Мира проверила основания, необходимые для handoff, и не нашла блокирующего противоречия.
3. Старый технический план только AUTH-01 против `e279cb6...` superseded; не переносить его решения автоматически.
4. Действующие owner decisions находятся в `DECISIONS.md`; scope и критерий завершения — в `TASK.md`.
5. Existing SET-05, AccountState/deactivation, registration admission, auth facts/attempt telemetry/Owner History и Worker runtime должны переиспользоваться и учитываться как текущие границы.

## Требуемый результат

1. Один полный технический план всей задачи в `PLAN.md`, а не just-in-time планы отдельных следующих этапов.
2. Определить техническую модель AUTH-01–AUTH-07, порядок и зависимости.
3. Для каждого этапа установить scope, затрагиваемые текущие seams, security/failure/race invariants и критерии готовности.
4. Установить, где реально нужны schema/forward migration, dependency, runtime/config или public-contract изменения; не вводить их без необходимости.
5. Определить применимые unit/native PostgreSQL/Worker/Better Auth/browser/connected acceptance границы.
6. Выделить независимые и взаимозависимые этапы так, чтобы Мира могла после плана определить delivery mode по `AGENTS.md`.
7. Проверить Better Auth 1.7.7 semantics по актуальным официальным/source материалам там, где решение зависит от конкретного API поведения.
8. Если обнаружится реально неоднозначное продуктовое решение, не выбирать его вместо владельца — зафиксировать вопрос отдельно.
9. Implementation, CI и external activation на этом этапе не выполнять.

После завершения обновить `PLAN.md`, этот файл и `WORKFLOW.md` для handoff Мире.
