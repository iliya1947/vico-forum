# История

- 2026-11-21 — разработчик прямо разрешил создать отдельный рабочий PR для системного разбора инструкций и уточнил, что этот PR не будет merge в `main`.
- 2026-11-21 — рабочее пространство создано от актуального `main`.
- 2026-11-21 — завершена фактическая инвентаризация трёх слоёв инструкций; выявлены прямые внутренние дубли U08/U13 и основные межслойные перекрытия. Редакционные решения отложены до отдельного этапа классификации.
- 2026-11-21 — завершена классификация правил по слоям; прямые дубли отделены от scope-specializations, а из стресс-тестов выделено пять действительно новых универсальных смыслов вместо переноса всех частных случаев в пользовательский слой.
- 2026-11-21 — loss/conflict-check исправил классификацию: P03 и A-L1–A-L6 нельзя удалять без потери области/аудитории; C11 восстановлен как отдельная универсальная защита применимости источника.
- 2026-11-21 — построена минимальная целевая архитектура U/P/A: четыре безопасных удаления, шесть новых универсальных guards, сохранение generic AGENTS logic как Codex/shared-agent coverage и отдельный project-level PR permission proposal.
- 2026-11-21 — executability-check отклонил простую модель расширения U до 19 пунктов; U07/U09 признаны перегруженными, C03+C11 объединены как один evidence/applicability guard, а перед финальными редакциями назначен внутренний аудит AGENTS.md.
- 2026-11-21 — внутренний аудит AGENTS.md показал, что shared logic A-L1–A-L6 нужно сохранять для Codex, а реальное сокращение искать в повторениях Diagnosis/Roles/Workflow/Review/Developer-action; подтверждён Workflow как место единого PR permission contract.
- 2026-11-21 — составлена точная change-map AGENTS.md: подтверждены KEEP/MOVE/REFERENCE/DELETE-DUPLICATE и единый Workflow PR-permission gate; действующий AGENTS.md не изменялся.
- 2026-11-21 — подготовлен полный proposed AGENTS.md как research draft и количественно сравнён с current; действующий файл не изменён. Выявлен единственный unresolved policy-вопрос: гранулярность разрешения на создание PR.
- 2026-11-21 — подготовлены конкретные User/Project proposals и суммарное сравнение всех трёх instruction layers; общий whitespace-word load снизился с 2914 до 2805, при этом User layer получил подтверждённые новые guards.
- 2026-11-21 — разработчик предоставил точный исходный набор из 55 правил; он зафиксирован как source-of-truth, а прежняя реконструкционная ветка анализа помечена предварительной до повторной сверки.
- 2026-11-21 — в USER_INSTRUCTIONS.draft.md механически удалены только подтверждённо избыточные old 17, 29, 44; остальные правила перенумерованы без изменения текста. Semantic coverage зафиксирован в research/user-52-semantic-coverage.md.
- 2026-11-21 — к USER_INSTRUCTIONS.draft.md применены 9 подтверждённых structural merge-групп: 52 semantic guards упакованы в 42 нумерованных пункта без удаления или переформулировки исходных смыслов; diff сохранён в research/user-42-semantic-diff.md.
- 2026-11-21 — локально исправлен USER draft rule 8: восстановлен общий evidence gate действующего current rule 8; повторная сверка подтвердила FULL coverage всех 15/15 действующих User rules.
- 2026-11-21 — PROJECT_INSTRUCTIONS.draft.md очищен от подтверждённых дублей User layer: удалён old Project 10, удалён goal-дубль, partial duplicate про первую трактовку сокращён до project-context check; exact diff подтверждает отсутствие неожиданных изменений.
- 2026-11-21 — Project draft очищен от подтверждённых межслойных дублей: removed current Project 10, removed generic goal duplicate, shortened interpretation duplicate; semantic diff confirms 0 lost project-specific guards.
