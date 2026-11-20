# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Moderation visibility — **B1 coordinator HOLD** на Draft PR #355 exact `736da519e3f3fcae716ec5fb1b81886cdac63a6e`.

Подтверждён один current-scope blocker: **VIS-B1-MIRA-01 — incomplete visibility permission integration across existing Admin/AP-10 projection maps**.

Лира — следующий исполнитель для bounded correction на том же B1 PR. B2 не открывать.

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

## Moderation visibility delivery — B1 coordinator HOLD

- B1 Draft PR #355 exact reviewed head: `736da519e3f3fcae716ec5fb1b81886cdac63a6e`.
- Exact-head CI/workflows: 13/13 completed SUCCESS; CI checks 2752/2752 unit, PG17 1483/1483. Green checks do not close the finding below.
- Schema/migration/History/localization/manifest portions inspected; no additional confirmed B1 blocker found.
- **VIS-B1-MIRA-01:** new `forum.content.visibility.manage` is incompletely integrated into existing permission projections:
  1. `app/admin/access.ts::ADMIN_FORUM_PERMISSIONS` omits it, so a visibility-only holder is denied Admin Forum by `requireAdminForumAccess`.
  2. `app/routes/locale-boundary.tsx` has a separate hard-coded Admin permission projection and does not resolve/include it, so header/Admin destinations remain hidden even if route admission is corrected.
  3. `app/admin/user-measure-restrictions.ts::USER_MEASURE_ADMIN_PERMISSION_FAMILIES["admin.forum"]` omits it while `db/user-measure-admin-forum.ts` already includes it. This breaks parity for raw AP-10 administrative authority/floor and consumers of the shared family map.
- This is one B1 foundation defect: the accepted plan explicitly requires Admin Forum admission/workspace hints and AP-10 `admin.forum` mapping.
- Correction should restore parity in the existing maps and add focused regressions proving a visibility-only holder is admitted/projected correctly and `admin.forum` applies consistently. Do not expose Hide/Restore routes or begin B2.
- After correction: Lira self-check + applicable exact-head checks → STOP Mira for fresh bounded B1 checkpoint.


## Process follow-up

После завершения текущей задачи #342 подготовить отдельное изменение `AGENTS.md`: заменить обязательную схему «bounded PR → review → merge → следующий bounded PR» на штатный stacked bounded PR workflow для тех задач, где несколько bounded-этапов образуют один вертикальный результат и промежуточный merge в main нежелателен.

## После moderation visibility

Forum structure/topic move → затем #320. #300/Stage6/general UI/UX не активированы.


## Process follow-up — проактивное использование возможностей инструментов

При будущей правке `AGENTS.md` добавить отдельное правило: если GitHub или другой используемый инструмент имеет штатную возможность, которая существенно улучшает текущий процесс, агент обязан сам выявить и предложить её разработчику, а не ждать, пока разработчик найдёт её случайно.
