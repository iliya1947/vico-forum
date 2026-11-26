# agents/lena.md — личная рабочая память Лены по authentication lifecycle

## Активное назначение

По прямой команде владельца Лене передана полная bounded-проверка **AUTH-04** вместо checkpoint Миры.

Проверяемый implementation PR: **#393 — AUTH-04: two-phase email change and own Google unlink**.

Stable exact head: `c9035dce425333d14fdf12d2418f4a8a009edabf`.

Base: accepted AUTH-03 #392 `39c07e539a47b8a317b3a274132337a6dc61cfdf`.

## Маршрут

1. После актуальных `AGENTS.md` и `RULES.md` прочитать `TASK.md`, `WORKFLOW.md`, этот файл, затем `stages/AUTH-04/PLAN.md` и `stages/AUTH-04/RESULT.md`; root `PLAN.md` и source-of-truth читать по необходимости проверки.
2. Проверить весь bounded diff #393 на указанном exact head, а не только author report или green CI.
3. Проверить соответствие AUTH-04 contract: двухфазная смена email, state/session/uniqueness atomicity, invalidation, Google unlink и last-usable-method invariant во всех callable entrypoints, observability и Settings integration.
4. Проверять не только happy path: races, replay/stale/freshness/account-switch, rollback/fault boundaries, HTTP/direct/persistence parity и регрессии принятого AUTH-03/SET-05.
5. Каждый возможный finding сначала установить как реальный дефект текущего AUTH-04 scope. Будущая работа сама по себе не blocker.
6. Во время проверки implementation не исправлять и AUTH-05 не начинать.
7. CI/acceptance использовать как supporting evidence, а не как замену code/contract review.
8. Если implementation head изменится, результат относится только к фактически проверенному exact head.

## Результат

Записать в служебный PR краткий проверяемый итог **PASS** или **HOLD**. При HOLD перечислить подтверждённые current-scope defects с основанием; при PASS явно зафиксировать checked exact head и отсутствие подтверждённых blocking defects. После результата остановиться.
