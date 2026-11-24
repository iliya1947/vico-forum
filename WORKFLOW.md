# WORKFLOW.md — Task6 / residual R2a-01 author PASS → Mira

## Active gate

**Mira coordinator review нового final exact #379 после residual R2a-01 correction.**

Stable exact `42efaaaabcae24fbb1fa74d042e18e850827b23d`; base/actual main `a3dae5815e26d158c566a27c552127b4b1ab29aa`. Reviewed parent28064df. Draft/open/unmerged; no merge. Intermediate #380/#381/#382/#383/#386 closed/superseded/merged=false, metadata rechecked.

Пять prior implementation defects и topic-move часть R2a-01 закрыты Lena re-review. Единственный residual — ordinary section reparent→Help destination, reconciled by Mira as controlled409, corrected now; новое решение reviewer ещё требуется.

## Correction / author self-check

PostgresStructureWriter.moveSection сначала валидирует ordinary source, затем отклоняет Help destination существующим StructureConflictError(reserved-destination) до generic category helper. Product delta2 lines. Missing destination/protected or Help source/direct protected Help operations404 сохранены; no write/version/History on refusal. Allowed path, locks/admission, UI/schema/permissions/dependencies не менялись.

**Leva author PASS**:
- Regression на28064df воспроизводимо падает; fixed87PG/29 action tests/lint/typecheck/Python syntax PASS.
- CI45411761750 SUCCESS:3196unit/1834PG и все migration/schema/manifest75/runtime/credential/Worker checks.
- Все18 applicable acceptance SUCCESS (first attempt). Whole-feature45411775325/job138507191628/artifact14929216238 downloaded/digest/integrity checked: exact SHA match,19groups,pageErrors/external=[].
- Новый actual Worker section reparent409 / absent/protected/direct Help404, unchanged section/global version/History. Existing WF-01/F6-01/six-item/editor/privacy/authority/retained state assertions сохранены.
- Database-only retry из-за поздно подключённого handler ожидаемого conflict в старом Complaints race test; current source не менялся. Latest database138509974425 SUCCESS,1834 tests и remaining steps.
- Local testDB removed, PG restored stopped, symlink removed; worktree clean/main unchanged.

Полная актуальная evidence и прозрачность retry: **stages/forum-structure/CORRECTIVE_REPORT.md** (latest residual section, затем сохранённая28064df baseline). Canonical PLAN unchanged; original LENA_REVIEW сохранён.

## Next / STOP

**Leva author STOP → Mira new-exact coordinator review #379 → Lena independent re-review того же42efaaa → owner merge только после PASS.** Предыдущий implementation gate не авторизует merge изменённого head. Independent self-review не выполняется.

F7 docs после owner merge. #342 sole service/never merge; #300/#320/Stage6/general UI/UX/deploy inactive. #384 paused.
