# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Moderation visibility — **B1 author correction PASS; Mira bounded checkpoint NEXT** на Draft [PR #355](https://github.com/iliya1947/vico-forum/pull/355), stable exact `704d5a46d59841538524424296ac28eaa39aa5e6`.

**VIS-B1-MIRA-01** исправлен: интеграция visibility permission согласована в Admin Forum admission, header/Admin presentation и AP-10 family/authority. Авторская self-check PASS; новый exact-head CI — 17/17 check-runs и 13/13 workflows SUCCESS.

**Лира STOP. Мира — следующий исполнитель для fresh bounded B1 review.** B2 не начинать до Mira PASS и отдельного продолжения владельца.

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

## Moderation visibility delivery — B1 correction author PASS / Mira checkpoint NEXT

- B1 Draft [#355](https://github.com/iliya1947/vico-forum/pull/355) stays unmerged, branch `feature/moderation-visibility-b1-foundation`, base current main `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf`.
- Previous Mira HOLD: `VIS-B1-MIRA-01` on `736da519e3f3fcae716ec5fb1b81886cdac63a6e`. Confirmed that the new `forum.content.visibility.manage` was omitted by three existing projections despite its presence in DB AP-10 wrapper.
- Narrow correction commit `704d5a46d59841538524424296ac28eaa39aa5e6`: add visibility permission to `app/admin/access.ts::ADMIN_FORUM_PERMISSIONS`, `app/routes/locale-boundary.tsx` resolver/header Admin destinations, and `app/admin/user-measure-restrictions.ts::USER_MEASURE_ADMIN_PERMISSION_FAMILIES["admin.forum"]`. Four scoped test files updated (route-only grant, navigation, AP-10 family/raw authority and PostgreSQL restriction projection). Seven files modified, no B2 command, Hide/Restore route, schema, grants, dependencies or unrelated refactor.
- Author review verified exact correction diff and parity: Admin Forum admission ⊆ AP-10 family; shared AP-10 family equals DB wrapper; locale projection includes the independent permission. **Lira author self-check PASS** on stable exact `704d5a46d59841538524424296ac28eaa39aa5e6`.
- [Exact-head CI](https://github.com/iliya1947/vico-forum/actions/runs/44691969348): both `checks` and `database` SUCCESS. Overall **17/17 check-runs SUCCESS, 13/13 associated workflows SUCCESS**, including AP-10 connected browser and Owner suites. No failed/pending on this exact head.
- **Next Мира / ChatGPT-5.6 Sol**: fresh coordinator bounded whole-B1 checkpoint on `704d5a46d59841538524424296ac28eaa39aa5e6` vs accepted `stages/moderation-visibility/PLAN.md`; determine PASS or independently verified current-B1 blocker. If PASS, developer's next explicit continuation may start separate stacked B2 PR based on `feature/moderation-visibility-b1-foundation` head. Keep B1 Draft/unmerged. **Leva final whole-feature review stays after B9.**

## Process follow-up

После завершения текущей задачи #342 подготовить отдельное изменение `AGENTS.md`: заменить обязательную схему «bounded PR → review → merge → следующий bounded PR» на штатный stacked bounded PR workflow для тех задач, где несколько bounded-этапов образуют один вертикальный результат и промежуточный merge в main нежелателен.

## После moderation visibility

Forum structure/topic move → затем #320. #300/Stage6/general UI/UX не активированы.


## Process follow-up — проактивное использование возможностей инструментов

При будущей правке `AGENTS.md` добавить отдельное правило: если GitHub или другой используемый инструмент имеет штатную возможность, которая существенно улучшает текущий процесс, агент обязан сам выявить и предложить её разработчику, а не ждать, пока разработчик найдёт её случайно.
