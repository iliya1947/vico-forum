# Transfer readiness — final exact drafts

Проверены актуальные exact drafts:

1. `USER_INSTRUCTIONS.draft.md`
   - blob: `f042613fa65d2484895c5bf3f9e427d5fb3b27cc`
   - 20 numbered rules
   - 523 whitespace words
   - 4999 characters
   - current coverage: 15/15 FULL
   - expanded retained guards: 52/52

2. `PROJECT_INSTRUCTIONS.draft.md`
   - blob: `fd8153931a306eb7e7c65a0e14db28dc20b437fe`
   - 16 numbered rules
   - 347 whitespace words
   - 2713 characters
   - current Project baseline: 3341 characters

3. `AGENTS.draft.md`
   - blob: `170ef5ed10715e416a376c75c3dae188ae0a3d24`
   - 58 numbered rules
   - 2017 whitespace words
   - 16186 characters

Three-layer consistency after compact User rewrite: PASS.

## 1. Global Custom Instructions

Актуальный OpenAI Help Center:
- Web/Desktop route: `Settings → Personalization → Custom Instructions`;
- изменения применяются сразу ко всем чатам;
- Plus/Pro/Enterprise/Business/Education limit: **5000 characters**.

User draft: **4999 characters**.

**Вердикт: READY.**

## 2. Project Instructions

Актуальный OpenAI Help Center:
- route: `Project → ••• → Project settings → instructions`;
- Project Instructions действуют только в проекте;
- OpenAI формулирует их как overriding global Custom Instructions внутри проекта.

Для Plus/Pro Help Center одновременно говорит, что global Custom Instructions применяются ко всем чатам; явное `only project instructions` отдельно указано для Enterprise/Edu. Поэтому для текущей Plus-конфигурации безопасная трактовка — Project Instructions имеют приоритет при конфликте.

Наша three-layer consistency-проверка подтверждает **0 конфликтов** между compact User и Project draft.

Точный официальный character limit поля Project Instructions в найденной документации не указан.

Практическая вместимость установлена без предположения о лимите:
- текущий Project current: **3341 characters**;
- draft: **2713 characters**.

То есть draft короче уже действующего Project instruction set.

**Вердикт: READY.**

## 3. AGENTS.md

`AGENTS.draft.md` должен переноситься в repository `main:AGENTS.md`.

Рабочий PR #368:
- аналитический draft workspace;
- не предназначен для merge.

Следовательно, финальный AGENTS переносится отдельным обычным repository change/PR от актуального `main`, с действующим review/merge process.

**Вердикт: READY FOR SEPARATE REPO PR.**

## 4. Безопасный порядок переноса

### 1. User layer
Сначала заменить global Custom Instructions на compact User draft.

Почему первым:
- Project draft уже не повторяет часть generic guards;
- обновление global Custom Instructions применяется сразу;
- это создаёт финальный global baseline до изменения project-specific слоя.

### 2. AGENTS layer
Затем отдельным mergeable PR перенести `AGENTS.draft.md` в `main:AGENTS.md`.

Почему вторым:
- Project draft ссылается на актуальный AGENTS для Stage classification и agent-name mapping;
- до переключения Project layer финальный shared repository contract должен уже быть в `main`.

### 3. Project layer
Последним заменить Project Instructions на `PROJECT_INSTRUCTIONS.draft.md`.

Почему последним:
- все generic/shared guards, на которые он опирается, уже будут фактически установлены;
- Project Instructions имеют приоритет над global Custom Instructions при конфликте, а consistency-check подтвердил 0 конфликтов.

## 5. Итог

1. User transfer readiness — **PASS**.
2. Project transfer readiness — **PASS**.
3. AGENTS transfer readiness — **PASS**, через отдельный repo PR.
4. Three-layer consistency — **PASS**.
5. Character-limit blockers — **0**.
6. Semantic blockers — **0**.
7. Реальные instruction sources пока не изменены.

Следующий отдельный этап — подготовить фактический transfer package/порядок действий для трёх источников; изменение реальных sources выполнять только по прямой команде разработчика.
