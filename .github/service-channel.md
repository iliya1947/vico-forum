# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–3 завершены и merged в `main`.
- Package 4 находится в Draft [PR #276](https://github.com/iliya1947/vico-forum/pull/276), stable exact head `7d64933d47c257267d1fa4c6aec63685e9d27344`, current main/base `6b653e3ec202e649c3ed48ba442d9a5bf5c64d1f`.
- Предыдущий technical review выявил current-scope P2 в Framework targeted reread: raw `request.url` содержал `_routes`, а strict `reviewPages` отвечал 400.
- Лира исправила только эту границу: Case loader валидирует pagination по React Router 8.3.1 normalized `url.href`; raw request framework metadata больше не участвует в application query validation.
- Мира завершила новый coordinator whole-PR review exact head `7d64933d...`: **PASS, подтверждённых current-scope дефектов — 0**.
- Проверено:
  1. Framework-style raw `.data?_routes=...` не попадает в `reviewPages`; normalized application URL сохраняет реальные pagination fields.
  2. Unknown/duplicate/out-of-range application query по-прежнему отклоняется 400; authorization/private-no-store не ослаблены.
  3. Первая correction Decision 409 recovery остаётся неизменной: forced reread, frozen reviewedVersion, сохранение draft/outcome/nonce, explicit acknowledgement, без auto-retry; concurrently resolved Case показывает фактический Decision.
  4. От первоначального fully-reviewed head `0de025e...` после обеих corrections изменены только три файла: `app/routes/complaint-review.tsx`, `app/complaints/review-view.test.tsx`, `app/complaints/review-http.test.ts`. Остальные 27 файлов Package 4 неизменны.
  5. Exact-head CI #41478096937 — SUCCESS: 1727/1727 application tests (120 files), 452/452 PostgreSQL tests (36 files), lint/typecheck/build/UI preview/migration/schema/runtime/Worker checks SUCCESS.
  6. CI test-merge `0d435b1b445374670c42cffb5d93372d8d155318` и implementation head имеют одинаковый Git tree `a47613b51aee7716d570562b89228ae8c4c83186`.
  7. Schema/domain/public API/permissions/Package 5+ не затронуты; docs/PROJECT_STATE остаются согласованы.
- Отдельный live built-Worker/Chromium прогон нового head Мирой не выполнялся и не заявляется; без конкретной новой непроверяемой гипотезы это не отдельный coordinator gate. Лёва проверяет runtime boundary в своём independent technical review.
- Лёва завершил independent technical whole-PR review того же exact head: **PASS, 0 подтверждённых current-scope дефектов**; [полный результат](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6582586583).
- Оба прежних P2 закрыты фактическим Chromium → production build → local Worker → PostgreSQL 17 прогоном: Decision 409 → targeted reread с `_routes` 200; still-open Case сохраняет draft/outcome/frozen version до explicit acknowledgement; concurrent resolution сразу показывает фактический Decision и удаляет старую форму. Нет reload/heartbeat wait, page errors или внешних media requests в записанном прогоне.
- Локально на exact head: 113/113 focused tests (11 files), client/Worker build и diff check PASS. Exact-head CI/jobs/tree parity независимо проверены API; полный suite в этом correction pass не повторялся. Owner visual/deployed acceptance не заявляются.
- Следующий шаг: Мира фиксирует coordinator closeout Package 4 на unchanged head и согласует дальнейший шаг с владельцем. PR #276 остаётся Draft; technical PASS не выполняет merge/production/Package 5.
- Production rollout и merge вне текущего review scope.

## Назначения

- Мира — ChatGPT-5.6 Sol: coordinator PASS завершён.
- Лира — ChatGPT-6: corrections завершены; новых изменений не выполняет.
- Лёва — Codex-6.1 Sol: independent technical PASS текущего head завершён, реализацию не менял.
- Марк — Codex-6 Sol: без текущего назначения.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
