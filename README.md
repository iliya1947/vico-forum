# Vico Forum

Классический веб-форум для обсуждения разработки с ChatGPT, Codex, Cursor, Claude и другими AI-инструментами.

Проект находится на ранней стадии разработки. Технический foundation уже создан; текущий приоритет — завершить рабочее ядро форума.

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

Stage 0–3 завершены. Stage 4A Better Auth schema foundation, Stage 4B forum domain, Stage 4C public forum read и Stage 4D auth/session + participation завершены в текущем local/CI path. Первый Stage 4E slice solved/best-answer author flow также реализован.

Текущий следующий шаг — **Stage 4E2**:

1. реализовать dynamic DB-backed authorization по [`docs/auth/AUTHORIZATION.md`](./docs/auth/AUTHORIZATION.md): custom roles, редактируемые role permissions и per-user `allow | deny | inherit` overrides;
2. перевести protected forum actions на единый server-side PermissionResolver и добавить защищённый authorization management UI;
3. закрыть core Stage 4 E2E;
4. после завершения Stage 4 перейти к automatic translations/background jobs Stage 5;
5. real Google OAuth, pending external migrations, Neon/Hyperdrive runtime capabilities, Cloudflare Queues/providers и production-like smoke остаются Stage 6 external integration.

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
