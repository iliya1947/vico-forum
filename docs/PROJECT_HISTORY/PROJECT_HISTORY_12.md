# История проекта — 2026-11-06: Admin Panel AP-10 measures завершён

Датированный implementation/review/merge snapshot. Не является текущим domain contract и
не свидетельствует о production rollout или owner visual acceptance.

- Implementation PR #290 реализовал AP-10 administrative measures поверх AP-09: configurable
  temporary/permanent restrictions, независимые exact-measure lifecycle/appeals, request-scoped
  enforcement ordinary/admin действий, приватные own/admin surfaces, atomic History и forward
  migration `0058_user_measures`.
- Продуктовая модель зафиксирована владельцем до реализации: разные нарушения создают разные
  measures; одна pending appeal и до трёх последовательных appeals на measure; accepted appeal
  либо меняет restrictions/expiry той же measure, либо полностью снимает её; expired/lifted
  measure terminal; пользователь не видит identity администратора/reviewer; обе
  `admin.users.blocks.manage*` capabilities имеют zero built-in initial grants.
- Начальный coordinator whole-PR review Миры на head
  `503a5c6dc570e2c6c0f64f59e7fe5bf390a90b13` подтвердил семь current-scope defects:
  pending-appeal discovery, duration UX, privileged administrative-restriction authority,
  elevated authorization UI, restriction-aware ordinary UI, AP-10 History presentation и
  localized own-measure metadata. Один correction cycle закрыл AP10-MIRA-01..07 на
  `52a1db67610357f514e8013b06f70af6bda629c6`.
- Следующий coordinator sweep подтвердил AP10-MIRA-08..10: authority-aware restriction
  selectors, consistency issuer-floor projection/direct admin-family guards и сохранение уже
  смонтированных Create Topic / Help Question / Published Edit editor operations при свежем
  restriction. Исправления завершены на
  `ad789c7bf28d4fe7896e8ddbf7757460e046da27`.
- Финальный gap-sweep того цикла нашёл AP10-MIRA-11: exact measure detail оставался читаемым
  корректно, но Change/Lift/pending Appeal Review presentation не учитывал stored
  `issuer_authority_floor`. Correction добавил admin-only current `canMutate` projection
  без раскрытия floor/identity subject'у; coordinator PASS достигнут на
  `9fecd925a256062e9892235f4ba02ed3147de1e3`.
- Первый independent technical review Лёвы на этом head завершился NOT PASS по единственному
  AP10-LEV-01 [P3]: canonical measure create пропускал NUL-containing `targetId` до PostgreSQL
  text bind и получал HTTP 500 вместо typed private/no-store 400. Мира независимо подтвердила
  причинную цепочку и current-scope применимость.
- Локальная correction использовала bounded target-ID validation и на route boundary, и
  независимо в domain service. NUL / >2048 UTF-8 bytes теперь отклоняются до repository/SQL;
  valid nonexistent target остаётся 404; unknown SQL/programming failures не маскируются.
  Final implementation exact head — `ef313919f6613c54db6ddb50765c968744101306`.
- На final head GitHub CI #42218475676 — SUCCESS: application 1966/1966, PostgreSQL 17
  561/561, lint/typecheck/build, migrations/Drizzle/schema/runtime privilege и Worker checks.
  AP-10 isolated browser acceptance #42218475943 — SUCCESS на disposable PostgreSQL +
  built Worker + Better Auth + authenticated Chromium; включён malformed-target 400 /
  missing-target 404 / no-write regression и EN/RU/HE responsive flow.
- Финальный coordinator regression/evidence sweep Миры завершён PASS на
  `ef313919f6613c54db6ddb50765c968744101306`; подтверждённых current-scope defects не осталось.
  Повторный independent technical review Лёвы того же exact head также завершён PASS.
  Собственные reruns Лёвы: 289/289 selected application/domain/route/UI/Worker tests,
  78/78 native PostgreSQL tests, build PASS и Chromium→Worker→Better Auth→PostgreSQL
  19 case groups PASS с 0 layout/page errors/external browser requests.
- PR #290 merged в `main` 2026-11-06; merge commit
  `03c505370f44fa2640a489b647fba3929219093f`.
- Merge AP-10 не выполнял production/deployed rollout, owner visual acceptance, AP-11/Settings
  или отдельную post-admin owner-role/last-manager cleanup задачу. Documentation closeout
  выполняется отдельным PR #291 после implementation merge.
