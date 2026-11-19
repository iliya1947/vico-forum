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
