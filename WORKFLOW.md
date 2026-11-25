# WORKFLOW.md — текущее оперативное состояние, назначения, блокеры и следующий переход

## Текущее состояние

1. Service PR **#320**, branch `service/authentication-lifecycle`; не merge в main.
2. Полный план AUTH-01–AUTH-07 принят Мирой: **COORDINATOR PASS — plan**. Baseline main `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
3. Delivery mode: stacked AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06; AUTH-07 — final gate всей сборки.
4. Активный этап **AUTH-01 — Mail foundation** реализован Лёвой в [#388](https://github.com/iliya1947/vico-forum/pull/388), branch `feat/auth-01-mail-foundation`, base main.
5. Stable implementation head: `e18fdb189d3c6a0a9ad913df398530a6cd69bb6a`. Author self-check/checks: PASS — author self-check/local checks и CI 45518743774 (attempt 2); evidence — stages/AUTH-01/RESULT.md.
6. Текущая фаза: **coordinator checkpoint AUTH-01 pending**. Проверяющий — Мира по ранее назначенному workflow; checkpoint PASS ещё не получен.
7. AUTH-02+ не начаты. Intermediate merge отсутствует. Лёва не выполняет независимую final review своей реализации; final reviewer определяется отдельно.
8. Real mail/provider/anti-bot/production Google и Stage-6 activation остаются заблокированными до explicit owner resume.

## Следующий переход

Мира проводит bounded coordinator checkpoint AUTH-01 на указанном stable head: scope, integration с основанием и evidence. Только её PASS разрешает следующую stacked-ступень. Implementation и service PR не merge на этом переходе. Лёва остановился; самостоятельно AUTH-02 не начинает.
