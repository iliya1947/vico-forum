# Three-layer consistency recheck — User 35-rule exact blob

## Exact sources

Проверены:

1. `USER_INSTRUCTIONS.draft.md`
   - blob `ef1c0efd10d2e95a5481476d91b336884d7d9c61`
   - 35 rules / 4999 chars
   - 15/15 current FULL
   - 52/52 retained guards
   - executability stress 17/17 EXEC PASS

2. `PROJECT_INSTRUCTIONS.draft.md`
   - blob `fd8153931a306eb7e7c65a0e14db28dc20b437fe`
   - 16 numbered rules

3. `AGENTS.draft.md`
   - blob `170ef5ed10715e416a376c75c3dae188ae0a3d24`
   - 58 numbered rules

4. Актуальный repository baseline:
   - `main` @ `9cff976a9621d9fe5dfef28ea5367e390ff435b1`
   - `main:AGENTS.md` blob `9037fc15fd2b5fbf8c86ee677d00198dfcfbe442`
   - baseline не изменился относительно предыдущей consistency-проверки.

Критерии сохранены от `research/three-layer-final-consistency.md`: semantic loss, authority/routing conflicts, scope/permission conflicts, recheck semantics, developer-action routing, Project pause semantics, intentional vs DELETE-SAFE duplication.

## 1. User layer

Новая атомизация не меняет semantic set:
- current coverage: **15/15 FULL**;
- retained expanded guards: **52/52**;
- stress executability: **17/17 EXEC PASS**;
- missing guards: **0**.

Опорные проверки:
- `research/user-35-redesign-preservation-check.md`;
- `research/user-35-executability-stress-recheck.md`.

**Вердикт: PASS.**

## 2. Project dependencies after User atomization

### Удалённый current Project generic noise guard

Project-specific prompt rules 4–11 остаются совместимы с User 2:
- User 2 запрещает ненужные и **неустановленные** constraints/rules/permissions;
- Project 4–11 сами являются установленными Vico-specific правилами.

**Конфликта нет.**

### Goal / interpretation guards removed from Project

Их universal coverage после atomization сохранена:
- цель и запрет локальной подмены → User 15;
- material interpretation alternatives → User 16;
- material alternatives/consequences → User 17;
- self-action scope/permission gate → User 18.

Project не нуждается в возврате generic goal rules.

**PASS.**

### Project Stage/future-work classification

Удалённый из Project draft current rule 3 по-прежнему покрывается AGENTS Review 5/7:
- finding классифицируется current task / current Stage / future;
- future groundwork само по себе не расширяет текущую реализацию;
- исправляются current-task и только blocking external defects.

User atomization этого contract не затрагивает.

**PASS.**

### Agent name/model mapping

Project хранит только требование использовать имена из AGENTS Roles; mapping остаётся в AGENTS.

**PASS.**

## 3. AGENTS dependencies after User atomization

AGENTS draft не менялся после предыдущего PASS. User split не создаёт основания удалять shared AGENTS generic logic:
- User действует как global ChatGPT layer;
- AGENTS остаётся repository contract для ChatGPT + Codex.

Намеренные audience-specialized повторы сохраняются.

**Вердикт: PASS.**

## 4. Authority / routing intersections

### User 2 ↔ Project prompt rules 4–11

User запрещает ненужные/неустановленные constraints; Project устанавливает конкретные project constraints для Codex prompts.

**Совместимо.**

### User 9 ↔ AGENTS Diagnosis 5

User: standard/default/recommended path не становится обязательным.
AGENTS: до workaround проверить возможность восстановления штатного пути.

AGENTS требует **проверить**, а не обязательно выбрать штатный путь.

**Совместимо.**

### User 18 ↔ AGENTS Roles / Review

User self-action gate требует фактического основания, связи с целью, scope и permission.
AGENTS конкретизирует роли, owners и допустимые project actions.

**Совместимо: generic admissibility + project-specific authority.**

### User 19–20 ↔ AGENTS Roles / Review 6 / production gates

User отдельно фиксирует:
- knowledge/work/technical ability ≠ authority;
- permission/exception действует только в границах.

AGENTS задаёт конкретных decision owners и explicit gates.

**Совместимо.**

### User 22 ↔ AGENTS Principle 5 / Review 3

User revalidation: подтверждённое перепроверяется только при новом основании.
AGENTS конкретизирует такими основаниями изменение exact head/external state/критичность старого вывода.

**Совместимо; AGENTS не ослабляет threshold.**

### User 23–26 ↔ AGENTS General 4 / Review 6 / Developer Action 2

User:
- не спрашивать доступно устанавливаемое;
- продолжать при immaterial uncertainty;
- спрашивать при material unresolved choice;
- прекращать анализ при достаточности данных.

AGENTS:
- developer принимает установленные спорные/material choices;
- доступную проверку и действие агент не перекладывает;
- source-of-truth conflict не разрешается агентом самовольно.

**Совместимо:** AGENTS случаи именно material/owned decisions; User 25 сохраняет этот ask boundary.

### User 26 ↔ Project 13

Потенциальная формальная коллизия:
- User 26: при достаточности данных прекратить проверку и действовать;
- Project 13: после завершения отдельной подзадачи остановиться до явной команды на следующую.

Фактического конфликта нет:
- User 26 — stop condition **внутри текущего допустимого действия**;
- User 18 требует, чтобы self-action был в scope и разрешён;
- User 20 ограничивает permission установленными границами;
- Project 13 устанавливает boundary: следующая подзадача ещё не разрешена.

Следовательно, User 26 не создаёт permission перескочить boundary Project 13.

**PASS.**

### User 32 ↔ AGENTS Diagnosis 4 / Developer Action 2

Все требуют сначала выполнить доступную агенту диагностику/действие, а не использовать разработчика как диагностический инструмент.

**Намеренная specialization, не конфликт.**

### User 33 ↔ Project 13

User 33 требует выполнять однозначное поручение в установленных границах.
Project 13 после завершённой подзадачи требует явной команды для следующей.

После завершения подзадачи нового поручения на следующую нет, следовательно User 33 не требует продолжения сам по себе.

**Совместимо.**

### User 35 ↔ Project 13

User 35 определяет `...` как явную команду продолжить следующий очевидный шаг, без расширения scope/permissions.

Это именно explicit continue, требуемый Project 13.

**Совместимо.**

## 5. Duplication check

1. Новых DELETE-SAFE межслойных дублей из-за atomization не появилось.
2. Atomization только разделила universal guards внутри User layer.
3. Оставшиеся похожие формулировки сохраняются по разным аудиториям/специализациям:
   - User — global ChatGPT behavior;
   - Project — Vico-specific ChatGPT orchestration;
   - AGENTS — shared repository contract для ChatGPT + Codex.

## 6. Итог

1. User exact blob `ef1c0efd...` — **PASS**.
2. Project exact blob `fd815393...` — **PASS**.
3. AGENTS exact blob `170ef5ed...` — **PASS**.
4. User current coverage — **15/15 FULL**.
5. Expanded User coverage — **52/52**.
6. User executability stress — **17/17 EXEC PASS**.
7. Подтверждённых межслойных противоречий — **0**.
8. Новых DELETE-SAFE межслойных дублей — **0**.
9. Lost guards — **0**.
10. Three-layer consistency blockers — **0**.

**Three-layer consistency: PASS.**

Следующий отдельный gate — обновить transfer-readiness для этих exact blobs. Реальные instruction sources на этом этапе не изменяются.
