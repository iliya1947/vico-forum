# Внутренний аудит AGENTS.md — дубли и structural merges

Источник: `AGENTS.current.md`, exact snapshot актуального `main:AGENTS.md`.

На этом этапе `AGENTS.draft.md` **не изменяется**.

## 1. Критерии

- **DELETE-SAFE** — весь самостоятельный смысл правила уже полностью и не слабее содержится в другом месте AGENTS.
- **SAFE-MERGE** — несколько правил выполняются как одна операция и могут стать одним пунктом без потери любого guard.
- **SAFE-REFERENCE-DEDUPE** — один раздел повторяет детали процесса, у которого уже есть каноническое определение в другом разделе; детали можно заменить точной ссылкой внутри AGENTS.
- **KEEP-SEPARATE** — сходство есть, но правила работают в разных стадиях или защищают от разных ошибок.

## 2. Полные удаления

**DELETE-SAFE целых правил: 0.**

Внутренний аудит не нашёл ни одного целого numbered rule, удаление которого оставляет весь его смысл без остатка в другом одном или составном механизме AGENTS.

Это не означает отсутствия повторов: основные повторы находятся внутри составных правил и в повторном описании одного workflow.

## 3. Подтверждённые SAFE-MERGE

### A. «Масштаб исправления» 1 + 2

Rule 1:
- сравнить с последним сопоставимым рабочим вариантом;
- сначала проверить локальное исправление/rollback.

Rule 2:
- если локального исправления достаточно, не расширять механизм;
- расширять scope только по подтверждённой необходимости;
- workaround требует отдельного обоснования.

**Вердикт: SAFE-MERGE.**

Обе части — один local-first scope decision:
1. установить baseline и локальный путь;
2. расширять scope только если локального пути недостаточно.

Rule 3 про repeated rework / plan escalation оставить отдельно.

---

### B. «Рабочий процесс» 4 + 5

Rule 4 маршрутизирует bounded implementation changes в отдельный implementation PR.

Rule 5 маршрутизирует документацию в отдельный PR в конце задачи.

**Вердикт: SAFE-MERGE.**

Обе части отвечают на одну операцию: **какой тип изменений в какой PR попадает**.

Service PR rules 2–3 не включать: это другой тип workspace и отдельный lifecycle.

---

### C. «Общие правила» 6 + 7 + 8

Rule 6 определяет содержимое `PROJECT_STATE.md`.

Rule 7 определяет содержимое `docs/PROJECT_HISTORY/`.

Rule 8 определяет место постоянных product/architecture/operations contracts.

**Вердикт: SAFE-MERGE.**

Это одна information-routing операция:
- current factual state → PROJECT_STATE;
- historical snapshots/corrections → PROJECT_HISTORY;
- permanent contracts → профильные source-of-truth docs.

Все три назначения должны остаться явными внутри объединённого пункта.

---

### D. «Запуск PR-тестов» 2 + 3

Rule 2 задаёт labels `run:ci` / `run:acceptance`.

Rule 3 задаёт one-shot semantics этих labels и повторный запуск на новом exact head.

**Вердикт: SAFE-MERGE.**

Это один trigger contract: какой label использовать и как долго команда действует.

Rules 1 и 4 оставить отдельно:
- 1 — policy, когда проверки вообще запускаются;
- 4 — fallback workflow_dispatch и исключение production/deploy.

---

### E. «Полный аудит документации» 2 + 3

Rule 2: каждый документ заданного scope читается полностью.

Rule 3: аудит нельзя называть полным, если часть scope не проверена.

**Вердикт: SAFE-MERGE.**

Это один completeness contract:
- фактически проверить весь scope;
- термин «полный» допустим только после этого.

Rules 1 и 4 отдельны: activation gate и classification of findings.

## 4. Подтверждённый SAFE-REFERENCE-DEDUPE

### A. «Рабочий процесс» 7 ↔ «Проверка PR» 1–2

Workflow 7 сейчас повторно описывает:
- author self-check + CI/checks промежуточной stacked-ступени;
- coordinator checkpoint Миры;
- PASS → следующая ступень без merge и independent Codex-review;
- финальный author self-check → whole-feature review Миры → independent review Лёвы → merge.

Те же процессы уже канонически определены:
- intermediate stacked checkpoint → `Проверка PR` 2;
- final full review cycle → `Проверка PR` 1.

**Вердикт: SAFE-REFERENCE-DEDUPE.**

В Workflow 7 нужно оставить уникальную stacked topology:
- первый PR от main;
- следующие PR base на предыдущую head-ветку;
- bounded diff каждой ступени;
- синхронизацию верхних ступеней при изменении нижней;
- перенос итогового head в первый PR и закрытие intermediate PR как superseded.

Повтор checkpoint/review sequence можно заменить точными ссылками на Review 2 / Review 1.

Это не удаляет процесс: его canonical definition остаётся в разделе Review.

---

### B. «Общие правила» 6 ↔ «Рабочий процесс» 5

General 6 повторяет, что `PROJECT_STATE.md` обновляется «в отдельном PR с документацией в конце задачи».

Workflow 5 уже задаёт общий контракт: implementation-related documentation меняется отдельным PR в конце задачи.

**Вердикт: SAFE-REFERENCE-DEDUPE.**

После объединения General 6–8 достаточно сослаться на documentation PR из Workflow; не повторять его lifecycle дословно.

## 5. Похожие правила, которые НЕ надо объединять

