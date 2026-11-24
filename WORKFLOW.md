# WORKFLOW.md — Task6 / Mira whole-feature re-review

## Активный gate

**Мира: повторное whole-feature coordinator review final Draft #379** после bounded WF-01 correction.

- Stable exact: `f601e91dcab19ee1992012564e9a0b557c2ea596`.
- Base main: `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- F1–F5 bounded coordinator PASS и исходная F6 acceptance/assembly сохранены.
- Предыдущий Mira HOLD на bf3e97d содержит один finding WF-01; автор не объявляет его закрытым и не подменяет новое coordinator решение.
- #379 Draft/open/unmerged; intermediate #380/#381/#382/#383/#386 closed/superseded/merged=false. Main unchanged.

## WF-01 correction / author gate

Create Category сохраняет attempted/unknown fence при отсутствии matching typed acknowledgement: имя остаётся, повторный create до explicit Refresh structure блокируется даже после независимого loader read. Штатный per-submission defaultShouldRevalidate=false исключает тихое post-action обновление expectations. Confirmed matching success очищает имя и явно revalidate'ит; typed invalid/conflict/unavailable/unauthenticated/forbidden сохранены. Automatic POST replay отсутствует. Backend/schema/API и остальные controls не менялись.

Correction: 7ee7d06; test-only synchronization: f601e91. Delta к bf3e97d:3 files/+144−8. Regression на исходном коде падает; fixed focused19 unit/lint/typecheck PASS. Первый CI browser run выявил race теста до окончания перехваченного POST; теперь assertions ждут фактический lost204 response после route.fetch/COMMIT.

**Leva author self-check/acceptance PASS** на stable exact:
- CI45314820622 SUCCESS:243 files/3158 unit,118 files/1831PG; lint/type/build/UI-preview, migration0072/history/schema/manifest75/runtime/credential/built Worker smokes.
- Все18 applicable acceptance SUCCESS. K5 attempt2 после раннего чтения старым тестом client-initialized editorOperationId; повторён только failed job, source не менялся.
- Whole-feature Chromium/local-R2 run45314830099 SUCCESS; downloaded artifact14885421479: implementationSha=checkoutSha=f601e91, fullFeature=true,14groups, pageErrors/external пустые.
- Новый реальный category COMMIT→lost204: ровно один category и original History event; имя сохранено; disabled click/submit event не создают POST; explicit refresh читает committed version, POST остаётся1.
- Local infrastructure очищена; production config восстановлен; worktree clean.

Полная S9/post-visibility matrix, точные run/job/artifact ссылки и correction provenance: **stages/forum-structure/F6_REPORT.md**. Canonical scope: stages/forum-structure/PLAN.md S0–S10.

## Следующий шаг / STOP

**Мира whole-feature re-review main→f601e91**, все108 files, отдельно WF-01 и regression. При current-scope findings — возврат автору; после coordinator PASS — независимый Марк при code independence, затем owner merge.

**Лёва STOP**: автор implementation/acceptance/assembly, independent review собственной работы не выполняет. Mark inactive до Mira PASS. F7 separate docs только после owner merge. Не merge #379/#342; #300/Stage6/general UI/UX/deploy не активированы.
