# DOCS-CLOSEOUT — authentication lifecycle documentation closeout

## Цель

Привести постоянную документацию `main` в соответствие с уже merged repository/local-CI authentication lifecycle после PR #388, без изменения реализации и без активации Stage 6.

## Основание

1. PR #388 merged в `main` commit `b1a1799b5927ed647eff9a8cbd5c03282f8a2d87`.
2. Реализация прошла финальный assigned technical PASS на exact `5d8bdaad117e59326f5eae61ea13613b0d45df7c`.
3. Docs branch создана от exact post-merge main:
   `docs/authentication-lifecycle-closeout`.

## Scope

Обновить только постоянные документы, где текущее состояние после #388 уже описано неверно или неполно:

1. `PROJECT.md`
2. `PROJECT_STATE.md`
3. `ROADMAP.md`
4. `docs/SETTINGS.md`
5. `docs/auth/AUTHORIZATION.md`
6. `docs/UI_UX_PASS.md`
7. `docs/PROJECT_HISTORY/PROJECT_HISTORY_35.md` — новый history snapshot
8. `docs/PROJECT_HISTORY/PROJECT_HISTORY.md` — добавить навигационную запись #35

## Обязательное содержание

Документация должна отражать фактическое repository/local-CI состояние после #388, включая:

1. mandatory email verification для email/password регистрации;
2. auth mail boundary и repository/local transport без утверждения, что реальные Resend/Brevo уже активированы;
3. password recovery/reset;
4. создание password method для Google-only собственного аккаунта;
5. own Account & security lifecycle: email/status, email change, password, explicit Google link/unlink, own sessions;
6. provider-neutral anti-abuse/registration challenge foundation;
7. pre-Stage-6 security/whole-lifecycle acceptance как repository/local-CI результат;
8. Stage 6 остаётся отдельной внешней границей: реальные Resend/Brevo credentials/DNS/outbound mail, production Google OAuth, выбранный/реальный anti-bot provider и deployed acceptance ещё не подтверждены.

## Что исправить явно

1. Удалить/заменить утверждения, что email verification и password recovery отложены/не обязательны.
2. В `docs/SETTINGS.md` убрать устаревшее утверждение, что Account & security не реализует recovery, Google-only set-password, email change и provider unlink; при этом не приписывать реализованные функции, которых нет.
3. В `docs/auth/AUTHORIZATION.md` исправить устаревший linking rationale, основанный на том, что email/password registration не требует verification. Explicit-only linking и запрет implicit same-email linking сохраняются.
4. В `docs/UI_UX_PASS.md` обновить исторически действовавший MVP auth contract так, чтобы он не задавал нынешнему продукту ложное требование показывать verification/recovery как недоступные.
5. В `ROADMAP.md` больше не называть verification/recovery будущими задачами и отделить repository/local-CI готовность от Stage-6 external activation.
6. В `PROJECT_STATE.md` зафиксировать только текущее состояние и актуальные незавершённые внешние границы; историю corrections/PR туда не переносить.
7. `PROJECT_HISTORY_35.md` компактно зафиксировать #320/#388, AUTH-01–AUTH-07, correction/review closeout, exact-head CI/PG/Chromium evidence и merge.

## Не входит

1. Source/runtime code, localization catalog/manual values и тесты.
2. `docs/SUPER_ADMIN.md` — проверен, текущий contract не требует auth-lifecycle correction.
3. Новый отдельный `AUTHENTICATION.md` — не создавать.
4. Stage 6 provisioning, secrets, provider calls, Google OAuth configuration, production/deployed acceptance.
5. Изменение product scope или технического решения.

Если при полной сверке конкретного документа фактический код противоречит этому плану — не подгонять документацию; зафиксировать finding в RESULT и STOP.

## Delivery

1. Работать в `docs/authentication-lifecycle-closeout`.
2. Создать отдельный docs PR в `main`; implementation PR #388 не переиспользовать.
3. Выполнить author self-check всего docs diff против post-merge `main` и актуального source.
4. Для docs-only diff не запускать browser/connected acceptance без конкретного основания.
5. CI запускать только если применимые repository checks действительно требуют его для docs diff; не запускать механически.
6. Записать результат в `stages/DOCS-CLOSEOUT/RESULT.md`: PR number, exact head, changed files, self-check PASS/HOLD и оставшиеся ограничения.
7. STOP → Мира.

## Назначение

**Лена / GPT-6.2 — автор docs closeout.**

После AUTHOR PASS Мира проверяет весь docs diff; затем при PASS техническая точность closeout передаётся Лёве. Merge выполняет разработчик.
