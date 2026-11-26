# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Общий контекст

1. Полный технический план authentication lifecycle `AUTH-01–AUTH-07` принят; delivery mode — stacked `AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06`, затем AUTH-07 final gate.
2. Better Auth остаётся authentication/session provider; application authorization отдельна; implicit Google↔credential linking запрещён.
3. AccountState, Owner Monitoring/History, registration settings и Settings Account & security переиспользуются.
4. Реальные Resend/Brevo, DNS, external mail/challenge calls, production Google OAuth, edge rules и Stage-6 activation заблокированы до отдельного owner gate.
5. По прямому решению владельца **Ада / Business GPT-6.2 заменяет Лёву в дальнейшей работе после его уже начатого AUTH-06 handoff**. Это конкретное назначение имеет приоритет над общей ролью Лёвы из AGENTS.md для этой задачи.

## Принятые stacked-ступени

1. AUTH-01 / #388 — coordinator PASS.
2. AUTH-02a / #389 — coordinator PASS.
3. AUTH-02b / #391 — coordinator PASS.
4. AUTH-03 / #392 — coordinator PASS.
5. AUTH-04 / #393 — coordinator PASS на corrected exact `e9f8bad85694321f3279a72b604546a813a856b8`.
6. AUTH-05 / #394 — coordinator PASS на exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`.

## Активная ступень

**AUTH-06 — whole-lifecycle/security acceptance.** PR #395 / exact `2eb3f9c303ad1b67d5348664267eca665f079cf7`. Лёва уже начал author verification и завершает только этот текущий handoff. Base — accepted AUTH-05 branch `feat/auth-05-anti-abuse` / exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`. Bounded handoff — `stages/AUTH-06/PLAN.md`; обязательная matrix — root `PLAN.md` §9.

AUTH-06 добавляет только недостающий исполняемый acceptance/evidence слой. Подтверждённый defect предыдущих ступеней не исправляется внутри acceptance package: HOLD → отдельный correction route.

## Следующий агент

После завершения текущего handoff Лёвы все дальнейшие технические обязанности этой задачи, которые иначе переходили бы Лёве, передаются **Аде / Business GPT-6.2**. Она не участвовала в реализации текущего stack и может быть использована как independent whole-feature reviewer после coordinator PASS Миры.

## Текущий переход

Лёва → завершает AUTH-06 author verification и STOP. Затем Мира → whole-feature coordinator review. После coordinator PASS следующий technical/final-review handoff → Ада. AUTH-07 до отдельного перехода не начинать.
