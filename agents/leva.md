Этот файл хранит персональную рабочую память Лёвы по данной задаче.

# Лёва

## Активное назначение — technical plan User AI

Business-Мира передала Лёве самостоятельную planning-задачу №2: подготовить полный technical plan User AI / Vico Consultant.

### Обязательный вход

1. Актуальные `AGENTS.md` и локальный `RULES.md`.
2. `research/user-ai-product-concept.md`, D-25–D-32, `WORKFLOW.md`, `agents/mira-business-user-ai.md`.
3. Актуальные `PROJECT.md`, `PROJECT_STATE.md`, `ROADMAP.md`.
4. Профильные source-of-truth: authorization, multilingual/translation, UI/UX, Editor, Settings и database/Hyperdrive — в объёме, необходимом выбранной архитектуре.
5. Текущие Search, Help similar-question, Forum readers/revisions, auth/request context, permission resolver, locale boundary, translation allowance/provider jobs и Editor entry points.

### Результат

Создать `stages/user-ai/PLAN.md` — один полный технический план всей задачи №2 до начала реализации. План должен самостоятельно обосновать:

1. Consultant, knowledge/navigation и retrieval architecture без второго Forum/Search backend.
2. Переиспользование Search/Help/solved/best-answer и lifecycle индекса для create/edit/hide/restore/current revision/stale cleanup.
3. Session-only consultation state, переходы между страницами, завершение и удаление состояния.
4. Fail-closed mapping dynamic permissions/overrides → disclosure layer без копирования RBAC.
5. Public/private data boundaries, prompt-injection isolation, provenance/freshness и отсутствие autonomous writes/posts.
6. Provider strategy, quotas, caching/dedup, hard-stop при $0 и приоритет обязательного перевода.
7. Locale-generic работу и representative RU/HE/EN + mixed-language/technical-code quality acceptance.
8. Launcher/panel, contextual entries, accessibility, responsive и LTR/RTL acceptance.
9. Graceful degradation: lexical Search, Editor и forum navigation работают без AI.
10. Миграции, background jobs, observability и external Stage-6 gates только в необходимом объёме.
11. Полные этапы, зависимости, repository/local-CI acceptance и рекомендуемый delivery mode для Ады.

Перед использованием внешних API, SDK или provider Лёва проверяет актуальную официальную документацию и отделяет подтверждённые факты от account-specific Stage-6 unknowns.

### Границы

- Не начинать реализацию и не создавать implementation PR.
- Не включать Admin/Moderation AI.
- Не использовать старый общий `stages/embedded-ai/SCOPE.md` как вход.
- Не менять root `PLAN.md`, `#399/#402`, ChatGPT-control, production, secrets или provider resources.
- Готовый план передать Business-Мире на coordinator review; Ада начинает реализацию только после PASS и отдельного handoff.

## Предстоящее назначение — Stage C ChatGPT-control

По прямому решению владельца после coordinator PASS Stage B следующий bounded-этап ChatGPT-control, Stage C, будет передан Лёве.

Пока Stage C не активен. Не начинать его реализацию и не создавать/менять implementation PR до coordinator PASS Stage B и отдельного handoff от Миры задачи №1.
