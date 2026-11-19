# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Moderation visibility — **B1 author self-check PASS** в [Draft PR #355](https://github.com/iliya1947/vico-forum/pull/355), exact `736da519e3f3fcae716ec5fb1b81886cdac63a6e`. **Мира — следующий coordinator reviewer для bounded B1 checkpoint; Лира STOP.**

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

## Moderation visibility delivery — B1 author PASS / Mira checkpoint NEXT

- Stack stage **B1 complete by author, not merged**: Draft [PR #355](https://github.com/iliya1947/vico-forum/pull/355), branch `feature/moderation-visibility-b1-foundation`, base current main `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf`, exact head **`736da519e3f3fcae716ec5fb1b81886cdac63a6e`**.
- B1: migration `0071_moderation_visibility_foundation`, topic/post default-visible state/version/changedAt CHECK and partial queues, permission `forum.content.visibility.manage` initial moderator/admin + AP-10 `admin.forum`, typed Hide/Restore History with neutral label/required reason, Owner classification and EN/RU/HE. Drizzle metadata and measured canonical PG17 hashes; production schema manifest parity 74 tables. No public Hide/Restore, B2 writer, B3–B9 read/UI changes or external deployment.
- Exact-base diff: 24 B1-only source/metadata/tests/legacy fixture paths; no unrelated dependencies, backend route, broader RBAC or new product contract. External accepted migration evidence still through 0020; repository ceiling 0071 **only in unmerged B1 branch**, main 0070.
- Exact-head [CI #44640562493](https://github.com/iliya1947/vico-forum/actions/runs/44640562493): checks SUCCESS **2752/2752 unit** in 218 files, lint/typecheck/build; database SUCCESS **1483/1483 PostgreSQL17** in 110 files, 74-table schema parity, runtime privileges/Worker smoke; **13/13 associated workflows SUCCESS**, AP-10 and Owner connected included. No failed/pending.
- **Лира author self-check PASS**. This is **not coordinator B1 PASS** or final whole-feature PASS. Next executor **Мира / ChatGPT-5.6 Sol** to inspect whole bounded B1 PR #355 vs `stages/moderation-visibility/PLAN.md` and source-of-truth at exact head `736da519e3f3fcae716ec5fb1b81886cdac63a6e`, report PASS or verified B1 blocker in #342. If blocker, return to Лира with correction on same B1 PR; if PASS, owner may initiate B2 only upon next explicit continuation. B2 base = `feature/moderation-visibility-b1-foundation` (B1 branch head); do not merge B1 or create B2 now.
- **Лира STOP at B1 checkpoint**; Leva independent whole-feature review not now. After B9 fold all into B1, Mira/Leva final whole-feature review, owner merge. #342 service-only/no merge.

## Process follow-up

После завершения текущей задачи #342 подготовить отдельное изменение `AGENTS.md`: заменить обязательную схему «bounded PR → review → merge → следующий bounded PR» на штатный stacked bounded PR workflow для тех задач, где несколько bounded-этапов образуют один вертикальный результат и промежуточный merge в main нежелателен.

## После moderation visibility

Forum structure/topic move → затем #320. #300/Stage6/general UI/UX не активированы.


## Process follow-up — проактивное использование возможностей инструментов

При будущей правке `AGENTS.md` добавить отдельное правило: если GitHub или другой используемый инструмент имеет штатную возможность, которая существенно улучшает текущий процесс, агент обязан сам выявить и предложить её разработчику, а не ждать, пока разработчик найдёт её случайно.
