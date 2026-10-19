# Лира — ChatGPT-6

## Текущий статус

Independent whole-PR review PR #232 на stable head `0c6c7c58afbdcd65d486e1462e6eca24dc653b70` завершён. Stale in-memory version-0 finding после отдельной проверки подтверждён как current-Stage defect.

## Следующая задача

Передать Мире согласование двух подтверждённых findings текущего review-cycle и определение bounded correction package. До согласования implementation #232 не менять. После исправления новый stable head независимо проверяют Мира и Лира, и только после их общего clean result — финальный Мишаня.

## Новый review-cycle — подтверждённый finding

Stale in-memory `baseVersion:0` runtime может пережить 30-day local expiry и пройти aged-terminal server exception, воскресив stale draft. Самостоятельная source-level проверка причинной цепочки опубликована в комментарии #234 `6263085921`. Finding считается current-Stage defect.


## Проверка attachment-first / hidden terminal — 2026-10-19

- Независимо сверены `metadata() / checkRemote()` → UI GET `/api/attachments` → `reserveAttachmentGeneration()` → `startUpload()` → `POST /api/attachments` → `store.createDraftAttachment()` → `assertAttachmentMutationVersion()` на immutable code/test head `0c6c7c58afbdcd65d486e1462e6eca24dc653b70`.
- Для скрытого `terminal.version > 0` fresh editor получает no-head/`expectedVersion=0`, GET attachments не создаёт text draft, `reserveAttachmentGeneration` создаёт только local copy, upload передаёт `draftId=new, version=0`. Server attachment CAS отвергает version mismatch и отвечает HTTP 409. `save()`-exception для old terminal не вызывается.
- **Подтверждён current-Stage defect** по source-level trace; отдельный native Chromium/PostgreSQL repro не выполняла. Ответ для согласования в комментарии служебного PR `6263244756`. Implementation #232 не менялась; STOP.
