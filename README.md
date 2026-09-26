# Vico Forum

Классический веб-форум для обсуждения разработки с ChatGPT, Codex, Cursor, Claude и другими AI-инструментами.

Проект находится на ранней стадии разработки. Forum core Stage 4 завершён в local/CI path; текущий продуктовый приоритет — automatic translations и background jobs Stage 5.

## Документация

- [`PROJECT.md`](./PROJECT.md) — постоянный продуктовый и технический baseline.
- [`PROJECT_STATE.md`](./PROJECT_STATE.md) — текущее фактическое состояние и следующий шаг.
- [`PROJECT_HISTORY.md`](./PROJECT_HISTORY.md) — история значимых решений, регрессий и последующих исправлений.
- [`ROADMAP.md`](./ROADMAP.md) — последовательный путь до первого production-релиза.
- [`docs/auth/AUTHORIZATION.md`](./docs/auth/AUTHORIZATION.md) — архитектурный контракт dynamic roles/permissions и per-user overrides.
- [`SCAFFOLD_PLAN.md`](./SCAFFOLD_PLAN.md) — завершённый executable plan Stage 1 и зафиксированный toolchain.
- [`TRANSLATION_ARCHITECTURE.md`](./TRANSLATION_ARCHITECTURE.md) — архитектурный контракт мультиязычности и переводов; detail documents находятся в [`docs/translation/`](./docs/translation/).
- [`docs/database/`](./docs/database/) — migration/Hyperdrive contracts и operational runbooks.
- [`AGENTS.md`](./AGENTS.md) — правила работы Codex с репозиторием.

## Разработка

Stage 0–4 завершены в текущем local/CI path. Forum MVP включает public read, Better Auth session boundary, authenticated topic/reply participation, safe Markdown, anti-spam cooldown, solved/best-answer flow и dynamic PostgreSQL-backed authorization с management UI по [`docs/auth/AUTHORIZATION.md`](./docs/auth/AUTHORIZATION.md).

Текущий следующий шаг — **Stage 5**:

1. завершить automatic UI translation generation/runtime path;
2. реализовать revision-bound translation пользовательского контента;
3. добавить durable background jobs/provider integration согласно [`TRANSLATION_ARCHITECTURE.md`](./TRANSLATION_ARCHITECTURE.md) и [`ROADMAP.md`](./ROADMAP.md);
4. real Google OAuth, pending external migrations, authorization bootstrap, Neon/Hyperdrive runtime capabilities, Cloudflare Queues/providers и production-like smoke остаются Stage 6 external integration.

Обычная разработка до pre-release проверяется локально и в CI. Merge feature-кода сам по себе не должен означать production rollout. Реальные external environment migrations/deploy/smoke являются отдельным pre-release/release процессом.

Текущая production-like инфраструктура и ранее выполненные Hyperdrive acceptance остаются полезным foundation, но не являются gate для каждого нового feature PR.

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
