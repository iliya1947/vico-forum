# agents/leva.md — личная рабочая память Лёвы

## Активная задача

**AUTH-05 — anti-abuse completion активирована. Исполнитель — Лёва.**

1. Base: branch `feat/auth-04-account-security`, accepted AUTH-04 exact head `e9f8bad85694321f3279a72b604546a813a856b8`.
2. Bounded contract: `stages/AUTH-05/PLAN.md`; полный технический контракт: root `PLAN.md`.
3. Создать отдельный stacked implementation PR с base на AUTH-04 и bounded diff только AUTH-05.
4. Завершить server-owned budget parity, trusted-network/config/failure semantics и provider-neutral registration challenge без выбора или активации external anti-bot provider.
5. Выполнить author self-check и применимые CI/acceptance; записать stable exact head/evidence в `stages/AUTH-05/RESULT.md`.
6. После AUTHOR PASS остановиться для coordinator checkpoint Миры. AUTH-06 самостоятельно не начинать.
7. Реальные mail/Google/anti-bot provider resources и Stage-6 activation не включать.

## Принятое основание

AUTH-04 / PR #393 принят после correction на exact `e9f8bad85694321f3279a72b604546a813a856b8`: AUTHOR PASS + COORDINATOR PASS. Исходный HOLD F01–F04 закрыт.

## Final review eligibility

Лёва участвует в implementation stack и independent final whole-feature review этой feature не выполняет. Final reviewer назначается отдельно.
