# Внутренний аудит AGENTS.md

Статус: аудит актуального `AGENTS.md` из `main@9cff976a9621d9fe5dfef28ea5367e390ff435b1`. Файл прочитан полностью. Действующий `AGENTS.md` не изменяется.

## 1. Главный вывод

Предыдущая идея удалять generic `Логика` A-L1–A-L6 была направлена не туда.

Для общего repository-регламента этот блок полезен как **единственное верхнее reasoning-ядро для ChatGPT и Codex**.

Реальный instruction load создают не сами A-L1–A-L6, а повторение их смыслов и operational workflow в последующих разделах.

Целевой принцип внутренней чистки:

- `Логика` — один shared reasoning core;
- `Роли` — только ответственность/полномочия, без повторного описания workflow;
- `Диагностика` — только специфическая техническая диагностика, без повторения generic logic;
- `Рабочий процесс` — sequencing/branching/handoff, без повторного описания review protocol;
- `Проверка PR` — verification semantics и gates, без повторения workflow;
- `Действие разработчика` — только интерфейс с разработчиком, без повторения handoff rules.

## 2. Подтверждённые внутренние дубли

### A-D2 ↔ A-L2/A-L3 — частичный прямой дубль

`Диагностика` п.2 содержит:
- проверку альтернативных причин/ограничений — это техническая specialization A-L3 и нужна;
- «Отделять подтверждённые факты от гипотез и не выдавать правдоподобное объяснение за установленную причину» — generic часть уже задана A-L2/A-L4.

Решение: при будущей редакции оставить diagnostic-specific causal requirement, generic fact/hypothesis guard не повторять.

### Role Лёвы ↔ Workflow 6/8 — существенный дубль

В роли Лёвы уже сказано:
- до реализации проектирует полный технический план;
- выполняет независимые технические проверки;
- реализует только при технической эскалации.

Workflow 6 повторяет plan-before-implementation и independent review route.
Workflow 8 снова повторяет реализацию Лёвой только при эскалации.

Решение: роль должна фиксировать **что за роль и её authority**, а operational trigger/sequence — жить в Workflow. Один из слоёв должен перестать пересказывать другой.

### Role Марка ↔ Workflow 8 / Review 1 — существенный дубль

Роль Марка: резервный независимый проверяющий, по умолчанию вне цикла.
Workflow 8 снова задаёт, когда Марк подключается.
Review 1 снова говорит, что стандартный reviewer — Лёва, Марк — по отдельному назначению.

Решение: роль оставить краткой; конкретные условия назначения хранить один раз в Workflow/Review, не в трёх местах.

### Role Лиры ↔ Workflow 6 / Review 1 — частичный дубль

Роль Лиры: основной исполнитель; может быть независимым reviewer там, где не участвовала.
Workflow 6 снова назначает Лиру исполнителем.
Review 1 снова задаёт независимость reviewer от реализации.

Решение: роль — основной исполнитель; правило независимости reviewer — только в Review. Не нужно повторять его в роли.

### Workflow 7 ↔ Review 2 — прямое процессное дублирование stacked checkpoint

Workflow 7 подробно описывает:
- author self-check + applicable checks;
- Mira coordinator checkpoint;
- PASS → следующая ступень без merge/Codex-review;
- defect → исправление до продолжения.

Review 2 почти повторяет тот же checkpoint.

Решение: Workflow 7 должен описывать **структуру stack и переходы**, а checkpoint ссылаться на Review 2. Review 2 остаётся единственным определением verification gate.

### Workflow 7 final cycle ↔ Review 1 — прямое дублирование full review sequence

Workflow 7 повторяет финальную цепочку:
`author self-check → whole-feature review Миры → independent whole-feature review Лёвы → merge`.

Review 1 уже является нормативным определением полного review cycle.

Решение: в Workflow 7 после финальной сборки ссылаться на полный цикл из Review 1 вместо повторения последовательности.

### Developer action 2 ↔ Workflow 9 — прямой дубль handoff

Developer action 2:
«Если работу продолжает другой агент, задача и необходимый контекст заранее фиксируются в служебном PR».

Workflow 9 уже подробно устанавливает handoff через служебный PR, запрет передачи технического контекста через разработчика и подготовку контекста заранее.

Решение: удалить handoff-фразу из Developer action 2; оставить там только правило «доступный шаг сначала выполняет агент».

### General 3 ↔ Review 5 — частичный дубль future-work boundary

General 3: не выполнять работу будущих Stage без текущей необходимости.
Review 5: future work сам по себе не является основанием для изменения текущей реализации.

Review 5 нужен для classification findings, но последняя идея уже является частным случаем General 3.

Решение: Review 5 должен классифицировать finding и границы текущей review-задачи; общий запрет future-work не обязательно повторять второй раз.

## 3. Сильные перекрытия, которые НЕ являются мусорными дублями

### A-L3 ↔ Diagnosis 2
KEEP-SPECIALIZATION.

A-L3 — общий guard альтернатив/последствий.
Diagnosis 2 — конкретно альтернативные причины, downstream ограничения и ранее работавший штатный путь.

### A-L2/A-L4 ↔ Principles 1
KEEP-SPECIALIZATION.

`Думай своей головой` не просто повторяет факт/предположение: оно вводит **независимость от уже сформулированного результата другого агента**.

### Principles 2 ↔ Review cycle
KEEP-SPECIALIZATION.

