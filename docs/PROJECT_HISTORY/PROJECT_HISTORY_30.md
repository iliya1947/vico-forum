# История проекта — 2026-11-18: Watch / Unwatch темы

Исторический snapshot завершённого bounded implementation/CI/review цикла
**Watch**. Этот файл **не** является source of truth текущего поведения:
актуальное состояние — [PROJECT_STATE.md](../../PROJECT_STATE.md).
Рабочий план/решения и review evidence — [служебный PR #342](https://github.com/iliya1947/vico-forum/pull/342).

## Merge и review

Implementation [PR #345](https://github.com/iliya1947/vico-forum/pull/345)
merged **2026-11-18 16:14:32 UTC**. Проверенный stable exact head:
`76c1c456557c614171a3b472758498795a668b9a`, merge commit:
`9c4639d23ca075c8bb92fbb909b96593d7bee127`.

Мира (coordinator whole-PR) и Лёва / Codex-6.1 Sol (независимый
technical whole-PR) зафиксировали **PASS** на том же exact head;
подтверждённых current-scope implementation defects не осталось.
Веткой реализации занималась Лира / ChatGPT-6.

## Доставленный bounded scope

1. **Отдельное личное состояние Watch:** forward migration
   `0068_topic_watch` создаёт `forum_topic_watches` с
   `(user_id, topic_id)` primary key, FK `ON DELETE CASCADE` и
   `(topic_id, user_id)` индексом для fanout. Пара принадлежит
   authenticated session actor; нет auto-watch, backfill, новых
   permissions/RBAC и публичного списка подписчиков.
2. **Явные Watch/Unwatch:** существующая canonical topic action
   принимает отдельный `intent=setTopicWatch` и желаемое состояние
   `watching=true|false`; сервер проверяет topic, session actor,
   active AccountState, origin и stale expected actor. Повторные
   ON/OFF идемпотентны, состояние сохраняется между запросами.
   Closed/solved/Help темы остаются доступны для подписки.
3. **Reply notifications:** для будущих ответов расширен существующий
   `forum_reply_notifications` inbox: set-based fanout подписчикам
   вместе с прежними author/direct-parent recipients, исключая
   автора ответа и дубли одного recipient/post. При совпадении с
   mention сохраняется существующий приоритет reply. Unwatch
   прекращает только новые watch-derived уведомления, не удаляет
   прежние и не подавляет независимые author/parent/mention paths.
4. **Транзакционные границы:** Watch/Unwatch и публикация ответа
   сериализуются через topic `FOR NO KEY UPDATE`; actor проходит
   active-account admission в той же транзакции. Порядок фактически
   закоммиченных операций определяет участие в новых уведомлениях,
   без retroactive fanout. Failure fanout откатывает публикацию.
   Watch не меняет topic read marker, notification read_at,
   редакторы, исходные сообщения или title revisions.
5. **UI:** отдельная кнопка Watch/Unwatch в теме, изолированный
   actor/topic fetcher и server-confirmed state; при ошибке или
   неопределённом результате — явный refresh, не автоматический
   POST retry. Приватное персональное состояние не кэшируется
   публично и не раскрывается гостю.

## Проверки exact head

- GitHub Actions: **17/17 completed-success check-runs**, включая
  lint, typecheck, unit, PostgreSQL 17 integration/clean migrations,
  builds, migration/manifest/runtime privilege probes и
  [connected Watch browser](https://github.com/iliya1947/vico-forum/actions/runs/44324798071).
- В реальном PostgreSQL 17 проверялись own-pair state,
  recipient dedupe, no-backfill, author/self/mention overlap,
  lifecycle/rollback, receipt и concurrency boundaries отдельных
  соединений для Watch × reply / Unwatch × reply.
- Connected browser использовал built Worker, реальные Better Auth
  sessions, disposable PostgreSQL 17 и Chromium: guest denial,
  stale actor/origin/form checks, Watch persistence, получение
  нового reply в inbox с переходом к точному post, Unwatch
  без удаления старого notice и narrow Hebrew RTL.
- Принимающий CI/browsers — **repository/local-CI evidence**, не
  production/deployed acceptance.

## Не выполнено в этом цикле

Не выполнялись production schema migration `0068`, новые runtime
bindings, real Google OAuth/Owner binding, Neon/Hyperdrive/Queue/
provider acceptance, email/push/digest и публичный rollout.
Внешняя принятая migration chain осталась через `0020`.
Отдельная owner visual/product acceptance отнесена владельцем
к позднему UI/UX pass и не была заявлена как завершённая.

Bookmarks (migration `0069`) — **следующий отдельный bounded docs
closeout**; этот исторический snapshot не подменяет его.
