# Authentication lifecycle — AUTH-01–AUTH-07

Период: 2026-11-25 — 2026-11-27. Служебный канал [#320](https://github.com/iliya1947/vico-forum/pull/320), assembled implementation [#388](https://github.com/iliya1947/vico-forum/pull/388). Этот snapshot исторический, текущие контракты — в PROJECT, SETTINGS и AUTHORIZATION.

## Доставка

AUTH-01: server-only mail boundary, Resend/Brevo adapters, validated localized action URLs, templates и local fake transport. AUTH-02a/02b: shared lifecycle transaction/state, account uniqueness, separate DB lifecycle budgets, mandatory verification/resend и signup без сессии. AUTH-03: password recovery/reset и own Google-only password creation. AUTH-04: two-phase email change, own methods и last-usable-method enforcement. AUTH-05: shared abuse policy и provider-neutral registration challenge. AUTH-06: connected whole-lifecycle acceptance, negative/race/failure и privacy coverage. AUTH-07: pre-Stage-6 security/technical gate.

Better Auth/Drizzle adapter 1.7.7 сохранены; stacked implementation собран в #388 (промежуточные #389, #391–#395 superseded). Forward migrations 0073–0078: account uniqueness, auth_lifecycle_budget, verification/credential/account-security/registration-challenge observations. Сохранены immutable user.id, application RBAC, exact Owner binding, AccountState, SET-02/05 и существующая History.

## Corrections и итоговые проверки

1. После assembly K5 acceptance дважды остановилась до upload на immediate editor operation ID assertion. Подтверждён synchronization gap теста; correction добавила bounded readiness assertion без product/runtime changes. Точное старое failing value не установлено. Corrected head 71cdb70d9a5a8b0d0efc3df724d62b736dff7601, новый applicable acceptance PASS.
2. AUTH-07 first review HOLD: mounted Account & security не обновлялась после password creation, собственные auth-письма брали action locale вместо сохранённого языка, replacement password-create proof не захватывался в том же документе. Correction закрыла все три на 5b29469fe51e716b483d4e610dd90705f5409029; coordinator PASS.
3. Assigned final technical review Лёвы HOLD: гостевой reset не захватывал replacement/reopened proof в том же документе и терял validated returnTo на retry. Correction-2 закрыла оба, включая pending overlap и safe fallback. Coordinator re-review PASS и повторный assigned technical review PASS на 5d8bdaad117e59326f5eae61ea13613b0d45df7c. Лёва участвовал в AUTH-06; его финальная проверка поручена владельцем с учётом этого и не называется independent review.

## Финальный evidence и merge

Exact head `5d8bdaad117e59326f5eae61ea13613b0d45df7c`, tree `59901b92ce2753fb69adaa9c43ff09bbbcd70dba`, base `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.

- [CI #46010040782](https://github.com/iliya1947/vico-forum/actions/runs/46010040782) SUCCESS: 3347 standard tests (252 files), 1998 PostgreSQL 17 tests (123 files), whole-lifecycle 62/62.
- Applicable connected acceptance 20/20 SUCCESS; failures/cancelled 0. [AUTH-02b #46010040434](https://github.com/iliya1947/vico-forum/actions/runs/46010040434) SUCCESS: replacement/reset same-document, reopening after refresh without auto-POST, unsafe-return fallback; K5/AP-10/SA08 также SUCCESS.
- Повторный technical review в Chromium с локальным Worker, disposable PostgreSQL 17, 79 migrations и fake mail: same-document replacement/reopened proof, scrub, explicit submit, delayed old response, safe return path, expired/superseded/replay denial, revoke all target sessions, no guest auto-session и отдельный sign-in подтверждены. Внешних browser requests 0. Полный отчёт и coordinator evidence сохранены в #320 (`stages/AUTH-07/FINAL-TECHNICAL-REVIEW-2.md`, `COORDINATOR-REVIEW-2.md`).
- #388 merged в main 2026-11-27, commit `b1a1799b5927ed647eff9a8cbd5c03282f8a2d87`; tree идентичен принятому head.

Repository/local-CI gate завершён. Реальные Resend/Brevo credentials/DNS/delivery, production Google OAuth, exact Owner binding, выбор/активация anti-bot provider, внешние DB/runtime changes и deployed acceptance не выполнены этим merge. Stage 6 остаётся paused до отдельной команды владельца.
