Этот файл хранит текущее оперативное состояние задачи и следующий переход.

# Workflow

## Активный этап

Продуктовый scope сформирован; подготовка критериев передачи на техническое планирование.

## Назначение

- Координатор: Мира — GPT-5.6 Sol.
- Текущий исполнитель: Мира.
- Технический планировщик после scope: Лёва — Codex-6.1 Sol.
- Implementation PR: `#399`, ветка `feature/chatgpt-forum-control`.
- Служебный PR: `#400`, ветка `service/chatgpt-forum-control`.

## Состояние

1. `#399` остаётся пустой draft-заготовкой; реализация не начата.
2. Capability inventory завершён: `research/capability-inventory.md`.
3. Product scope v1, confirmation/risk model, exclusions, untrusted-content boundary, replay/result semantics и product acceptance зафиксированы в `research/product-scope-v1.md` и отражены в `TASK.md`/`DECISIONS.md`.
4. CI/acceptance не запускались.

## Следующий переход

Мира выполняет финальную внутреннюю проверку scope на полноту/противоречия с установленной целью и правилами проекта. Если scope проходит проверку, привести контекст в состояние handoff и передать Лёве задачу на полный технический план.
