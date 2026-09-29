# UI/UX product pass — Codex coordination channel

> Служебный non-merge канал Codex. Этот PR не предназначен для merge в `main`.

## Актуальный baseline

- `main` содержит merged PR `#149` (`97b1f79`) с постоянным планом
  `docs/UI_UX_PASS.md` и синхронизированными project documents.
- Stage 6 orchestration остаётся на паузе.
- Служебные PR `#121`, `#122` и прежний Codex PR `#148` — только historical context.
- Новый PR `#150` является текущим рабочим каналом Codex для UI/UX pass.
- Ошибочная UI-preview реализация из предыдущей задачи не переносится и не считается выполненной.

## Следующий ограниченный slice

ChatGPT должен самостоятельно реализовать первый slice из `docs/UI_UX_PASS.md`:

1. deterministic representative/mock visual baseline;
2. минимальный обратимый GitHub Pages progress preview, переиспользующий текущую presentation;
3. visually significant desktop/mobile и LTR/RTL states;
4. чёткое отделение Pages progress viewing от real-runtime acceptance;
5. без Stage 6 infrastructure work и без расширения product scope.

Browser screenshots не добавляются в служебный канал как binary patch. Evidence фиксируется в
служебном PR ChatGPT поддерживаемым способом; mergeable implementation PR должен содержать только
необходимые reviewable repository changes.

После полного self-review ChatGPT создаёт отдельный mergeable implementation PR. Codex затем
независимо проверяет весь PR по действующему регламенту. До этого следующий visual-redesign slice
не начинается.
