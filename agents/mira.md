# agents/mira.md — личная рабочая память Миры по authentication lifecycle

## Текущий контекст

1. AUTH-01/AUTH-02a/AUTH-02b/AUTH-03 — coordinator PASS.
2. AUTH-04 #393: предыдущий author PASS Лёвы и мой parallel PASS относились к exact `c9035dce425333d14fdf12d2418f4a8a009edabf`.
3. Лена поставила HOLD с F01–F04. Я независимо перепроверила их по коду и pinned Better Auth 1.7.7 / better-call 1.4.0: все четыре подтверждены как реальные current-scope defects.
4. Мой прежний PASS ошибочен и отозван; ошибка зафиксирована в task/global logic logs service branch.
5. Лёве передана bounded correction F01–F04 в #393. AUTH-05 не активирована.
6. External Stage-6 activation остаётся заблокированной.

## Следующий переход

После нового AUTHOR PASS Лёвы проверить corrected stable exact head целиком по AUTH-04 с особым вниманием к F01–F04 regressions и затронутым acceptance criteria. До моего PASS AUTH-05 не активировать.
