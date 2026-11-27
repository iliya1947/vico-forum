# K5-CORRECTION — implementation выполнена Мирой, verification pending

## Current exact state

PR #388 / `feat/auth-01-mail-foundation`:
- base main: `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432` — unchanged;
- accepted assembly baseline: `615d93598daf78945a86fbdc4255bc778ae3403f`;
- current correction head: `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`.

Compare baseline → correction: 1 commit, 1 modified file, `tests/browser/sa04-attachments/check.py`, +59/-6. Product/runtime/schema/dependencies/workflow files не изменены.

## Исправление

Подтверждённый test synchronization defect исправлен без изменения product behavior:

1. K5 больше не использует form presence/networkidle как неявное доказательство готовности attachment operation.
2. Для шести первичных operation reads введён `ready_editor_operation`: Playwright retrying assertion ждёт UUID v4 в hidden `editorOperationId`, затем значение читается и повторно валидируется.
3. Исходный first-case `len(operation) == 36`, все последующие upload/R2/lifecycle assertions и 33-case matrix не ослаблены.
4. Readiness evidence содержит case, elapsed time, operation count/length/UUID boolean и disabled state file input. Raw operation IDs не записываются.
5. Success/failure artifacts включают `editor_readiness`, чтобы новый failure различал initialization readiness и дальнейший runtime failure.
6. Актуальная официальная Playwright Python API подтверждает retrying `expect(locator).to_have_value(Pattern, timeout=...)`; pinned test dependency остаётся 1.62.0.

## Self-check

Source-level bounded correction self-check: **PASS по scope**.
- ровно один test/evidence файл;
- 1 helper definition;
- ровно 6 intended readiness calls;
- прежние 6 immediate initial reads отсутствуют;
- success/failure readiness evidence присутствует;
- product code не изменён.

Это **не runtime PASS**. Targeted K5 на `71cdb70d...` ещё не выполнялся; общий K5 automated gate остаётся HOLD.

## Историческая граница

Ada-candidate `bb19d5c238dec436a57dc174b9c422a98b4ae4f1` ранее был force-with-lease rolled back и не является текущей correction. На нём workflow runs не выполнялись.

## Следующая подзадача

Targeted K5 exact-head verification `71cdb70d...`. При failure — сохранить evidence и HOLD без blind retry. При PASS — отдельно перейти к final exact-head CI/acceptance.
