# Vico Forum

Классический веб-форум для обсуждения разработки с ChatGPT, Codex, Cursor, Claude и другими AI-инструментами.

Проект находится на ранней стадии разработки. Технический foundation уже создан; текущий приоритет — построить рабочее ядро форума.

## Документация

- [`PROJECT.md`](./PROJECT.md) — постоянный продуктовый и технический baseline.
- [`PROJECT_STATE.md`](./PROJECT_STATE.md) — текущее фактическое состояние и следующий шаг.
- [`ROADMAP.md`](./ROADMAP.md) — последовательный путь до первого production-релиза.
- [`docs/auth/AUTHORIZATION.md`](./docs/auth/AUTHORIZATION.md) — архитектурный контракт dynamic roles/permissions и per-user overrides.
- [`SCAFFOLD_PLAN.md`](./SCAFFOLD_PLAN.md) — завершённый executable plan Stage 1 и зафиксированный toolchain.
- [`TRANSLATION_ARCHITECTURE.md`](./TRANSLATION_ARCHITECTURE.md) — архитектурный контракт мультиязычности и переводов; detail documents находятся в [`docs/translation/`](./docs/translation/).
- [`docs/database/`](./docs/database/) — migration/Hyperdrive contracts и operational runbooks.
- [`AGENTS.md`](./AGENTS.md) — правила работы Codex с репозиторием.

## Разработка

Stage 0–3 завершены. Дополнительно уже создана migration-only Better Auth schema foundation (исторический Stage 4A), но Better Auth runtime и Google OAuth ещё не подключены.

Активное направление — **forum-first**:

1. построить базовую модель `категория → раздел → тема → сообщения`;
2. реализовать публичное SSR-чтение и классический forum UI;
3. подключить auth/session и участие в обсуждениях в local/CI development path;
4. добавить solved/best-answer и dynamic DB-backed authorization с custom roles, редактируемыми role permissions и per-user allow/deny overrides;
5. только после рабочего forum core завершать automatic translations/background jobs и выполнять внешнюю pre-release интеграцию с Google OAuth, Neon/Hyperdrive runtime writes, Cloudflare Queues/providers и production rollout.

Обычная разработка до pre-release проверяется локально и в CI. Merge feature-кода сам по себе не должен означать production rollout. Реальные external environment migrations/deploy/smoke являются отдельным pre-release/release процессом.

Текущая production-like инфраструктура и ранее выполненные Hyperdrive acceptance остаются полезным foundation, но не являются gate для каждого нового forum feature PR.

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
