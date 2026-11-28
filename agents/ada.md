Этот файл хранит персональную рабочую память Ады по самостоятельной задаче User AI / Vico Consultant.

# Ада — User AI

Назначение владельца: реализатор задачи №2. Координатор — Business-Мира.

## Активный этап — U1

Implementation PR: **#403**  
Branch: `feature/user-ai-u1`  
Base: `main` at `99b40480cb4d777298aafb1ffae7f28cf0c6085d`  
Initial setup head: `f121b1c775b7c454fb84a8b2d67d52e97dd6247e`

Обязательный вход:

1. Актуальные `AGENTS.md`, `PROJECT.md`, `PROJECT_STATE.md` и профильные source-of-truth.
2. `research/user-ai-product-concept.md`.
3. Принятый `stages/user-ai/PLAN.md`, особенно U1.
4. `stages/user-ai/REVIEW.md`.
5. Текущие auth/session/AccountState, permission resolver, locale/route helpers и canonical forum navigation surfaces из `main`.

## Требуемый результат U1

1. Защищённый same-origin API boundary без LLM/provider calls.
2. Live Better Auth session и active AccountState guards.
3. Один current server-side permission snapshot и fail-closed disclosure projection.
4. Capability-filtered versioned navigation/knowledge catalog.
5. Canonical server-built localized links для утверждённых User/Moderator/Administrator entries.
6. Детерминированные navigation ответы на Watch/Bookmarks/Settings/Help/reporting и другие включённые product scenarios.
7. Тесты role/grant/override/deny, exact Owner, missing permission state, locale routes и no-provider behavior.

## Не входит

- launcher/panel/dialog и consultation store (U2);
- semantic index, retrieval, migrations и background jobs (U3+);
- Workers AI, embeddings, generation и external provider calls;
- production/Stage 6, secrets и deployed resources;
- ChatGPT-control `#399/#402`;
- Admin/Moderation AI;
- несвязанный refactor и работа будущих U2–U6.

После реализации выполнить полный source self-check U1 и передать Business-Мире stable exact head #403 с кратким результатом. CI, acceptance и их результаты не запускать и не проверять — это делает Business-Мира. U2 не начинать до coordinator PASS.
