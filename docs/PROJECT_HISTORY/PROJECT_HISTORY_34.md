# История проекта — 2026-11-23 — 2026-11-24: Forum Structure и Topic Move

Исторический snapshot завершённой Task 6 служебного
[PR #342](https://github.com/iliya1947/vico-forum/pull/342).
Действующие контракты — в [PROJECT.md](../../PROJECT.md),
[ADMIN_PANEL.md](../ADMIN_PANEL.md) и
[AUTHORIZATION.md](../auth/AUTHORIZATION.md);
текущее состояние — в [PROJECT_STATE.md](../../PROJECT_STATE.md).

## Реализованный результат

F1–F6 собраны в [PR #379](https://github.com/iliya1947/vico-forum/pull/379).
Миграция `0072_forum_structure_foundation` добавила
`sort_position` обычных категорий/разделов, singleton version
структуры и отдельную topic `location_version`, а также
`forum.structure.manage` с initial built-in admin grant и
`forum.topic.move` с initial moderator/admin grants.

Реализованы создание/переименование/Up/Down категорий и разделов,
перенос ordinary section между обычными категориями и ordinary
topic Move между разделами с сохранением topic/post IDs, URL,
ревизий, вложений, статусов, персонального/инбокс состояния и
existing receipt. Help identities остаются зарезервированными.
Actual write сопровождается CAS и одним атомарным structural History
event из восьми новых action kinds; Owner `forum.structure`
читает исходный `admin_history`, без отдельного shadow journal.

После moderation visibility дополнительно сохранён отдельный guarded
hidden Move boundary: для скрытой ordinary topic требуются свежие
`forum.topic.move` и `forum.content.visibility.manage`;
private context не раскрывает title/body/author. Shared inline Move,
Admin-формы, guarded picker/direct view, EN/RU/HE, RTL и
сохранность mounted editors/undo/in-flight attachment XHR
проверены в локальном connected runtime.

## Review, corrections и merge

Промежуточные stacked F1–F5 PR закрыты/замещены при финальной
сборке F6. Независимый whole-feature review первоначально
остановил merge по пяти дефектам текущей реализации и одному
несоответствию контракта. После исправлений и повторных
coordinator/independent проверок **все шесть замечаний закрыты**.
Последняя коррекция согласовала отказ `409` для
section reparent в Help destination с `404` для недоступного
source/target: код не создаёт изменения или History на отказах.

Final implementation exact:
`42efaaaabcae24fbb1fa74d042e18e850827b23d`.
Мира выдала coordinator PASS, Лена — независимый whole-feature PASS
на том же exact head. Owner merged #379 в `main`
**2026-11-24 14:49:15 UTC**, merge commit
`59e2fd9092bb1884392221eb856c2b989cc87ade`.
Служебный #342 остаётся отдельным рабочим каналом без merge.

## Проверки и граница доказательств

1. [CI #45411761750](https://github.com/iliya1947/vico-forum/actions/runs/45411761750)
   — финальный exact-head author-check: **3196 unit** и
   **1834 PostgreSQL** теста, локальные lint/type/build.
2. [Whole-feature acceptance #45411775325](https://github.com/iliya1947/vico-forum/actions/runs/45411775325)
   — SUCCESS одного connected whole-feature workflow с
   Worker/Better Auth/PostgreSQL 17/Chromium и local-R2 seams.
   Всего на том же exact head успешно завершились
   **18 отдельных применимых acceptance workflows**.
3. Финальный Chromium artifact `14929216238` проверен в
   independent review: exact SHA, 19 groups, без page errors
   и внешних обращений. Latest database CI потребовал
   повтора после обработки ожидаемого conflict в старом
   Complaints race test; затем все нужные проверки SUCCESS
   без изменения production source.

Это repository/local-CI evidence, не deployed/production
acceptance, не подтверждение применения `0072` во внешней БД,
реальных Google/Owner binding, provider/R2 или owner visual sign-off.
