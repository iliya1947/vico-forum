# История проекта — 2026-11-18: Bookmarks тем

Исторический snapshot завершённого bounded implementation/CI/review цикла
**Bookmarks**. Это **не** source of truth текущего поведения:
текущее состояние — [PROJECT_STATE.md](../../PROJECT_STATE.md),
постоянная продуктовая семантика — [PROJECT.md](../../PROJECT.md),
принятый план и review decisions — [служебный PR #342](https://github.com/iliya1947/vico-forum/pull/342).

## Merge и reviews

Implementation [PR #346](https://github.com/iliya1947/vico-forum/pull/346)
merged **2026-11-18 21:43:51 UTC**. Последний проверенный stable exact head:
`a3e6c0e63c99078ece89303592e1f24b2fe440fb`;
merge commit: `34ddf42985f6dc348e77d0dcc90e0aecc37fd15e`.
Мира (coordinator whole-PR) и Лёва / Codex-6.1 Sol (независимый
technical whole-PR) завершили проверки **PASS** одного и того же head.
Подтверждённых current-scope defects после corrections не осталось.

## Реализованный bounded scope

1. **Закладки только существующих тем.** `0069_topic_bookmarks` добавила
   `forum_topic_bookmarks` с PK `(user_id, topic_id)`, `saved_at`
   точности 3 ms, FK user/topic с `ON DELETE CASCADE`, индексами
   собственного списка и topic-side cleanup. Наличие записи означает
   сохранённую тему; повторный Add не обновляет время. Без backfill,
   post-level target, отдельных RBAC permissions и новых внешних ресурсов.
2. **Собственное состояние и одна mutation authority.** Topic page Add/Remove
   и Remove из списка используют существующую canonical topic action
   `intent=setTopicBookmark` и authoritative identity из Better Auth session.
   Active AccountState, origin, expected actor и строгость формы проверяются
   на сервере. Команда идемпотентна, действует только на свою пару;
   сохранение закрытых/решённых/Help тем допустимо.
3. **Отдельный private list `/:locale/bookmarks`.** Authenticated loader
   читает только собственные сохранённые темы, с `private, no-store`
   для HTML/data и typed отказом на storage outage. Keyset pagination
   по `saved_at DESC, topic_id DESC`: до 50 строк, «Older/Newest»,
   tie-safe cursor, без скрытого обрезания после первых 50.
   Ручной foreign/removed cursor остаётся позицией, не полномочием
   прочитать чужие записи. Список показывает текущую title revision,
   обычный public location (Help без service section) и нейтрального
   автора для деактивированного аккаунта, без snapshot текста.
4. **Изоляция от Watch и read/inbox.** Закладки не создаются из просмотров,
   ответов или подписки Watch; Add/Remove/List не меняют Watch,
   уведомления, прочитанность, редакции/статус темы, а также не вызывают
   уведомлений. UI использует независимые actor/topic-scoped fetchers;
   uncertain outcome требует обновления own state без автоматического POST.
   При смене аккаунта с ранее открытой older page private cursor сбрасывается,
   не запрещая произвольный исходный deep link для того же пользователя.
5. **Локализованная навигация.** Signed-in entry и действия в теме/списке
   реализованы в существующих ForumShell/locale UI, включая узкий Hebrew RTL.
   Реализация не включала редизайн, bookmark folders/notes, saved posts,
   публичные lists/counts, Admin/Super-admin или Mute/block.

## Значимые corrections во время acceptance

- **B6:** первый coordinator review Миры удержал PASS из-за отсутствующей
  real-PG concurrency/lifecycle acceptance, а не установленного code race.
  Лира добавила тесты на реальном PostgreSQL 17 с двумя соединениями,
  наблюдением server-side `pg_blocking_pids()`, конкурирующими Add×Add
  и Add×Remove, обоими порядками writer×deactivation, rollback,
  topic deletion/FK cleanup и совместимостью с title writer.
  При исправлении test assertion учитывалась Drizzle-обёртка ошибки COMMIT;
  product code не менялся. Все Bookmarks DB тесты **10/10 PASS**.
- **B5-R1:** независимый review Лёвы выявил сохранение cursor пользователя A
  при возврате через credential sign-in пользователя B. Мира подтвердила
  current-scope defect. Лира скорректировала только presentation reset
  при фактическом A→B, сохранив server-side own filtering и допустимость
  обычного foreign cursor. Добавлены компонентные и connected Chromium
  регрессионные проверки, включая A older page → sign-out → B email sign-in
  с непустым newest list → ручной прежний cursor.
- После этих corrections coordinator Мира и независимый reviewer Лёва
  повторили whole-PR проверки на одном финальном head и дали PASS.

## Evidence финального exact head

- На `a3e6c0e63c99078ece89303592e1f24b2fe440fb` GitHub Actions:
  **18/18 completed-success check-runs**, включая lint, typecheck, tests,
  PostgreSQL 17, builds, migration metadata/full schema manifest,
  runtime privileges и браузерные регрессии.
- [Connected Bookmarks browser run](https://github.com/iliya1947/vico-forum/actions/runs/44398510026)
  прошёл **11** checkpoints с built Worker, Better Auth, disposable PG17
  и Chromium: guest/private denial, validation, persist/reload,
  per-account isolation, current title и deleted author/Help,
  57 bookmarks/tied timestamps/keyset pagination, Watch independence,
  A→B credential return и EN/RU/HE narrow/RTL.
- Evidence относится к **repository/local-CI**, не к deployed/production
  инфраструктуре или отдельной owner visual acceptance.

## Границы, не закрытые merge

Production migration `0069`, live grants, Neon/Hyperdrive,
реальный Google OAuth/Owner binding, Queue/providers, production release
и deployed smoke **не выполнялись**. Принятая внешняя migration evidence
остаётся через `0020`; Stage 6 стоит на паузе. Финальная
product/visual acceptance относится к отдельному позднему UI/UX pass.
