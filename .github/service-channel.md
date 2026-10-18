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
- Formal whole-PR review-cycle #232 ещё не начат: перед ним не закрыт обязательный applicable browser prerequisite для Chromium-sensitive Editor behavior.

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

Лира закрывает недостающий applicable browser prerequisite для #232 на текущем stable implementation head. Formal whole-PR review до этого не начинать.
