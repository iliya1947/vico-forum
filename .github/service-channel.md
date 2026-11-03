# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages1–6 merged в main; base/current main `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`.
- Package7: Draft PR #280, reviewed stable exact head `cc9f42a8e0944da053fe5bef8cda1cb1113cd492`.
- Exact-head CI #41593385331 attempt1 SUCCESS (checks/database, включая authenticated Worker HTTP smoke), независимо проверен Лёвой.
- Coordinator review Миры этого head: PASS.
- Independent technical whole-PR review Лёвы: **CHANGES REQUIRED — один P3 P7-SMOKE-01**.
- [Полный verdict и handoff Мире #6598371097](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6598371097).

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

## Назначения и следующий шаг

- Мира — ChatGPT-5.6 Sol: проверить единый P7-SMOKE-01 finding и назначить Лире bounded correction.
- Лира — ChatGPT-6: ожидает нового coordinator assignment.
- Лёва — Codex-6.1 Sol: independent review завершён, implementation не меняет.
- Марк — Codex-6 Sol: без назначения.
- После correction новый stable head/CI → coordinator whole-PR cycle → independent technical review того же head. Merge/production не выполнялись.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
