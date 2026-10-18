# Vico Forum — общий служебный канал

Этот PR — единственный активный служебный канал ChatGPT + Codex. Он не merge в `main`.

## Текущий рабочий цикл

- Основной Editor 2.0 PR #215 смержен 2026-10-18 как pre-release baseline.
- Test-audit Package 3 / PR #229 ведётся отдельно от этого рабочего цикла; его изменения уже присутствуют в `main` до текущего follow-up.
- Активный follow-up implementation PR: #232.
- #232 синхронизирован с актуальным на момент реализации `main` merge-коммитом `91a2c521cb355b16ad7f84932288f099aec5829a`.
- Implementation code/test head: `36e1306832e1910a5ed9e0bf9e5400d39abf45b6`.
- Current PR head: `ee267d908c089e8781368a3b6a563f0f1c54eff6`; единственное изменение после code/test head — `PROJECT_STATE.md`.
- GitHub Actions CI #39135879866 на code/test head и #39136086360 на current head завершены SUCCESS.

## Scope #232

В одном bounded implementation package реализованы коррекции четырёх ранее подтверждённых current-Stage дефектов:

1. **Cleanup / unresolved attachment boundary.** Cleanup должен учитывать unresolved attachment-version membership и не удалять физический объект до завершения conflict resolution.
2. **Simple table-cell paste.** Native paste в editable Simple table input не должен перехватываться body/surface paste handler.
3. **Unsaved / terminal cross-tab conflict resolution.** Version-0 cached candidates и новая generation поверх terminal head должны проходить authoritative server transition; conflict UI закрывается только после успешного server result.
4. **Cross-leaf Enter.** Enter при native selection через соседние Simple-mode leaves/blocks должен заменять фактический source range, а не использовать leaf-local fallback.

Наличие реализации и зелёного CI не считается подтверждением корректности этих исправлений до review-cycle.

## Принятые границы

- Не возвращаться к PR #215 и не продолжать его patch-chain.
- Не пересматривать Editor 2.0 целиком.
- Не переносить сюда закрытые A–D findings, GPT6-04, общий UI/UX refinement или Stage 6 infrastructure.
- Если attachment/conflict mechanism снова требует повторной переделки того же механизма или нового компенсирующего слоя, остановиться и заново проверить технический план.
- Review проводится на стабильном #232 head по порядку: ChatGPT-5.6 Sol → ChatGPT-6 → Codex-5.6 Sol.
- Codex-6.1 Sol подключается только в самом конце перед merge, после исправлений и чистого прохода первых трёх reviewers.
- Любое implementation-изменение после review сбрасывает текущий review-cycle.
- Merge выполняет только разработчик.

## Следующий шаг

ChatGPT-5.6 Sol проводит первый independent whole-PR review PR #232 на current head `ee267d908c089e8781368a3b6a563f0f1c54eff6`, учитывая, что implementation delta заканчивается на `36e1306832e1910a5ed9e0bf9e5400d39abf45b6`, а следующий commit меняет только `PROJECT_STATE.md`.
