# AGENTS vs USER + PROJECT drafts — межслойная классификация

База:
- `main` = `9cff976a9621d9fe5dfef28ea5367e390ff435b1`;
- `main:AGENTS.md` полностью прочитан;
- blob `9037fc15fd2b5fbf8c86ee677d00198dfcfbe442`;
- он полностью совпадает с `AGENTS.current.md`.

Сравниваются:
- `AGENTS.current.md`;
- `USER_INSTRUCTIONS.draft.md`;
- `PROJECT_INSTRUCTIONS.draft.md`.

На этом этапе `AGENTS.draft.md` **не изменяется**.

## 1. Критическая граница аудитории

`AGENTS.md` — общий рабочий регламент разработчика, Codex и ChatGPT.

User/Project layers напрямую регулируют ChatGPT в текущем продукте/проекте, но не являются надёжной заменой правил, которые Codex должен получить из репозитория.

Поэтому текстовое совпадение AGENTS с User/Project **не является основанием удалить правило из AGENTS**, если оно нужно Codex или общему multi-agent workflow.

## 2. Совпадения USER ↔ AGENTS, которые должны остаться в AGENTS

### AGENTS / Логика
- Logic 1 ↔ User 19 + 20: цель и трактовка.
- Logic 2 ↔ User 3 + 6: факты vs предположения.
- Logic 3 ↔ User 21: существенные альтернативы/последствия.
- Logic 4 ↔ User 8: вывод без скрытых посылок.
- Logic 5 ↔ User 22: самостоятельное действие следует из оснований и цели.
- строка об изменении существенного факта ↔ User 17.

**Решение:** KEEP-AGENTS.

Причина: это базовый reasoning contract для Codex/shared agents. Удаление перенесло бы защиту только в ChatGPT User layer.

### AGENTS / Принципы
- Principle 1 «Думай своей головой» ↔ User 18.
- Principle 5 «Не перепроверяй без причины» ↔ User 28.

**Решение:** KEEP-AGENTS.

Это общие правила для всех repo agents.

### AGENTS / Диагностика
- Diagnosis 2 частично ↔ User 6, 11, 20, 21, 27.
- Diagnosis 3 ↔ User 31, но конкретизирован для технической причинности/исправления.
- Diagnosis 4 ↔ User 29 + 30 + 38.
- Diagnosis 6 ↔ User 4 + 27 + 38.

**Решение:** KEEP-AGENTS.

Здесь overlap в основном является технической специализацией общего User guard и нужен Codex.

### AGENTS / Общие правила
- General 5 ↔ User 4 + 5: актуальная официальная документация + запрет ложных claims о проверке.

**Решение:** KEEP-AGENTS.

Для Codex это единственный repository-visible контракт такого типа.

### AGENTS / Полный аудит документации
- Audit 2–3 ↔ User 5: полное чтение до фактического конца и запрет называть аудит полным при неполном охвате.
- Audit 4 ↔ User 6 + 8: отделение подтверждённого от предположений/неустановленного.

**Решение:** KEEP-AGENTS.

Это audit-specific specialization и одновременно Codex-visible правило.

## 3. Совпадения PROJECT ↔ AGENTS

### Project 3 ↔ AGENTS Review 5
Project draft:
> каждую проблему, найденную ChatGPT в работе Codex, проверить: current Stage или future groundwork; future groundwork сам по себе не основание для исправления.

AGENTS Review 5:
- findings классифицируются как дефекты текущей задачи, посторонние дефекты текущего Stage или future work;
- future groundwork сам по себе не основание для изменения текущей реализации;
- посторонний current-Stage defect не расширяет текущую задачу без blocking necessity.

**Решение: DELETE-SAFE из PROJECT, KEEP в AGENTS.**

Причины:
1. Project 2 уже требует сначала получить `main` и полностью прочитать актуальный `AGENTS.md`.
2. AGENTS правило шире и точнее.
3. Оно нужно не только ChatGPT, но и Codex.
4. Дублирование Project 3 не добавляет отдельного project-only guard.

### Project block «Имена ИИ-агентов» ↔ AGENTS / Роли
Project содержит таблицу:
- Лира — ChatGPT-6;
- Мира/Ари — GPT-5.6 Sol;
- Марк — Codex-6 Sol;
- Лёва — Codex-6.1 Sol;
и отдельную команду использовать эти имена.

AGENTS / Роли уже содержит те же имена, модели и дополнительно роль каждого агента.

**Решение: PARTIAL-DUPLICATE в PROJECT, KEEP AGENTS roles.**

