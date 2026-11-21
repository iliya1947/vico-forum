# PROJECT current → draft semantic diff

Сравниваются:
- `PROJECT_INSTRUCTIONS.current.md` — действующий эталон;
- `PROJECT_INSTRUCTIONS.draft.md` — рабочий Project draft после удаления подтверждённых дублей с User layer.

Фактический commit изменения draft: `46ceb0fe8f42b11da4ccb553bc6111489739617c` (`docs: remove project-level duplicates`), parent `3f8596e708b302de98d684ee8404e912d8fe17fe`.

## 1. Нумерованные правила

### Сохранены без изменения смысла
- current 1 → draft 1
- current 2 → draft 2
- current 3 → draft 3
- current 4 → draft 4
- current 5 → draft 5
- current 6 → draft 6
- current 7 → draft 7
- current 8 → draft 8
- current 9 → draft 9
- current 11 → draft 10
- current 12 → draft 11
- current 13 → draft 12
- current 14 → draft 13
- current 15 → draft 14
- current 16 → draft 15
- current 17 → draft 16
- current 18 → draft 17

### Удалено
- current 10: «Не добавлять очевидные, дублирующие или страхующие ограничения без реальной необходимости».

**Coverage после удаления:** User draft 2 + 7.
- User 2 запрещает ненужные инструкции/действия/следующие шаги.
- User 7 запрещает добавлять неустановленные условия, правила, запреты, разрешения и полномочия.

Вердикт: отдельный Project-specific смысл не потерян.

## 2. Ненумерованные правила

### Удалено полностью
Current:
> «Всегда рассуждай от цели — не делай выводов и не действуй, пока не понимаешь, зачем это нужно!!!»

**Coverage:** User draft 19 + 22 + 26 + 39.
- User 19 устанавливает актуальную цель и запрещает подменять её локальной подцелью.
- User 22 проверяет связь самостоятельного действия с целью, scope и permission.
- User 26 сохраняет fidelity прямому поручению.
- User 39 требует выполнять ясное разрешённое поручение без лишних вопросов.

Вердикт: Project-specific смысл не потерян; User layer покрывает механизм точнее.

### Сокращено
Current:
> «Всегда перед ответом внимательно проверь, не упустила ли ты что-то очевидное из уже сказанного или происходящего в текущей задаче. Не отвечай автоматически по первой пришедшей трактовке — сначала сопоставь её с контекстом.»

Draft:
> «Всегда перед ответом внимательно проверь, не упустила ли ты что-то очевидное из уже сказанного или происходящего в текущей задаче.»

Удалённая часть полностью покрыта User draft 20:
- если трактовка существенно влияет на результат, не принимать первую правдоподобную автоматически;
- сопоставлять очевидные варианты с контекстом задачи.

Сохранённая первая часть остаётся отдельным Project-context guard.

## 3. Неизменённые Project-specific элементы

- приоритет прямых user instructions над Project instructions;
- совместная обязательность User + Project layers;
- обязательное чтение актуального main/AGENTS;
- Stage-vs-future classification findings;
- failure mode при невозможности выполнить обязательное правило;
- Codex prompt contract и neutral-review rules;
- long-task decomposition / STOP checkpoints / atomic operations;
- pre-release и release risk policy;
- имена ИИ-агентов и их технические соответствия.

## 4. Итог

1. Current numbered rules: 18.
2. Draft numbered rules: 17.
3. Удалён 1 нумерованный дубль: current 10.
4. Удалён 1 ненумерованный общий дубль про цель.
5. 1 ненумерованный абзац сокращён только на часть, уже полностью покрытую User layer.
6. Потерянных Project-specific guards: **0**.
7. Project draft сохраняет все уникальные project-specific смыслы current и больше не повторяет три подтверждённые общие части User layer.

Это утверждение относится только к Project current-vs-draft и User overlap; AGENTS overlap ещё не классифицирован.
