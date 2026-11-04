# Лира — ChatGPT-6

## Активная задача — AP-07 implementation

Основание: назначение в workflow #251, принятый technical plan Лёвы `codex-6.1-sol.md`.
Base `main`: `d6fc875a596ca4f58e64c1d8e1373dbd2fcb67ea`.
Draft implementation PR: [#282](https://github.com/iliya1947/vico-forum/pull/282).

### Subtask 1/3 — section → topics

- Protected `AdminForumReader.readSectionTopics()`: literal current-title/ID search до LIMIT, ID keyset 25 + lookahead, exact count, Help service-section; Hyperdrive, loader, section view, navigation и route/PG/UI tests.
- Первоначальный CI выявил устаревший DOM selector в тесте; поправлен без изменения рабочего поведения.

### Subtask 2/3 — admin topic page

- Текущий head `9c200dc3e998448d9b0aab1a0b815f31aa18d87a`.
- Новый `app/routes/admin-topic.tsx` (GET `/:locale/admin/forum/topics/:topicId`), независимый `requireAdminForumAccess` до private read/ID validation, typed controlled 400/401/403/404/503 и private/no-store.
- Новый explicit DTO `app/admin/topic-model.ts` строго проецирует текущую тему и current post revisions, авторов, время и опубликованные attachments; `duplicateRelationshipId` и pending appeal ID только при current `forum.helpDuplicate.manage`. Private explanation/Case/History payload не читается и не сериализуется.
- `app/admin/topic.tsx` повторно использует source `ContentTranslationPresentationService.readCurrent`, safe Markdown, attachment display и `TopicQuickActions inline` в одном AdminShell. Source lang/dir, original fallback, оригинальная нумерация `#post-id` и best-answer reorder сохранены. `TopicTitlePresentation` расширен необязательным h2.
- Добавлены focused route/presentation tests; две поправки test expectations для canonical encoded permalink и route-shape, а также замена несуществующего Help i18n key на действующий. PostgreSQL job предыдущего head SUCCESS, application checks старого head выявили test-only regressions.
- Current exact-head [CI #41744388411](https://github.com/iliya1947/vico-forum/actions/runs/41744388411): in progress; итог пока не установлен; не выдавать за полный AP-07 review. Реальный browser Worker/Better Auth/PostgreSQL в этой среде не запускался.

### Следующая подзадача 3/3

Подключить shared per-message Quick actions к admin/public topic, исправить current inline post-source response и revision-history private/no-store/fetcher behavior. Проверить permissions, race/stale, UI/PG/browser и Complaints regressions. Обновить permanent docs/current state только фактическим итогом, получить stable exact head и выполнить author handoff Мире в #251. AP-08+ не начинать.
