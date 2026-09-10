# PROJECT_STATE.md

Последнее обновление: 2026-09-10

## Состояние

Этап 0 завершён. Stage 1 выполняется серией компактных PR `1A → 1B → 1C`.
Stage 1A добавляет базовый scaffold и quality gates; весь Stage 1 ещё не завершён.

## Готово

- создан GitHub-репозиторий и базовая проектная документация;
- зафиксирован последовательный roadmap до первого production-релиза;
- зафиксирована расширяемая архитектура мультиязычности и переводов без hard-coded списка locale;
- translation architecture разделена на обязательный contract и detail documents; все 49 component IDs привязаны к этапам реализации через `ROADMAP.md`;
- завершён этап 0 и зафиксирован `SCAFFOLD_PLAN.md` с exact toolchain и границами Stage 1;
- Stage 1 разделён на PR 1A (scaffold/quality gates), PR 1B (locale boundary/resolution) и PR 1C (UI translation resource runtime);
- в Stage 1A добавлен минимальный React Router v8 Framework Mode SSR scaffold для Cloudflare Workers, exact toolchain, lockfile, ESLint, Vitest и CI.

## Сейчас

Stage 1A ограничен технической foundation: locale routing/resolution и UI translation business behavior в него не входят.
Обязательные проверки Stage 1A: frozen install, `lint`, `typecheck`, `test`, `build`.

## Блокеры

Нет блокеров для Stage 1A.

До начала PR 1B необходимо отдельно выбрать разрешённую архитектурой policy для explicit unknown/inactive `/:locale`.

## Следующий шаг

После merge Stage 1A с подтверждёнными обязательными проверками выбрать unknown/inactive-locale route policy и реализовать PR 1B по `SCAFFOLD_PLAN.md`.
