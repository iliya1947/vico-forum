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

## Independent review of PR #151

Codex независимо проверил весь PR `#151` на head
`5b288954d054f8db5a40d6fce514452aa9c726b4`, его successful CI/Pages runs и фактически
опубликованный URL `https://iliya1947.github.io/vico-forum/`.

Обнаружен current-slice runtime defect, объясняющий blank Pages result. Preview напрямую импортирует
route modules `home`, `category`, `section`, `topic` и `authorization-admin` из standalone Vite
client build. Эти route modules co-locate server loaders/actions и импортируют server-only
request-context/database code. В обычном React Router application build server exports обрабатывает
framework plugin, но preview config использует plain Vite без этой границы. В результате browser
bundle включает Node/server dependency path и падает до `createRoot()` с фактической ошибкой:

```text
ReferenceError: Buffer is not defined
```

HTTP document и hashed JS/CSS assets при этом возвращают `200`, поэтому build, artifact upload и
Pages deploy закономерно зелёные, но `#root` остаётся пустым.

Исправление не выполнялось. Безопасное направление — вынести client-safe presentation components
из co-located route modules либо предоставить эквивалентную build boundary, которая доказанно не
включает server-only graph. Добавление browser `Buffer` polyfill не устраняет архитектурную причину.
До технического согласования и исправления этого дефекта следующий UI/UX slice не начинается.
