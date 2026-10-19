# Vico Forum — общий служебный канал

Этот PR — единственный актуальный служебный канал ChatGPT и Codex. Он не merge в `main`.

## Текущая реализация

- Активный implementation PR: #232 — Editor 2.0 follow-up corrections.
- Current PR head: `ae121565ccedcb7868cba01987e2cde0392b90e9`.
- Exact current code/test head: `0c6c7c58afbdcd65d486e1462e6eca24dc653b70`; successor `ae12156…` меняет только `PROJECT_STATE.md`.
- GitHub Actions #39176074057 на code head: `checks` SUCCESS, `database` SUCCESS. #39176308478 на current head: оба jobs SUCCESS.
- Independent whole-PR reviews Миры и Лиры этого stable head завершены.
- Implementation #232 остаётся STOP до согласования всех current-Stage findings нового цикла.

## Ранее исправленные defects

1. Expired draft оставлял unresolved attachment boundary и мог бессрочно удерживать orphan object.
2. Hidden terminal tombstone старше metadata window блокировал fresh generation text save.
3. Simple table-cell paste перехватывался visual surface.
4. Cross-leaf / cross-block Simple Enter терял native selection.
5. Version-0 / terminal cross-tab choice не всегда проходил authoritative server transition.

Correction package для первых двух lifecycle defects находится в `0c6c7c5…`; предыдущие UI/client corrections — в составе этого же PR.

## Findings нового review-cycle

### 1. Подтверждённый current-Stage defect: stale in-memory version-0 draft обходит 30-day expiry

Мира выявила, Лира отдельно подтвердила source-level цепочку:

- уже смонтированный runtime может держать unsaved `ctx.local` старше 30 дней без повторной проверки local expiry;
- terminal generation того же persistent context может за это время выйти за metadata cutoff;
- возвратившийся stale runtime получает no-head и отправляет `save(... expectedVersion:0)`;
- aged-terminal exception на server допускает этот новый draft ID и просроченное локальное содержимое снова становится active.

Это нарушает текущий 30-day draft lifetime contract. PR #232 не clean.

### 2. Подтверждённый current-Stage defect: первое attachment upload поверх hidden terminal tombstone

Мира выявила, Лира отдельно подтвердила source-level причинную цепочку (комментарий #234 `6263244756`):

- после >30 дней metadata скрывает terminal head, поэтому fresh editor стартует с `expectedVersion:0`;
- current correction разрешает обычный text `save()` нового generation поверх aged terminal row;
- но Attach доступен до первого 60-second text save, и `reserveAttachmentGeneration()` сам server save не выполняет;
- первый POST attachment уходит с новым draft ID и `expectedVersion:0`;
- attachment CAS допускает fresh generation поверх terminal head только при точном совпадении `draft.version === expectedVersion`;
- hidden terminal имеет version > 0, поэтому attachment-first path получает conflict, хотя текущий контракт специально допускает attachment reservation до первого ordinary text save.

Первый attachment upload до первого ordinary text save отклоняется HTTP 409 из-за несовпадения версии hidden terminal. Штатный text `save()` CAS не вызывается при резервировании attachment generation; GET attachment list также не создаёт text generation. Второй finding подтверждён; отдельный browser/DB repro этого сценария ещё не выполнялся.

## Границы

- Не расширять #232 до общего Editor refinement, косметики или Stage 6.
- Implementation не менять до завершения согласования findings.
- Мишаню не подключать до stable head без current-Stage findings у Миры и Лиры.
- Лёву не подключать без отдельной прямой команды разработчика.
- Merge выполняет только разработчик.

## Review sequence

1. Мира и Лира независимо проверяют один stable implementation head.
2. Findings согласуются; подтверждённые current-Stage defects исправляются отдельным bounded package.
3. Любое implementation change запускает новый независимый проход Миры и Лиры.
4. Только после общего clean result Мишаня выполняет один финальный whole-PR pre-merge review.

## Следующий шаг

Лира выполняет один bounded correction package в PR #232 для двух подтверждённых current-Stage defects нового review-cycle:

1. 30-day expiry должен применяться и к уже загруженному в память local draft: просроченный неизменённый draft не должен уходить в следующий server save и не должен воскресать через aged-terminal path.
2. Fresh generation после hidden aged terminal должна поддерживать attachment-first до первого ordinary text save без 409, сохраняя существующие защиты от stale/retired generation и реальных CAS-конфликтов.

Критерии готовности: оба сценария покрыты targeted regressions; применимые checks зелёные; фактическое состояние документации/PROJECT_STATE обновлено только по реально выполненным проверкам; никаких несвязанных изменений.

После нового stable implementation head — STOP. Затем Мира и Лира выполняют новый независимый whole-PR review одного exact head. Мишаню не подключать до общего clean result; Лёву не подключать без прямого указания владельца.
