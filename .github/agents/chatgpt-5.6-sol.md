# Мира — ChatGPT-5.6 Sol

Активная задача: поэтапный аудит AUD-20261022. Этап 3 начат; части 1–2 завершены.

Этот файл используется для собственных рабочих результатов, выводов и технического контекста Миры в рамках текущего служебного PR.

## AUD-20261022 — этап 1

- Baseline: `d72b27ca762dd930f0e7ad614e5b00832a07ec0c`.
- Полностью прочитаны 18 актуальных документов, 7934 строки; подтверждённых document-contract contradictions нет.

## AUD-20261022 — этап 2

- Проверены все manifest targets этапа 2; новых подтверждённых current-Stage defects не установлено.
- Route/config/toolchain/dependency/server-client boundaries зафиксированы в shared channel.

## AUD-20261022 — этап 3, часть 1 — email/password и session

- Проверены email/password registration/sign-in, credential return path, request-scoped session, session refresh/expiry, sign-out presentation/revalidation и Better Auth resource route.
- OAuth service flow исключён.
- Отдельный real PostgreSQL sign-out regression отсутствует; оставить как coverage observation для этапа 12.
- Новых подтверждённых functional auth/session defects в этой части не установлено.

## AUD-20261022 — этап 3, часть 2 — dynamic authorization

- Baseline повторно подтверждён; `AGENTS.md` полностью прочитан перед подзадачей.
- Проверены `app/authorization/catalog.ts`, `request-context.ts`, `admin-view.tsx` и test, `app/routes/authorization-admin.tsx` и test, `db/authorization-service.ts`, `db/authorization-repository.ts` и test, `db/hyperdrive-authorization.ts` и test, `tests/database/authorization-snapshot.test.ts`; дополнительно использовано применимое evidence из `tests/database/migrations.test.ts`.
- Catalog содержит 15 current permission keys; built-in grants совпадают с source-of-truth. Dynamic role grants и overrides имеют precedence deny → allow → role → deny.
- Protected management route получает actor только из authenticated session, independently checks effective `access.authorization.manage`, checks same-origin before mutation and maps classified domain/availability failures to controlled responses.
- Repository mutation повторно проверяет actor permission внутри serialized transaction; singleton lock serializes all authorization mutations and post-mutation manager count prevents atomic removal of the last effective manager. Concurrent-last-two-manager scenario имеет PostgreSQL integration coverage.
- `resolveUser` и management state используют REPEATABLE READ read-only snapshots; production Hyperdrive capability caches one resolution promise per user only within request, while a new request resolves afresh.
- Availability adapter wraps only classified connection/query-timeout chains; schema/programming errors remain visible to normal error handling.
- Детали любых findings не записаны в служебный PR до завершения проверки согласно AGENTS.md.
- Следующая часть: resource ownership и owner/any boundaries.
