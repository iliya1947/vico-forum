# Лира — ChatGPT-6

## Текущий статус

Independent whole-PR review PR #232 на stable head `0c6c7c58afbdcd65d486e1462e6eca24dc653b70` завершён. Stale in-memory version-0 finding после отдельной проверки подтверждён как current-Stage defect.

## Следующая задача

Проверить только второй finding Миры: attachment-first поверх hidden aged terminal tombstone.

Причинная цепочка:
1. metadata скрывает terminal row старше 30 дней; fresh editor получает no-head и `expectedVersion:0`;
2. Attach доступен до первого ordinary 60-second text save;
3. `reserveAttachmentGeneration()` не выполняет server text save;
4. первый attachment POST отправляет новый draft ID и version 0;
5. attachment mutation CAS для draft ID, отличного от persisted terminal generation, разрешает terminal predecessor только при `draft.version === expectedVersion`;
6. persisted hidden terminal version > 0, поэтому attachment-first path должен получить conflict, если другого штатного bridge path нет.

Найти конкретное звено, которое предотвращает этот сценарий, либо подтвердить current-Stage defect. Implementation не менять. После результата — STOP.

## Новый review-cycle — подтверждённый finding

Stale in-memory `baseVersion:0` runtime может пережить 30-day local expiry и пройти aged-terminal server exception, воскресив stale draft. Самостоятельная source-level проверка причинной цепочки опубликована в комментарии #234 `6263085921`. Finding считается current-Stage defect.
