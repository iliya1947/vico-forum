# PROJECT current → draft semantic diff

Сравниваются:
- `PROJECT_INSTRUCTIONS.current.md` — действующий эталон;
- `PROJECT_INSTRUCTIONS.draft.md` — очищенный рабочий Project draft;
- `AGENTS.current.md` — актуальный repository-visible contract, который Project rule 2 требует полностью прочитать из `main`.

## 1. Нумерованные правила

Исходно: 18.

Сейчас: 16.

Сохранившиеся правила перенумерованы без изменения текста:

- current 1 → draft 1
- current 2 → draft 2
- current 4 → draft 3
- current 5 → draft 4
- current 6 → draft 5
- current 7 → draft 6
- current 8 → draft 7
- current 9 → draft 8
- current 11 → draft 9
- current 12 → draft 10
- current 13 → draft 11
- current 14 → draft 12
- current 15 → draft 13
- current 16 → draft 14
- current 17 → draft 15
- current 18 → draft 16

Проверка показала: тексты всех этих 16 правил совпадают с corresponding current rules дословно.

### Удалён current Project 10

> Не добавлять очевидные, дублирующие или страхующие ограничения без реальной необходимости.

Coverage:
- User draft 2 запрещает ненужные инструкции, действия и следующие шаги;
- User draft 7 запрещает добавлять неустановленные условия, правила, запреты, разрешения и полномочия.

Вердикт: отдельный Project-specific guard не потерян.

### Удалён current Project 3

> Каждую проблему, найденную ChatGPT в работе Codex, сначала проверяй: является ли она реальной проблемой текущего Stage или только заделом на будущее. Задел на будущее сам по себе не является основанием для исправления.

Coverage:
- Project draft 2 требует при работе с проектом получить из `main` и полностью прочитать актуальный `AGENTS.md`;
- AGENTS / Проверка PR / 5 требует классифицировать findings как:
  - дефекты текущей задачи;
  - посторонние дефекты текущего Stage;
  - вопросы будущей работы;
- тот же AGENTS rule прямо устанавливает, что future groundwork сам по себе не является основанием для изменения текущей реализации;
- AGENTS Review 7 дополнительно ограничивает исправления дефектами текущей задачи и внешними blockers.

Вердикт: Project 3 полностью покрыт более широким и точным shared-agent правилом AGENTS; отдельный Project-дубль не нужен.

## 2. Ненумерованные правила

### Удалён общий goal-дубль

Current:
> Всегда рассуждай от цели — не делай выводов и не действуй, пока не понимаешь, зачем это нужно!!!

Coverage:
- User 19 — актуальная цель и запрет подменять её локальной;
- User 22 — admissibility самостоятельного действия;
- User 26 — fidelity прямому поручению;
- User 39 — выполнение ясного разрешённого поручения без лишних вопросов.

Вердикт: отдельный Project-specific guard не потерян.

### Сокращён абзац про трактовку

Сохранено:
> Всегда перед ответом внимательно проверь, не упустила ли ты что-то очевидное из уже сказанного или происходящего в текущей задаче.

Удалена часть про автоматическое принятие первой трактовки, потому что её полностью покрывает User 20.

Вердикт: уникальный Project-context check сохранён.

## 3. Имена ИИ-агентов

Current Project повторяет полный mapping:
- Лира → ChatGPT-6;
- Мира, Ари → ChatGPT-5.6 Sol;
- Марк → Codex-6 Sol;
- Лёва → Codex-6.1 Sol.

Draft вместо таблицы содержит:
> Для идентификации, обращения и упоминания агентов используй имена, закреплённые в разделе «Роли» актуального `AGENTS.md`; при необходимости технического обозначения сохраняй точное название модели.

Coverage:
- точный mapping name → model и роли уже находится в обязательном для чтения `AGENTS.md`;
- project-only требование использовать эти имена в идентификации/обращении/упоминании сохранено;
- требование сохранять точное техническое название модели сохранено.

Вердикт: semantic coverage сохранён, межслойный дубль удалён.

## 4. Проверка потерь

1. Current numbered rules: 18.
2. Draft numbered rules: 16.
3. Все 16 сохранённых numbered rules совпадают с current дословно.
4. Удалены только current 3 и 10.
5. Уникальная часть project-context check сохранена.
6. Name/model mapping перенесён на единственный shared source — AGENTS Roles; project-only usage instruction сохранён.
7. Потерянных Project-specific guards: **0**.

## 5. Объём

- Current Project file: 443 whitespace words.
- Draft Project file: 347 whitespace words.
- Изменение: -96 слов.

Это числовое сокращение текста, а не самостоятельное доказательство улучшения поведения.

## 6. Итог

Текущий `PROJECT_INSTRUCTIONS.draft.md` сохраняет все уникальные Project-specific смыслы current, но больше не дублирует:
- User-level prompt hygiene;
- User-level goal/interpretation guards;
- AGENTS Stage/future finding classification;
- AGENTS name/model mapping.

Следующий независимый этап — внутренняя оптимизация самого `AGENTS.md`; межслойный анализ уже показал, что удалять AGENTS rules только из-за User/Project coverage нельзя.
