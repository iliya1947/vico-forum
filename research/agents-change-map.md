# Change-map AGENTS.md

Статус: точная карта предполагаемых изменений актуального `AGENTS.md` из `main@9cff976a9621d9fe5dfef28ea5367e390ff435b1`. Это не финальная редакция и не разрешение применять изменения.

## Обозначения

- **KEEP** — оставить на месте по смыслу.
- **DELETE-DUPLICATE** — удалить повторяющийся смысл без замены.
- **MOVE** — убрать смысл из текущего места и оставить его в другом разделе.
- **REFERENCE** — заменить повторное полное описание ссылкой на нормативный раздел.
- **ADD-PERMISSION** — добавить точный repository permission contract.

## 1. Заголовок и преамбула

### Прямые инструкции разработчика > AGENTS.md
**KEEP.**

Это корневое правило приоритета внутри repository-регламента.

## 2. Раздел «Логика»

### A-L1 — цель / первая трактовка
**KEEP.**

### A-L2 — факты / предположения
**KEEP.**

### A-L3 — альтернативы / последствия
**KEEP.**

### A-L4 — скрытые посылки
**KEEP.**

### A-L5 — самостоятельно выбранное действие должно следовать из вывода и вести к цели
**KEEP.**

### A-L6 — изменение основания → пересмотр зависимых выводов
**KEEP.**

### Журналирование логических ошибок
**KEEP.**

Итог: reasoning core не сокращать.

## 3. Раздел «Роли»

### Разработчик
**KEEP.**

Оставить ownership, product/disputed decisions, merge authority.

### Ари
**KEEP.**

Оставить общую координационную роль и отсутствие standard bounded gate.

### Мира
Текущее содержит:
- process lead / liaison;
- соответствие service PR актуальному AGENTS;
- исправление несоответствий в пределах полномочий;
- запрет менять service PR без прямой команды.

Решение:
- process lead / liaison — **KEEP**;
- ответственность за соответствие service PR AGENTS — **KEEP**;
- «исправляет несоответствия в пределах полномочий» — **KEEP**;
- запрет менять service PR — **MOVE** в общий Workflow permission contract.

Причина: это не свойство личности Миры, а repository permission rule.

### Лира
Текущее:
- основной исполнитель;
- может быть independent reviewer там, где не участвовала.

Решение:
- «основной исполнитель» — **KEEP**;
- eligibility independent reviewer — **MOVE** в Review.

Причина: independence — общее правило review, а не часть role description.

### Марк
Текущее:
- резервный independent reviewer;
- по умолчанию вне цикла.

Решение:
- reserve reviewer identity — **KEEP**;
- условия, когда он включается/заменяет Лёву — хранить только в Workflow/Review; если в роли есть operational implication, **MOVE**.

### Лёва
Текущее:
- chief architect / technical lead;
- до реализации строит полный план;
- затем делает независимые техпроверки;
- сам реализует только при эскалации.

Решение:
- identity/authority «chief architect / technical lead» — **KEEP**;
- plan-before-implementation — **MOVE** в Workflow 6;
- independent review duty — **MOVE** в Review 1;
- implementation only on escalation — **MOVE** в Workflow 8.

## 4. «Принципы работы агентов»

### 1. Думай своей головой
**KEEP.**

### 2. Взаимные проверки
**KEEP.**

### 3. תגדיל את הראש
**KEEP.**

### 4. Проактивно используй возможности инструментов
**KEEP.**

### 5. Не перепроверяй без причины
**KEEP.**

Здесь внутреннего exact-duplicate удаления нет.

## 5. «Диагностика перед выбором решения»

### Пункт 1 — симптомы / ожидаемое поведение / causal chain / первая ошибка не завершает диагностику
**KEEP.**

Это technical specialization.

### Пункт 2 — альтернативные причины / последующие ограничения / ранее работавший штатный путь / факты vs гипотезы
Решение:
- альтернативные причины, downstream ограничения, штатный путь — **KEEP**;
- «отделять подтверждённые факты от гипотез / не выдавать объяснение за причину» — **DELETE-DUPLICATE** относительно A-L2/A-L4.

