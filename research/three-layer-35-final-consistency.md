# Three-layer consistency — User 35-rule exact blob

## Exact sources

Проверены:

1. `USER_INSTRUCTIONS.draft.md`
   - blob `ef1c0efd10d2e95a5481476d91b336884d7d9c61`
   - 35 rules / 4999 chars
   - 15/15 current FULL
   - 52/52 retained semantic guards
   - executability stress: 17/17 EXEC PASS

2. `PROJECT_INSTRUCTIONS.draft.md`
   - blob `fd8153931a306eb7e7c65a0e14db28dc20b437fe`
   - 16 numbered rules

3. `AGENTS.draft.md`
   - blob `170ef5ed10715e416a376c75c3dae188ae0a3d24`
   - 58 numbered rules

Проверка относится только к этим exact blobs.

## 1. User ↔ Project

### User 2 ↔ Project prompt constraints
User запрещает ненужные и неустановленные условия/правила/запреты/разрешения/полномочия.

Project 4–11 задаёт установленные Vico-specific правила формирования задач Codex.

Вердикт: **PASS**. Project rules являются установленным project-context, а User 2 запрещает лишь неустановленное/ненужное.

### User 15–17 ↔ Project context checking
User отдельно задаёт:
- установление текущей цели;
- проверку material interpretations;
- material alternatives/consequences.

Project сохраняет только Vico-specific orchestration и не дублирует эти generic guards.

Вердикт: **PASS**.

### User 21/33 ↔ Project 13
User 21: прямое однозначное поручение задаёт текущее действие.
User 33: однозначное in-scope поручение выполняется без лишних вопросов.

Project 13: после завершения отдельной подзадачи переход к следующей требует явной команды пользователя.

Вердикт: **PASS**. После завершения подзадачи нового поручения нет, пока пользователь его не дал.

### User 35 ↔ Project 13
User 35: `...` = явная команда продолжить следующий очевидный шаг текущей задачи; scope/permissions не расширяются.

Вердикт: **PASS**. `...` удовлетворяет requirement Project 13 о явной команде продолжения.

## 2. User ↔ AGENTS

### User 15–17 ↔ AGENTS Logic 1/3
Оба слоя требуют goal/context/material alternatives checks.

Вердикт: **intentional audience overlap / PASS**.
- User layer нужен global ChatGPT behavior;
- AGENTS нужен shared ChatGPT + Codex repository contract.

Удалять AGENTS Logic нельзя без потери Codex coverage.

### User 18 ↔ AGENTS Roles / Workflow / General
User 18 разрешает self-action только при evidence/goal/scope/permission/adverse-consequence gate.

AGENTS конкретизирует project permissions и owner boundaries.

Вердикт: **PASS**. Generic admissibility gate не создаёт project permission.

### User 19 ↔ AGENTS Roles / Review 6
User отдельно говорит: знание/работа/проверка/техвозможность не создают decision authority; установленного владельца решения нельзя подменять.

AGENTS:
- developer — owner product/disputed decisions and merge;
- Codex-6.1 Sol решает technical-plan questions;
- developer выбирает между несколькими technically admissible variants.

Вердикт: **PASS**. User guard усиливает соблюдение AGENTS owner model и не конфликтует с ним.

### User 20 ↔ AGENTS explicit permission gates
User 20 ограничивает permission/prohibition/exception явными границами и запрещает превращать разовое исключение в precedent.

AGENTS отдельно требует явное разрешение на production/deployment/secret/paid/irreversible actions.

Вердикт: **PASS**. Project-specific gates являются явными границами, а не конфликтом.

### User 22 ↔ AGENTS Principle 5 / Review 3
User 22 разрешает recheck только при новом основании: изменение данных/источника/состояния, contradiction, insufficient previous check или mutable external state.

AGENTS Principle 5/Review 3 конкретизируют exact-head и mutable external environment.

Вердикт: **PASS**. AGENTS specialization не ослабляет User threshold.

