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
- Owner override для PR #232 от 2026-10-19: Мишаня не участвует в промежуточном defect-discovery цикле. Сначала Мира и Лира самостоятельно доводят implementation до stable head, на котором обе не находят current-Stage defects. Только после этого Мишаня выполняет один финальный whole-PR pre-merge review. Лёва для #232 не подключается без отдельной прямой команды разработчика.
- Merge выполняет только разработчик.

## Review sequence

Для PR #232 действует прямой owner override от 2026-10-19:

1. Мира и Лира независимо проверяют один stable implementation head.
2. Их current-Stage findings согласуются; подтверждённые defects исправляются отдельно.
3. Любое implementation change возвращает PR к новому независимому проходу Миры и Лиры.
4. Этот цикл повторяется, пока **обе** не завершат проверку одного stable exact head без current-Stage findings.
5. Только после этого Мишаня выполняет **один финальный whole-PR pre-merge review**.
6. Если Мишаня находит current-Stage defect, после исправления снова требуется чистый проход Миры и Лиры до следующего финального review Мишани.
7. При чистом финальном review Мишани PR готов к решению разработчика о merge.
8. Лёва в review-cycle #232 не входит без отдельной прямой команды разработчика.

## Следующий шаг

Мира завершила первую formal independent whole-PR проверку PR #232 на stable code/test head `36e1306832e1910a5ed9e0bf9e5400d39abf45b6` с documentation-only successor `ee267d908c089e8781368a3b6a563f0f1c54eff6`.

Лира завершила вторую независимую whole-PR/source-level проверку того же implementation head. Статус и границы проверок указаны в её личном служебном файле. Findings Миры и Лиры до завершения независимых проверок переданы только разработчику в соответствующих чатах и **не публикуются в служебном PR**.

Текущий head **не передаётся Мишане**: Мира и Лира уже завершили независимые проверки, но цикл ещё не является чистым. Следующая рабочая точка — согласовать их current-Stage findings, исправить только подтверждённые defects и затем заново провести независимые проверки Миры и Лиры на новом stable exact head. Мишаня остаётся зарезервирован только для финального whole-PR pre-merge review после чистого результата обеих.
