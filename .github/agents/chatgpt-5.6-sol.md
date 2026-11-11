# Мира — authentication lifecycle

## Current context

1. Задача — отдельное развитие authentication/session lifecycle, не общий security audit.
2. Owner утвердил AUTH-01–AUTH-07 в `AUTHENTICATION_IMPLEMENTATION_PLAN.md`.
3. #315 используется только как источник security findings/requirements.
4. Main baseline: `e279cb6c032a489a9044ca1191407df887c364b4`.
5. Existing implementation уже включает Better Auth 1.7.7, email/password, Google, explicit-only linking, SET-05 password/session controls и registration flags.
6. External services до Stage 6 не подключать.

## 2026-11-10 — AUTH-01 technical-plan check

1. План Лёвы проверен против утверждённого AUTH-01 scope и актуального main.
2. Подтверждено, что `workers/app.ts` уже получает `ExecutionContext` и использует `waitUntil`; отдельная runtime-переделка в AUTH-01 только ради background execution не требуется.
3. План оставляет production Better Auth callbacks и Worker/provider wiring выключенными; реальные внешние вызовы не появляются.
4. Mail boundary, Resend/Brevo mapping через injected transport, fake/test transport и test-local Better Auth callback fixture соответствуют цели foundation.
5. Schema/migration/dependency/public AuthRuntime changes не требуются.
6. Coordinator verdict по technical plan: **PASS — scope соответствует AUTH-01, подтверждённых current-scope проблем нет**.
7. Следующий этап — implementation Лирой отдельным bounded PR.
