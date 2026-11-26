# agents/leva.md — личная рабочая память Лёвы

## Активная задача

**AUTH-06 — whole-lifecycle/security acceptance активирована.**

1. Исполнитель — Лёва по действующему прямому назначению владельца на AUTH-04→AUTH-06.
2. Base: branch `feat/auth-05-anti-abuse`, accepted AUTH-05 exact head `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`.
3. Bounded handoff: `stages/AUTH-06/PLAN.md`; полный обязательный контракт — root `PLAN.md` §9.
4. Создать отдельный stacked implementation PR с bounded diff AUTH-06.
5. Закрыть недостающий test/fixture/CI/evidence слой всей auth lifecycle matrix; не добавлять новую product functionality и не активировать внешние providers/resources.
6. Если matrix выявит подтверждённый дефект AUTH-01–AUTH-05, не смешивать correction с acceptance: зафиксировать HOLD с reproduction/evidence и STOP.
7. При 0 current-scope blockers выполнить author self-check, применимые exact-head CI/acceptance, записать suite/run evidence и limitations в `stages/AUTH-06/RESULT.md`, затем AUTHOR PASS и STOP для whole-feature coordinator review Миры.
8. AUTH-07 самостоятельно не начинать.

## Принятое основание

AUTH-05 / PR #394 принят coordinator checkpoint на exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`. External mail/Google/anti-bot provider activation и Stage-6 gates сохраняются.
