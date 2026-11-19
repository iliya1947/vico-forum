# agents/lira.md — персональная рабочая память Лиры по #342

## Текущее назначение

Лира реализует consolidated corrective PR #354 до полного закрытия четырёх confirmed audit findings.

## Текущий PR

- Draft #354 `fix/watch-loader-ack-freshness`.
- Base implementation main: `a645fbe21110e77429025c428e498194b9a92ca2`.
- Current main после docs-only #352: `bb3d44f940f44a4f08c4a501d9d0b3deaa50eb02`.
- Head на момент workspace migration: `79066adade6a01a1b723d9d2127632182307ed3c`.
- Current diff: Watch control+tests + Bookmark control+tests.

## Уже сделано

- WATCH-AUDIT-1: loader authoritative; local confirmed mirror удалён; stale successful ACK regressions обоих направлений добавлены.
- Watch slice ранее имел author checks + Mira промежуточный PASS на `afe23e08...`.
- BOOKMARKS-AUDIT-1 correction уже появилась в current diff: bookmark control также переведён на loader-authoritative display и добавлены two-direction stale-ACK regressions. Финальный author checkpoint этого расширенного head пока не зафиксирован в service workspace.

## Осталось в этом же #354

1. BOOKMARKS-AUDIT-2: stale Remove ACK/local removed latch не должен скрывать тему, уже присутствующую в свежем loader list после re-add.
2. TITLE-AUDIT-1: Save и Cancel должны вернуть focus на Edit-title opener **после** его возврата в DOM.
3. Проверить, что current Bookmark-control slice сохраняет pending/error/explicit refresh/actor-topic isolation и не вводит automatic POST retry.
4. Применимые regression/CI/connected checks всего consolidated PR.
5. Stable final exact head + author self-check.
6. STOP Мире.

Лёву не подключать самостоятельно и не готовить ему отдельный slice handoff: сначала fresh whole-PR PASS Миры всего #354.
