# DECISIONS.md — действующие решения владельца и принятые рабочие границы #342

## D-01 — один служебный канал

#342 — единственный рабочий service PR для шести задач перед #320. Он не merge в main.

## D-02 — порядок шести задач

Edit own title → Watch → Bookmarks → Mute/Block → moderation visibility → forum structure/topic move → затем #320.

## D-03 — #300 не текущий канал Миры

Мира не использует #300 как текущий рабочий канал или источник назначений. Обращение к нему — только после полного завершения #342 либо по прямой команде владельца.

## D-04 — corrective package объединён

WATCH-AUDIT-1, BOOKMARKS-AUDIT-1, BOOKMARKS-AUDIT-2 и TITLE-AUDIT-1 закрываются в одном implementation PR #354.

Это прямое owner-решение отменяет прежнюю отсрочку TITLE-AUDIT-1 до общего UI/UX pass.

## D-05 — один независимый review после всего пакета

Лёву не подключать после отдельных correction slices. Сначала Лира завершает весь #354, затем Мира заново проверяет whole PR на final stable head; только после Mira PASS Лёва делает один independent whole-PR review того же head.

## D-06 — merge выполняет владелец

Агенты не merge implementation/docs PR в main без отдельного owner route.

## D-07 — future product stages не смешиваются с corrections

Moderation visibility и structure/topic move не активируются, пока consolidated #354 не закрыт и merged.


## D-08 — moderation visibility product model уже принят

V-P1/V-P2/V-P3 не являются открытыми owner forks. Они были пройдены до migration service workspace и подтверждены owner correction в текущем чате.

- V-P1: hidden topic → neutral public 404; hidden post in visible topic → stable sanitized tombstone.
- V-P2: dedicated `forum.content.visibility.manage`; initial moderator/admin grants; AP-10 `admin.forum`; nonblank reason для real Hide/Restore.
- V-P3: visibility transition не удаляет и не переписывает orthogonal state/data; related state сохраняется, public/current projections становятся unavailable-safe, без automatic backfill/state rewrites.

Отсутствие отдельной migrated acceptance-записи не является основанием повторно открывать эти решения.


## D-09 — stacked bounded PR workflow

Владелец утвердил stacked PR delivery как рабочий паттерн, а не разовое исключение.

Для составной вертикальной задачи bounded-этапы могут идти лестницей: первый PR от `main`, каждый следующий PR от head-ветки предыдущего. Промежуточные PR не merge в `main`. После последнего этапа итоговый head всей цепочки сворачивается в ветку первого PR; остальные ступени закрываются как superseded. Первый PR становится полным feature PR и только он проходит финальный stable-head Mira → Leva review и owner merge в `main`.

Если меняется нижняя ступень, все зависимые верхние ступени синхронизируются до продолжения.

Это решение владельца имеет приоритет над текущей формулировкой `AGENTS.md`. После завершения текущей задачи необходимо отдельным process PR обновить `AGENTS.md`, чтобы сделать stacked bounded PR workflow штатным правилом для подходящих составных задач.


## D-10 — проактивно предлагать полезные возможности инструментов

Агенты не должны ждать, пока разработчик сам обнаружит полезную возможность GitHub или другого используемого инструмента.

Если штатная возможность инструмента существенно упрощает, ускоряет или делает надёжнее текущий workflow, агент обязан сам:
- заметить её применимость;
- проверить существенные ограничения;
- предложить её разработчику до закрепления более сложного или неэффективного процесса;
- объяснить практическую пользу именно для текущей задачи.

Это относится, в частности, к GitHub workflow-возможностям вроде stacked PR, Draft PR, смены base, compare между ветками и другим штатным механизмам.

После #342 это правило должно быть перенесено в обновлённый `AGENTS.md` вместе со stacked bounded PR workflow.

## D-11 — agent-triggered PR tests

PR CI and browser/connected acceptance are not automatic per-push gates. Agents launch only the checks required by the current workflow point:
- `run:ci` for the main CI;
- `run:acceptance` for path-relevant acceptance suites;
- `workflow_dispatch` as fallback.

Production/deploy workflows, UI preview Pages and Codex service-channel bridge are outside this control mechanism.

