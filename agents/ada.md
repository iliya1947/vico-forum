Этот файл хранит персональную рабочую память Ады по самостоятельной задаче User AI / Vico Consultant.

# Ада — User AI

Назначение владельца: реализатор задачи №2. Координатор — Business-Мира.

## U1 — реализация передана координатору

Implementation PR: **#403**  
Branch: `feature/user-ai-u1`  
Base: `main` at `99b40480cb4d777298aafb1ffae7f28cf0c6085d`  
Stable implementation head: `f17bd79edb3c2b35aee47ac5669513dbd404bfda`

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

## Передача U1 (28.11.2026)

Реализация и source-level author self-check завершены на exact head `f17bd79edb3c2b35aee47ac5669513dbd404bfda`; PR #403 и ветка подтверждены. Diff от принятого main: 17 файлов, только U1.

1. `POST /:locale/consultant`: request-local Worker dependencies, native Better Auth session/active AccountState и дополнительный canonical AccountState read после bounded body; same-origin, закрытый JSON DTO, UUIDv4 consultation/turn, максимум 8192 bytes / 1000 code units вопроса, private/no-store, no-referrer, безопасные ошибки и aliases. Нет записи в БД.
2. Один текущий effective resolver snapshot из существующего AP-10-aware runtime; layer anchors ровно из принятого плана; exact Owner binding + authoritySource, отдельные permission predicates, public-only fallback при typed authz unavailability. Нативные routes/actions остаются собственными authorization boundaries.
3. Server-only versioned catalog: 37 feature keys, локализованные EN/RU/HE cards и существующие canonical path helpers. Детерминированные Search/Help/Settings/Watch/Bookmarks/Mute/Block/report/best-answer, public structure placement и разрешённая Moderator/Administrator navigation. Context IDs и continuation — только hints, сверяются с native public readers; скрытые/отсутствующие цели не раскрываются. Никакого model/provider/allowance, нового RBAC или retrieval index.
4. `VICO_CONSULTANT_ENABLED`: при отсутствии значения или `true` доступен только provider-free локальный navigation API; `false` и любые другие значения закрывают endpoint. Никакой внешней активации/изменения environment не выполнено.
5. Добавлены `app/consultant/consultant.test.ts`, реальные PG fixtures в `tests/database/account-state.test.ts` и `tests/database/owner-authorization.test.ts`: guard, DTO, effective role/override, Owner, restricted/hidden/missing target, locale, catalog route/key/fingerprint, no-provider, live AccountState и dynamic grants/overrides.
6. Source self-check: прочитан diff/изменённый runtime, сверены native auth/locale/permission/public reader contracts и scope; exact-head source assertions подтвердили 17 файлов, 37 уникальных feature keys, 58 связанных message keys в canonical EN/ru/he packs и fingerprints, 12 intent patterns и Worker/private route wiring. Исправлены выявленные до handoff недостатки: admission после body, контекстные best-answer/report/placement predicates, различение search/feature intent, закрытый server-only registry, private 5xx, точное сопоставление public section names.
7. Ограничения: это детерминированные правила, не multilingual semantic retrieval и не модель. Для локального contextual navigation переиспользован существующий public topic-page reader; bounded retrieval projection принадлежит U3. Полный build/typecheck/lint/unit/database runtime и connected acceptance **не проверены** — CI/checks/acceptance не запускались и их результаты не читались Ада. Stage 6 и U2+ не начаты.

Следующий агент: Business-Мира запускает применимые CI/checks на exact head, проводит coordinator checkpoint по U1 и `PLAN.md`. U1 PASS не присваивать до её проверки. U2 не начинать до PASS; merge не выполнять.
