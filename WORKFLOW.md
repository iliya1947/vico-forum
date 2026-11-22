# WORKFLOW.md — текущее оперативное состояние

## Текущий этап

- Служебный PR #369, ветка `service/ui-progress-preview-architecture`; не merge.
- Проверенная основа main: `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- Концепция принята владельцем; D-06–D-09 действуют.
- Лёва завершил канонический финальный технический `PLAN.md`.
- **Мира завершила scope/fit review PLAN на head `d97f6ac5b7f4e7cfe3403dd8bd23f47e2a378b4d`: PASS.**
- Подтверждённых дефектов технического плана, блокирующих текущую задачу, не найдено.
- План сохраняет один product source, GitHub/Pages/browser-only runtime, test capabilities/fixtures, simulated success без обязательной записи и atomic cutover.
- Риски browser-safe graph, Framework→Data Router adaptation, Pages URL/native resources и local transport корректно вынесены в bounded P0 как runtime proof, а не объявлены уже доказанными.
- Реализация/P0 не назначены и не запускались. Product/preview code, зависимости, #322 и deployment не менялись.

## Следующая работа

Следующий отдельный шаг — определить delivery mode и подготовить bounded назначение P0 по PLAN §15.

До отдельного назначения:
1. не запускать P0/реализацию;
2. не продолжать #322;
3. не менять принятую архитектуру без подтверждённого нового основания;
4. #369 остаётся служебным каналом и не merge.
