# DECISIONS.md — действующие решения stale/legacy audit

## D-01 — отдельный служебный канал

По прямой команде владельца от 2026-11-25 весь stale/legacy audit перенесён из завершённого #342 в отдельный service PR.

## D-02 — baseline evidence не равен current exact

80 A являются exact fresh-reviewed registry только для main `9cff976a9621d9fe5dfef28ea5367e390ff435b1`. Изменение relevant source требует dependent recheck.

## D-03 — cleanup только A

B/C/D/E не являются автоматическим cleanup scope.

## D-04 — bounded implementation PR

Каждый связный cleanup-пакет выполняется отдельным implementation PR; service PR хранит координацию и evidence, но не product diff.

## D-05 — C1 сохраняет #377

Existing Draft #377 остаётся implementation PR для C1, но перед новым review должен быть reconciled/synced с current main и получить fresh exact-head evidence.

## D-06 — #384 отдельно

Полный аудит форума #384 не объединяется со stale/legacy audit.
