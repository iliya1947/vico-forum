# История проекта — 2026-11-19 — 2026-11-23: Moderation Visibility

Компактная запись о завершённой модерации видимости опубликованных тем
и сообщений. Исторический snapshot; действующее поведение определяется
[PROJECT.md](../../PROJECT.md),
[AUTHORIZATION.md](../auth/AUTHORIZATION.md) и
[ADMIN_PANEL.md](../ADMIN_PANEL.md).

## Реализованный результат

В принятой реализации B1–B9 reversible topic/post Hide/Restore отделён
от удаления и personal Mute/Block. Forward migration
`0071_moderation_visibility_foundation` добавила visibility state,
версии, timestamps, индексы скрытой очереди, новый code-backed
`forum.content.visibility.manage` с initial moderator/admin grants
и четыре вида нейтральной History. Закрытый public topic возвращает
нейтральный 404; hidden post представлен source-free tombstone с
неизменной хронологией, якорями и связями.

Транзакционные writer-gates, текущие permission/AP-10/actor checks,
CAS/reason/History, public discovery, personal/inbox and
attachment/translation safety, guarded private queue/inspection,
Admin QuickActions и EN/RU/HE UI получили интегрированную реализацию.
Защищённые Complaint/Appeal/Help lifecycle boundaries, stored
attachments, ревизии и пользовательские состояния сохраняются
без публичного раскрытия скрытого источника.

## Доставка, corrections, review и merge

Стек bounded этапов B1–B9 собран в первый implementation
[PR #355](https://github.com/iliya1947/vico-forum/pull/355).
Промежуточные PR #357/#359/#365/#367/#370/#371/#376 предназначались
для закрытия как superseded без merge в `main`; после fast-forward
первого PR GitHub зарегистрировал их как merged *в B1*, а не в `main`.
Это отклонение касается PR metadata, не feature или истории `main`.

Первый whole-feature review на `fdad1930fc68a854d52bee31922f923be5c1c751`
получил PASS Миры, но independent review Лёвы нашёл два current-feature
P2 дефекта:

1. **VIS-FINAL-LEVA-01:** Hide ошибочно запрещал отзыв собственного
   pending Help-сигнала при скрытых зависимостях вопреки protected
   lifecycle exception V6. Исправлено с сохранением admission,
   lock order и запрета ordinary creation/review скрытого контента.
2. **VIS-FINAL-LEVA-02:** ordinary Admin удалял hidden tombstones из
   projection и смещал permanent message numbers/root/best identity.
   Исправлено сохранением обезличенных заглушек и полной хронологии,
   без приватного hidden-source reader.

Исправления вошли в 8 scoped файлов / 5 commits. На финальном
exact head `66b1bb7ec0f4a1f5bed17583398d5acc041da143`
Мира выполнила свежий whole-feature PASS, затем Лёва — независимый
whole-feature re-review PASS; оба finding CLOSED.

Владелец merged #355 в `main` **2026-11-23 12:40:49 UTC**.
Merge commit: `9c6295593fb51a85cdb556c6fd928dc5d56de0f6`.
Служебный канал решения/передачи — [#342](https://github.com/iliya1947/vico-forum/pull/342);
он не предназначен для merge.

## Проверки финального exact head

1. [CI #45168532264](https://github.com/iliya1947/vico-forum/actions/runs/45168532264)
   — SUCCESS: 2958 unit, 1693 real PostgreSQL 17 tests,
   lint/typecheck/build/preview, migration/schema/privilege checks,
   built Worker + Better Auth smoke.
2. [SA04-N #45168532275](https://github.com/iliya1947/vico-forum/actions/runs/45168532275)
   — SUCCESS: подключённые Chromium/Worker/Better Auth/PG сценарии
   B8-C1/C2/C3.
3. [SA04-K5 #45168532028](https://github.com/iliya1947/vico-forum/actions/runs/45168532028)
   — SUCCESS: локальный R2/вложения и Chromium B8-B2.
4. Exact-head: 38 workflow runs (20 SUCCESS, 18 expected SKIPPED),
   48 PR check runs (24 SUCCESS, 24 expected SKIPPED), 0 FAIL.

Эти проверки относятся к repository/local-CI. Они не подтверждают
применение `0071` в production, deployed runtime, реальные Cloudflare
R2/Provider/Google binding или owner visual acceptance.
