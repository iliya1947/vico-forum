# PROJECT_STATE.md

Последнее обновление: 2026-09-10

## Состояние

Этап 0 завершён. Stage 1 выполняется серией компактных PR `1A → 1B → 1C`.
Stage 1A завершён и merged; весь Stage 1 ещё не завершён.

## Готово

- создан GitHub-репозиторий и базовая проектная документация;
- зафиксирован последовательный roadmap до первого production-релиза;
- зафиксирована расширяемая архитектура мультиязычности и переводов без hard-coded списка locale;
- translation architecture разделена на обязательный contract и detail documents; все 49 component IDs привязаны к этапам реализации через `ROADMAP.md`;
- завершён этап 0 и зафиксирован `SCAFFOLD_PLAN.md` с exact toolchain и границами Stage 1;
- Stage 1 разделён на PR 1A (scaffold/quality gates), PR 1B (locale boundary/resolution) и PR 1C (UI translation resource runtime);
- Stage 1A merged: добавлен минимальный React Router v8 Framework Mode SSR scaffold для Cloudflare Workers, exact toolchain, lockfile, ESLint, Vitest и CI;
- для Stage 1B выбрана explicit-locale route policy: canonicalizable alias/case/deprecated variant активного locale получает permanent canonical redirect, а malformed/unknown/inactive/disabled locale временно redirect-ится на тот же путь под `/en/` без cookie/header negotiation.

## Сейчас

Следующий шаг — Stage 1B: generic `/:locale/*`, `LocaleRegistry`, `LocaleResolver`, BCP-47 canonicalization, root negotiation, `lang`/`dir`, formatting context и targeted routing tests.

## Блокеры

Нет.

## Следующий шаг

Реализовать PR 1B по `SCAFFOLD_PLAN.md` и `docs/translation/LOCALES.md`. После PR 1B Stage 1 остаётся незавершённым до PR 1C и полного Stage 1 acceptance.
