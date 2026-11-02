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

## Архивные снимки

Каталог [`doc_old/`](../../doc_old/) сохраняется отдельно как набор старых полных снимков документов. Он не входит в последовательность `PROJECT_HISTORY_##.md` и используется только когда нужен конкретный исторический snapshot.
