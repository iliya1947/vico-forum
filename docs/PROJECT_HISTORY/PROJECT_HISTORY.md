# История проекта Vico Forum

## Назначение

Этот каталог хранит значимую историю разработки Vico Forum отдельно от текущего состояния проекта.

История нужна для восстановления причин решений, последовательности implementation/correction циклов, старых ограничений и результатов проверок. Она **не является source of truth для текущего поведения**.

Актуальное состояние проекта находится в [`PROJECT_STATE.md`](../../PROJECT_STATE.md), а постоянные продуктовые и технические контракты — в профильных source-of-truth документах.

Git history и PR остаются первичными историческими источниками. Эти файлы дают компактную навигацию по уже зафиксированной истории без необходимости каждый раз восстанавливать её из Git.

## Навигация

1. [`PROJECT_HISTORY_01.md`](./PROJECT_HISTORY_01.md) — 2026-09-09 — 2026-09-28: Stage 0–6 foundation и corrective ledger H-001–H-013.
2. [`PROJECT_HISTORY_02.md`](./PROJECT_HISTORY_02.md) — 2026-10-01 — 2026-10-10: UI/UX product pass, discovery, Help & solutions, auth presentation, notifications, profiles, registration и Editor tooling.
3. [`PROJECT_HISTORY_03.md`](./PROJECT_HISTORY_03.md) — 2026-10-10 — 2026-10-19: Attention и основной цикл Editor 2.0, его аудиты, corrections, publication/edit lifecycle и завершение реализации.
4. [`PROJECT_HISTORY_04.md`](./PROJECT_HISTORY_04.md) — 2026-10-20 — 2026-10-26: post-Editor решения и correction packages по auth, recovery, database, notifications, Help lifecycle и audit fixes.
5. [`PROJECT_HISTORY_05.md`](./PROJECT_HISTORY_05.md) — 2026-10-27 — 2026-10-28: attachment journal, Markdown/literal-text, Editor и localization corrections.
6. [`PROJECT_HISTORY_06.md`](./PROJECT_HISTORY_06.md) — 2026-10-29 — 2026-10-31: Admin Panel AP-01–05, Complaints Packages 1–3 и поздние Editor/discovery/i18n/a11y corrections.
7. [`PROJECT_HISTORY_07.md`](./PROJECT_HISTORY_07.md) — snapshot 2026-10-31: полный остаточный `PROJECT_STATE.md` перед его нормализацией 2026-11-02.
8. [`PROJECT_HISTORY_08.md`](./PROJECT_HISTORY_08.md) — 2026-11-02: Complaints Package 5 implementation/CI checkpoint; independent review тогда ещё ожидался.
9. [`PROJECT_HISTORY_09.md`](./PROJECT_HISTORY_09.md) — 2026-11-03: Complaints Package 7 integration и локальный Worker HTTP smoke, авторский CI snapshot до независимых review.
10. [`PROJECT_HISTORY_10.md`](./PROJECT_HISTORY_10.md) — 2026-11-04: Admin Panel AP-08 close/reopen, coordinator/technical PASS, CI и merge #283.
11. [`PROJECT_HISTORY_11.md`](./PROJECT_HISTORY_11.md) — 2026-11-05: Admin Panel AP-09 Users, correction cycles, merge #287 и test stabilization #289.
12. [`PROJECT_HISTORY_12.md`](./PROJECT_HISTORY_12.md) — 2026-11-06: Admin Panel AP-10 measures, correction/review cycles, final PASS и merge #290.
13. [`PROJECT_HISTORY_13.md`](./PROJECT_HISTORY_13.md) — 2026-11-07: Admin Panel AP-11 integration closeout, correction/review cycles, final PASS и merge #292.
14. [`PROJECT_HISTORY_14.md`](./PROJECT_HISTORY_14.md) — 2026-11-07: owner/authorization redesign Stage 1, удаление obsolete last-manager invariant при сохранении transaction mutex, final PASS и merge #294.
15. [`PROJECT_HISTORY_15.md`](./PROJECT_HISTORY_15.md) — 2026-11-07: owner/authorization redesign Stage 2, bound Owner all-catalog authority, raw AP-10 hierarchy, immunity/elevated gate, acceptance correction и merge #296.

## Архивные снимки

Каталог [`doc_old/`](../../doc_old/) сохраняется отдельно как набор старых полных снимков документов. Он не входит в последовательность `PROJECT_HISTORY_##.md` и используется только когда нужен конкретный исторический snapshot.
