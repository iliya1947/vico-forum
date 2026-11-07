# История проекта — 2026-11-07: owner/authorization redesign Stage 2

Датированный implementation/review/merge snapshot. Не является source of truth текущего
поведения и не подтверждает production rollout, owner visual acceptance или завершение
оставшихся recovery/bootstrap работ. Актуальные контракты — в
[`AUTHORIZATION.md`](../auth/AUTHORIZATION.md) и
[`ADMIN_PANEL.md`](../ADMIN_PANEL.md); текущее состояние — в
[`PROJECT_STATE.md`](../../PROJECT_STATE.md).

- Stage 1 ранее удалил obsolete last-manager veto, сохранив
  `authz_mutation_lock`; Stage 2 выполнил approved Owner authority model.
  Технический план Лёвы и AP-10 уточнение: служебный PR #251,
  комментарии #6702391114 и #6702520494, плюс подтверждённая
  Owner all-catalog model.
- Реализация: PR #296, итоговый exact head
  `824ab8eccb091664c2e7d37f81f2737e7fd43e87`.
  Bound Owner определяется только точным `VICO_OWNER_USER_ID` для существующего
  authenticated user и имеет все code-backed `PERMISSION_CATALOG` permissions
  независимо от raw роли и персональных deny; не создаётся Owner role, wildcard
  или редактор binding. Raw role/grants/overrides сохраняются.
- AP-10 использует отдельно восстановленный raw RBAC actor/target, rank 3 для
  bound Owner и fresh проверки issuer floor/self/Owner-target/target hierarchy.
  Исторические меры Owner сохраняются, но не ограничивают его текущие
  действия в Forum/attachments/Complaints/generation и административной
  capability projection. Non-Owner enforcement остаётся действующим.
- `admin.users.blocks.managePrivileged` выдаётся и отзывается только
  bound Owner при role grants, назначении/снятии роли, персональных
  overrides и удалении elevated custom role. Сохранены same-origin,
  session, CAS/lifecycle, общий mutex и атомарная History.
  Private Roles/Users UI объясняет Owner effective authority рядом с
  фактическими raw ролью/deny (EN/RU/HE).
- Первая coordinator whole-PR проверка Миры на `04865401...` дала
  CHANGES REQUIRED по `STAGE2-MIRA-01`: неполная acceptance успешных
  Owner elevated grant/revoke transitions, без подтверждённого runtime
  дефекта. Исправлены только две тестовые fixtures: native PostgreSQL
  positive grant/revoke lifecycle и canonical Chromium UI с fresh
  recipient request/History. Runtime/schema не менялись.
- Итоговый exact-head GitHub CI #42349494000 — SUCCESS:
  155/155 application test files (1974/1974 tests), 47/47 PostgreSQL 17
  suites (571/571 tests), lint/typecheck/build, migration chain
  0000–0059, schema parity, runtime privilege и Worker smoke.
- Итоговый Chromium workflow #42349494094 — SUCCESS с первого запуска:
  AP-10/AP-11/Owner 37 case groups, включая успешные Owner role
  assignment/elevated grant removal/override changes, реальные
  Better Auth sessions, свежие права, History и EN/RU/HE при
  320/768/1280; независимый Admin History — 35 groups. Strict
  pageerror/layout/external-request проверки сохранены.
- После коррекции coordinator whole-PR Мира — PASS на том же exact
  head; independent technical review Лёвы — PASS, отчёт в служебном
  PR #251, комментарий #6704068605. Его собственное evidence включало
  выборочные unit/native PostgreSQL тесты, concurrency/mutex и History
  rollback probe, built Worker + Chromium.
- PR #296 merged в `main` 2026-11-07, merge commit
  `df57dabf2a4cbc44d85138d8809079878490a7c8`.
  Реализация не добавляла schema/migrations, seed grants, новую RBAC,
  super-admin/Settings, инфраструктурный redesign или публичный
  unauthenticated bootstrap. Recovery/bootstrap и deployed acceptance
  остаются отдельными будущими этапами.
