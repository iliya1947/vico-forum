# agents/lira.md — персональная рабочая память Лиры по #342

## Текущее назначение

Лира реализует consolidated corrective PR #354 до полного закрытия четырёх confirmed audit findings.

## Текущий PR

- Draft #354 `fix/watch-loader-ack-freshness`.
- Base implementation main: `a645fbe21110e77429025c428e498194b9a92ca2`.
- Current main после docs-only #352: `bb3d44f940f44a4f08c4a501d9d0b3deaa50eb02`.
- Current head: `6dd9c66c2d22158f41e76089436399082b6553c5`.
- Current diff: Watch control+tests, Bookmark control+tests, Bookmarks list+tests; без backend/DB/RBAC и изменений title.

## Уже сделано

- WATCH-AUDIT-1: loader authoritative; local confirmed mirror удалён; stale successful ACK regressions обоих направлений добавлены.
- Watch slice ранее имел author checks + Mira промежуточный PASS на `afe23e08...`.
- BOOKMARKS-AUDIT-1 **bounded PASS** на exact `79066adade6a01a1b723d9d2127632182307ed3c`. Удалён локальный `confirmed` mirror из `TopicBookmarkControl`, сохранены pending/error/explicit refresh/actor-topic guards/no automatic retry; matching ACK больше не выставляет own confirmed state. Обычный success test использует актуальный loader, два новых deterministic теста покрывают stale ACK обоих направлений. CI `44610653172` checks PASS 2748/2748 (Bookmark 6/6), database PASS PG17 1476/1476; dedicated Bookmarks `44610653174` PASS 11/11; все 7/7 workflows SUCCESS, no pending. Diff нового slice — только bookmark component + test, ранее принятый Watch не менялся.

- BOOKMARKS-AUDIT-2 **bounded PASS** на exact `6dd9c66c2d22158f41e76089436399082b6553c5`. Удалены `removed`/`setRemoved`/`return null` из `bookmarks-view.tsx`, сохранены transient error/refresh, pagination и tab actor marker. Тестовая страница стала loader-backed: success Remove скрывает строку после фактического server loader read, race Remove→re-add→fresh list→old ACK сохраняет строку, timestamp и после повторной revalidation. GitHub CI `44612960668` checks PASS 2749/2749 (Bookmarks view 7/7), database PG17 1476/1476; dedicated Bookmarks `44612960463` 11/11; все 7/7 workflows SUCCESS. Новый срез — только Bookmarks view+test.

## Осталось в этом же #354

1. TITLE-AUDIT-1: Save и Cancel должны вернуть focus на Edit-title opener **после** его возврата в DOM.
2. После исправления проверить применимые exact-head regressions/CI/connected и всю границу consolidated PR.
3. Stable final exact head + author self-check.
4. STOP Мире.

Лёву не подключать самостоятельно и не готовить ему отдельный slice handoff: сначала fresh whole-PR PASS Миры всего #354.
