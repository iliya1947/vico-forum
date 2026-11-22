# Финальная трёхслойная consistency-проверка

Проверены exact current/draft источники:
- `USER_INSTRUCTIONS.current.md` ↔ `USER_INSTRUCTIONS.draft.md`;
- `PROJECT_INSTRUCTIONS.current.md` ↔ `PROJECT_INSTRUCTIONS.draft.md`;
- `AGENTS.current.md` ↔ `AGENTS.draft.md`.

## 1. User layer

1. Current rules: 15.
2. Draft rules: 42.
3. Current coverage: 15/15 FULL.
4. PARTIAL: 0.
5. LOST: 0.

**Вердикт: PASS.**

## 2. Project layer

1. Current numbered rules: 18.
2. Draft numbered rules: 16.
3. Removed current Project 10 покрыт User 2 + 7.
4. Removed current Project 3 покрыт AGENTS Review 5/7.
5. Goal/interpretation duplicates вынесены в User.
6. Name/model mapping вынесен в AGENTS Roles; project-only requirement использовать закреплённые имена сохранён.
7. Все уникальные project-specific guards сохранены.

**Вердикт: PASS.**

## 3. AGENTS layer

1. Current numbered rules: 64.
2. Draft numbered rules: 58.
3. Structural dedupe: 5 safe merges + 2 internal reference-dedupe.
4. Wording pass: 16 подтверждённых reductions.
5. Три найденных wording-regressions исправлены commit `475a1ecabf31d07a4d93dc1fb3b96575d799a1fd`:
   - Principle 4 — восстановлена non-requirement модальность;
   - Diagnosis 1 — восстановлен узкий scope exemption;
   - General 6 — восстановлено ограничение history authority именно для current behavior.
6. Финальный объём: 2209 → 2017 whitespace words.

**Вердикт: PASS.**

## 4. Межслойная consistency

Проверены основные authority/routing intersections:

1. User 30 ↔ AGENTS Review 6 — совместимы: общий self-choice guard уступает установленному decision owner.
2. Project 8 ↔ AGENTS Review 6 — совместимы: normal Codex design choice не равен disputed review choice.
3. Project 13 ↔ AGENTS Developer Action 2 — совместимы: Project STOP делает следующий этап недоступным до explicit continue; User 42 определяет `...` как такую команду.
4. User 23 ↔ AGENTS Roles — generic authority guard + конкретная project authority model.
5. Project 2 обеспечивает обязательное чтение актуального AGENTS, поэтому вынесенные туда Stage classification и name/model mapping остаются применимыми.

Подтверждённых межслойных противоречий: **0**.

## 5. Оставшиеся дубли

Новых DELETE-SAFE authority/routing дублей после финальной сверки не найдено.

Оставшиеся похожие guards сохраняются намеренно из-за разных аудиторий и стадий:
- User — глобальный ChatGPT layer;
- Project — Vico-specific ChatGPT layer;
- AGENTS — repository-visible shared contract для ChatGPT и Codex.

## 6. Итог

1. User draft — **PASS**.
2. Project draft — **PASS**.
3. AGENTS draft — **PASS**.
4. Подтверждённых межслойных противоречий — **0**.
5. Потерянных current guards в проверенных преобразованиях — **0**.
6. Блокеров по consistency — **0**.

Три draft-файла готовы к следующему отдельному этапу — итоговой фиксации/подготовке к переносу в реальные instruction sources.
