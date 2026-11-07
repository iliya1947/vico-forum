# История проекта — 2026-11-07: owner/authorization redesign Stage 1

Датированный implementation/review/merge snapshot. Не является текущим source of truth и
не свидетельствует о production rollout, owner visual acceptance или завершении всей
owner/authorization redesign.

- После завершения ordinary Admin Panel AP-01–AP-11 владелец признал старый
  last-access-manager invariant ошибочным для целевой модели и, поскольку форум ещё
  pre-release и не запущен, утвердил его удаление до реализации новой owner authority.
- Перед удалением отдельно проверено использование `authz_mutation_lock`: manager-count
  state использовался только obsolete lockout path, но singleton row независимо нужен как
  общий transaction mutex для authorization mutations и AP-10 authority/read/write paths.
  Поэтому Stage 1 удаляет только veto/count/flag, не сам mutex.
- Технический план Лёвы: service PR #251, comment #6700603167.
- Implementation PR #294 final exact head:
  `e3604222ae8cecb4b1f2f94cdd5d7e9f76c15e61`.
- Runtime удалил `AuthorizationLockoutError`, `countManagers()`,
  `managers_ever_existed` и manager-count veto. Forward migration
  `0059_remove_last_manager_flag` удаляет только соответствующий столбец;
  `authz_mutation_lock` row/id/PK/CHECK и `FOR UPDATE` synchronization сохранены.
- Допустимый self-revoke последнего effective `access.authorization.manage` теперь
  коммитится с одним обычным History event; следующий fresh management request от этого
  actor запрещён. Failed History append по-прежнему откатывает mutation.
- Controlled PostgreSQL concurrency regression подтвердил, что authorization и AP-10 paths
  ждут retained mutex и после release используют fresh authority.
- Exact-head GitHub CI #42328843126 — SUCCESS: 1967/1967 application tests,
  563/563 PostgreSQL 17 tests, lint/typecheck/build, migrations/Drizzle/manifest,
  runtime-privilege probes и Worker smoke.
- Exact-head browser #42328843151 — SUCCESS: отдельный Admin History flow — 35 case groups,
  terminal canonical self-revoke + next-request denial, 0 page errors/external requests;
  AP-10/AP-11 regression — 34 case groups, 0 layout failures/page errors/external requests.
- Coordinator whole-PR review Миры — PASS на final exact head.
- Independent technical review Лёвы — PASS, report #6701647394. Собственное evidence
  включало selected unit/route/UI + PostgreSQL tests, build/metadata checks, full populated
  0058→0059 upgrade probe для обоих historical flag values и отдельные real Chromium reruns.
- PR #294 merged в `main` 2026-11-07; merge commit
  `e20490bc2d80c696bdf78e62539a8e1440821f9e`.
- Stage 1 не реализует target owner authority/recovery, не удаляет/перепроектирует mutex,
  не реализует Settings и не выполняет Stage 6/production rollout. Эти задачи остаются
  отдельными следующими этапами.
