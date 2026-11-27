# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**; implementation PR #388 к unchanged main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
2. Accepted AUTH-01–AUTH-06 assembled baseline был exact `615d93598daf78945a86fbdc4255bc778ae3403f`; substantive AUTHOR PASS, CI PASS и 19/20 connected acceptance, с единственным K5 HOLD.
3. По прямой команде владельца K5-CORRECTION забрана у Ады и выполняется Мирой.
4. **Correction implementation выполнена:** PR #388 exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601`. Delta к accepted baseline — ровно один файл `tests/browser/sa04-attachments/check.py`, +59/-6; product/runtime/schema/dependencies/workflow не менялись.
5. Исправление ждёт фактическую client initialization: `editorOperationId` должен стать UUID v4 через Playwright `expect(locator).to_have_value(regex)` до чтения/первого upload. Шесть первичных operation reads переведены на этот helper; последующие lifecycle assertions сохранены. Failure/success evidence хранит только readiness structure/length/UUID boolean, без raw operation IDs.
6. Source-level bounded self-check correction — PASS по scope. **Runtime K5 verification ещё не выполнялась; общий K5 gate остаётся HOLD.**
7. Старый Ada-candidate `bb19d5c...` остаётся rolled back historical state и не является текущей correction.
8. AUTH-07, independent review, main merge и external/Stage-6 activation заблокированы.

## Следующий переход

Отдельная следующая подзадача: targeted K5 verification exact `71cdb70d...`. При failure — HOLD/evidence без blind retry. При targeted PASS — дальнейший final exact-head CI/acceptance выполняется отдельным шагом согласно `stages/K5-CORRECTION/PLAN.md`.
