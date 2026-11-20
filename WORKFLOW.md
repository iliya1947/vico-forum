# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Moderation visibility — **B1 Mira bounded PASS** в Draft #355 exact `704d5a46d59841538524424296ac28eaa39aa5e6`.

По явному owner continuation (`...`) начат **B2 stacked PR #357**, base = `feature/moderation-visibility-b1-foundation`. Начальный узкий срез **B2.1 — neutral atomic visibility History append** реализован, current B2 head `41f94434e62b59d40d7f7ebd57be5927decb23c9`. PostgreSQL 17 PASS (3/3 новых, 1486/1486 full DB). Exact-head `checks` изначально FAIL на неизменённом `app/forum/content-generation-navigation.test.tsx` (одно UI waitFor assertion); rerun **only failed checks job** на том же SHA инициирован, результат пока не подтверждён.

B2 ещё не завершён и Mira checkpoint не запрошен. Дальше — дождаться достоверного результата exact-head rerun, затем остановить срез B2.1; при следующей команде продолжения реализовать следующий узкий B2-срез. B1/B2 не merge.

## Baseline

- Current main: `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf`.
- #354 corrective package merged and closed.
- V-P1/V-P2/V-P3 — ранее приняты и не переоткрываются.
- V-T1/V-T2 — technical fit PASS на current main.
- Лёва завершил адаптацию V1–V9 к current main и разложил delivery на B1–B9.

## Owner process decision — stacked bounded PR delivery

Владелец утвердил новый рабочий паттерн, который применяется здесь и берётся на вооружение для последующих подходящих задач:

1. B1 открывается от `main`.
2. B2 открывается с base = head-ветка B1; B3 — с base = head-ветка B2; далее лестницей до последнего bounded-этапа.
3. Каждый PR остаётся отдельным bounded implementation PR и показывает свой локальный diff относительно предыдущей ступени.
4. Промежуточные ступени не merge в `main`.
5. После завершения последней ступени итоговый head всей лестницы переносится/fast-forward'ится в ветку первого PR, чтобы первый PR против `main` содержал весь законченный вертикальный срез.
6. Промежуточные B2…Bn закрываются как superseded, а не merge.
7. Собранный первый PR проходит final stable exact-head author self-check → Mira whole-feature review → Leva independent whole-feature review того же head → owner merge в `main`.
8. Если нижняя ступень требует изменения до финальной сборки, зависимые верхние ступени должны быть синхронизированы с изменившимся основанием до продолжения.
9. Этот owner decision имеет приоритет над текущей формулировкой `AGENTS.md`. После текущей задачи требуется отдельное process изменение `AGENTS.md`, чтобы закрепить stacked bounded PR delivery как общий штатный маршрут там, где bounded-этапы составляют одну неделимую вертикальную feature.

## Moderation visibility delivery — B1 PASS; B2.1 scoped foundation

- B1 Draft #355 head `704d5a46d59841538524424296ac28eaa39aa5e6`: Mira bounded PASS, previous `VIS-B1-MIRA-01` closed, checks/workflows green. First stacked rung stays unmerged.
- B2 Draft [#357](https://github.com/iliya1947/vico-forum/pull/357), head branch `feature/moderation-visibility-b2-commands`, base B1 branch `feature/moderation-visibility-b1-foundation`.
- B2.1 code on commit `41f94434e62b59d40d7f7ebd57be5927decb23c9`: `db/forum-history.ts` adds `appendVisibilityHistory` using neutral ID-only label and existing transactional advisory order lock, without reading title/body. New `tests/database/visibility-history-append.test.ts` covers typed topic/post events, mandatory reason constraint and enclosing transaction rollback. Diff exactly 2 files vs B1.
- [CI run 44696500126](https://github.com/iliya1947/vico-forum/actions/runs/44696500126): PostgreSQL17 `database` SUCCESS, 111/111 files, 1486/1486 tests including new 3/3. First `checks` attempt failed 1/2758 unrelated `app/forum/content-generation-navigation.test.tsx` navigation-result waitFor (the B2 diff does not touch its code). Exact-head rerun of only `checks` job in progress, do not infer PASS yet.
- B2.2+ pending: topic/post desired-state command/CAS, actor + permission/AP-10 transaction admission, reason validation and tests; existing content writer gates and real lock graph remain further bounded slices under the accepted V4/V8 plan. None implemented in B2.1; no B3–B9 routes/UI/read paths.
- Complete entire B2 and exact-head author self-check before Mira bounded B2 checkpoint. No independent Leva review until final folded feature.

## Process follow-up

После завершения текущей задачи #342 подготовить отдельное изменение `AGENTS.md`: заменить обязательную схему «bounded PR → review → merge → следующий bounded PR» на штатный stacked bounded PR workflow для тех задач, где несколько bounded-этапов образуют один вертикальный результат и промежуточный merge в main нежелателен.

## После moderation visibility

Forum structure/topic move → затем #320. #300/Stage6/general UI/UX не активированы.


## Process follow-up — проактивное использование возможностей инструментов

При будущей правке `AGENTS.md` добавить отдельное правило: если GitHub или другой используемый инструмент имеет штатную возможность, которая существенно улучшает текущий процесс, агент обязан сам выявить и предложить её разработчику, а не ждать, пока разработчик найдёт её случайно.
