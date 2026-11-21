# agents/lira.md — рабочая память Лиры по #342

## Текущее назначение

**B4 — assets и translation boundaries, пакет B4-A выполнен; STOP до owner `...` на B4-B.**

Stack: B1 #355 и B2 #357 (coordinator PASS), B3 #359 exact `cde5219046dcac9cbde3d62c4eb819fcfd2f6e91` (Мира PASS). B1/B2/B3 Draft, unmerged. New stacked [Draft #365](https://github.com/iliya1947/vico-forum/pull/365), base B3, exact `e30c763d4dd42e32537f2a6e6edfec194c6d2af0`. Не merge до B9/fold.

## Последний пакет — B4-A

- `readPublishedAttachment` в `db/forum-attachments.ts`: сохранила точную post/attachment membership, добавила join topic и post/topic `isHidden=false`. Public `attachment-download.ts` не менялся, уже выполняет reader перед bucket.get для default/inline/text.
- `tests/database/forum-attachments.test.ts`: реальный PG/HTTP integration сценарий для hidden post/topic, missing ID/ref, no bucket GET/neutral 404, положительные shared visible и owner draft paths, retention refs. Версии/time на Hide/Restore корректны.
- **17/17 статических source/diff проверок PASS**, реальный PostgreSQL/Vitest/Typecheck **не проверены**, не утверждать runtime PASS. Только 2 файла изменены, current B4-A commit `e30c763d4dd42e32537f2a6e6edfec194c6d2af0`. Не запускала полный CI как пакетный gate.

## Следующий пакет — B4-B (только после owner continuation)

Проверить уже доставленные B2 translation planner gates и accepted task execution без дублирования; добавить целевые real-PG Hide/Restore × new-plan/accepted execution тесты, поправить только реальные пробелы B4. После B4-B — STOP перед B4-C. Полный контракт — `WORKFLOW.md`/ `stages/moderation-visibility/PLAN.md`.

Не начинать B5–B9, Stage6, #300, общий UI/UX; B6 guarded private moderator download не относится к B4-A. Собранная фича и CI — только после полного B4, перед checkpoint Миры.