### Пункт 3 — sufficient evidence before fix
**KEEP.**

### Пункт 4 — все доступные проверки до привлечения разработчика
**KEEP.**

### Пункт 5 — восстановить штатный путь до workaround
**KEEP.**

### Пункт 6 — «Информация не проверена», неподтверждённое основание, experiment ≠ final fix, permissions
Решение:
- explicit unverified boundary — **KEEP**;
- experiment ≠ final fix — **KEEP**;
- permissions сохраняются — **KEEP** как bridge к permission contract.

## 6. «Масштаб исправления»

### Пункты 1–3
**KEEP полностью.**

Отдельного semantic duplicate удаления нет.

## 7. «Рабочий процесс»

### Новый общий PR permission contract
**ADD-PERMISSION** перед текущим пунктом 2.

Нормативный смысл:
1. Новый PR любого типа создаётся только после прямого разрешения разработчика.
2. Наличие задачи, стандартного workflow, найденной необходимости или технической возможности не является таким разрешением.
3. Уже назначенный service PR не меняется на другой без прямой команды разработчика.
4. После разрешения тип PR и дальнейший маршрут определяются текущими правилами Workflow.

Это заменяет частный запрет в роли Миры.

### Workflow 1 — main source of truth
**KEEP.**

### Workflow 2 — service PR contract
**KEEP.**

После ADD-PERMISSION он описывает тип/назначение PR, но не permission на его создание.

### Workflow 3 — создание/чтение service PR
**KEEP.**

### Workflow 4 — implementation PR per bounded stage
**KEEP.**

### Workflow 5 — docs PR в конце
**KEEP.**

### Workflow 6 — standard cycle
**KEEP**, но он становится единственным местом для:
- Мира определяет scope;
- Лёва строит полный план до реализации;
- Мира выбирает delivery mode;
- Лира реализует;
- plan defect → исправить plan before continue.

Формальный review sequence внутри этого пункта не дублировать сверх необходимой ссылки на раздел Review.

### Workflow 7 — stacked mode
Разделить ответственность:

**KEEP**:
- первый PR от main;
- каждый следующий base на предыдущий head;
- dependency sync при изменении нижней ступени;
- финальная сборка итогового head в первый PR;
- закрытие промежуточных PR как superseded.

**REFERENCE** вместо повторения:
- промежуточный coordinator checkpoint → ссылка на Review 2;
- финальный author/coordinator/independent cycle → ссылка на Review 1.

### Workflow 8 — Лёва/Марк escalation
**KEEP** как единственное operational место:
- когда Лёва реализует;
- когда Марк подключается/заменяет Лёву.

После этого эти triggers убрать из Roles и не повторять в Review сверх identification reviewer.

### Workflow 9 — handoff через service PR
**KEEP** как единственный нормативный handoff contract.

### Workflow 10 — current assignment > general roles
**KEEP.**

### Workflow 11 — context recovery
**KEEP.**

## 8. «Действие разработчика»

### Пункт 1 — каждый ответ заканчивается блоком
**KEEP.**

### Пункт 2
Текущее содержит:
- доступный следующий шаг сначала выполняет агент;
- не перекладывать доступное действие/проверку/выбор;
- handoff context заранее фиксируется в service PR.

Решение:
- первые две части — **KEEP**;
- handoff-фразу — **DELETE-DUPLICATE** относительно Workflow 9.

## 9. «Общие правила»

### G1 — нет локальной копии
**KEEP.**

### G2 — PROJECT.md / PROJECT_STATE / source-of-truth читать полностью
**KEEP.**

### G3 — не менять architecture/schema/dependencies/contracts без необходимости; не делать unrelated refactor/future Stage
**KEEP.**

Это общий scope/future-work boundary.

### G4 — contradiction code/docs/decisions → developer
**KEEP.**