Безопасная архитектура:
- удалить из Project повторную таблицу имён/моделей;
- сохранить короткое project-only требование вида: «Используй закреплённые в актуальном AGENTS.md имена агентов; при необходимости технического обозначения сохраняй точное название модели.»

Почему не удалить Project block целиком: AGENTS описывает роли и имена, но не формулирует столь явно user-facing требование всегда использовать закреплённые имена в общении.

### Project 2 ↔ AGENTS source-of-truth
Project 2 требует получить из `main` и прочитать AGENTS.

AGENTS Workflow 1 говорит, что `main` — source of truth.

**Решение: KEEP-PROJECT + KEEP-AGENTS.**

Это разные операции:
- Project 2 — entry protocol ChatGPT;
- AGENTS Workflow 1 — shared repository source-of-truth contract.

### Project prompt/decomposition/risk rules
Project 5–17 не имеют полного AGENTS-эквивалента:
- prompt construction для Codex;
- нейтральность research/review prompts;
- long-task decomposition/STOP для текущего ChatGPT-чата;
- pre-release risk strategy.

**Решение:** KEEP-PROJECT.

## 4. Остальные AGENTS sections

### Роли
**KEEP-AGENTS.**
Уникальная shared responsibility/authority model.

### Principle 2 Mutual checks
**KEEP-AGENTS.**
User 18 требует проверять основания другого агента, но AGENTS дополнительно задаёт handoff-specific поведение: проверить относящуюся часть и не продолжать цепочку поверх найденной проблемы.

### Principle 3 «смотри шире»
**KEEP-AGENTS.**
Отдельный project/team behavior. User 2 запрещает лишние next steps, но не требует игнорировать существенную nearby problem; правила совместимы через materiality/scope.

### Principle 4 proactive tooling
**KEEP-AGENTS.**
Уникальный shared-agent workflow guard.

### Diagnosis 1 / 5
**KEEP-AGENTS.**
Техническая causal diagnosis и preference for restoring normal path before workaround не дублируются верхними слоями.

### Масштаб исправления 1–3
**KEEP-AGENTS.**
Project-specific repair-scope/escalation policy.

### Рабочий процесс 1–11
**KEEP-AGENTS.**
Service PR, implementation PR, stacked mode, agent handoff, assignments и context restore — уникальный shared workflow.

### Действие разработчика 1–2
**KEEP-AGENTS.**
User layer регулирует вопросы/самостоятельность, но AGENTS добавляет обязательный формат ответа и service-PR handoff.

### Общие правила 1–10
**KEEP-AGENTS.**
Даже там, где есть User overlap, правила содержат repository/project-specific source-of-truth, permissions, state/history/contracts и Stage semantics.

### Запуск PR-тестов 1–4
**KEEP-AGENTS.**
Уникальный CI trigger protocol.

### Проверка PR 1–8
**KEEP-AGENTS.**
Уникальный review/checkpoint/exact-head protocol.
Некоторые логические guard'ы пересекаются с User, но их exact-head/Stage/reviewer semantics уникальны.

### Полный аудит документации 1–4
**KEEP-AGENTS.**
Audit-specific mode и Codex visibility.

## 5. Что можно удалить из AGENTS прямо сейчас

**Ничего на основании межслойного сравнения.**

Это не означает, что AGENTS нельзя сократить вообще. Это означает только:
- User/Project overlap не даёт безопасного основания удалить соответствующие правила из AGENTS из-за другой аудитории;
- возможная оптимизация AGENTS должна идти отдельным этапом через **внутренние** дубли/структурные объединения самого AGENTS, а не через перенос его guard'ов в ChatGPT-only layers.

## 6. Обратные изменения, найденные этим проходом

### DELETE-SAFE из PROJECT draft
1. Project 3 — полностью покрыт AGENTS Review 5, который Project 2 обязывает прочитать.

### PARTIAL-DUPLICATE в PROJECT draft
1. Блок имён ИИ-агентов:
   - удалить повторную таблицу name → model;
   - сохранить короткую команду использовать имена, закреплённые в AGENTS roles.

## 7. Итог

1. `AGENTS.current.md` совпадает с актуальным `main:AGENTS.md`.
2. Межслойное сравнение не выявило ни одного AGENTS rule, который безопасно удалить только из-за User/Project coverage.
3. Найден один новый DELETE-SAFE в Project draft: Project 3.
4. Найден один новый PARTIAL-DUPLICATE в Project draft: таблица имён агентов.
5. `AGENTS.draft.md` на этом этапе не изменён.