Взаимная проверка — общий team principle; Review задаёт конкретный formal gate и independence.

### Principles 5 ↔ Review 3
KEEP-SPECIALIZATION.

Принцип 5 — когда вообще перепроверять факт.
Review 3 — exact-head validity конкретного PR review/checkpoint.

### Diagnosis 1 ↔ Review 4
KEEP-SPECIALIZATION.

«Первая найденная ошибка не завершает диагностику» и «первый finding не завершает review» относятся к разным операциям.

### Diagnosis 3 ↔ Stop condition
KEEP-SPECIALIZATION.

Diagnosis 3 определяет достаточность именно для перехода к техническому исправлению.

### General 2 ↔ Full documentation audit
KEEP-SPECIALIZATION.

General 2 задаёт обязательные project source-of-truth перед изменением проекта.
Audit section задаёт специальный режим полного аудита по прямому запросу.

### General 5 ↔ Diagnosis/Audit
KEEP.

«Не заявлять о проверках, которые не выполнялись» — project-wide honesty guard. В `Логике` сейчас точного аналога нет; удалять его без переноса нельзя.

### General 6–8
KEEP.

Три пункта образуют распределение ответственности:
- current state → PROJECT_STATE;
- history → PROJECT_HISTORY;
- permanent contracts → профильные source-of-truth.

Это не дубли, а три разных хранилища.

## 4. Роли: неправильное место для operational rules

Сейчас раздел `Роли` смешивает:
- identity/authority;
- operational sequence;
- escalation triggers;
- review eligibility;
- PR permission.

Это создаёт повторения с Workflow/Review.

Целевая структура ролей:

- Developer — ownership/decision/merge authority.
- Ари — общая координация, вне standard bounded gate.
- Мира — process coordinator / liaison.
- Лира — primary implementer.
- Марк — reserve independent reviewer.
- Лёва — chief architect / technical lead.

А правила:
- кто когда планирует;
- кто когда реализует;
- когда reviewer считается независимым;
- когда Марк заменяет Лёву;
- запрет создавать/сменять PR

должны жить в Workflow/Review/permission rules, а не дублироваться в описаниях ролей.

## 5. Workflow и Review должны иметь разные обязанности

### Workflow должен отвечать:
- какой тип PR используется;
- как строятся bounded/stacked этапы;
- когда происходит переход между этапами;
- как передаётся работа;
- кто назначается по стандартному маршруту;
- когда используется escalation.

### Review должен отвечать:
- что такое full review cycle;
- что такое stacked coordinator checkpoint;
- к какому exact head относится PASS;
- что проверять;
- как классифицировать findings;
- кто имеет право на независимый review;
- какие defects блокируют завершение.

Сейчас Workflow 7 и Review 1–2 пересекаются слишком сильно.

## 6. Permission gap и его правильное место

Подтверждённый ранее пробел остаётся.

Точный PR permission contract лучше разместить в `Рабочий процесс` **перед правилами создания service/implementation PR**:

- тип PR определяется workflow;
- создание нового PR требует прямого разрешения разработчика;
- наличие задачи/стандартного маршрута/технической необходимости не является таким разрешением;
- назначенный service PR не меняется без прямой команды.

Это позволит убрать PR-specific запрет из описания роли Миры и не создавать отдельные частные запреты для каждого типа агента.

## 7. Что можно реально сократить в AGENTS.md без потери защиты

Подтверждённые направления, без финального текста:

1. Убрать generic fact/hypothesis repetition из Diagnosis 2, сохранив causal specialization.
2. Убрать operational plan/review/escalation детали из Roles, оставить их в Workflow/Review.
3. Убрать повтор stacked checkpoint protocol из Workflow 7, сослаться на Review 2.
4. Убрать повтор final full-review sequence из Workflow 7, сослаться на Review 1.
5. Убрать handoff repetition из Developer action 2, оставить Workflow 9.
6. Убрать повтор общего future-work запрета из Review 5, сохранив classification semantics.
7. Перенести PR permission из частного ограничения роли Миры в единый Workflow permission contract.

Это **реальное сокращение семантического дублирования**, а не объединение нескольких правил в длинный пункт.

## 8. Что не следует сокращать

Не трогать ради компактности:

- A-L1–A-L6 как shared ChatGPT/Codex reasoning core;
- Principles 1–5;
- causal-specific Diagnosis;
- Fix scope;
- exact-head semantics;
- source-of-truth/document-state architecture;
- CI labels/gates;
- full audit semantics.

Их похожесть на верхние пользовательские правила сама по себе не делает их внутренним дублем AGENTS.md.

## 9. Новый вывод для общей архитектуры U/P/A

После этого аудита правильнее не пытаться убрать A-L1–A-L6.

Наоборот:
- U содержит универсальные пользовательские требования к ChatGPT;
- A-L содержит shared repository reasoning core, необходимый Codex;
- ниже в A нужно убрать **повторное пересказывание A-L и workflow**, где это не добавляет specialization.

Это уменьшает внутренний AGENTS load и одновременно сохраняет Codex coverage.

## 10. Следующий этап

До финальной редакции всех трёх слоёв нужен ещё один bounded шаг:

составить **точную change-map AGENTS.md**:
- KEEP;
- DELETE exact duplicate;
- MOVE внутри AGENTS;
- REPLACE WITH REFERENCE;
- ADD PR-permission contract.

Без написания финального `AGENTS.md` и без применения изменений.
