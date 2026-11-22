# Финальная трёхслойная consistency-проверка — compact User

Проверены exact источники:
- `USER_INSTRUCTIONS.current.md` ↔ compact `USER_INSTRUCTIONS.draft.md`;
- `PROJECT_INSTRUCTIONS.draft.md`;
- `AGENTS.draft.md`;
- актуальный `main:AGENTS.md` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1` полностью перечитан.

Draft-файлы на этом этапе не изменялись.

## 1. User layer

1. Current rules: 15.
2. Compact draft: 20 rules / 4999 characters.
3. Current coverage: **15/15 FULL**.
4. Expanded retained guards: **52/52**.
5. PARTIAL: 0.
6. LOST: 0.

Опорные проверки:
- current → compact: `research/user-current-vs-compact-coverage.md`;
- 52 retained guards → compact: `research/user-5000-semantic-coverage.md`.

**Вердикт: PASS.**

## 2. Project layer после compact User rewrite

Project draft: 16 numbered rules.

Проверены зависимости от вынесенных guards:

1. Удалённый current Project 10 остаётся покрыт compact User 2:
   - ненужные инструкции/действия/шаги запрещены;
   - неустановленные условия/правила/запреты/разрешения/полномочия запрещены.

2. Удалённый current Project 3 остаётся покрыт AGENTS Review 5/7:
   - finding классифицируется current task / current Stage / future work;
   - future groundwork сам по себе не основание менять текущую реализацию;
   - исправляются только current-task и blocking external defects.

3. Name/model mapping по-прежнему находится в AGENTS Roles; Project сохраняет только project-only требование использовать закреплённые имена.

4. Goal/interpretation guards, вынесенные из Project, остаются в compact User:
   - цель/смысл и запрет подмены — compact 9;
   - materially relevant interpretation alternatives — compact 9;
   - action/scope/permission — compact 10.

**Вердикт: PASS.**

## 3. AGENTS layer

AGENTS draft не менялся после предыдущего PASS:
- current: 64 numbered rules;
- draft: 58 numbered rules;
- 5 structural merges + 2 reference-dedupe;
- 16 подтверждённых wording reductions;
- три ранее найденных wording-regressions исправлены.

Проверено, что compact User не требует удаления shared AGENTS guards: User layer доступен ChatGPT, но AGENTS остаётся repository-visible contract для ChatGPT + Codex.

**Вердикт: PASS.**

## 4. Межслойные authority/routing intersections

### Compact User 2 ↔ Project prompt rules
User запрещает ненужные и неустановленные constraints; Project 4–11 задаёт установленные Vico-specific правила формирования Codex prompt.

**Противоречия нет:** Project rules являются установленным контекстом, а User 2 запрещает только ненужное/неустановленное.

### Compact User 6 ↔ AGENTS Diagnosis 5
User: `standard path ≠ обязательно`.
AGENTS: перед workaround проверить возможность восстановления штатного пути.

**Противоречия нет:** AGENTS требует проверить normal path, а не обязательно выбрать его.

### Compact User 10 ↔ AGENTS Roles / Review 6
User запрещает выводить полномочие из знания/работы/технической возможности и требует не подменять decision owner.
AGENTS задаёт конкретных owners и review authority.

**Совместимо:** generic authority guard + project-specific owner model.

### Compact User 12 ↔ AGENTS Principle 5 / Review 3
User задаёт общий threshold повторной проверки.
AGENTS Principle 5 и Review 3 добавляют exact-head/external-state специализацию.

**Совместимо:** AGENTS не ослабляет User threshold, а конкретизирует его для repo workflow.

### Compact User 13 ↔ AGENTS General 4 / Review 6
User разрешает самостоятельный выбор только при несущественных различиях и отсутствии закреплённого owner.
AGENTS требует передать developer выбор при противоречии source-of-truth или между несколькими допустимыми review-вариантами.

**Совместимо:** в AGENTS случаях owner/материальный выбор установлен.

### Compact User 17 ↔ AGENTS Diagnosis 4 / Developer Action 2
Все три запрещают перекладывать доступную агенту проверку/действие на разработчика.

**Это намеренная shared specialization, не конфликт.**

### Compact User 18 ↔ Project 13
User 18 выполняет текущее однозначное поручение без лишних вопросов.
Project 13 после завершённой подзадачи требует отдельной явной команды для следующей.

**Противоречия нет:** после завершения подзадачи нового поручения на следующую нет; compact User 20 определяет `...` как явную команду продолжения.

### Compact User 20 ↔ Project 13
`...` = продолжить следующий очевидный шаг без запроса подтверждения; scope/permissions не расширяются.

**Совместимо:** это ровно explicit continue, требуемый Project 13.

## 5. Оставшиеся дубли

1. Новых DELETE-SAFE межслойных authority/routing дублей после compact rewrite не найдено.
2. Оставшиеся похожие guards сохраняются намеренно из-за разных аудиторий:
   - User — global ChatGPT behavior;
   - Project — Vico-specific ChatGPT routing/prompt rules;
   - AGENTS — shared repository contract для ChatGPT и Codex.

## 6. Итог

1. Compact User draft — **PASS**.
2. Project draft — **PASS**.
3. AGENTS draft — **PASS**.
4. User current coverage — **15/15 FULL**.
5. Expanded User coverage — **52/52**.
6. Подтверждённых межслойных противоречий — **0**.
7. Новых DELETE-SAFE authority/routing дублей — **0**.
8. Потерянных guards из-за compact User rewrite — **0**.
9. Consistency blockers — **0**.

Три draft-файла готовы к отдельному transfer-readiness этапу.
