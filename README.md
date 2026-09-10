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

Stage 1A содержит только базовый React Router v8 SSR scaffold для Cloudflare Workers и quality gates. Locale routing/resolution и UI translation runtime реализуются отдельно в PR 1B и PR 1C по `SCAFFOLD_PLAN.md`.

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
