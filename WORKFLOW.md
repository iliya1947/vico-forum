# WORKFLOW.md — текущее оперативное состояние #342

## Активный этап

Consolidated corrective implementation PR #354 — **Mira coordinator whole-PR PASS** на stable exact head `b67e14d81cd20f2e42264e3d25d336ee19db626b`.

## Текущее состояние

- Draft #354 открыт, не merged. Base `a645fbe21110e77429025c428e498194b9a92ca2`.
- Current GitHub main `bb3d44f940f44a4f08c4a501d9d0b3deaa50eb02`; main drift от base только service-regulation docs, продуктовый код не менялся.
- Diff #354: ровно 9 файлов — Watch control+tests, Bookmark control+tests, Bookmarks list+tests, Title editor+tests и Title connected browser test.
- WATCH-AUDIT-1, BOOKMARKS-AUDIT-1, BOOKMARKS-AUDIT-2 и TITLE-AUDIT-1 подтверждены закрытыми.
- TITLE-AUDIT-1-R1 [P3] закрыт: pending opener-focus request одноразово погашается при close transition даже если opener недоступен из-за permission loss; позднее возвращение permission не проигрывает старый focus.
- Exact-head `b67e14d8...`: 7/7 GitHub workflows completed SUCCESS, включая CI, Topic Watch, Topic Bookmarks, Own topic title и regression connected jobs.
- Review threads/comments по #354 не содержат новых findings.
- **Mira whole-PR result: PASS. Confirmed current-scope defects = 0.**

## Назначение и следующий шаг

**Лёва / Codex-6.1 Sol** — выполнить один independent technical **whole-PR review всего #354** на том же exact head `b67e14d81cd20f2e42264e3d25d336ee19db626b`.

Проверить весь consolidated scope четырёх original audit findings + TITLE-AUDIT-1-R1, а не только последний delta. Implementation не менять во время review. Если найден подтверждённый current-scope defect — вернуть результат в #342; если PASS — зафиксировать PASS того же SHA.

Если implementation head изменится, текущий Mira PASS перестаёт быть final gate и coordinator cycle начинается заново.

Merge выполняет только владелец после independent PASS. Лира STOP.

## После #354

После owner merge #354: moderation visibility → forum structure/topic move → затем #320. #300/Stage6/general UI/UX не активированы.
