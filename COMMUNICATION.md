# COMMUNICATION.md — общий актуальный контекст, факты, ограничения, зависимости и незакрытые вопросы команды

## K5 correction

1. Final assembled PR #388 остаётся open/unmerged; main unchanged.
2. Единственный прежний automated blocker — K5 initialization assertion до первого upload.
3. По прямому решению владельца correction выполняет Мира; Ада STOP.
4. Новый #388 exact `71cdb70d9a5a8b0d0efc3df724d62b736dff7601` отличается от accepted `615d9359...` только `tests/browser/sa04-attachments/check.py`.
5. Test теперь ждёт UUID operation state штатным retrying Playwright assertion вместо immediate `input_value()`; шесть initial reads синхронизированы. Safe evidence фиксирует readiness без raw operation capability. Product/runtime/schema/workflow не менялись.
6. Runtime verification нового head ещё не выполнялась; K5 gate пока HOLD.

## Следующий route

Сначала targeted K5 exact-head verification. Только после его PASS — final CI/acceptance на том же stable head. Final whole-feature coordinator review выполняется отдельной последующей подзадачей.

Лёва и Ада не independent final reviewer из-за участия в implementation. AUTH-07 и Stage-6 заблокированы.
