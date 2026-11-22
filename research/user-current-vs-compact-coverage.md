# USER current → compact draft coverage

Сравниваются:
- `USER_INSTRUCTIONS.current.md` — действующие 15 правил;
- `USER_INSTRUCTIONS.draft.md` — compact draft, 20 правил / 4999 characters.

## Результат

1. current 1 → compact 1 — **FULL**.
   - обязательность всегда;
   - проекты включены;
   - запрет игнорировать/ослаблять/обходить ради удобства или скорости сохранён.

2. current 2 → compact 2 — **FULL**.
   - «по существу, без воды» сохранено.

3. current 3 → compact 3 — **FULL + expansion**.
   - запрет выдумывать факты сохранён;
   - дополнительно уточнена epistemic classification.

4. current 4 → compact 4 — **FULL**.
   - изменяемая техинформация;
   - актуальные первичные источники;
   - нужная версия.

5. current 5 → compact 4 — **FULL**.
   - точная фраза `«Информация не проверена»` сохранена.

6. current 6 → compact 4 — **FULL**.
   - запрет заявлять о невыполненном чтении/проверке/действии сохранён;
   - полное чтение = до фактического конца сохранено по смыслу.

7. current 7 → compact 3 — **FULL + clarification**.
   - факты/применимые условия отделяются от предположений/гипотез/выводов.

8. current 8 → compact 5 — **FULL**.
   - вывод только из установленных фактов/условий;
   - hidden-premise guard;
   - contradiction check.

9. current 9 → compact 17 — **FULL**.
   - до действия пользователю агент сам разбирается в задаче и маршруте;
   - сам выполняет доступные проверки/диагностику;
   - trial-and-error через пользователя запрещён;
   - доступная агенту диагностика на пользователя не перекладывается.

10. current 10 → compact 18 — **FULL + scope guard**.
    - однозначное поручение выполняется без лишних вопросов;
    - дополнительно сохранены установленные границы и higher-rule prohibition.

11. current 11 → compact 2 — **FULL + expansion**.
    - ненужные инструкции и следующие шаги запрещены;
    - дополнительно запрещены ненужные действия.

12. current 12 → compact 19 — **FULL**.
    - точность;
    - проверяемость;
    - логика;
    - практический результат.

13. current 13 → compact 8 — **FULL + expansion**.
    - ошибка прошлого ответа ChatGPT не переносится как факт;
    - дополнительно не переносится как условие/основание.

14. current 14 → compact 19 — **FULL**.
    - списки нумеруются.

15. current 15 → compact 20 — **FULL + scope/permission guard**.
    - `...` продолжает следующий очевидный шаг;
    - без остановки и запроса подтверждения;
    - дополнительно явно не расширяет scope и разрешения.

## Итог

1. FULL coverage: **15/15**.
2. PARTIAL: **0**.
3. LOST: **0**.
4. Compact draft сохраняет все действующие User instructions.
5. Отдельная 52-guard карта уже подтверждает coverage expanded semantic set.
6. Размер compact draft: **4999 characters** — в пределах установленного transfer limit 5000.

Следующий отдельный шаг — повторная three-layer consistency-проверка после User compact rewrite.
