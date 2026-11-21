# DECISIONS.md — действующие решения именно этой задачи.

## D-01 — Audit-first
До завершения системного реестра исправления запрещены.

## D-02 — Product-first method
Аудит строится от фактических capabilities текущего `main`, не от поиска legacy-маркеров.

## D-03 — Compatibility is not stale by default
Старый route/helper/test сохраняется, если он подтверждён как намеренная и корректная compatibility boundary.

## D-04 — One registry before cleanup
Cleanup-пакеты проектируются только после единого классифицированного реестра и отдельного решения разработчика.