### «Логика» 2 ↔ «Принципы» 1
**KEEP-SEPARATE.**
- Logic 2 — facts/assumptions classification.
- Principle 1 — доверие к output другого агента и независимая проверка оснований.

### «Логика» 3 ↔ «Диагностика» 2
**KEEP-SEPARATE.**
- Logic 3 — универсальные alternatives/consequences.
- Diagnosis 2 — technical alternative causes, downstream constraints и comparison with normal path.

### «Логика» change invalidation ↔ Principle 5 recheck
**KEEP-SEPARATE.**
- первое инвалидирует зависимые выводы после изменения основания;
- второе определяет, когда подтверждённый факт вообще нужно перепроверять.

### Principle 2 mutual checks ↔ Review cycle
**KEEP-SEPARATE.**
Mutual checks применяются к любому agent handoff; Review 1–2 — формальный PR protocol.

### Principle 5 ↔ Review 3 exact head
**KEEP-SEPARATE.**
Principle 5 — общий revalidation threshold; Review 3 — exact-head validity formal review/checkpoint.

### Diagnosis 1 ↔ Review 4 «первый finding не завершает проверку»
**KEEP-SEPARATE.**
- Diagnosis 1 запрещает прекращать causal diagnosis на первой найденной ошибке;
- Review 4 требует проверить весь assigned PR scope даже после finding.

### Diagnosis 4 ↔ «Действие разработчика» 2
**KEEP-SEPARATE.**
- Diagnosis 4 — не перекладывать именно диагностику;
- Developer Action 2 — не перекладывать любой доступный следующий шаг/выбор/действие.

### Diagnosis 5 ↔ «Масштаб исправления» 1–2
**KEEP-SEPARATE.**
- Diagnosis 5: normal path before workaround и честная маркировка workaround;
- Scope: local-first breadth of actual fix.

### Roles 6 ↔ Workflow 8 ↔ Review 6
**KEEP-SEPARATE.**
Есть повтор имени Лёвы/technical-plan authority, но:
- Roles 6 определяет роль;
- Workflow 8 определяет условия implementation escalation;
- Review 6 определяет authority при disputed finding/plan change.
Полное слияние смешает responsibility, escalation и review arbitration.

### Workflow 2–3 ↔ Workflow 9
**KEEP-SEPARATE.**
- 2–3 определяют service PR workspace/lifecycle;
- 9 — handoff semantics между агентами и запрет использовать разработчика как courier.

### General 2 ↔ Full Audit 2–3
**KEEP-SEPARATE.**
- General 2 — mandatory project docs before project change;
- Audit 2–3 — completeness contract специального full-audit режима.

### General 3 ↔ Review 5/7
**KEEP-SEPARATE.**
- General 3 запрещает ненужные architecture/refactor/future-stage changes вообще;
- Review 5/7 классифицирует findings и ограничивает fixes внутри review workflow.

### General 5 ↔ Diagnosis 6
**KEEP-SEPARATE.**
- General 5 — official docs for external APIs/libraries/tools + no fake verification claims;
- Diagnosis 6 — unverified technical circumstances and prohibition on treating diagnostic experiment as fix.

### Review 5 consensus guard ↔ Principle 1
**KEEP-SEPARATE.**
Principle 1 регулирует доверие к agent output вообще; Review 5 отдельно запрещает считать совпадение выводов нескольких агентов подтверждением finding.

## 6. Внутренние повторы, которые пока не стоит трогать

### Roles ↔ Workflow/Review role mentions

Имена Миры, Лёвы и Марка повторяются в operational sections. Часть повторов можно потенциально заменить ссылками на «Роли», но сейчас это ухудшит локальную читаемость critical workflow больше, чем даст экономию.

**Решение: пока KEEP.**

### Review 1 ↔ Review 3 exact-head wording

Review 1 говорит, что после исправлений coordinator cycle начинается заново на новом stable exact head; Review 3 задаёт общий exact-head contract.

Это частичный repeat, но первая формулировка фиксирует sequencing именно до independent review.

**Решение: пока KEEP.**

### Scope 3 ↔ Review 6 technical-plan escalation

Обе части отправляют пересмотр технического плана Лёве, но в разных trigger contexts: failed fix vs disputed review finding.

**Решение: KEEP.**

## 7. Количественный результат первого прохода

Текущий AGENTS содержит 64 нумерованных правила:
- Логика 5
- Роли 6
- Принципы 5
- Диагностика 6
- Масштаб исправления 3
- Рабочий процесс 11
- Действие разработчика 2
- Общие правила 10
- Запуск PR-тестов 4
- Проверка PR 8
- Полный аудит документации 4

Подтверждено:
- DELETE-SAFE whole rules: **0**
- SAFE-MERGE groups: **5**
- SAFE-REFERENCE-DEDUPE: **2**

Если применить только 5 structural merges:
- 64 → 58 numbered rules;
- semantic guards не удаляются.

Reference-dedupe дополнительно уменьшит повтор текста, но не меняет число правил само по себе.

## 8. Вывод

В AGENTS нет безопасного слоя «просто удалить несколько правил».

Основная оптимизация должна быть структурной:
1. объединить 5 групп, которые реально являются одной операцией;
2. сделать Review section canonical source для checkpoint/review details и убрать повторное перечисление из Workflow 7;
3. сохранить generic guards и их technical/workflow specializations раздельно там, где они защищают разные стадии.

На этом этапе `AGENTS.draft.md` не изменён.
