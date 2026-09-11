# Vico Forum

Классический веб-форум для обсуждения разработки с ChatGPT, Codex, Cursor, Claude и другими AI-инструментами.

Проект находится на ранней стадии разработки.

## Документация

- [`PROJECT.md`](./PROJECT.md) — постоянный контекст и принятые основы проекта.
- [`PROJECT_STATE.md`](./PROJECT_STATE.md) — текущее состояние разработки.
- [`ROADMAP.md`](./ROADMAP.md) — последовательный план разработки до первого production-релиза.
- [`SCAFFOLD_PLAN.md`](./SCAFFOLD_PLAN.md) — проверенные версии, команды и executable plan этапа 1.
- [`TRANSLATION_ARCHITECTURE.md`](./TRANSLATION_ARCHITECTURE.md) — обязательный архитектурный контракт мультиязычности и переводов; detail documents находятся в [`docs/translation/`](./docs/translation/).
- [`AGENTS.md`](./AGENTS.md) — правила работы Codex с репозиторием.

## Разработка

Stage 1 и Stage 2 завершены. Persistent `LocaleRegistry` работает в production через Neon,
cache-disabled Cloudflare Hyperdrive, `pg` и Drizzle. Перед Stage 3 выполнен hardening failure
boundaries и migration/release safety: required CI включает `checks` и `database`, migration
history защищена как append-only, а production migration workflow ограничен `main`.
Следующий продуктовый этап — Stage 3; последовательность работ зафиксирована в `ROADMAP.md`,
а актуальное состояние — в `PROJECT_STATE.md`.

Требования:

- Node.js `24.21.0`;
- pnpm `12.3.4`.

Команды:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```
