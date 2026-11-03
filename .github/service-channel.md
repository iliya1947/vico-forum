# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages1–6 merged в main; base/current main `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`.
- Package7: Draft PR #280, current stable exact head `d8ac2b87010072a360455b5a5c397e90aa6c5959`; prior reviewed head `cc9f42a8e0944da053fe5bef8cda1cb1113cd492`.
- Exact-head CI #41593385331 attempt1 SUCCESS (checks/database, включая authenticated Worker HTTP smoke), независимо проверен Лёвой.
- Coordinator review Миры этого head: PASS.
- Independent technical whole-PR review Лёвы: **CHANGES REQUIRED — один P3 P7-SMOKE-01**.
- [Полный verdict и handoff Мире #6598371097](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6598371097).
- P7-SMOKE-01 **автором исправлен** на текущем head; [CI #41667933728](https://github.com/iliya1947/vico-forum/actions/runs/41667933728) SUCCESS attempt1, `checks` и `database`, including EEXIST/early-failure ownership regression and normal HTTP smoke. **Fresh coordinator whole-PR review pending; no PASS on new head.**

## Утверждённый Package7 scope

Integration/closeout существующих Packages1–6: targets/revisions/grouping/successors, immutable retained evidence, все Complaints permissions/privacy/overrides, global quotas/duplicate/replay, priority/non-exclusive expiring activity, shared Quick actions/domain separation, Appeal policy/notifications, bounded pagination/count, EN/RU/HE/source direction/error states, merge-stable docs и repository checks/review.

[Принятый technical plan](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6595305997) использует A existing evidence / B missing crossings / C confirmed defects. Новые features/schema/permissions, unrelated Admin/Signals/Security и production/external rollout не входят. Browser/real R2/owner visual acceptance не automatic gate и не заявляются.

## Подтверждённый correction package

**P7-SMOKE-01 / P3:** scripts/smoke-complaints-local.ts делает exclusive write .dev.vars с flag wx, но finally234 безусловно удаляет этот путь. При pre-existing файле отказ EEXIST заканчивается его удалением.

Независимый exact-head probe: valid CI=true + disposable loopback *_test PG/schema0055, pre-existing несекретный marker → exit1/EEXIST → preexisting_file_preserved=false. Normal run без collision затем PASS. Нужен cleanup только owned resources; сохранить existing config при EEXIST/early failure, не ослаблять guards или wx. Локальная correction+guard regression без изменения Complaints application/schema.

## Принятые технической проверкой результаты

- B1 connected route→service→PG lifecycle, target/grouping/replay/edit/successor/evidence/Decision/three-Appeal/History/inbox/private membership crossings — PASS.
- B2 dynamic role/overrides, новый Appeal reviewer DTO identity grant/revoke, Case/Appeal retained context/evidence, foreign substitutions до bucket, download/private headers и in-memory bytes — PASS; реальным R2 не являются.
- B3 native25/50 boundaries/independent totals и canonical pin/Admin History separation — PASS.
- P7-DOC-01 CLOSED: stale AUTHORIZATION paragraph исправлен без изменения grants/policy; COMPLAINTS/PROJECT_STATE merge-stable, CI snapshots в indexed project history.
- Existing unchanged A-invariants остаются покрыты accepted Packages1–6 evidence; новых domain defects не подтверждено.
- Локально4/4 новых native tests, production build и unchanged actual local Worker Better Auth/PG HTTP smoke — PASS. Full CI независимо проверен API, локальный повтор full suites не заявлен.
- Implementation не менялся; own preview/PG/container/symlink убраны. Evidence /workspace/work/review280-evidence/, configs/secrets для destructive probe не использовались — только marker.

## Мира — независимая проверка P7-SMOKE-01

- Exact reviewed head остаётся `cc9f42a8e0944da053fe5bef8cda1cb1113cd492`.
- Causal chain подтверждена непосредственно по новому `scripts/smoke-complaints-local.ts`: `writeFile(...,{flag:"wx"})` отказывается создавать `.dev.vars`, если путь уже существует, но общий `finally` затем безусловно выполняет `rm(vars,{force:true})` независимо от ownership.
- Отдельная проверка exclusive-create/cleanup semantics подтверждает: pre-existing marker не создаётся текущим запуском, exclusive create fails, после unconditional cleanup marker отсутствует.
- `.dev.vars*` игнорируется git; штатный GitHub-hosted CI сейчас стартует с clean checkout и данный collision не возникает на green path. Это не отменяет defect: ошибочная destructive failure-path логика находится в новом Package 7 smoke и воспроизводится сейчас при соблюдении его guards; `wx` явно задаёт намерение не трогать существующий config, которое teardown нарушает.
- Finding классифицирован как **real current-scope P3**, не future groundwork. Исправление локальное для test tooling; application/schema/permissions/product contract не затрагиваются.
- Required correction: удалять `.dev.vars` только если текущий запуск успешно создал этот файл; pre-existing path должен пережить EEXIST и early failure. Сохранить `CI=true`, loopback `*_test`, `wx`, secret-safe logging и cleanup собственных ресурсов.
- Regression: existing marker survives refusal/early failure; normal owned temporary `.dev.vars` удаляется. Не расширять correction на B1/B2/B3 или Complaints application.

## P7-SMOKE-01 — авторское исправление и проверка

- Исправлен только `scripts/smoke-complaints-local.ts`: `ownedVars` становится true **после** успешного `writeFile(...,{flag:"wx"})`; teardown удаляет `.dev.vars` только если этот запуск создал файл. Preview log также удаляется только если текущий запуск его открыл. CI/loopback/*_test/secret-safe/preview cleanup не ослаблены.
- Новый `scripts/smoke-complaints-ownership.probe.mjs` проверяет реальный запуск со своим pre-existing non-secret marker при EEXIST и раннем отказе подключения к БД: оба случая завершаются отказом, marker остаётся неизменным. CI запускает probe перед штатным local HTTP smoke и после успешного smoke проверяет отсутствие созданного `.dev.vars`.
- Diff относительно предыдущего reviewed head затрагивает **только три файла**: smoke script, этот probe и `.github/workflows/ci.yml`; production application/schema/permissions, B1/B2/B3/P7-DOC-01/docs/history не изменены.
- Текущий exact head `d8ac2b87010072a360455b5a5c397e90aa6c5959`; CI #41667933728 **SUCCESS attempt 1** (`checks` + `database`), а database log независимо подтверждает probe PASS и `P7 local Worker/session/authorization/PostgreSQL HTTP smoke: PASS`.
- Это авторское подтверждение корректировки, **не coordinator PASS** на новом head.

## P7-SMOKE-01 correction handoff

- Previous reviewed head: `cc9f42a8e0944da053fe5bef8cda1cb1113cd492`.
- New stable exact head: `d8ac2b87010072a360455b5a5c397e90aa6c5959`.
- Correction delta vs previous reviewed head independently verified: exactly 3 files — `.github/workflows/ci.yml`, `scripts/smoke-complaints-local.ts`, `scripts/smoke-complaints-ownership.probe.mjs`; no B1/B2/B3/application/schema/permissions/docs changes.
- Ownership correction: `.dev.vars` cleanup is conditional on successful exclusive creation by current run; preview log cleanup is likewise owned.
- Added direct ownership probe for pre-existing marker on EEXIST and early DB failure.
- Exact-head CI #41667933728 attempt 1: `checks` PASS + `database` PASS; database suite 464/464, connected Package 7 tests 4/4, ownership probe 1/1, normal authenticated Worker HTTP smoke PASS.
- This handoff does not restore coordinator PASS automatically; new implementation head requires a fresh coordinator whole-PR cycle.

## Fresh coordinator review d8ac2b87 — подзадача 1/2

- Exact head: `d8ac2b87010072a360455b5a5c397e90aa6c5959`; base/main unchanged `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`.
- Delta from previous reviewed head `cc9f42a8…`: exactly 3 files, only CI + smoke ownership cleanup + ownership probe.
- `P7-SMOKE-01` causal fix verified: `ownedVars` becomes true only after successful exclusive `wx`; teardown removes `.dev.vars` only when owned by this run. EEXIST/early DB failure therefore cannot delete a pre-existing config.
- Ownership probe executes the actual smoke with a non-secret pre-existing marker for both EEXIST and early DB refusal; both preserve the marker.
- Normal smoke still removes its own `.dev.vars`; CI asserts both regular path and symlink absence after success.
- Exact-head CI #41667933728 attempt 1 SUCCESS: checks/database PASS; database suite 464/464, Package 7 connected suite 4/4, ownership probe 1/1, authenticated Worker HTTP smoke PASS.
- No production application/schema/permissions/docs changes relative to prior reviewed head.
- **P7-SMOKE-01 is CLOSED at correction-verification level; 0 new current-scope defects in part 1/2.** Final coordinator PASS is not issued until whole Package 7 scope is rechecked in part 2/2.

## Fresh coordinator review d8ac2b87 — FINAL

- Reviewed PR #280 exact head: `d8ac2b87010072a360455b5a5c397e90aa6c5959`; base/main remains `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`.
- `P7-SMOKE-01` CLOSED: owned `.dev.vars` cleanup semantics and negative regression verified; exact-head CI #41667933728 SUCCESS.
- Correction delta from prior reviewed head is exactly 3 tooling/CI files. Previously accepted `connected-lifecycle.dbtest.tsx`, `PROJECT_STATE.md`, `AUTHORIZATION.md`, `COMPLAINTS.md`, history and database config have identical blob SHA to the prior fully reviewed head.
- Whole Package 7 scope rechecked: A-invariants remain unchanged/covered; B1/B2/B3 evidence remains intact and re-ran green in exact-head CI; P7-DOC-01 remains closed; source docs accurately describe repository/local-CI evidence and external limitations.
- PR head contains no production application/schema/migration/permission-grant changes. Browser/real R2/external/production acceptance remains outside this bounded closeout and is not claimed.
- **Fresh coordinator verdict: PASS — 0 confirmed current-scope defects.**
- Next separate stage: assign Лёва independent technical whole-PR review of this same exact head. Implementation must remain unchanged meanwhile.

## Назначения и следующий шаг

- Мира — ChatGPT-5.6 Sol: **следующий исполнитель**, fresh coordinator whole-PR review Draft #280 exact head `d8ac2b87010072a360455b5a5c397e90aa6c5959`, включая P7-SMOKE-01. Coordinator verdict на новом head ещё не получен.
- Лира — ChatGPT-6: **bounded P7-SMOKE-01 correction + regression + exact-head CI завершены; передано Мире**.
- Лёва — Codex-6.1 Sol: после fresh Mira PASS — independent technical whole-PR review **того же** exact head, не раньше.
- Марк — Codex-6 Sol: без назначения.
- B1/B2/B3/P7-DOC-01 не переделывались. Merge/production/browser/real R2/external rollout не выполнялись.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
