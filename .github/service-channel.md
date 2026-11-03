# Complaints — communication

Служебный PR: #254.

## Актуальное состояние

- Packages 1–6 merged в `main`; current main/base: `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`.
- Package 6 PR #279 merged successfully; reviewed implementation head `5494fe92dc5cc8b3fed87db5efcc9bc98b2f1731`, merge commit/main `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`.
- Package 7: **Draft PR #280**, base `020cbafe1a1c872773c7e3c41e79c7c7f81eabe8`, stable head `cc9f42a8e0944da053fe5bef8cda1cb1113cd492`. P7-DOC-01 author-corrected; **B1/B2/B3 native regression + local authenticated Worker HTTP smoke PASS**. Merge-stable `COMPLAINTS.md`, `PROJECT_STATE.md` и `PROJECT_HISTORY_09.md`/index обновлены. Exact-head CI #41593385331 **SUCCESS** (checks/database, attempt 1). **Author handoff to Mira for coordinator whole-PR review on current exact head; coordinator PASS not yet issued.**
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

## Package 7 — verified integration evidence (author-side)

- B1: `app/complaints/connected-lifecycle.dbtest.tsx` couples actual React Router actions/loaders, Complaints service and PostgreSQL17 Case/Decision/Appeal/History/inbox IDs, immutable evidence after edit, successor Case, three Appeals and notification replay.
- B2: native PostgreSQL-backed role grants/overrides, reviewer DTO identity projection/revocation, independent Case/Appeal resource access and retained attachment membership with in-memory bucket; **not actual R2 acceptance**.
- B3: native 25/50 page boundaries, independent totals for pending Appeals, resolved History, timeline and mixed inbox; canonical `topicAction` pin + exactly one Admin History event, no implicit sanction from Complaints.
- Built local Worker with real Better Auth sign-up/session cookies, same-origin HTTP, PostgreSQL `*_test`, permission revoke/regrant across requests, protected resource responses, EN/RU/HE SSR and `und` source direction `auto`. Positive retained bytes require R2 and were not claimed; no browser/deployment.
- Author-verified head `3cd46b6583a40db5e48f317d2c798584f9e8eded` CI #41591646928 **SUCCESS**. After docs-only closeout, current stable head `cc9f42a8e0944da053fe5bef8cda1cb1113cd492` exact-head CI #41593385331 **SUCCESS attempt 1** (`checks` + `database`, local HTTP smoke PASS). No production code/schema/permission changes.
- Source docs closeout: `docs/moderation/COMPLAINTS.md` describes actual integration and limits; `PROJECT_STATE.md` records repository/local-CI state without PR/CI/review history; `docs/PROJECT_HISTORY/PROJECT_HISTORY_09.md` archives the pre-review author/CI snapshot and index links it.
- **Next:** final handoff to Мира in #254 for coordinator whole-PR review; only after her PASS independent technical review by Лёва. No Package 7 coordinator PASS yet.

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

## Package7 — технический план подготовлен

[Полный план Лёвы](https://github.com/iliya1947/vico-forum/blob/b07228406189154853ac521ceedbfeb79eb38b96/.github/agents/codex-6.1-sol.md#технический-план-package-7--integration-и-closeout); [handoff Мире #6595305997](https://github.com/iliya1947/vico-forum/pull/254#issuecomment-6595305997).

- Main020cbafe… tree совпадает с accepted final P6 head5494fe92…; post-merge implementation delta отсутствует.
- A/B/C карта отделяет уже доказанные native/route/runtime invariants от недостающих connected/CI crossings; базовый delta — минимальные tests/docs, без новых features/schema/permissions/dependencies.
- B gaps: connected submission→Case/Decision→Appeal→History/inbox; P6 reviewer DTO/privacy + retained resources; integrated pagination и canonical Quick action/domain separation. Existing proofs не переписываются.
- **P7-DOC-01 подтверждён:** docs/auth/AUTHORIZATION.md:103 сохраняет устаревшее deferred-утверждение про Appeals/notifications/History UI. Нужна локальная актуализация Complaints capability paragraph по действующему COMPLAINTS.md, без изменения grants/authorization policy.
- Application/schema defect при planning не подтверждён. Новые checks/implementation не выполнялись; Package7 PR отсутствует.
- Browser не автоматический gate; конкретная необходимость требует technical justification с сохранением прямых developer restrictions.
- Техплан подготовлен для проверки Мирой; его принятие и assignment Лире ещё не заявлены.

## Coordinator review техплана Package 7

- План Лёвы соответствует bounded integration/closeout scope и не расширяет Package 7 в новую функциональность.
- A/B/C decomposition принята: существующая evidence переиспользуется; новые проверки добавляются только для реально недостающих connected/native/runtime crossings.
- Предлагаемый implementation delta допустим: minimal integration/regression tests + merge-stable docs; без новой schema/migration/permission/dependency по умолчанию.
- **P7-DOC-01 независимо CONFIRMED:** current `docs/auth/AUTHORIZATION.md` всё ещё говорит, что Appeals, notifications и History UI deferred, что противоречит merged Packages 5–6 и current `COMPLAINTS.md`.
- Application/schema defect на planning этапе независимо не подтверждён.
- Browser/visual остаётся неавтоматическим gate; production/external rollout вне scope.
- Coordinator verdict по плану: **ACCEPTED**.

## Назначения и следующий шаг

- Мира — ChatGPT-5.6 Sol: **техплан Package 7 проверен и принят по scope; P7-DOC-01 независимо подтверждён**.
- Лира — ChatGPT-6: **назначена реализация Package 7 integration/closeout; implementation branch `chatgpt/complaints-package-7` создан Мирой из exact main после tool-blocker Лиры**.
- Лёва — Codex-6.1 Sol: техплан Package 7 подготовлен и принят координатором; без implementation assignment.
- Марк — Codex-6 Sol: без назначения.
- Package 6 закрыт в repository/local-CI path. Production rollout не выполнялся.
- Tool-blocker создания ветки снят. Draft #280 готов и передан Мире на coordinator whole-PR review exact head `cc9f42a8e0944da053fe5bef8cda1cb1113cd492`: B1/B2/B3 и local Worker HTTP smoke зелёные, docs/history обновлены, CI #41593385331 SUCCESS. **Мира — следующий исполнитель**, при current-scope findings возвращает один bounded correction package Лире; после PASS — independent technical review Лёвы того же head. Package 7 coordinator PASS пока отсутствует.

Оперативное состояние: [workflow.md](./workflow.md).
Утверждённый продуктовый план: [COMPLAINTS_IMPLEMENTATION_PLAN.md](../COMPLAINTS_IMPLEMENTATION_PLAN.md).
