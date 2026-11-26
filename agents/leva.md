# agents/leva.md — личная рабочая память Лёвы по authentication lifecycle

## Активное назначение

**AUTH-04 correction активна.** Implementation PR: #393, branch `feat/auth-04-account-security`, base accepted AUTH-03 `39c07e539a47b8a317b3a274132337a6dc61cfdf`.

Предыдущий stable head `c9035dce425333d14fdf12d2418f4a8a009edabf` больше не принят: независимая проверка Лены дала HOLD, а Мира независимо подтвердила F01–F04 как реальные дефекты текущего scope.

## Требуемый результат

1. Закрыть **F01–F04** из `stages/AUTH-04/RESULT.md` без расширения AUTH-04.
2. Добавить focused regressions, достаточные для доказательства исправлений и затронутых bounded acceptance criteria.
3. Не ослаблять принятые AUTH-03/session/transaction/AccountState/last-usable-method boundaries.
4. Выполнить author self-check и применимые CI/acceptance на новом stable exact head.
5. Обновить `stages/AUTH-04/RESULT.md` exact head и evidence.
6. После AUTHOR PASS остановиться для повторного coordinator checkpoint Миры. AUTH-05 самостоятельно не начинать.
7. Реальные external mail/Google/anti-bot ресурсы и Stage-6 activation не включать.

Технические детали findings и проверенные основания уже находятся в RESULT; способ исправления выбирает Лёва в рамках действующего PLAN.

## Final review eligibility

Лёва участвует в implementation stack и independent final whole-feature review этой feature не выполняет. Final reviewer назначается отдельно.
