# USER current vs draft coverage — recheck after rule 8 fix

Сравниваются:
- `USER_INSTRUCTIONS.current.md` — действующие 15 правил;
- `USER_INSTRUCTIONS.draft.md` — 42-point draft после локального исправления rule 8.

## Результат по каждому current rule

1. current 1 → draft 1 — **FULL**.
2. current 2 → draft 2 — **FULL**.
3. current 3 → draft 3 — **FULL + расширение**.
4. current 4 → draft 4 — **FULL**.
5. current 5 → draft 4 — **FULL**.
6. current 6 → draft 5 — **FULL**.
7. current 7 → draft 6 — **FULL + уточнение**.
8. current 8 → draft 8 + 10 — **FULL**.
   - общий evidence gate восстановлен: выводы только из установленных фактов и применимых условий;
   - hidden-premise guard сохранён;
   - при недостатке оснований результат не выдаётся за вывод и остаётся гипотезой/предположением;
   - confidence propagation сохранён;
   - contradiction check остаётся в draft 10.
9. current 9 → draft 19–22 + 29 + 38 — **FULL, распределённое покрытие**.
10. current 10 → draft 39 — **FULL**.
11. current 11 → draft 2 — **FULL + расширение**.
12. current 12 → draft 40 — **FULL**.
13. current 13 → draft 18 — **FULL + расширение**.
14. current 14 → draft 41 — **FULL**.
15. current 15 → draft 42 — **FULL + ограничение scope/permissions**.

## Проверка локальности исправления

При переходе от предыдущего 42-point draft к текущему изменён только пункт 8.

Остальные 41 пункт не изменены.

## Итог

- FULL coverage: 15 из 15 current rules.
- PARTIAL: 0.
- LOST: 0.
- Установленная ранее semantic regression current 8 устранена.
- Текущий User draft является semantic superset действующих User instructions по проверенным 15 current rules: все действующие смыслы сохранены, draft добавляет дополнительные guards.

Это утверждение относится только к User current-vs-draft coverage и не означает, что Project/AGENTS layers уже оптимизированы или что весь трёхслойный набор завершён.
