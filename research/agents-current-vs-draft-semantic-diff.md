# AGENTS current → draft semantic diff

Сравниваются:
- `AGENTS.current.md` — exact snapshot актуального `main:AGENTS.md`;
- `AGENTS.draft.md` — draft после 5 structural merges и 2 reference-dedupe.

## 1. Границы изменения

Изменены только разделы:
1. `Масштаб исправления`;
2. `Рабочий процесс`;
3. `Общие правила`;
4. `Запуск PR-тестов`;
5. `Полный аудит документации`.

Без изменений остались:
- `Логика`;
- `Роли`;
- `Принципы работы агентов`;
- `Диагностика перед выбором решения`;
- `Действие разработчика`;
- `Проверка PR`.

## 2. Structural merges

### Масштаб исправления 1 + 2
Current rules 1 и 2 объединены в один пункт дословным последовательным соединением.

Сохранены:
- comparable working baseline;
- local fix / rollback first;
- запрет расширять механизм, если локального исправления достаточно;
- расширение scope только при подтверждённой необходимости;
- отдельное обоснование workaround.

Current rule 3 сохранён отдельно как draft rule 2.

**Coverage: FULL.**

### Рабочий процесс 4 + 5
Current rules 4 и 5 объединены в draft rule 4.

Сохранены:
- отдельный implementation PR на bounded implementation stage;
- только изменения этапа + относящиеся CI/checks;
- implementation PR не является каналом общения;
- документация идёт отдельным PR в конце задачи и не включается в implementation PR.

**Coverage: FULL.**

### Общие правила 6 + 7 + 8
Current rules 6–8 объединены в draft rule 6.

Сохранены три назначения:
- current factual project state → `PROJECT_STATE.md`;
- completed implementation/CI/review history → `docs/PROJECT_HISTORY/`;
- permanent product/architecture/operations contracts → профильные source-of-truth документы.

Также сохранены:
- ограничения содержимого `PROJECT_STATE.md`;
- запрет заранее фиксировать незавершённые CI/acceptance/external verification;
- `PROJECT_HISTORY.md` как навигационный индекс;
- history не является source of truth для current behavior;
- history читается только при необходимости исторического контекста.

**Coverage: FULL.**

### Запуск PR-тестов 2 + 3
Current rules 2 и 3 объединены в draft rule 2 дословным последовательным соединением.

Сохранены:
- `run:ci`;
- `run:acceptance`;
- path-filter semantics;
- one-shot semantics labels;
- снятие label управляющим workflow;
- повторное добавление label для нового exact head.

**Coverage: FULL.**

### Полный аудит документации 2 + 3
Current rules 2 и 3 объединены в draft rule 2 дословным последовательным соединением.

Сохранены:
- полное чтение каждого документа заявленного scope;
- запрет называть аудит полным, если scope проверен не полностью.

**Coverage: FULL.**

## 3. Reference-dedupe

### Рабочий процесс / stacked mode
Current Workflow 7 повторно описывал checkpoint/review sequence.

Draft Workflow 6 сохраняет уникальную topology:
- первый implementation PR от `main`;
- каждый следующий base на head предыдущей ступени;
- bounded diff каждой ступени;
- синхронизация верхних ступеней после изменения нижней;
- перенос итогового head в ветку первого PR;
- закрытие промежуточных PR как superseded;
- merge в `main` выполняет разработчик.

Повторные детали проверки заменены ссылкой на канонический раздел `Проверка PR`:
- intermediate coordinator checkpoint уже полностью определён Review 2;
- final full review cycle уже полностью определён Review 1 и общими exact-head правилами раздела.

**Coverage: FULL.**

### Общие правила / documentation PR lifecycle
Current General 6 повторял lifecycle документационного PR: отдельный PR в конце задачи.

Draft General 6 ссылается на правило раздела `Рабочий процесс`, где этот lifecycle сохранён в объединённом Workflow rule 4.

Содержимое и routing `PROJECT_STATE.md` / history / permanent contracts остаются локально явными.

**Coverage: FULL.**

## 4. Количественный diff

- Current numbered rules: 64.
- Draft numbered rules: 58.
- Разница: -6 numbered rules.
- Current volume: 2209 whitespace words.
- Draft volume: 2179 whitespace words.
- Разница: -30 слов.

Число уменьшилось только за счёт structural merge; целые semantic guards не удалялись.

## 5. Проверка потерь

1. Изменены только 5 заранее классифицированных разделов.
2. 6 остальных разделов совпадают с current.
3. DELETE-SAFE whole rules на этом этапе: 0.
4. Все 5 merge-групп сохраняют исходные условия явно.
5. Оба reference-dedupe сохраняют единственное каноническое определение процесса в другом разделе того же AGENTS.
6. Потерянных установленных semantic guards: **0**.

## 6. Итог

Текущий `AGENTS.draft.md` сохраняет semantic coverage `AGENTS.current.md`, сокращая структурное повторение:
- 64 → 58 numbered rules;
- duplicated workflow text заменён внутренними ссылками;
- shared-agent contracts и Codex-visible guards сохранены.

Следующий отдельный этап — проверить локальное сокращение формулировок внутри 58-rule AGENTS draft. Сначала только карта safe wording reductions, без изменения draft.
