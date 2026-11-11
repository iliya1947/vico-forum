# Functional preview runtime — service channel

## Подтверждённые решения

1. Цель — ручная функциональная проверка уже реализованного Vico Forum в браузере, а не расширение mock Pages.
2. GitHub Pages остаётся постоянной точкой входа/visual preview; настоящий функционал требует real Worker/runtime.
3. Functional preview обязан быть изолирован от production private data/write capability.
4. Stage 6 остаётся paused; production rollout и реальные внешние providers не входят в задачу.
5. Domain/backend functionality не дублируется внутри app/ui-preview.

## Подтверждённые факты

1. Current main: `e279cb6c032a489a9044ca1191407df887c364b4`.
2. `.github/workflows/ui-preview-pages.yml` публикует статическую сборку `app/ui-preview`.
3. Pages preview использует memory-router/scenario fixtures и не является live SSR/auth/database runtime.
4. `docs/UI_UX_PASS.md` требует actual Worker/runtime для functional/final acceptance.
5. `docs/database/HYPERDRIVE.md` запрещает preview auth/forum writes или private production data без отдельной изоляции.

## Открытый вопрос

Точный технический способ изолированного functional-preview runtime должен определить Codex-6.1 Sol на основании актуального repository и текущих platform contracts. Реализация до этого не начинается.
