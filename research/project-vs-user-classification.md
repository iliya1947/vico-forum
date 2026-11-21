# PROJECT layer vs USER draft — классификация

Сравниваются:
- `PROJECT_INSTRUCTIONS.current.md` / текущий идентичный `PROJECT_INSTRUCTIONS.draft.md`;
- очищенный `USER_INSTRUCTIONS.draft.md`.

На этом этапе Project draft **не изменяется**.

## Критерии

- **KEEP-PROJECT** — смысл относится именно к Vico, его стадиям, Codex workflow, ролям или проектному режиму.
- **DELETE-SAFE** — смысл уже полностью и не слабее покрыт User draft; отдельное Project-правило больше ничего не добавляет.
- **PARTIAL-DUPLICATE** — часть формулировки покрыта User draft, но другая часть сохраняет отдельный Project-смысл.
- Общность правила сама по себе не является основанием для удаления, если User layer его не покрывает.

## Верхнеуровневые правила

### «Прямые инструкции пользователя в текущем чате имеют приоритет над инструкциями проекта»
**Решение: KEEP-PROJECT.**

User draft 25 регулирует замену инструкций **того же уровня**, но не задаёт приоритет direct user instruction над Project layer. Это правило разрешает межслойную коллизию.

### Project 1 — User + Project instructions обязательны совместно
**Решение: KEEP-PROJECT.**

User draft 1 делает обязательным User layer, включая проекты, но не устанавливает обязательность именно Vico Project instructions.

### Project 2 — получить main и полностью прочитать актуальный AGENTS.md
**Решение: KEEP-PROJECT.**

Это конкретный Vico entry protocol и source-of-truth route.

### Project 3 — finding в Codex сначала проверить на current Stage vs future groundwork
**Решение: KEEP-PROJECT.**

User 14 ограничивает масштаб вывода, User 22 — самостоятельное действие, но ни одно правило не задаёт Vico Stage classification и запрет исправлять future groundwork только из-за его обнаружения.

### Project 4 — если обязательное правило невозможно выполнить, не выполнять противоречащее действие и сообщить ограничение
**Решение: KEEP-PROJECT.**

Правило общее по форме, но полного аналога в User draft нет. Удаление потеряет явный failure-mode для обязательного Project rule.

## Формирование задачи для Codex

### Project 5 — результат + scope + readiness criteria
**Решение: KEEP-PROJECT.**

Это контракт структуры Codex task. User 15 про проверку завершённости не требует включать readiness criteria в prompt.

### Project 6 — не пересказывать Codex AGENTS/docs
**Решение: KEEP-PROJECT.**

Project-specific prompt hygiene.

### Project 7 — передавать только относящийся контекст, которого нет надёжно в repo
**Решение: KEEP-PROJECT.**

Project-specific handoff/data-source rule.

### Project 8 — при необходимости указывать конкретные файлы/модули/entry points/current implementation
**Решение: KEEP-PROJECT.**

Project-specific prompt construction.

### Project 9 — не диктовать способ реализации без обязательности; Codex выбирает техническое решение
**Решение: KEEP-PROJECT.**

User 23 защищает установленного decision owner, но Project 9 отдельно устанавливает delegation boundary именно для Codex implementation choice.

### Project 10 — не добавлять очевидные, дублирующие или страхующие ограничения без реальной необходимости
**Решение: DELETE-SAFE.**

Полностью покрыто User draft:
- User 2: не добавлять ненужные инструкции, действия и следующие шаги;
- User 7: не добавлять неустановленные условия, правила, запреты, разрешения или полномочия.

Фраза «без реальной необходимости» не вводит более строгого project-specific критерия, чем уже существующий общий запрет ненужных/неустановленных инструкций.

### Project 11 — hard requirements/prohibitions только для immutable conditions или важных границ
**Решение: KEEP-PROJECT.**

