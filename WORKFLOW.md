# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Moderation visibility — **B1 bounded PASS** на Draft [PR #355](https://github.com/iliya1947/vico-forum/pull/355), exact `704d5a46d59841538524424296ac28eaa39aa5e6`.

`VIS-B1-MIRA-01` CLOSED. Новых подтверждённых B1 blocker не осталось.

**#355 остаётся Draft/unmerged. B2 ещё не активирован.** Следующий owner continuation может назначить Лиру на stacked B2 с base = `feature/moderation-visibility-b1-foundation`.

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

## Moderation visibility delivery — B1 bounded PASS

- B1 Draft #355 base = current main `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf`.
- Stable exact head: `704d5a46d59841538524424296ac28eaa39aa5e6`.
- Previous Mira finding `VIS-B1-MIRA-01` corrected in one narrow commit: Admin Forum admission, locale/header Admin projection and shared AP-10 `admin.forum` family are now aligned with `forum.content.visibility.manage`.
- Correction diff: exactly seven files, no schema/route/Hide/Restore/B2 expansion.
- Exact-head CI: `checks` SUCCESS, `database` SUCCESS; 13/13 associated workflows SUCCESS, no failed/pending.
- Fresh Mira bounded whole-B1 checkpoint on the corrected exact head: **PASS**.
- Unchanged migration/schema/History/Owner/localization/manifest portions retain prior reviewed result; no new reason to reopen them.
- #355 remains Draft/unmerged as the first stacked rung.
- Next potential stage: **B2 — transactional commands and writer admission**, in a new PR whose base is B1 head branch `feature/moderation-visibility-b1-foundation`.
- B2 is not active until explicit owner continuation.

## Process follow-up

После завершения текущей задачи #342 подготовить отдельное изменение `AGENTS.md`: заменить обязательную схему «bounded PR → review → merge → следующий bounded PR» на штатный stacked bounded PR workflow для тех задач, где несколько bounded-этапов образуют один вертикальный результат и промежуточный merge в main нежелателен.

## После moderation visibility

Forum structure/topic move → затем #320. #300/Stage6/general UI/UX не активированы.


## Process follow-up — проактивное использование возможностей инструментов

При будущей правке `AGENTS.md` добавить отдельное правило: если GitHub или другой используемый инструмент имеет штатную возможность, которая существенно улучшает текущий процесс, агент обязан сам выявить и предложить её разработчику, а не ждать, пока разработчик найдёт её случайно.
