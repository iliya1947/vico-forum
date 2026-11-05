# История проекта — 2026-11-05: Admin Panel AP-09 Users завершён

Датированный implementation/review/merge snapshot. Не является текущим domain contract
и не свидетельствует о production rollout.

- Implementation PR #287 добавил AP-09 Users: независимый code-backed `admin.users.read`
  с initial grant built-in admin, protected `/:locale/admin/users` index/search/detail,
  минимальную публичную identity/profile проекцию и targeted one-user authorization state
  только при отдельном `access.authorization.manage`.
- Users index использует name/ID search, stable ID keyset paging и matching total; email не
  выбирается и не участвует в search. Management controls на detail переиспользуют существующий
  canonical `/:locale/admin/authorization` action для `assignRole` / `override` без нового
  writer, mutation protocol, actor-authority field, lockout model или History event kind.
- Первый coordinator whole-PR review Миры на head
  `f5117f22bd891d3892357fc984009388481001f7` подтвердил AP09-MIRA-01..03:
  fresh management denial терял всё ещё разрешённый read-only detail; capability-dependent
  compatibility redirects не имели private/no-store; Users оставался в unfinished list.
  Один bounded correction package закрыл эти три defects.
- Второй coordinator cycle на `13bae37dd3b7d033b271788fadb7e8be63d66a43`
  подтвердил AP09-MIRA-04: history-state recovery marker переживал один denial event и мешал
  следующему независимому revoke/regrant cycle. Correction заменил persistent marker на
  mounted ErrorBoundary `useRef`: каждый отдельный denial получает максимум один fresh GET,
  successful read-only recovery позволяет будущий cycle, loss Users-read остаётся terminal
  403 без loop, denied mutation не replay.
- Финальный coordinator whole-PR review Миры завершён **PASS** на exact head
  `b85c3809befe3a1dcc83fe654dde4cd093f625ba`; подтверждённых открытых current-scope defects 0.
- Independent technical review Лёвы сначала ошибочно сообщил AP09-LEVA-01 о timezone-сдвиге
  `user.created_at`. Repro использовал synthetic `timestamptz`, тогда как accepted schema
  имеет `timestamp without time zone`. После повторной проверки всех migrations 0000–0057,
  actual directory/Drizzle profile readers и 9/9 boundary-date сравнений в трёх session
  TimeZones finding был **отозван** без code correction; итоговый independent verdict — **PASS**.
- Exact final-head CI #41941892340: **SUCCESS** — application 143/143 files,
  1888/1888 tests; PostgreSQL 41/41 files, 483/483 tests; применимые lint/typecheck/build,
  migration/schema/manifest/runtime probes и Worker smoke прошли.
- PR #287 merged в `main` 2026-11-05, merge commit
  `386023ce892044e623ec3d24f8a724e92af61a31`.
- При documentation closeout CI #41951777119 дважды проявил AP09-MIRA-05 — race только в
  repeated-revocation regression: тест мог проверить `Public details` на промежуточном
  ErrorBoundary до commit успешного recovery render. Runtime defect не подтвердился.
- Test-only PR #289 изменил только две synchronization assertions на positive-state
  `await waitFor(...)`; coordinator PASS и exact-head CI #41953193998 SUCCESS
  (application 143/143 files, 1888/1888 tests; PostgreSQL 41/41 files, 483/483 tests).
  По прямому решению владельца independent Codex review для этого single test-only correction
  не требовался. PR #289 merged в `main` 2026-11-05, merge commit
  `0521669eadc3b927b3f8d0651b98291ffda137a2`.
- Отдельный authenticated Chromium→Worker→Better Auth→PostgreSQL AP-09 browser flow и
  deployed/production acceptance не выполнялись и не заявляются выполненными; отдельный
  mandatory browser/owner visual gate для этого pre-release package не назначался.
- AP-10 blocking, Settings, Stage 6 и production rollout в AP-09 не входили.