User 12 запрещает усиливать нормативную силу, но Project 11 дополнительно определяет, когда в Codex prompt вообще оправдана жёсткая constraint-форма. Это prompt-specific guard против overconstraint.

### Project 12 — research prompt не должен навязывать Codex вывод ChatGPT
**Решение: KEEP-PROJECT.**

User 18 запрещает считать вывод другого агента фактом, но не требует нейтральной постановки исследования.

### Project 13 — independent check prompt нейтрален и без вывода ChatGPT
**Решение: KEEP-PROJECT.**

Это отдельный protocol независимой проверки, а не общий epistemic guard.

## Декомпозиция длительных задач

### Project 14 — долгую задачу сначала декомпозировать и показать разбиение
**Решение: KEEP-PROJECT.**

User draft не устанавливает такой workflow для всех задач.

### Project 15 — после каждой подзадачи сообщить результат и STOP до явной команды
**Решение: KEEP-PROJECT.**

User 42 определяет семантику команды «...», но не создаёт обязательный project checkpoint после каждой подзадачи.

### Project 16 — не дробить атомарные операции
**Решение: KEEP-PROJECT.**

Отдельный workflow guard, аналога в User draft нет.

## Риски

### Project 17 — до pre-release: простота/скорость/обратимость, без сложности ради гипотетических рисков
**Решение: KEEP-PROJECT.**

Прямая stage-specific стратегия Vico.

### Project 18 — с pre-release учитывать реальные эксплуатационные риски и цену ошибки
**Решение: KEEP-PROJECT.**

Прямая stage-specific стратегия Vico.

## Ненумерованные правила после Risk section

### «Всегда рассуждай от цели — не делай выводов и не действуй, пока не понимаешь, зачем это нужно»
**Решение: DELETE-SAFE.**

User draft уже задаёт более точную систему:
- User 19 — установить актуальную цель и не подменять её локальной подцелью;
- User 22 — self-chosen action должен приближать актуальную цель и быть допустимым;
- User 26 + 39 — прямое однозначное поручение не подменяется предполагаемой общей целью и выполняется без лишних вопросов.

Project-фраза не добавляет отдельного Project-specific механизма и в своей абсолютной форме даже менее точна, чем новая User-система.

### «Перед ответом проверь, не упустила ли очевидное из уже сказанного/происходящего; не принимай первую трактовку автоматически»
**Решение: PARTIAL-DUPLICATE.**

Две части:
1. **KEEP-смысл:** перед ответом проверить, не упущено ли очевидное из текущего project context — отдельный project emphasis, полного аналога в User draft нет.
2. **DELETE-смысл:** «не отвечай автоматически по первой трактовке; сопоставь с контекстом» уже полностью покрыт User 20.

Следовательно, весь абзац удалять нельзя, но его можно позже сократить до первой, неповторяющейся части.

## Имена ИИ-агентов

### Таблица имён Лира / Мира / Ари / Марк / Лёва + требование использовать эти имена
**Решение: KEEP-PROJECT.**

Это project-specific nomenclature.

## Итог классификации

### DELETE-SAFE из Project layer
1. Project 10.
2. Ненумерованное правило «Всегда рассуждай от цели…».

### PARTIAL-DUPLICATE
1. Ненумерованное правило «Перед ответом…»:
   - сохранить project-context check;
   - убрать duplicate про первую трактовку, уже покрытый User 20.

### KEEP-PROJECT
- верхнеуровневый priority statement;
- Project 1–9;
- Project 11–18;
- project-context часть ненумерованного «Перед ответом…»;
- блок имён ИИ-агентов.

## Количественный результат

Из 18 нумерованных Project rules:
- 17 KEEP-PROJECT;
- 1 DELETE-SAFE (№10).

Дополнительно:
- 1 ненумерованное общее правило DELETE-SAFE;
- 1 ненумерованный абзац PARTIAL-DUPLICATE;
- agent-name block KEEP-PROJECT.

На этом этапе `PROJECT_INSTRUCTIONS.draft.md` не изменён.