### G5 — external API/docs + не заявлять непроведённое
**KEEP.**

### G6 — PROJECT_STATE current-state contract
**KEEP.**

### G7 — PROJECT_HISTORY contract
**KEEP.**

### G8 — permanent contracts
**KEEP.**

### G9 — production/secrets/paid/irreversible only explicit permission
**KEEP.**

Новый PR permission contract не заменяет этот пункт: разные виды внешних действий.

### G10 — Stage bounds/source-of-truth
**KEEP.**

## 10. «Запуск PR-тестов»

### CI1–CI4
**KEEP полностью.**

Это compact operational contract, явных внутренних дублей нет.

## 11. «Проверка PR»

### Review 1 — full review cycle
**KEEP как единственное нормативное определение полного review cycle.**

После чистки:
- reviewer independence должна жить здесь;
- стандартный reviewer / fallback можно оставить здесь только если это не повторяет Workflow 8. Предпочтительно: Review 1 определяет independence и sequence, Workflow 8 — assignment exceptions.

### Review 2 — stacked coordinator checkpoint
**KEEP как единственное нормативное определение checkpoint.**

Workflow 7 должен ссылаться сюда.

### Review 3 — exact head
**KEEP.**

### Review 4 — whole scope / first finding not enough / green CI not proof
**KEEP.**

### Review 5 — classification findings
Текущее:
- defect current task;
- external defect current Stage;
- future work;
- external current-Stage defect не расширяет task, если не блокирует;
- future work itself не основание для change;
- agreement several agents not proof.

Решение:
- classification и task-boundary semantics — **KEEP**;
- фразу «future work сам по себе не является основанием для изменения текущей реализации» — **DELETE-DUPLICATE** относительно G3, если после удаления classification всё ещё явно отличает future work от current task.
- multiple-agent agreement not proof — **KEEP**.

### Review 6 — divergent findings / plan owner / developer choice
**KEEP.**

### Review 7 — what to fix / review != fix / fix scope
**KEEP.**

Несмотря на overlap с G3/Fix scope, здесь нужен review-specific admission rule.

### Review 8 — completion condition
**KEEP.**

## 12. «Полный аудит документации»

### Audit 1–4
**KEEP полностью.**

Это специальный режим и не является мусорным дублем G2.

## 13. Сводка change-map

### KEEP
- весь reasoning core;
- Principles;
- Diagnosis, кроме generic fact/hypothesis repetition в D2;
- Fix scope;
- большинство Workflow;
- General;
- CI;
- Review;
- Audit.

### DELETE-DUPLICATE
1. Generic fact/hypothesis tail в Diagnosis 2.
2. Handoff tail в Developer action 2.
3. Future-work prohibition phrase в Review 5, если G3 остаётся и classification смысл не ослабляется.

### MOVE
1. Мира: запрет смены service PR → общий Workflow permission contract.
2. Лира: independent-review eligibility → Review.
3. Лёва: plan/review/escalation operational details → Workflow/Review.
4. Марк: operational inclusion conditions → Workflow/Review.

### REFERENCE
1. Workflow 7 intermediate checkpoint → Review 2.
2. Workflow 7 final full cycle → Review 1.
3. При необходимости Workflow 6 full-review transition → Review section, без повторения sequence.

### ADD-PERMISSION
1. Новый общий PR gate в Workflow перед правилами типов PR.

## 14. Ожидаемый эффект

Это сокращение:
- убирает реальные повторы;
- не убирает shared reasoning для Codex;
- не переносит repository workflow в User instructions;
- делает Roles короче и стабильнее;
- делает Workflow источником sequencing;
- делает Review источником verification semantics;
- закрывает реальную PR-permission ошибку одним общим правилом вместо частных запретов.

## 15. Следующий шаг

После этой change-map уже можно отдельно подготовить **draft-редакцию только AGENTS.md** для сравнения «до/после» по смыслу и объёму, не применяя её.