### User 23/32 ↔ AGENTS Diagnosis 4 / Developer Action 2
User запрещает спрашивать то, что можно надёжно установить самостоятельно, и требует сделать доступную диагностику до действия пользователю.

AGENTS требует выполнить доступные разрешённые проверки до привлечения разработчика и сначала выполнить доступный следующий шаг.

Вердикт: **PASS / intentional specialization**.

### User 24–26 ↔ AGENTS Diagnosis 3
User:
- immaterial uncertainty не останавливает работу;
- materially distinct unresolved choice может требовать пользователя;
- при достаточности данных нужно остановить проверку и действовать.

AGENTS Diagnosis 3: переходить к исправлению, когда данных достаточно и остаточная uncertainty не меняет решение.

Вердикт: **PASS**.

### User 11 ↔ AGENTS Review 8
User readiness: только по установленным проверенным критериям.

AGENTS Review 8 определяет concrete project completion criterion для PR review cycle.

Вердикт: **PASS**.

### User 13 ↔ AGENTS exact-head semantics
User: material fact/state change invalidates only dependent conclusions/decisions/checks.

AGENTS Review 3: implementation change requires new relevant review; non-implementation service/doc changes that do not alter implementation/requirements do not.

Вердикт: **PASS**. Это точная project specialization принципа dependency-limited invalidation.

## 3. Project ↔ AGENTS

Новый User split не изменяет прежние Project↔AGENTS зависимости:

1. Project 2 по-прежнему bootstrap’ит актуальный `main:AGENTS.md`.
2. Name/model mapping остаётся в AGENTS Roles.
3. Stage/future-work classification остаётся в AGENTS Review.
4. Project Codex prompt rules не дублируют repository workflow.
5. Long-task decomposition Project 12–14 остаётся ChatGPT interaction rule, а AGENTS задаёт repository bounded workflow.

Вердикт: **PASS**.

## 4. Cross-layer permission / authority / continuation matrix

### Permission
- User 18: self-action требует permission.
- User 20: permission действует только в установленных границах.
- User 35: `...` не расширяет permission.
- AGENTS production gates остаются explicit.

**PASS.**

### Authority
- User 19 запрещает выводить authority из capability/knowledge/work.
- AGENTS явно задаёт decision owners.

**PASS.**

### Continuation
- User 33 выполняет ясное поручение.
- Project 13 требует остановки после bounded subtask до новой явной команды.
- User 35 определяет `...` как такую явную команду.

**PASS.**

### Recheck
- User 22 задаёт generic recheck threshold.
- AGENTS даёт exact-head/external-state specialization.

**PASS.**

### Completion
- User 11 требует established checked criteria.
- AGENTS определяет concrete review completion criteria.

**PASS.**

## 5. Duplicates

1. Новых DELETE-SAFE inter-layer дублей из-за User atomization не найдено.
2. Оставшиеся semantic overlaps намеренные и объясняются аудиторией:
   - User — global ChatGPT behavior;
   - Project — Vico-specific ChatGPT orchestration;
   - AGENTS — shared repository contract для ChatGPT + Codex.

## 6. Final verdict

1. User draft exact blob `ef1c0efd...` — **PASS**.
2. Project draft exact blob `fd815393...` — **PASS**.
3. AGENTS draft exact blob `170ef5ed...` — **PASS**.
4. User current coverage — **15/15 FULL**.
5. User retained semantic guards — **52/52**.
6. User executability stress — **17/17 EXEC PASS**.
7. Подтверждённых межслойных противоречий — **0**.
8. Новых DELETE-SAFE inter-layer дублей — **0**.
9. Permission/authority/continuation blockers — **0**.
10. Three-layer consistency blockers — **0**.

## Status

**THREE-LAYER CONSISTENCY PASS** для указанных exact blobs.

Следующий отдельный этап — повторный transfer-readiness exact текущих blobs и только затем transfer package.
