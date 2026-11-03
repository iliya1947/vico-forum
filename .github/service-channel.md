# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–6 merged в `main`; current main/base: `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`.
- Package 6 PR #279 merged successfully; reviewed implementation head `5494fe92dc5cc8b3fed87db5efcc9bc98b2f1731`, merge commit/main `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`.
- Exact-head CI #41571491052 attempt1 SUCCESS, checks/database; head/jobs/steps независимо проверены Лёвой.
- Coordinator review Миры: PASS, 0 confirmed current-scope defects.
- Independent technical whole-PR review Лёвы того же final exact head: **PASS, 0 confirmed current-scope defects**.
- [Полный independent результат и handoff Мире #6594813068](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6594813068).

## Утверждённый Package6 scope

1. Одна pending Appeal на initial Decision.
2. Eligibility по current effective outcome: confirmed→author, not-confirmed→reporters; upheld сохраняет, overturned меняет текущий итог.
3. Общий лимит3 Appeal на initial Decision; повтор того же eligible reporter разрешён.
4. Каждый result атомарно уведомляет affected author и всех actual reporters через общий inbox с dedup.
5. Initial Decision immutable, effective outcome выводится из resolved Appeals.
6. Другой initial reviewer предпочтителен, hard deadlock не допускается.

## Закрытые findings и доказательства

- P6-UI-01 CLOSED: target kind в group2/review и current topic title с registry lang/dir восстановлены; actual Worker SSR и rendered EN/RU/HE regressions прошли.
- P6-UI-02 CLOSED: обе формы показывают отдельные localized invalid/conflict/forbidden/notFound/unavailable, сохраняя status/draft/nonce/target; rendered actions/errors/retry regressions прошли.
- P6-DOC-01/02 CLOSED: PROJECT_STATE без transient PR/review snapshots, repository migration history0055 соответствует forward migration.
- Previous P6-RTL/VERIFY findings остаются закрытыми.
- Новый локальный pass:164 application/route/rendered tests, production build, actual Worker+session+PermissionResolver+PostgreSQL HTTP three-slot flow и corrected metadata EN/RU/HE — PASS.
- DB/drizzle/workers tree hashes совпадают с прежним reviewed head c38b036. Previous native73 tests, populated upgrade/concurrency/rollback и дополнительные28-row queue/60-row inbox probes учитываются как unchanged-code evidence; повторно выполненными в final pass не заявляются.
- Browser/Chromium и owner visual acceptance не выполнялись и не заявляются; developer restriction/coordinator classification сохранены. Full CI независимо подтверждён API; полный local CI повторно не запускался.
- Implementation не менялся. Temporary preview/PG/container/symlink/auth vars убраны.

## Package 7 — bounded coordinator scope

Package 7 является **integration/closeout package**, а не новым feature package. Его задача — доказать целостность уже реализованных Packages 1–6 на current `main` и закрыть только реальные cross-package/current-scope дефекты, если они обнаружатся.

### В scope

1. End-to-end проверить разделение `topic-title` и first-post targets и корректную immutable revision identity.
2. Проверить grouping/lifecycle Cases: разные reporters → отдельные Complaint в одном применимом open Case; новая revision или новый инцидент → отдельный связанный Case без изменения предыдущего.
3. Проверить сохранность reported evidence при последующих изменениях контента и границы retained evidence.
4. Проверить privacy и dynamic permissions всей цепочки Complaints: create, review, reporter identity, priority manage, appeal review; включая role grants, per-user allow/deny и negative states.
5. Проверить complaint-specific anti-abuse, duplicate/replay boundaries и отсутствие влияния лимитов на корректную жалобу на другой target.
6. Проверить priority lifecycle, manual override и reviewer presence как non-exclusive/expiring activity, а не assignment/lock.
7. Проверить shared Admin Quick actions boundary и отсутствие неявных санкций из Complaint/Decision/Appeal.
8. Проверить полный Appeal lifecycle: eligibility обеих сторон, один pending, общий лимит 3, effective outcome и participant notifications.
9. Проверить bounded pagination/count и empty/out-of-range behavior для Queue, Appeals и History на интегрированном состоянии.
10. Проверить применимые EN/RU/HE, source `lang/dir`, LTR/RTL и negative permission/error presentation на ключевых Complaints surfaces.
11. Проверить, что Complaints не дублируют и не расширяют домены Signals, Security или Admin panel.
12. Закрыть постоянную документацию и `PROJECT_STATE.md` только фактически подтверждённым merge-stable состоянием.
13. Выполнить применимые repository CI/checks и стандартный coordinator → independent technical review cycle.

### Правило реализации

- Не добавлять функциональность ради самого Package 7.
- Если current `main` уже удовлетворяет инварианту, использовать существующую evidence либо добавить только недостающую regression/integration verification.
- Production/external rollout, новые административные возможности, новые типы жалоб, Signals/Security integration и Package 7+ отсутствуют.
- Browser/visual acceptance не является автоматическим требованием: использовать только если конкретный integration path нельзя надёжно проверить существующими repository/local runtime средствами или разработчик отдельно запросит visual acceptance.
- Новая schema/migration/permission/public contract допустима только если техническая проверка выявит реальный current-scope дефект, который нельзя исправить локальнее.

### Готовность Package 7

Package 7 готов, когда весь lifecycle Complaints от submission до Case/Decision/Appeal/History/notifications проходит как единая система, все перечисленные cross-package invariants подтверждены, документация отражает фактическое состояние, repository checks зелёные и после coordinator + independent review не остаётся confirmed current-scope defects.

## Назначения и следующий шаг

- Мира — ChatGPT-5.6 Sol: bounded scope Package 7 определён.
- Лира — ChatGPT-6: без нового назначения.
- Лёва — Codex-6.1 Sol: **назначен технический план Package 7 integration/closeout по current main и зафиксированному scope**.
- Марк — Codex-6 Sol: без назначения.
- Package 6 закрыт в repository/local-CI path. Production rollout не выполнялся.
- Следующий этап: Лёва готовит технический integration/acceptance plan Package 7. Реализация до готового плана не начинается.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
