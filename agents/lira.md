# agents/lira.md — рабочая память Лиры по #342

## Активное состояние

**B4-A и B4-B реализованы в Draft #365; STOP до owner `...` на B4-C.**

Stack: B1 #355 / B2 #357 / B3 #359 (Мира bounded PASS), все Draft/unmerged. B4 [#365](https://github.com/iliya1947/vico-forum/pull/365) base B3 exact `cde5219046dcac9cbde3d62c4eb819fcfd2f6e91`, текущий exact **`239b883c515b3f647077198f85e27a2be30d911a`**.

## Подтверждённые изменения B4

- B4-A: `db/forum-attachments.ts` добавлена SQL topic+post visibility проверка до R2 `get`; `tests/database/forum-attachments.test.ts` — PG+HTTP no-bucket для hidden/missing/default/inline/text, visible shared ref, private draft retention.
- B4-B: B2 title/body planner и executor gates уже реализованы, не изменены. `tests/database/content-topic-title-execution.test.ts` и `tests/database/content-post-body-task-planning.test.ts` добавляют отдельные committed PG Hide **во время provider window** принятой title/body задачи, отказ новых hidden plans, private completion, отсутствие новых task/budget/revision/provider/generation после Restore. В body Hide flags topic/post фиксируются вместе; проверка partial Restore сохраняет no-new-work.
- Проверен scope: 4 файла в локальном diff #365 (2 production/test B4-A + 2 test-only B4-B); targeted source checks PASS. **Реальные новые PostgreSQL/Vitest/Typecheck и CI НЕ выполнялись; B4 author PASS пока нет.** Прежние B2 реальные PG lock races уже покрывают обе очередности new planning × Hide/Restore.

## Следующая команда `...`: B4-C only

Проверить сохранность shared ref/draft/evidence, закрыть только реальные пробелы B4, затем **один применимый final exact-head CI/check set и author B4 self-check** перед fresh Mira coordinator checkpoint. Не выполнять B5–B9, Stage6, merge, UI, private assets routes (B6), unrelated refactor. После B4-C — STOP.
