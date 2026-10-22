# Мира — ChatGPT-5.6 Sol

Активная задача: поэтапный аудит AUD-20261022. Этап 3 начат; часть 1 завершена.

Этот файл используется для собственных рабочих результатов, выводов и технического контекста Миры в рамках текущего служебного PR.

## AUD-20261022 — этап 1, части 6–7

- Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.
- Полностью до EOF прочитаны `CONTENT_TRANSLATION.md`, `STORAGE_AND_VERSIONING.md`, `PROVIDERS_AND_JOBS.md`, `RESEARCH.md`.
- Накопительный итог этапа 1: 18 документов, 7934 строки; подтверждённых document-contract contradictions нет.

## AUD-20261022 — этап 2

- Проверены все manifest targets этапа 2; новых подтверждённых current-Stage defects не установлено.
- Route/config/toolchain/dependency/server-client boundaries зафиксированы в shared channel.

## AUD-20261022 — этап 3, часть 1 — email/password и session

- Baseline повторно подтверждён; `AGENTS.md` прочитан полностью перед подзадачей.
- Проверены: `app/auth/auth-client.ts`, `auth-controls.tsx` и test, `auth.server.ts` и test, `credential-path.ts`, `credential-view.tsx` и test, `request-context.ts`, `session-context.ts` и test, `app/routes/auth-api.ts` и test, `credential-sign-in.tsx`, `credential-sign-up.tsx`, `tests/database/auth-runtime.test.ts`, `tests/database/forum-email-registration.test.ts`.
- Email/password enabled; email verification намеренно не требуется; password limits 8–128. Registration hook server-side trim/validates display name (1–100), поэтому client maxLength не является единственной защитой.
- Credential return destination допускает только same-locale relative path; outside-origin, protocol-relative и cross-locale destination сходятся к locale root.
- Better Auth handler доступен только через explicit `/api/auth/*` resource route before API catch-all. Session resolved один раз до routing; только Set-Cookie из get-session переносится на page response, его cache headers не перетирают route response.
- PostgreSQL integration evidence: registration сохраняет hash вместо plaintext password, provider_id credential, non-verified user и session cookie; неверный password отвергается, верный принимается; sliding session refresh и expired-session cleanup работают через request boundary.
- Header sign-out использует Better Auth client signOut, после success очищает presentation и revalidates server snapshot. Official Better Auth docs подтверждают signOut/session revocation semantics; отдельного real PostgreSQL sign-out regression в repository не обнаружено — оставить как coverage observation для этапа 12, не defect.
- Generic credential/auth errors не выводят raw provider/secret details.
- OAuth service flow исключён; наличие конфигурационного adapter boundary не считается его acceptance.
- Новых подтверждённых current-Stage functional auth/session defects в этой части не установлено.
- Credential accessibility semantics намеренно не закрывались здесь; это этап 11.
- Следующая часть: dynamic authorization — catalog, roles/grants/overrides, management operations, snapshot/freshness, lockout.
