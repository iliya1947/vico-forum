# HISTORY.md — значимые завершённые события stale/legacy audit

## 2026-11-21…23 — systematic audit внутри #342

- Audit был передан как side-task через #342.
- Grep-first метод признан несистемным; аудит перестроен от capability map и всех projection classes.
- Corrected registry проходил fresh reviews; итог baseline review — 80 exact A на main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`.
- B/C/D/E отделены от A.

## 2026-11-23 — cleanup C1

- Owner продолжением разрешил перейти от audit-only к cleanup.
- Draft #377 exact `d4f820166bc905e28e2ae818854e6f8038c96ea1` удалил baseline A-011…A-026 из трёх localization files.
- Exact-head CI тогда прошёл checks + database SUCCESS; author self-check PASS.
- До independent review main позднее изменился.

## 2026-11-24 — #342 complete

Основная service task #342 завершилась и больше не должна хранить рабочий контекст stale/legacy audit.

## 2026-11-25 — dedicated service transfer

- Owner прямо распорядился перенести весь аудит в новый служебный PR.
- Current main: `9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432`.
- Старый audit baseline теперь требует dependent reconciliation из-за четырёх новых main commits.
- #377 diverged: ahead 3 / behind 4; old author PASS сохранён как history, но не как current review gate.
