# AGENTS.md

`AGENTS.md` предназначен только для Codex. Он не является инструкцией для ChatGPT и не должен использоваться как набор правил поведения ChatGPT.

1. Перед изменением прочитай `PROJECT.md`, `PROJECT_STATE.md` и связанные с задачей файлы.

2. Не меняй архитектуру, схему БД, зависимости и публичные контракты без необходимости.

3. Если обнаружено противоречие между кодом, документацией или архитектурой — не решай его самостоятельно. Опиши конфликт и спроси пользователя.

4. Перед использованием API, библиотеки или инструмента проверь официальную документацию именно используемой версии.

5. Не выдумывай методы, параметры, команды и возможности. Если информация не проверена — прямо укажи это.

6. Делай только изменения, необходимые для текущей задачи. Не рефактори несвязанный код и не добавляй функциональность «на будущее».

7. Не утверждай, что проверка, build, test, lint, migration или deploy успешны, если они фактически не запускались.

8. Если после изменения поменялось фактическое состояние проекта — обнови `PROJECT_STATE.md`.

9. Все изменения должны попадать в `main` только через Pull Request. PR создаёт и merge выполняет пользователь. Не выполняй merge самостоятельно.

10. Во время обычной pre-release feature-разработки новые schema/runtime changes проверяются локально и в CI и не обязаны немедленно применяться к Neon/production-like environment. Если изменение **фактически выкатывается** во внешний pre-release/production runtime и впервые добавляет schema, от которой этот runtime будет зависеть, rollout разделяется: migration-only change → merge → успешная target-environment migration + verification → runtime rollout, который зависит от новой schema. Не переноси это external rollout требование на обычную local/CI разработку, если production deployment не выполняется.

11. До первого forum-code PR active development `main` должен быть отделён от автоматического production promotion. Не выполняй production deploy, не меняй Cloudflare/Neon/Google resources и не запускай production migration workflow только потому, что feature PR добавляет schema или runtime code. Такие внешние действия выполняются только отдельной задачей/этапом с явным разрешением пользователя.

12. Если non-production/preview build имеет доступ к production bindings, writes или private data, этот path должен быть изолирован либо отключён до использования соответствующей capability. Read-only public localization capability не должна автоматически расширяться для forum/auth/translation writes.

13. Текущий продуктовый приоритет — Stage 5 translations/background jobs. Реализуй Stage 5 через local/CI path по `TRANSLATION_ARCHITECTURE.md`, `docs/translation/*` и `ROADMAP.md`; не превращай Stage 5 feature-задачу в Stage 6 Hyperdrive/Neon/real OAuth/real Queue/provider rollout или дополнительный infrastructure hardening, если это не требуется для реализации и local/CI проверки самой задачи.

14. Существующий localization/translation/database foundation сохраняй и переиспользуй. Не переписывай его ради нового forum code без конкретной технической необходимости.

15. Если задача меняет PostgreSQL schema/migration, SQL constraints/invariants или DB integration behavior, `pnpm db:test` является обязательным verification gate. Если в локальном окружении нет `DATABASE_URL`, прямо укажи, что DB suite не проверен локально. Не называй изменение merge-ready до успешного GitHub Actions `database` job на актуальном PR head. Если текущая Codex-сессия не может наблюдать PR/CI после создания PR пользователем, явно укажи, что merge readiness остаётся неподтверждённой до зелёного `database` job.
