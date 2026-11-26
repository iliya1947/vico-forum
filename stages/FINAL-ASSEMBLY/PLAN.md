# stages/FINAL-ASSEMBLY/PLAN.md — сборка stacked authentication lifecycle в первый implementation PR

## Цель

Собрать уже принятый stack AUTH-01–AUTH-06 в первый implementation PR #388 без изменения продуктового поведения и подготовить один stable exact head для финального author/review/AUTH-07 цикла.

## Вход

1. Current main / base PR #388: `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
2. Final accepted AUTH-06 head: PR #395 `615d93598daf78945a86fbdc4255bc778ae3403f`.
3. Corrected AUTH-05: `dbbfe1c05b4774c49f6b06fc4457bc422b5d39a6`.
4. AUTH-06 AUTHOR PASS + whole-feature COORDINATOR PASS; current-scope blockers = 0.
5. Исполнитель final assembly по прямому назначению владельца: **Ада / Business GPT-6.2**.

## Scope

1. Перенести итоговое состояние accepted AUTH-01–AUTH-06 в branch первого implementation PR #388 (`feat/auth-01-mail-foundation`) так, чтобы PR #388 к `main` представлял всю authentication lifecycle vertical.
2. Не добавлять новую product functionality, refactor, schema/dependency change или docs closeout.
3. Не изменять accepted implementation ради удобства сборки. Если обнаружен реальный конфликт/расхождение stack — HOLD с exact evidence и STOP.
4. После подтверждённой сборки закрыть intermediate implementation PRs #389, #391, #392, #393, #394, #395 как superseded; не merge их в main.
5. Service PR #320 и его файлы в implementation branch не переносить.
6. External providers, production/deployed actions и Stage 6 не активировать.
7. AUTH-07 не начинать самостоятельно.

## Проверка сборки

1. PR #388 остаётся с base `main`; перед изменением проверить, что main не сдвинулся. Если main изменился — STOP для пересмотра affected evidence, а не механическая assembly.
2. Финальный assembled tree должен соответствовать accepted final AUTH-06 tree. Любое непредусмотренное отличие — HOLD.
3. После assembly зафиксировать stable exact head PR #388 и выполнить final author self-check всей vertical.
4. На final assembled PR #388 запустить применимые `run:ci` и `run:acceptance`; проверять реально исполненные workflows и exact SHA.
5. Не считать старые runs на intermediate PRs заменой final assembled-PR checks, хотя они остаются историческим evidence.

## Done

1. PR #388 к current main содержит всю accepted AUTH-01–AUTH-06 vertical и только её.
2. Intermediate PRs #389/#391/#392/#393/#394/#395 закрыты superseded, без merge.
3. Stable exact head и tree identity записаны в `stages/FINAL-ASSEMBLY/RESULT.md`.
4. Final author self-check + applicable exact-head CI/acceptance имеют PASS, либо подтверждённый blocker записан как HOLD.
5. При PASS Ада STOP и передаёт Мире final whole-feature coordinator review на этом exact head.
6. Ада не выполняет independent final whole-feature review, потому что участвовала в AUTH-05 correction и final assembly.
7. AUTH-07 активируется только отдельным следующим переходом после coordinator PASS Миры.
