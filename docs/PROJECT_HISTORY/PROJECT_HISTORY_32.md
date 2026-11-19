# История проекта — 2026-11-19: персональные Mute/Block

Исторический snapshot завершённой реализации, коррекций и проверок
**личных Topic Mute и направленного User Block**. Не является source of truth
текущего поведения: состояние — [PROJECT_STATE.md](../../PROJECT_STATE.md),
постоянный контракт — [PROJECT.md](../../PROJECT.md),
план и решения review — [служебный PR #342](https://github.com/iliya1947/vico-forum/pull/342).

## Merge и независимые проверки

Implementation [PR #351](https://github.com/iliya1947/vico-forum/pull/351)
merged **2026-11-19 19:38:41 UTC**. Последний проверенный stable exact head:
`0fc239a554c8df562e97bc600f59b6b7b06d36ab`;
merge commit в `main`: `b87a6702b4f97634ee21426f95ece38f53c672ed`.

Мира (повторный coordinator whole-PR review) и Лёва / Codex-6.1 Sol
(независимый technical whole-PR review) последовательно дали **PASS**
на одном и том же exact head для всего принятого M1–M7 scope.
Подтверждённых дефектов текущей задачи после corrections не осталось.
Merge выполнен владельцем после этих проверок.

## Реализованный bounded scope

1. **Сохраняемые личные пары и receipts.** Миграция
   `0070_personal_filters` добавила `forum_topic_mutes`,
   `forum_user_blocks` и `forum_post_notification_suppressions`.
   Первые две таблицы хранят собственные пары пользователь–тема и
   пользователь–заблокированный пользователь с FK, CASCADE cleanup,
   ключами/индексами личных списков; self-block запрещён SQL CHECK.
   Третья хранит подавленные пары получатель–сообщение, чтобы edit/replay
   после снятия фильтра не доставлял старые уведомления.
2. **Mute и Block не являются модерацией.** Explicit Mute темы подавляет
   будущие обычные reply/mention notifications для владельца фильтра из
   этой темы независимо от author/parent/Watch/mention sources; не
   скрывает контент и не меняет Watch. Направленный Block A→B подавляет
   новые обычные уведомления A от publication actor B и сворачивает
   сообщения B только в обычном TopicView A с явным per-post Reveal.
   Обратное направление независимо, публикация/чтение B не запрещены.
3. **Согласованная публикация и no-backfill.** Ordinary recipient decision,
   source dedupe и suppression receipts интегрированы в транзакционные
   initial-topic/reply/edit paths с real-PG ordering/rollback и replay
   checks. Unmute/Unblock не оживляют старые suppressed recipient–post
   pairs; новые публикации снова обрабатываются по текущим фильтрам.
4. **Собственные действия, private read и отображение.** Canonical topic
   action меняет Mute, canonical profile action — Block; active session
   actor, origin и строгая форма проверяются сервером. Приватная страница
   `/:locale/filters` показывает свои muted topics и blocked users
   в отдельных tabs, поддерживает Undo и keyset pagination.
   Own flags/list, errors и responses изолированы по пользователю и
   используют `private, no-store`; гостю не выдаётся Block graph.
   TopicView сохраняет post anchors/root/best-answer/parent/child
   связи, не монтирует body/attachments свёрнутых сообщений до Reveal.
5. **Независимые границы.** Mute/Block не меняют Watch, Bookmarks,
   read-state, Complaint decisions/evidence, Admin/Owner readers,
   публикационные разрешения или RBAC catalog. Реализация не включает
   новый moderation ban, общий social graph либо отдельный inbox.

## Значимые corrections в coordinator cycle

1. **PF-REVIEW-1 — stale successful ACK control.** В общем
   `PersonalFilterControl` удалён второй локальный `confirmed` mirror:
   свежий loader snapshot остаётся authoritative даже при позднем
   успешном ACK от прежнего writer той же пары. Проверены обе
   последовательности ON/OFF для Mute и Block; explicit refresh при
   неизвестном исходе и отсутствие автоматического POST replay сохранены.
2. **PF-REVIEW-2 — permanent Undo latch.** В `FilterRow` удалён локальный
   `removed` latch, скрывавший заново созданную пару после старого Undo.
   Новые тесты для Mute и Block проверяют Remove → повторное Add →
   fresh loader → delayed old ACK; строка снова отображается.
3. **PF-REVIEW-3 — Block graph A→guest.** Проверка stale Block snapshot
   распространена на смену header identity в guest/null до revalidation.
   Old A graph не применяется к гостевому TopicView; fresh guest
   остаётся публичным, A→B также fail-closed. Добавлены deterministic
   delayed-loader тест и real Better Auth same-page Chromium sign-out.
4. **Test-fixture correction.** На промежуточном head два старых теста
   attachment-only posts оказались несовместимы с новой защитой:
   серверная authenticated session сочеталась с guest header fixture.
   Исправлена только идентичность header в тесте; production code не
   ослаблялся. На финальном head оба сценария и новый sign-out тест PASS.

## Evidence финального exact head

- На `0fc239a554c8df562e97bc600f59b6b7b06d36ab`:
  **16/16 GitHub Actions workflows и 20/20 jobs SUCCESS**.
- [CI run 44590976935](https://github.com/iliya1947/vico-forum/actions/runs/44590976935):
  `checks` — lint/typecheck, application/unit/route **2744/2744 tests
  в 218/218 files**, build/preview; `database` —
  **1476/1476 tests в 109/109 files** на PostgreSQL 17,
  migration/schema/manifest/runtime-ACL/provisioning/Worker checks.
- [Connected Mute/Block run 44590977494](https://github.com/iliya1947/vico-forum/actions/runs/44590977494):
  **49/49 `FILTERS_CONNECTED` markers** с локальным built Worker,
  настоящими Better Auth sessions, disposable PostgreSQL 17 и Chromium:
  Mute/Block persistence/fanout, no-backfill, Block collapse/reveal,
  privacy/Undo/pagination, RTL и A→guest sign-out на той же теме.

## Дополнительный necessity audit Лёвы

После independent whole-PR PASS Лёва отдельно сопоставил текущие
механизмы с упрощёнными альтернативами. **Необоснованных
архитектурных механизмов не выявлено**: suppression receipts необходимы
для no-backfill, сохранение actor marker — для credential remount,
stale Block snapshot barrier — для переходов идентичности.
Изолированный прототип **PF-SIMPLIFY-1** (объединить два transient flags
в `PersonalFilterControl`) прошёл выбранные проверки, но **не был
включён в PR #351**; это необязательное упрощение, не дефект,
не новый review gate и не назначенная реализация.

## Границы после merge

Принятие относится к **repository/local-CI**, не к production
deployment, применению миграции `0070` и runtime privileges во
внешней БД, реальному Google OAuth/Owner binding, отдельному
deployed R2 download или production smoke. Внешняя принятая
migration history остаётся через `0020`; Stage 6 приостановлен.
Owner visual acceptance и поздний UI/UX product pass этим
implementation merge не закрыты. Отложенные WATCH/BOOKMARKS/TITLE
audits не были частью #351.
