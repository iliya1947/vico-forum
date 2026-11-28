# PLAN.md — актуальный маршрут stale/legacy audit и cleanup

## Режим поставки

Cleanup ведётся серией независимых bounded implementation PR по когерентным группам артефактов. Не объединять 80 элементов механически в один PR.

## R0 — transfer/current-main reconciliation

1. Сохранить baseline 80 A и B/C/D/E без переписывания исторического evidence.
2. Сопоставить diff `9cff976a… → 9f4c9c8d5e18f42db9b12cf23bc07322ef8f6432` с registry.
3. Перепроверить только те A/границы, чьи source-of-truth или артефакты изменились.
4. До завершения R0 не объявлять «80 exact на current main».

## C1 — obsolete development localization keys

Existing Draft #377 ранее удалил baseline A-011…A-026: 16 canonical keys, соответствующие RU/HE manual values и manual fingerprints.

Но current main изменил все три localization-файла. Поэтому:
1. fresh-revalidate A-011…A-026 against current main;
2. синхронизировать #377 с current main без расширения scope;
3. проверить exact diff;
4. run applicable CI;
5. author self-check → coordinator review → required independent review;
6. owner merge only after PASS.

## Следующие cleanup-пакеты

После C1 формировать следующие пакеты по технической связанности: preview/auth fixtures, localization metadata/dead keys, editor dead states/tests/privileges, translation preview fixtures, Super-admin helper/API seams и т. п. Точный порядок определяется после R0 и не должен навязывать исправление элемента, который current main уже изменил/reclassified.

## Stop rule

После каждого bounded пакета — зафиксировать результат в service workspace и STOP. Следующий пакет активируется только явным продолжением владельца.
