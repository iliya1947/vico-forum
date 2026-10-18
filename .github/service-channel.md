# Vico Forum — общий служебный канал

Этот PR — единственный актуальный служебный канал ChatGPT и Codex. Он не merge в `main`.

## Текущая реализация

- Активный implementation PR: #232 — Editor 2.0 follow-up corrections.
- PR #215 смержен в `main`; его дальнейшая история здесь не ведётся.
- Package 3 тестового аудита относится к отдельному рабочему потоку и здесь не координируется.
- #232 синхронизирован с актуальным `main`.
- Current PR head: `ee267d908c089e8781368a3b6a563f0f1c54eff6`.
- Exact code/test head: `36e1306832e1910a5ed9e0bf9e5400d39abf45b6`.
- Последующий `ee267d9…` меняет только запись exact-head CI в `PROJECT_STATE.md`; implementation не меняется.
- GitHub Actions #39136086360 на current head: SUCCESS.
- Applicable browser/runtime prerequisite закрыт Мишаней на неизменном code/test head `36e1306…`; formal whole-PR review-cycle теперь может начаться.

## Текущий пакет #232

Реализованы коррекции четырёх ранее подтверждённых current-Stage дефектов:

1. cleanup учитывает unresolved attachment boundary и не удаляет нужный conflict winner объект;
2. Simple table-cell paste остаётся native внутри выбранной ячейки;
3. unsaved/version-0 и terminal-based cross-tab candidates проходят authoritative server transition вместо некорректного active-draft resolve;
4. cross-leaf / cross-block Simple Enter использует полный native selection range вместо leaf-end fallback.

Эти коррекции ещё не считаются окончательно принятыми. Предварительные reviewer findings до завершения предусмотренных независимых проверок в служебный PR не переносятся.

## Границы

- Не расширять #232 до общего Editor refinement, косметики или Stage 6.
- Не возвращать закрытые findings #215 без нового подтверждённого causal evidence.
- Если attachment/conflict механизм снова требует повторной переделки или нового компенсирующего слоя, остановиться и заново проверить технический план.
- Лёва подключается только в самом конце перед merge, после чистого прохода Миры, Лиры и Мишани.
- Merge выполняет только разработчик.

## Review sequence

После закрытия обязательных prerequisites стабильный implementation head последовательно проверяют:

1. Мира — независимая whole-PR проверка #232.
2. Лира — независимая whole-PR проверка того же stable implementation.
3. Мишаня — whole-PR проверка.
4. Подтверждённые current-Stage findings согласуются и исправляются отдельно; implementation change сбрасывает цикл.
5. После чистого повторного прохода первых трёх reviewers — финальный Лёва pre-merge review.

## Следующий шаг

Мишаня закрыл узкий prerequisite-прогон в настоящем React Router + Workers/Hyperdrive runtime с Chromium `154.0.8037.57` и одноразовой PostgreSQL 17:

- native Simple table-cell Ctrl+V сохранил input semantics и обновил только выбранную ячейку/source;
- cross-leaf и cross-block Enter заменили полный native Range с ожидаемым Markdown;
- version-0 и terminal-based local conflicts прошли реальные authoritative server transitions для обеих кнопок выбора (`0 → 1` и `2 → 3`) с выбранным draft ID/payload;
- attachment DB lifecycle DELETE → zero refs → cleanup → resolve сохранил boundary object, а обычная очистка после снятия boundary осталась рабочей;
- targeted application 118/118 и PostgreSQL attachment 58/58 PASS, browser page errors отсутствовали.

Это был только prerequisite, не whole-PR review и не implementation change. Мира начинает первую formal independent whole-PR проверку PR #232 на stable code/test head `36e1306832e1910a5ed9e0bf9e5400d39abf45b6` с documentation-only successor `ee267d908c089e8781368a3b6a563f0f1c54eff6`. Findings до завершения предусмотренного независимого цикла остаются только у соответствующего reviewer.
