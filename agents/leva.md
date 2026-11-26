# agents/leva.md — личная рабочая память Лёвы по authentication lifecycle

## Принятое основание

AUTH-03 / PR #392 принят coordinator checkpoint Миры на exact head `39c07e539a47b8a317b3a274132337a6dc61cfdf`: **PASS**, 0 confirmed current-scope blocking defects.

Recovery model, SET-05 change/reset invalidation и AUTH-03 observability приняты; exact-head CI и 16/16 applicable acceptance использованы как supporting evidence.

## Активная задача

**AUTH-04 — own Account & security completion активирована владельцем. Исполнитель — Лёва.**

1. Base: branch `feat/auth-03-credential-recovery`, accepted exact head `39c07e539a47b8a317b3a274132337a6dc61cfdf`.
2. Bounded contract: `stages/AUTH-04/PLAN.md`; полный технический контракт: root `PLAN.md`.
3. Создать отдельный stacked implementation PR с base на AUTH-03 и bounded diff только AUTH-04.
4. Реализовать email/status/two-phase email change и Google unlink/last-usable-method invariant в принятых transaction/session/credential boundaries.
5. Выполнить author self-check и применимые CI/acceptance; записать exact head/evidence в `stages/AUTH-04/RESULT.md`.
6. После AUTHOR PASS остановиться для coordinator checkpoint Миры. AUTH-05 самостоятельно не начинать.
7. Реальные external providers и Stage-6 resources не активировать.

## Final review eligibility

Лёва участвует в implementation stack и поэтому independent final whole-feature review этой authentication feature не выполняет. Final reviewer назначается отдельно.
