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

Stage 0, Stage 1, Stage 2 и Stage 3 завершены. Persistent `LocaleRegistry` и persistent UI translation sources работают в production через Neon, cache-disabled Cloudflare Hyperdrive, `pg` и Drizzle.

Pre-Stage-4 audit завершён и зафиксировал обязательный hardening перед auth/private data/runtime writes: canonical locale persistence boundary, bounded DB deadlines, безопасную деградацию malformed translation rows, production privilege verification и полную staging isolation. Stage 4 (Better Auth + Google OAuth) начинается только после закрытия этих блокеров.

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
