# Vico Forum — общий служебный канал

Этот PR — единственный активный служебный канал ChatGPT + Codex. Он не merge в `main`.

## Текущий рабочий цикл

- Основной Editor 2.0 PR #215 смержен 2026-10-18 как pre-release baseline.
- Отдельная работа по test-audit Package 3 / PR #229 ведётся вне этого рабочего цикла и не координируется через этот канал.
- Активный follow-up implementation PR: #232.
- #232 создан для остаточных current-Stage дефектов Editor 2.0 и должен работать поверх актуального `main`.

## Подтверждённые current-Stage дефекты для #232

1. **Cleanup / unresolved attachment boundary.** Cleanup может физически удалить attachment, который ещё нужен незавершённому conflict-resolution boundary.
2. **Simple table-cell paste.** Surface-level paste handler перехватывает native paste в editable table input.
3. **Unsaved / terminal cross-tab conflict resolution.** Synthetic local candidate ошибочно обрабатывается как active server draft; version-0 и terminal-generation выбор может остаться неразрешимым.
4. **Cross-leaf Enter.** Codex воспроизвёл в Chromium: selection через соседние Simple-mode leaves игнорируется, Enter вставляется по leaf-local fallback вместо замены фактического source range.

## Принятые границы

- Не возвращаться к PR #215 и не продолжать его patch-chain.
- Не пересматривать Editor 2.0 целиком.
- Исправлять только подтверждённые current-Stage дефекты текущего follow-up scope.
- Не переносить сюда закрытые A–D findings, GPT6-04, общий UI/UX refinement или Stage 6 infrastructure.
- Если attachment/conflict mechanism снова требует повторной переделки того же механизма или нового компенсирующего слоя, остановиться и заново проверить технический план.
- Codex-6.1 Sol подключается только в самом конце перед merge, после исправлений и чистого прохода ChatGPT-5.6 Sol, ChatGPT-6 и Codex-5.6 Sol.
- Merge выполняет только разработчик.

## Следующий шаг

Codex-5.6 Sol проверяет этот служебный PR и актуальное состояние PR #232. Перед реализацией #232 должен быть синхронизирован с текущим `main`; затем формируется один bounded correction package из четырёх подтверждённых дефектов.
