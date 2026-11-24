# WORKFLOW.md — Task6 / WF-01 author checks

## Активный шаг

**Лёва: bounded WF-01 correction реализована; exact-head CI/acceptance выполняются.**

- Final Draft #379 exact `7ee7d06b182c4295ddb4ce1b05b45254c21d9b80`, base main `a3dae5815e26d158c566a27c552127b4b1ab29aa`.
- Mira whole-feature HOLD на предыдущем `bf3e97d6c52b224d1a77bd14f96597b446405472` пока не закрыт; новый head требует её повторного whole-feature review.
- #379 остаётся Draft/open/unmerged. Intermediate #380/#381/#382/#383/#386 closed/superseded/merged=false. Main не изменён.

## WF-01 — bounded correction

Create Category теперь удерживает attempted/unknown состояние при отсутствии подтверждённого ответа; сохраняет имя и блокирует повторную команду до explicit Refresh structure. Штатный per-submission `defaultShouldRevalidate={false}` предотвращает тихую post-action замену версии. Только совпадающий typed success очищает имя и запускает explicit revalidation. Typed errors сохраняют прежнюю политику.

Author checks:
- Regression на исходной реализации падает; после correction проходит.
- 19 focused unit tests PASS; lint/typecheck PASS.
- Real Worker/Better Auth/PG17/local-R2/Chromium whole-feature локально: 14 groups PASS, pageErrors/external пустые.
- Новый browser case: actual category COMMIT → lost204 → ровно один category/History event, имя сохранено, disabled click и submit event не отправляют POST; explicit refresh читает новую version, POST count остаётся1.
- Local test infrastructure очищена, production config восстановлен, worktree clean.
- На stable exact head запущены одноразовые run:ci/run:acceptance; итог ещё не объявлен.

## Следующий шаг

Лёва дожидается применимых exact-head checks и проверяет artifact provenance, затем author STOP → **Мира whole-feature re-review #379**. Mark не активировать до Mira PASS. Author gate не является independent review.

Не расширять correction за WF-01. Не merge #379. F7/docs только после owner merge; #342 never merge; #300/Stage6/general UI/UX/deploy не активированы.
