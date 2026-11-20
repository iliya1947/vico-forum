# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Moderation visibility: B1 **Mira bounded PASS**, Draft #355 exact `704d5a46d59841538524424296ac28eaa39aa5e6`.

B2 — stacked Draft [#357](https://github.com/iliya1947/vico-forum/pull/357), base = `feature/moderation-visibility-b1-foundation`. **B2.1 author PASS**: neutral atomic visibility History append. **B2.2 author PASS**: transactional topic/post Hide/Restore desired-state, in-transaction fresh actor/RBAC/Owner/AP-10 admission before no-op, version+revision CAS, reason validation, atomic History + PostgreSQL regressions. Stable exact head `ff5d560da266ba1c2ccf8eb28304be02a2d5cab8`.

[Exact-head CI 44701346485](https://github.com/iliya1947/vico-forum/actions/runs/44701346485) **SUCCESS**: 2758/2758 unit, 1493/1493 PG17 (7/7 new B2.2), overall **22/22 check-runs SUCCESS, 18/18 workflows SUCCESS**. All changes B2.2 confined to #357; no public Hide/Restore route, no B3–B9.

**B2.3a author PASS:** `createPost` denies new replies under hidden topic or directly hidden parent, preserving generic reply with hidden root and inert matching publication receipt. Exact `355c0a1de2e3032f4b3c88ff996ae680bf2f1fff`. [CI run 44704018502](https://github.com/iliya1947/vico-forum/actions/runs/44704018502) **22/22 checks, 18/18 workflows SUCCESS; 2758/2758 unit, 1496/1496 PG17 (10/10 visibility commands)**.

**Лира STOP перед B2.3b.** Next explicit owner continuation: published edit and own title/source writer admission, respecting draft/receipt-first and topic→post→actor lock order. Further B2.3 slices: remaining Help/solution/closure/pin writers; then separate real PG two-order races/lock graph. Whole B2 not complete; no Mira checkpoint yet; B1/B2 remain Draft/unmerged.

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

## Moderation visibility delivery — B1 PASS; B2.1/B2.2/B2.3a author PASS

- B1 Draft #355 exact `704d5a46d59841538524424296ac28eaa39aa5e6`: Mira bounded PASS, `VIS-B1-MIRA-01` closed; stays Draft/unmerged.
- B2 Draft [#357](https://github.com/iliya1947/vico-forum/pull/357), branch `feature/moderation-visibility-b2-commands`, base = B1 branch.
- B2.1 `41f94434e62b59d40d7f7ebd57be5927decb23c9`: neutral ID-only transaction-owned History append and dedicated PG rollback/reason regressions, author PASS.
- B2.2 exact `ff5d560da266ba1c2ccf8eb28304be02a2d5cab8`: `db/forum-repository.ts`, `db/forum-service.ts`, `db/hyperdrive-forum.ts`, `workers/app.ts`, focused test updates. Topic/post transactional Hide/Restore state CAS, current revision and membership checks, active actor, direct RBAC/Owner and AP-10 admission even on no-op, mandatory transition reason, overflow/stale denial, History appended last and transaction rollback. B2.2 changed only backend commands/wiring/tests; no action routes/reader exposure.
- Exact-head [CI 44701346485](https://github.com/iliya1947/vico-forum/actions/runs/44701346485): 2758/2758 unit and 1493/1493 PostgreSQL17 SUCCESS including 7/7 new `moderation-visibility-commands.test.ts` cases. GitHub check-runs 22/22 SUCCESS; associated workflows 18/18 SUCCESS. Earlier red CI attempts on intermediate commits corrected within B2.2; verified evidence is final exact head.
- B2.3a exact `355c0a1de2e3032f4b3c88ff996ae680bf2f1fff`: `createPost` keeps topic NO KEY UPDATE and parent FK KEY SHARE; requires visible topic and visible direct parent before actor/mutation. Missing and hidden share generic not-found; matching receipt replay remains inert/allowed. Exactly two changed files vs B2.2 (`db/forum-repository.ts`, `tests/database/moderation-visibility-commands.test.ts`); +3 PG cases, including hidden root generic reply and Hide/Restore replay boundaries.
- [Exact-head CI 44704018502](https://github.com/iliya1947/vico-forum/actions/runs/44704018502): **22/22 check-runs SUCCESS, 18/18 workflows SUCCESS, 2758/2758 unit, 1496/1496 PG17**, 10/10 visibility-commands tests.
- B2 remaining: B2.3b published edit and own title/source; subsequent Help/solution/closure/pin and local recovery/planning admission; final real PG two-order races, actor deactivation and compatible lock graph. No claim that entire B2 or feature is ready.
- **B2.3a author PASS / Lira STOP before B2.3b.** Continue only on explicit owner command. After full B2 scope: author exact-head self-check and CI → Mira bounded checkpoint. B1/B2 remain Draft/unmerged; no Leva independent review until final folded feature.

## Process follow-up

После завершения текущей задачи #342 подготовить отдельное изменение `AGENTS.md`: заменить обязательную схему «bounded PR → review → merge → следующий bounded PR» на штатный stacked bounded PR workflow для тех задач, где несколько bounded-этапов образуют один вертикальный результат и промежуточный merge в main нежелателен.

## После moderation visibility

Forum structure/topic move → затем #320. #300/Stage6/general UI/UX не активированы.


## Process follow-up — проактивное использование возможностей инструментов

При будущей правке `AGENTS.md` добавить отдельное правило: если GitHub или другой используемый инструмент имеет штатную возможность, которая существенно улучшает текущий процесс, агент обязан сам выявить и предложить её разработчику, а не ждать, пока разработчик найдёт её случайно.
