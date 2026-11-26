# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## Общий контекст

1. Полный технический план authentication lifecycle `AUTH-01–AUTH-07` принят; delivery mode — stacked `AUTH-01 → AUTH-02a → AUTH-02b → AUTH-03 → AUTH-04 → AUTH-05 → AUTH-06`, затем AUTH-07 final gate.
2. Better Auth остаётся authentication/session provider; application authorization отдельна; implicit Google↔credential linking запрещён.
3. AccountState, Owner Monitoring/History, registration settings и Settings Account & security переиспользуются.
4. Реальные Resend/Brevo, DNS, external mail/challenge calls, production Google OAuth, edge rules и Stage-6 activation заблокированы до отдельного owner gate.

## Принятые stacked-ступени

1. AUTH-01 / #388 — coordinator PASS.
2. AUTH-02a / #389 — coordinator PASS.
3. AUTH-02b / #391 — coordinator PASS.
4. AUTH-03 / #392 — coordinator PASS.
5. AUTH-04 / #393 — coordinator PASS на corrected exact `e9f8bad85694321f3279a72b604546a813a856b8`.
6. AUTH-05 / #394 — coordinator PASS на exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`.

## Активная ступень

**AUTH-06 — whole-lifecycle/security acceptance.** Исполнитель — Лёва. Base — accepted AUTH-05 branch `feat/auth-05-anti-abuse` / exact `ac59e3d2e693d27806ebe732e4a52e79cd2fd3e0`. Bounded handoff — `stages/AUTH-06/PLAN.md`; обязательная matrix — root `PLAN.md` §9.

AUTH-06 добавляет только недостающий исполняемый acceptance/evidence слой. Новые auth product capabilities и external provider activation не входят. Подтверждённый дефект предыдущих ступеней не исправляется внутри acceptance package: HOLD → отдельный correction route.

## Текущий переход

После AUTHOR PASS AUTH-06 Лёва останавливается для whole-feature coordinator review Миры. AUTH-07 до отдельного перехода не начинать.
