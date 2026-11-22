# Финальная трёхслойная consistency-проверка

Проверены exact current/draft источники:
- `USER_INSTRUCTIONS.current.md` ↔ `USER_INSTRUCTIONS.draft.md`;
- `PROJECT_INSTRUCTIONS.current.md` ↔ `PROJECT_INSTRUCTIONS.draft.md`;
- `AGENTS.current.md` ↔ `AGENTS.draft.md`.

На этом этапе drafts **не изменяются**.

## 1. User layer

Предыдущая exact coverage-проверка подтверждена актуальными файлами:
- current rules: 15;
- draft rules: 42;
- FULL: 15/15;
- PARTIAL: 0;
- LOST: 0.

Новых изменений User draft после coverage-recheck не было.

**Вердикт: PASS.**

## 2. Project layer

Current → draft:
- numbered rules: 18 → 16;
- current Project 10 покрыт User 2 + 7;
- current Project 3 покрыт AGENTS Review 5/7;
- goal/interpretation duplicates вынесены в User;
- name/model mapping вынесен в AGENTS Roles;
- project-only usage rule для имён сохранён.

Проверено, что AGENTS draft по-прежнему содержит:
- Stage/future finding classification;
- ограничение исправлений current-task/blocking defects;
- Roles mapping name → model.

**Вердикт: PASS при сохранении этих AGENTS guards.**

## 3. Межслойные authority/routing проверки

### User 30 ↔ AGENTS Review 6
User 30 разрешает самостоятельно выбирать между несущественно различающимися вариантами только если право выбора не закреплено за пользователем/другой ролью.

AGENTS Review 6 закрепляет выбор между несколькими технически допустимыми вариантами в review-dispute context за разработчиком.

**Противоречия нет:** User 30 явно уступает установленному decision owner.

### Project 8 ↔ AGENTS Review 6
Project 8 запрещает диктовать Codex способ реализации без необходимости и разрешает ему самостоятельно выбрать технически корректное решение в обычной постановке задачи.

AGENTS Review 6 действует внутри review при расходящихся findings и закрепляет за разработчиком выбор между несколькими допустимыми вариантами.

**Противоречия нет:** области действия различаются — normal task design vs disputed review choice.

### Project 13 ↔ AGENTS «Действие разработчика» 2
Project 13 требует STOP после завершённой подзадачи до явной команды пользователя.

AGENTS Developer Action 2 требует сначала выполнить следующий очевидный шаг, если он доступен агенту.

**Противоречия нет:** Project 13 делает следующую подзадачу недоступной до explicit continue; User 42 определяет `...` как такую команду продолжения.

### User 23 ↔ AGENTS Roles
User 23 задаёт общий guard полномочий; AGENTS Roles задаёт конкретных владельцев решений.

**Это намеренная специализация, не дубль для удаления.**

## 4. Оставшиеся межслойные повторы

DELETE-SAFE межслойных authority/routing дублей больше не найдено.

Оставшиеся совпадения намеренны из-за разных аудиторий:
- User layer действует глобально для ChatGPT;
- AGENTS — repository-visible shared contract для ChatGPT и Codex;
- Project layer содержит Vico-specific ChatGPT routing и prompt construction.

Поэтому, например, User recheck/logic guards нельзя использовать как замену AGENTS guards для Codex.

## 5. Найденные semantic regressions в AGENTS wording-pass

### Finding A — Principle 4: optional → prohibition

Current:
> «Не требуется исследовать все функции инструмента без связи с текущей задачей.»

Draft:
> «не исследуй функции инструмента без связи с текущей задачей.»

Изменение:
- current говорит, что exhaustive unrelated exploration **не обязательно**;
- draft вводит прямой **запрет**.

Это меняет нормативную силу правила.

**Статус: REAL REGRESSION.**

### Finding B — Diagnosis 1: расширение exemption

Current:
> «Для новой функциональности и заранее обоснованной foundation-работы симптом или причинная цепочка не требуются…»

Draft:
> «Для новой функциональности и заранее обоснованной foundation-работы это не требуется…»

В draft местоимение «это» грамматически может относиться ко всему предыдущему диагностическому набору, включая **ожидаемое поведение**, тогда как current освобождает только от требования symptom/causal-chain.

Это может ослабить обязательную постановку expected behavior для новой функциональности.

**Статус: REAL REGRESSION / scope ambiguity.**

### Finding C — General 6: history authority broadened

Current:
> «История не является source of truth для текущего поведения…»

Draft:
> «история не source of truth…»

Current запрещает использовать history как authority именно для **current behavior**.

Draft можно прочитать как запрет считать history source of truth вообще, включая исторические факты/snapshots, для которых она и предназначена.

**Статус: REAL REGRESSION.**

## 6. Исправление предыдущего вывода

Предыдущий файл `research/agents-58-wording-semantic-diff.md` утверждал, что все 19 wording reductions сохраняют semantic guards.

Финальная трёхслойная сверка показала, что это утверждение было слишком сильным:
- 16 из 19 сокращений не дали найденной semantic regression;
- 3 из 19 требуют исправления;
- поэтому текущий AGENTS draft пока нельзя считать полностью semantic-equivalent current.

## 7. Итоговый статус трёх drafts

1. User draft — **PASS**.
2. Project draft — **PASS**.
3. AGENTS draft — **BLOCKED: 3 локальные wording-regressions**.
4. Подтверждённых межслойных противоречий — **0**.
5. Новых DELETE-SAFE authority/routing дублей — **0**.
6. До фиксации итогового набора нужно исправить только Findings A–C и повторить consistency-check.

## 8. Границы следующего исправления

Следующее изменение должно затронуть только:
1. `AGENTS → Принципы работы агентов / 4`;
2. `AGENTS → Диагностика перед выбором решения / 1`;
3. `AGENTS → Общие правила / 6`.

User и Project drafts менять оснований нет.
