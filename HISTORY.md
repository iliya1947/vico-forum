# HISTORY.md — значимые завершённые события и переходы задачи #342

## 2026-11-18 — Edit own topic title

- Implementation #343 merged.
- Docs #344 merged.
- Поздний owner audit подтвердил TITLE-AUDIT-1 [P3] по focus restoration; data/write contract не признан дефектным.

## 2026-11-18 — Watch

- Implementation #345 merged.
- Docs #349 merged.
- Поздний owner audit подтвердил WATCH-AUDIT-1 [P2]: stale successful ACK мог перекрывать fresher loader state.

## 2026-11-18 — Bookmarks

- Implementation #346 merged.
- Docs #350 merged.
- Ранее в implementation был закрыт B5-R1 account-switch cursor defect.
- Поздний owner audit подтвердил BOOKMARKS-AUDIT-1/2 [P2]: stale ACK control state и stale removed latch list row.

## 2026-11-19 — Mute/Block

- Implementation #351 merged после Mira coordinator PASS и Leva independent PASS.
- Docs #353 merged.
- Permanent Mute/Block contract и migration 0070 зафиксированы в main.

## 2026-11-19 — consolidated corrective #354

- #354 открыт для WATCH-AUDIT-1.
- Watch correction на head `afe23e08f0e54cafbfc2d803fe9f1cee59b2bbbf` прошла author checks и промежуточный Mira whole-PR PASS.
- Владелец расширил тот же #354 на все четыре audit findings и отложил Leva review до полного пакета.
- Текущий head на момент миграции workspace: `79066adade6a01a1b723d9d2127632182307ed3c`; в diff уже добавлена Bookmark-control correction, но общий corrective пакет ещё не завершён.

## 2026-11-19 — новый service workspace

- #352 merged в main как общепроектный контракт структуры/правил service PR.
- По прямому owner route #342 мигрируется из старой .github/service-* структуры в локальные STRUCTURE/RULES/TASK/PLAN/WORKFLOW/... файлы.


## 2026-11-20 — consolidated corrective #354 closed

- Final implementation exact head `b67e14d81cd20f2e42264e3d25d336ee19db626b` прошёл Mira coordinator whole-PR PASS и Leva independent whole-PR PASS.
- WATCH-AUDIT-1, BOOKMARKS-AUDIT-1/2, TITLE-AUDIT-1 и TITLE-AUDIT-1-R1 закрыты; confirmed current-scope defects = 0.
- Owner merged #354; merge commit/current main `6fa2a43b02c55515bbd46a0d74fe6cc0d4424caf`.
- #342 перешёл к moderation visibility scope/fit gate.
